import "server-only";

/*
 * The single server-only Gemini client (REST generateContent), shared by
 * moderation and recommendations. Holds a small key pool:
 *
 *  - Keys: GEMINI_API_KEY (primary), then GEMINI_API_KEY2, GEMINI_API_KEY3, …
 *    (GEMINI_API_KEY_2 style also accepted). Empty values and duplicates are ignored.
 *  - The primary key is tried first; each key at most once per request.
 *  - 429 → that key rests for the provider's Retry-After / retryDelay (bounded),
 *    then the next key is tried. 5xx → short rest, next key.
 *    Invalid/forbidden key → long rest, next key.
 *    Malformed request, timeout or network failure → stop (another key won't help).
 *  - Rests are in memory, per server instance — not shared across instances.
 *  - Keys never leave the server: not in URLs, logs, errors or return values.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_ATTEMPTS_PER_REQUEST = 3;
const DEFAULT_RATE_LIMIT_REST_MS = 60_000;
const MIN_REST_MS = 5_000;
const MAX_REST_MS = 10 * 60_000;
const UNAVAILABLE_REST_MS = 15_000;
const INVALID_KEY_REST_MS = 10 * 60_000;

export type GeminiError =
  | "not_configured"
  | "timeout"
  | "quota"
  | "auth"
  | "http_4xx"
  | "http_5xx"
  | "invalid_response"
  | "network";

export type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  promptFeedback?: { blockReason?: string };
};

export type GenerateResult =
  | { ok: true; data: GeminiResponse; model: string; keyIndex: number }
  | { ok: false; error: GeminiError; model?: string };

export type GenerateRequest = {
  systemInstruction: string;
  userText: string;
  responseJsonSchema: object;
  maxOutputTokens: number;
  timeoutMs?: number;
};

/** Configured keys in priority order (values stay server-side). */
export function geminiKeys(env: NodeJS.ProcessEnv = process.env): string[] {
  const numbered = Object.keys(env)
    .map((name) => ({ name, n: name.match(/^GEMINI_API_KEY_?(\d+)$/)?.[1] }))
    .filter((entry): entry is { name: string; n: string } => entry.n !== undefined)
    .sort((a, b) => Number(a.n) - Number(b.n))
    .map(({ name }) => env[name]);
  const values = [env.GEMINI_API_KEY, ...numbered]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return [...new Set(values)];
}

export function geminiModel(env: NodeJS.ProcessEnv = process.env) {
  const model = env.GEMINI_MODEL?.trim();
  return model && /^[a-z0-9.\-]+$/i.test(model) ? model : null;
}

// key index -> time (ms) until which the key rests. Per instance only.
const restingUntil = new Map<number, number>();

/** Clears key rest state (tests only). */
export function resetGeminiKeyState() {
  restingUntil.clear();
}

function log(message: string) {
  console.error(`[gemini] ${message}`);
}

/** Retry-After header (seconds) or google.rpc.RetryInfo retryDelay ("12s"). */
function retryDelayMs(response: Response, body: unknown): number {
  const header = Number(response.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0) return header * 1000;
  const details = (body as { error?: { details?: { retryDelay?: string }[] } })?.error?.details;
  const delay = details?.find((d) => typeof d?.retryDelay === "string")?.retryDelay;
  const seconds = delay ? Number.parseFloat(delay) : Number.NaN;
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : DEFAULT_RATE_LIMIT_REST_MS;
}

function isKeySpecificFailure(status: number, body: unknown) {
  if (status === 401 || status === 403) return true;
  const error = (body as { error?: { message?: string; details?: { reason?: string }[] } })?.error;
  return (
    status === 400 &&
    (error?.details?.some((d) => d?.reason === "API_KEY_INVALID") ||
      /api key not valid/i.test(error?.message ?? ""))
  );
}

const clamp = (ms: number) => Math.min(MAX_REST_MS, Math.max(MIN_REST_MS, ms));

export async function generateJson(request: GenerateRequest): Promise<GenerateResult> {
  const keys = geminiKeys();
  const model = geminiModel();
  if (keys.length === 0 || !model) return { ok: false, error: "not_configured" };

  const now = Date.now();
  const available = keys
    .map((_, index) => index)
    .filter((index) => (restingUntil.get(index) ?? 0) <= now)
    .slice(0, MAX_ATTEMPTS_PER_REQUEST);
  if (available.length === 0) return { ok: false, error: "quota", model };

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: request.systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: request.userText }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: request.maxOutputTokens,
      responseMimeType: "application/json",
      responseJsonSchema: request.responseJsonSchema,
      thinkingConfig: { thinkingLevel: "minimal" },
    },
  });

  let lastError: GeminiError = "quota";
  for (const index of available) {
    let response: Response;
    try {
      response = await fetch(`${ENDPOINT}/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": keys[index] },
        signal: AbortSignal.timeout(request.timeoutMs ?? 8000),
        cache: "no-store",
        body,
      });
    } catch (error) {
      const isTimeout = error instanceof DOMException && error.name === "TimeoutError";
      return { ok: false, error: isTimeout ? "timeout" : "network", model };
    }

    if (response.ok) {
      try {
        return { ok: true, data: (await response.json()) as GeminiResponse, model, keyIndex: index };
      } catch {
        return { ok: false, error: "invalid_response", model };
      }
    }

    const errorBody: unknown = await response.json().catch(() => null);
    const label = `key #${index + 1}`;
    if (response.status === 429) {
      const rest = clamp(retryDelayMs(response, errorBody));
      restingUntil.set(index, Date.now() + rest);
      log(`${label} rate-limited; resting ${Math.round(rest / 1000)}s`);
      lastError = "quota";
      continue;
    }
    if ([500, 502, 503, 504].includes(response.status)) {
      restingUntil.set(index, Date.now() + UNAVAILABLE_REST_MS);
      log(`${label} got HTTP ${response.status}; trying another key`);
      lastError = "http_5xx";
      continue;
    }
    if (isKeySpecificFailure(response.status, errorBody)) {
      restingUntil.set(index, Date.now() + INVALID_KEY_REST_MS);
      log(`${label} rejected (HTTP ${response.status}); check this key`);
      lastError = "auth";
      continue;
    }
    // Malformed request or other client error: another key won't help.
    log(`request rejected (HTTP ${response.status}); not retrying`);
    return { ok: false, error: response.status >= 500 ? "http_5xx" : "http_4xx", model };
  }
  return { ok: false, error: lastError, model };
}

/** Concatenated non-thinking text parts of the first candidate. */
export function responseText(data: GeminiResponse) {
  return (data.candidates?.[0]?.content?.parts ?? [])
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text)
    .join("");
}
