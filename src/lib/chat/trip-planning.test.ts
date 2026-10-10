import { describe, expect, it } from "vitest";
import { isTripPlanningRequest, PLANNING_REFERRAL, withPlanningNotes } from "@/lib/chat/trip-planning";

describe("trip-planning questions", () => {
  it("recognises broad planning requests", () => {
    for (const q of [
      "I want to go to Dubai, give me full guidelines",
      "Can you plan my trip?",
      "What's the itinerary for 5 days?",
      "Do I need a visa?",
      "how do I get there",
    ]) {
      expect(isTripPlanningRequest(q), q).toBe(true);
    }
  });

  it("leaves specific story questions alone", () => {
    expect(isTripPlanningRequest("What mistakes should I avoid here?")).toBe(false);
    expect(withPlanningNotes("Any problems with taxis?", "Dubai", "Answer.")).toBe("Answer.");
  });

  it("states the stories-only scope first and refers to The Visa Guy last, with fixed wording", () => {
    const text = withPlanningNotes("I want to go to Dubai, give me full guidelines", "Dubai", "One story says the heat is intense.");
    expect(text.startsWith("I can only share what travellers have posted on RegretMap about Dubai")).toBe(true);
    expect(text.endsWith(PLANNING_REFERRAL)).toBe(true);
    expect(PLANNING_REFERRAL).toContain("The Visa Guy");
    // No invented contact details.
    expect(PLANNING_REFERRAL).not.toMatch(/https?:|www\.|@|\+?\d{6,}/);
  });
});
