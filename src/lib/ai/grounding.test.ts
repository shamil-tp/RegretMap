import { describe, expect, it } from "vitest";
import { stripRefs, unsupportedNumbers } from "@/lib/ai/grounding";

describe("stripRefs", () => {
  it("removes evidence references written into prose", () => {
    expect(stripRefs("Leave early (S1). Carry cash [S2, S3]. S4 says so.")).toBe("Leave early. Carry cash. says so.");
  });
});

describe("unsupportedNumbers", () => {
  const evidence = ["The drive took 6 hours and cost 2,500 rupees.", "Cusco is at about 3,400 m."];

  it("allows numbers that appear in the evidence (with or without separators)", () => {
    expect(unsupportedNumbers("Plan for 6 hours; budget 2500.", evidence)).toEqual([]);
    expect(unsupportedNumbers("It sits near 3,400 m.", evidence)).toEqual([]);
  });

  it("flags invented specifics", () => {
    expect(unsupportedNumbers("Tickets cost 50 dollars and it's 20°C today.", evidence)).toEqual(["50", "20"]);
  });
});
