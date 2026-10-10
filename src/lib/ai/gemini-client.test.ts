import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateJson, geminiKeys, resetGeminiKeyState } from "@/lib/ai/gemini-client";

const KEYS = ["key-one-not-real", "key-two-not-real", "key-three-not-real"];
const request = {
  systemInstruction: "sys",
  userText: "<story>{}</story>",
  responseJsonSchema: { type: "object" },
  maxOutputTokens: 100,
};
const ok = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }));
const status = (code: number, body: unknown = {}, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status: code, headers });

const fetchMock = vi.fn();
const usedKeys = () => fetchMock.mock.calls.map(([, init]) => init.headers["x-goog-api-key"]);
let logs: string[] = [];

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GEMINI_MODEL", "gemini-test-model");
  vi.stubEnv("GEMINI_API_KEY", KEYS[0]);
  vi.stubEnv("GEMINI_API_KEY2", KEYS[1]);
  vi.stubEnv("GEMINI_API_KEY3", KEYS[2]);
  fetchMock.mockReset();
  resetGeminiKeyState();
  logs = [];
  vi.spyOn(console, "error").mockImplementation((...args) => void logs.push(args.join(" ")));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  // Secrets must never reach logs.
  for (const key of KEYS) expect(logs.join("\n")).not.toContain(key);
});

describe("geminiKeys", () => {
  it("reads the primary key then numbered keys in order, ignoring empty and duplicate values", () => {
    expect(
      geminiKeys({
        GEMINI_API_KEY: " a ",
        GEMINI_API_KEY3: "c",
        GEMINI_API_KEY_2: "b",
        GEMINI_API_KEY4: "",
        GEMINI_API_KEY5: "a",
        GEMINI_MODEL: "m",
      } as unknown as NodeJS.ProcessEnv),
    ).toEqual(["a", "b", "c"]);
  });

  it("returns no keys when none are configured", () => {
    expect(geminiKeys({} as unknown as NodeJS.ProcessEnv)).toEqual([]);
  });
});

describe("generateJson key rotation", () => {
  it("uses the primary key for a normal request, in a header (never the URL)", async () => {
    fetchMock.mockResolvedValue(ok());
    const result = await generateJson(request);
    expect(result).toMatchObject({ ok: true, keyIndex: 0, model: "gemini-test-model" });
    expect(usedKeys()).toEqual([KEYS[0]]);
    expect(String(fetchMock.mock.calls[0][0])).not.toContain(KEYS[0]);
    expect(JSON.stringify(result)).not.toContain(KEYS[0]);
  });

  it("falls back to the next key on 429 and rests the limited key", async () => {
    fetchMock.mockResolvedValueOnce(status(429)).mockResolvedValue(ok());
    expect(await generateJson(request)).toMatchObject({ ok: true, keyIndex: 1 });
    expect(usedKeys()).toEqual([KEYS[0], KEYS[1]]);

    // Next request skips the resting primary key.
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(ok());
    await generateJson(request);
    expect(usedKeys()).toEqual([KEYS[1]]);
  });

  it("respects the provider's retry delay before using a rate-limited key again", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-11T00:00:00Z"));
    fetchMock
      .mockResolvedValueOnce(status(429, { error: { details: [{ retryDelay: "30s" }] } }))
      .mockResolvedValue(ok());
    await generateJson(request);

    // Make every key fail so each request shows exactly which keys are usable.
    vi.setSystemTime(new Date("2026-10-11T00:00:20Z"));
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(status(500));
    await generateJson(request);
    expect(usedKeys()).not.toContain(KEYS[0]); // still resting after 20s

    vi.setSystemTime(new Date("2026-10-11T00:00:31Z"));
    fetchMock.mockClear();
    await generateJson(request);
    expect(usedKeys()).toContain(KEYS[0]); // back after 30s
  });

  it("uses the Retry-After header when present", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-11T00:00:00Z"));
    fetchMock.mockResolvedValueOnce(status(429, {}, { "retry-after": "120" })).mockResolvedValue(ok());
    await generateJson(request);
    vi.setSystemTime(new Date("2026-10-11T00:01:30Z"));
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(status(500));
    await generateJson(request);
    expect(usedKeys()).not.toContain(KEYS[0]);
  });

  it("falls back on a temporary 5xx error", async () => {
    fetchMock.mockResolvedValueOnce(status(503)).mockResolvedValue(ok());
    expect(await generateJson(request)).toMatchObject({ ok: true, keyIndex: 1 });
  });

  it("stops immediately on a malformed request instead of burning every key", async () => {
    fetchMock.mockResolvedValue(status(400, { error: { message: "Invalid JSON payload" } }));
    expect(await generateJson(request)).toEqual({ ok: false, error: "http_4xx", model: "gemini-test-model" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("tries another key when a key is invalid", async () => {
    fetchMock
      .mockResolvedValueOnce(status(400, { error: { message: "API key not valid.", details: [{ reason: "API_KEY_INVALID" }] } }))
      .mockResolvedValue(ok());
    expect(await generateJson(request)).toMatchObject({ ok: true, keyIndex: 1 });
  });

  it("never tries the same key twice and fails safely when all keys are rate-limited", async () => {
    fetchMock.mockImplementation(async () => status(429));
    const result = await generateJson(request);
    expect(result).toEqual({ ok: false, error: "quota", model: "gemini-test-model" });
    expect(usedKeys()).toEqual(KEYS);
    expect(JSON.stringify(result)).not.toMatch(/not-real/);

    // All keys resting: no network call at all.
    fetchMock.mockClear();
    expect(await generateJson(request)).toMatchObject({ ok: false, error: "quota" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("tries every configured key, including a 4th, before giving up", async () => {
    vi.stubEnv("GEMINI_API_KEY4", "key-four-not-real");
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) =>
      (init.headers as Record<string, string>)["x-goog-api-key"] === "key-four-not-real" ? ok() : status(503),
    );
    expect(await generateJson(request)).toMatchObject({ ok: true, keyIndex: 3 });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("bounds attempts per request even with a very large key pool", async () => {
    for (let i = 4; i <= 14; i++) vi.stubEnv(`GEMINI_API_KEY${i}`, `extra-${i}-not-real`);
    fetchMock.mockImplementation(async () => status(503));
    await generateJson(request);
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it("moves to another key after a timeout or network error", async () => {
    fetchMock.mockRejectedValueOnce(new DOMException("t", "TimeoutError")).mockResolvedValue(ok());
    expect(await generateJson(request)).toMatchObject({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockClear();
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await generateJson(request)).toMatchObject({ ok: false, error: "network" });
  });

  it("rotates the starting key round-robin across requests", async () => {
    fetchMock.mockImplementation(async () => ok());
    for (let i = 0; i < 4; i++) await generateJson(request);
    expect(usedKeys()).toEqual([KEYS[0], KEYS[1], KEYS[2], KEYS[0]]);
  });

  it("tries the optional fallback model when the main model is overloaded on every key", async () => {
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "gemini-fallback-model");
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("gemini-fallback-model") ? ok() : status(503),
    );
    expect(await generateJson(request)).toMatchObject({ ok: true, model: "gemini-fallback-model" });
  });

  it("does not use the fallback model for a malformed request", async () => {
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "gemini-fallback-model");
    fetchMock.mockResolvedValue(status(400, { error: { message: "Invalid JSON payload" } }));
    expect(await generateJson(request)).toMatchObject({ ok: false, error: "http_4xx" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports not_configured without calling the API", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY2", "");
    vi.stubEnv("GEMINI_API_KEY3", "");
    expect(await generateJson(request)).toEqual({ ok: false, error: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
