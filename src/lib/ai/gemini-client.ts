import "server-only";

/*
 * The single server-only Gemini client (REST generateContent), shared by
 * moderation and recommendations. Holds a small key pool:
 *
 *  - Keys: GEMINI_API_KEY, GEMINI_API_KEY2, GEMINI_API_KEY3, GEMINI_API_KEY4, …
 *    (GEMINI_API_KEY_2 style also accepted). Empty values and duplicates are ignored.
 *  - Round-robin: each request starts at the next key, spreading quota across
 *    all keys; each key is tried at most once per request.
 *  - 429 → that key rests for the provider's Retry-After / retryDelay (bounded),
 *    then the next key is tried. 5xx / timeout / network → brief rest, next key
 *    (overload is usually momentary). Invalid/forbidden key → long rest, next key.
 *    Malformed request (other 4xx) → stop: another key won't help.
 *  - Optional GEMINI_FALLBACK_MODEL: if every key fails on the main model with
 *    a temporary error, the fallback model is tried once per available key.
 *  - Rests are in memory, per server instance — not shared across instances.
 *  - Keys never leave the server: not in URLs, logs, errors or return values.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
/** Every configured key gets a chance per request (bounded for very large pools). */
const MAX_ATTEMPTS_PER_REQUEST = 8;
const DEFAULT_RATE_LIMIT_REST_MS = 60_000;
const MIN_REST_MS = 5_000;
const MAX_REST_MS = 10 * 60_000;
/** Overload/timeouts are usually momentary and not key-specific: rest briefly. */
const UNAVAILABLE_REST_MS = 3_000;
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

const MODEL_NAME = /^[a-z0-9.\-]+$/i;

export function geminiModel(env: NodeJS.ProcessEnv = process.env) {
  const model = env.GEMINI_MODEL?.trim();
  return model && MODEL_NAME.test(model) ? model : null;
}

/** Optional second model tried only when the main one is temporarily failing. */
export function geminiFallbackModel(env: NodeJS.ProcessEnv = process.env) {
  const model = env.GEMINI_FALLBACK_MODEL?.trim();
  return model && MODEL_NAME.test(model) && model !== geminiModel(env) ? model : null;
}

// "model|key index" -> time (ms) until which the key rests for that model.
// Per instance only.
const restingUntil = new Map<string, number>();
let nextStart = 0;

/** Clears key rest and rotation state (tests only). */
export function resetGeminiKeyState() {
  restingUntil.clear();
  nextStart = 0;
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

  // Round-robin starting key, so load spreads over every key.
  const start = nextStart % keys.length;
  nextStart = (start + 1) % keys.length;
  const order = keys.map((_, i) => (start + i) % keys.length);

  const fallback = geminiFallbackModel();
  let last: GenerateResult = { ok: false, error: "quota", model };
  for (const candidate of fallback ? [model, fallback] : [model]) {
    const result = await tryModel(candidate, keys, order, request);
    if (result.ok) return result;
    last = result;
    // Only temporary failures are worth another model.
    if (!["quota", "http_5xx", "timeout", "network"].includes(result.error)) return result;
    if (candidate === model && fallback) log(`main model unavailable (${result.error}); trying fallback model`);
  }
  return last;
}

async function tryModel(
  model: string,
  keys: string[],
  order: number[],
  request: GenerateRequest,
): Promise<GenerateResult> {
  const now = Date.now();
  const available = order
    .filter((index) => (restingUntil.get(`${model}|${index}`) ?? 0) <= now)
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
    const rest = (ms: number) => restingUntil.set(`${model}|${index}`, Date.now() + ms);
    const label = `key #${index + 1}`;
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
      lastError = isTimeout ? "timeout" : "network";
      rest(UNAVAILABLE_REST_MS);
      log(`${label} ${lastError}; trying another key`);
      continue;
    }

    if (response.ok) {
      try {
        return { ok: true, data: (await response.json()) as GeminiResponse, model, keyIndex: index };
      } catch {
        lastError = "invalid_response";
        continue;
      }
    }

    const errorBody: unknown = await response.json().catch(() => null);
    if (response.status === 429) {
      const ms = clamp(retryDelayMs(response, errorBody));
      rest(ms);
      log(`${label} rate-limited; resting ${Math.round(ms / 1000)}s`);
      lastError = "quota";
      continue;
    }
    if ([500, 502, 503, 504].includes(response.status)) {
      rest(UNAVAILABLE_REST_MS);
      log(`${label} got HTTP ${response.status}; trying another key`);
      lastError = "http_5xx";
      continue;
    }
    if (isKeySpecificFailure(response.status, errorBody)) {
      rest(INVALID_KEY_REST_MS);
      log(`${label} rejected (HTTP ${response.status}); check this key`);
      lastError = "auth";
      continue;
    }
    // Malformed request or other client error: another key won't help.
    log(`request rejected (HTTP ${response.status}); not retrying`);
    return { ok: false, error: "http_4xx", model };
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
