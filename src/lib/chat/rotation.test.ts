import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { story } from "@/test/fixtures";

/*
 * Integration: the chat uses the SHARED Gemini client and key pool (not mocked
 * here) — a rate-limited primary key falls back to the next key, bounded.
 */

vi.mock("@/lib/data", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/data")>()),
  getDestinationBySlug: async () => ({ id: "d1", slug: "testville", name: "Testville", isDemo: false }),
  listStoriesForDestination: async () => [story({ id: "s1", destinationId: "d1", title: "Late taxi" })],
}));

const { answerDestinationQuestion, resetChatState } = await import("@/lib/chat/service");
const { resetGeminiKeyState } = await import("@/lib/ai/gemini-client");

const fetchMock = vi.fn();
const ok = () =>
  new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ answer: "One traveller's taxi was late.", sources: ["S1"], sufficient_evidence: true }) }] } }],
    }),
  );

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GEMINI_MODEL", "gemini-test");
  vi.stubEnv("GEMINI_API_KEY", "primary-not-real");
  vi.stubEnv("GEMINI_API_KEY2", "secondary-not-real");
  fetchMock.mockReset();
  resetGeminiKeyState();
  resetChatState();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const ask = (question: string) => answerDestinationQuestion({ slug: "testville", question, history: [] });

it("falls back to the second key when the primary is rate-limited", async () => {
  fetchMock.mockResolvedValueOnce(new Response("{}", { status: 429 })).mockResolvedValue(ok());
  const result = await ask("Any transport problems?");
  expect(result).toMatchObject({ status: "answer" });
  expect(fetchMock.mock.calls.map(([, init]) => init.headers["x-goog-api-key"])).toEqual([
    "primary-not-real",
    "secondary-not-real",
  ]);
  expect(JSON.stringify(result)).not.toMatch(/not-real/);
});

it("fails safely, without looping, when every key is rate-limited", async () => {
  fetchMock.mockImplementation(async () => new Response("{}", { status: 429 }));
  expect(await ask("Any transport problems?")).toEqual({ status: "unavailable", reason: "busy" });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  // Both keys resting: the next question makes no network call.
  expect(await ask("What about cash?")).toEqual({ status: "unavailable", reason: "busy" });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
