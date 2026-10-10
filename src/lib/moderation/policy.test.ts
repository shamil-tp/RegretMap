import { describe, expect, it } from "vitest";
import {
  localSignals,
  parseModerationResult,
  queueLabelFor,
  type ModerationResult,
} from "@/lib/moderation/policy";

const valid = {
  decision: "allow_review",
  categories: [],
  reason_codes: ["ordinary_story"],
  summary: "Ordinary travel experience.",
  confidence: 0.9,
};

describe("parseModerationResult", () => {
  it("accepts a valid result", () => {
    expect(parseModerationResult(JSON.stringify(valid))).toEqual(valid);
  });

  it("rejects invalid JSON and empty output", () => {
    expect(parseModerationResult("{not json")).toBeNull();
    expect(parseModerationResult("")).toBeNull();
  });

  it("rejects unknown decisions, including attempts to publish", () => {
    expect(parseModerationResult(JSON.stringify({ ...valid, decision: "publish" }))).toBeNull();
    expect(parseModerationResult(JSON.stringify({ ...valid, decision: "approve" }))).toBeNull();
  });

  it("rejects unsupported categories and unexpected fields such as a status", () => {
    expect(parseModerationResult(JSON.stringify({ ...valid, categories: ["danger_zone"] }))).toBeNull();
    expect(parseModerationResult(JSON.stringify({ ...valid, status: "published" }))).toBeNull();
    expect(parseModerationResult(JSON.stringify({ ...valid, sql: "update stories" }))).toBeNull();
  });

  it("rejects oversized or malformed fields", () => {
    expect(parseModerationResult(JSON.stringify({ ...valid, summary: "x".repeat(301) }))).toBeNull();
    expect(parseModerationResult(JSON.stringify({ ...valid, confidence: 1.5 }))).toBeNull();
    expect(parseModerationResult(JSON.stringify({ ...valid, reason_codes: ["DROP TABLE"] }))).toBeNull();
    expect(parseModerationResult("x".repeat(5000))).toBeNull();
  });

  it("removes duplicate categories", () => {
    const parsed = parseModerationResult(
      JSON.stringify({ ...valid, decision: "flag_review", categories: ["spam", "spam"] }),
    );
    expect(parsed?.categories).toEqual(["spam"]);
  });
});

describe("localSignals", () => {
  it("detects contact details and links", () => {
    expect(localSignals("Call me on +91 98765 43210")).toContain("personal_info");
    expect(localSignals("Email guide@example.com for tours")).toEqual(["personal_info"]);
    expect(localSignals("Book at https://cheap-tours.example")).toContain("suspicious_link");
    expect(localSignals("visit www.best-deal.shop now")).toContain("suspicious_link");
  });

  it("does not flag ordinary travel text, prices, years or strong complaints", () => {
    expect(
      localSignals(
        "In May 2025 the driver charged us 15000 rupees, which was a total scam and the worst day of the trip.",
      ),
    ).toEqual([]);
  });
});

describe("queueLabelFor (server policy — never publishes)", () => {
  const result = (overrides: Partial<ModerationResult>): ModerationResult => ({
    decision: "allow_review",
    categories: [],
    reason_codes: [],
    summary: "Ordinary travel experience.",
    confidence: 0.9,
    ...overrides,
  });

  it("labels a confident allow as clear", () => {
    expect(queueLabelFor(result({}), [])).toBe("clear");
  });

  it("does not penalise a negative story the model allowed", () => {
    // Negativity is not a moderation category; only the listed concerns are.
    expect(queueLabelFor(result({ summary: "Strongly negative but ordinary experience." }), [])).toBe("clear");
  });

  it("sends flags, categories, low confidence and local signals to human attention", () => {
    expect(queueLabelFor(result({ decision: "flag_review" }), [])).toBe("needs_attention");
    expect(queueLabelFor(result({ categories: ["personal_info"] }), [])).toBe("needs_attention");
    expect(queueLabelFor(result({ confidence: 0.4 }), [])).toBe("needs_attention");
    expect(queueLabelFor(result({ confidence: undefined }), [])).toBe("needs_attention");
    expect(queueLabelFor(result({}), ["suspicious_link"])).toBe("needs_attention");
  });

  it("keeps rejection as a recommendation label only", () => {
    expect(queueLabelFor(result({ decision: "reject_recommended", categories: ["spam"] }), [])).toBe(
      "reject_recommended",
    );
  });

  it("labels failed moderation as unmoderated (or needs attention with signals)", () => {
    expect(queueLabelFor(null, [])).toBe("unmoderated");
    expect(queueLabelFor(null, ["personal_info"])).toBe("needs_attention");
  });
});
