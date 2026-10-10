import { describe, expect, it } from "vitest";
import {
  boundHistory,
  CHAT_LIMITS,
  rankStoriesForQuestion,
  validateChatAnswer,
} from "@/lib/chat/evidence";
import { buildEvidencePayload } from "@/lib/recommendations/evidence";
import { story } from "@/test/fixtures";

describe("rankStoriesForQuestion", () => {
  const stories = [
    story({ id: "packing", category: "packing", title: "Wrong shoes", body: "Wore sneakers in the snow." }),
    story({ id: "costs", category: "costs", title: "Cash ran out", body: "Only cash was accepted at small shops." }),
    story({ id: "rain", category: "weather", title: "Monsoon mist", body: "It rained every day of the trip." }),
  ];

  it("puts category and word matches first", () => {
    expect(rankStoriesForQuestion(stories, "What budget surprises with cash?")[0].id).toBe("costs");
    expect(rankStoriesForQuestion(stories, "Planning a trip in the rainy season")[0].id).toBe("rain");
  });

  it("keeps newest-first order when nothing matches, and respects the limit", () => {
    expect(rankStoriesForQuestion(stories, "hello").map((s) => s.id)).toEqual(["packing", "costs", "rain"]);
    const many = Array.from({ length: 20 }, (_, i) => story({ id: `s${i}` }));
    expect(rankStoriesForQuestion(many, "anything")).toHaveLength(CHAT_LIMITS.maxStories);
  });
});

describe("validateChatAnswer", () => {
  const stories = [story({ id: "a", destinationId: "d1", title: "Late taxi" }), story({ id: "b", destinationId: "d1", title: "Cash only" })];
  const { refs } = buildEvidencePayload("Testville", stories);
  const answer = (overrides: Record<string, unknown> = {}) =>
    JSON.stringify({ answer: "One traveller found the taxi was late.", sources: ["S1"], sufficient_evidence: true, ...overrides });

  it("maps refs to real eligible stories", () => {
    expect(validateChatAnswer(answer({ sources: ["S1", "S2", "S1"] }), refs, "d1")).toEqual({
      answer: "One traveller found the taxi was late.",
      sources: [
        { id: "a", title: "Late taxi" },
        { id: "b", title: "Cash only" },
      ],
      sufficientEvidence: true,
    });
  });

  it("rejects fabricated refs and stories from another destination", () => {
    expect(validateChatAnswer(answer({ sources: ["S5"] }), refs, "d1")).toBeNull();
    expect(validateChatAnswer(answer(), refs, "d2")).toBeNull();
  });

  it("rejects links, malformed JSON and unexpected fields", () => {
    expect(validateChatAnswer(answer({ answer: "Book at www.deals.example" }), refs, "d1")).toBeNull();
    expect(validateChatAnswer("nope", refs, "d1")).toBeNull();
    expect(validateChatAnswer(answer({ url: "https://x" }), refs, "d1")).toBeNull();
    expect(validateChatAnswer(answer({ answer: "x".repeat(CHAT_LIMITS.answerMax + 1) }), refs, "d1")).toBeNull();
  });

  it("never claims sufficient evidence without citing a story", () => {
    const result = validateChatAnswer(answer({ sources: [], sufficient_evidence: true }), refs, "d1");
    expect(result).toMatchObject({ sources: [], sufficientEvidence: false });
  });
});

describe("boundHistory", () => {
  it("keeps only the last few turns and clips long ones", () => {
    const history = Array.from({ length: 10 }, (_, i) => ({ role: "user" as const, text: `${i}`.padEnd(2000, "x") }));
    const bounded = boundHistory(history);
    expect(bounded).toHaveLength(CHAT_LIMITS.historyTurns);
    expect(bounded[0].text.startsWith("6")).toBe(true);
    expect(bounded.every((turn) => turn.text.length <= CHAT_LIMITS.historyChars)).toBe(true);
  });
});
