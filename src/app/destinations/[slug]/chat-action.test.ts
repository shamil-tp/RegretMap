import { beforeEach, describe, expect, it, vi } from "vitest";

let currentIp = "198.51.100.1";
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": currentIp }) }));

const answerDestinationQuestion = vi.fn();
vi.mock("@/lib/chat/service", () => ({
  answerDestinationQuestion: (input: unknown) => answerDestinationQuestion(input),
}));

const { askDestinationQuestion } = await import("@/app/destinations/[slug]/chat-action");

const answer = {
  status: "answer",
  answer: { answer: "One traveller's taxi was late.", sources: [{ id: "s1", title: "Late taxi" }], sufficientEvidence: true },
  fromDemo: false,
  destinationName: "Manali",
};
let ipCounter = 0;

beforeEach(() => {
  currentIp = `198.51.100.${++ipCounter}`;
  answerDestinationQuestion.mockReset().mockResolvedValue(answer);
  vi.stubEnv("GEMINI_API_KEY", "secret-key-not-real");
});

describe("askDestinationQuestion", () => {
  it("returns only the validated answer and sources", async () => {
    const result = await askDestinationQuestion({ slug: "manali", question: "Any transport problems?" });
    expect(result).toEqual({
      status: "answer",
      answer: "One traveller's taxi was late.",
      sources: [{ id: "s1", title: "Late taxi" }],
      sufficientEvidence: true,
      fromDemo: false,
    });
    expect(JSON.stringify(result)).not.toContain("secret-key-not-real");
  });

  it.each([
    [{ slug: "manali", question: "" }, /enter a question/],
    [{ slug: "manali", question: "    " }, /enter a question/],
    [{ slug: "manali", question: "x".repeat(501) }, /under 500/],
    [{ slug: "Manali!", question: "Hello there" }, /enter a question/],
    [{ slug: "manali", question: "Hi there", evidence: ["fake story"] }, /enter a question/],
    [null, /enter a question/],
  ])("rejects invalid input %#", async (input, message) => {
    const result = await askDestinationQuestion(input);
    expect(result).toMatchObject({ status: "error", retryable: false });
    expect(result.status === "error" && result.message).toMatch(message);
    expect(answerDestinationQuestion).not.toHaveBeenCalled();
  });

  it("maps service results to honest messages", async () => {
    answerDestinationQuestion.mockResolvedValueOnce({ status: "insufficient", destinationName: "Manali" });
    expect(await askDestinationQuestion({ slug: "manali", question: "Hello there" })).toMatchObject({
      status: "insufficient",
      message: expect.stringMatching(/aren.t any stories about Manali/),
    });
    answerDestinationQuestion.mockResolvedValueOnce({ status: "not_found" });
    expect(await askDestinationQuestion({ slug: "atlantis", question: "Hello there" })).toMatchObject({ status: "error", retryable: false });
    answerDestinationQuestion.mockResolvedValueOnce({ status: "unavailable", reason: "busy" });
    expect(await askDestinationQuestion({ slug: "manali", question: "Hello there" })).toMatchObject({ status: "error", retryable: true });
  });

  it("rate-limits one IP", async () => {
    const results = [];
    for (let i = 0; i < 11; i++) results.push(await askDestinationQuestion({ slug: "manali", question: `Question ${i}` }));
    expect(results.slice(0, 10).every((r) => r.status === "answer")).toBe(true);
    expect(results[10]).toMatchObject({ status: "error", retryable: true });
  });

  it("caps total questions even when every request forges a new IP", async () => {
    vi.resetModules();
    const { askDestinationQuestion: fresh } = await import("@/app/destinations/[slug]/chat-action");
    const results = [];
    for (let i = 0; i < 61; i++) {
      currentIp = `10.20.${Math.floor(i / 200)}.${i}`;
      results.push(await fresh({ slug: "manali", question: `Question ${i}` }));
    }
    expect(results.slice(0, 60).every((r) => r.status === "answer")).toBe(true);
    expect(results[60].status).toBe("error");
  });
});
