import { describe, expect, it } from "vitest";
import { normalizeText, parseSubmission } from "@/lib/story-submission";
import { validInput } from "@/test/submission-fixtures";

function errorsFor(overrides: Record<string, string | undefined>) {
  const result = parseSubmission(validInput(overrides));
  return result.success ? {} : result.fieldErrors;
}

describe("parseSubmission", () => {
  it("accepts a valid submission and normalises text", () => {
    const result = parseSubmission(
      validInput({ title: "  The bus   left early  ", place: "  Bus stand ", travelMonth: "4" }),
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.title).toBe("The bus left early");
    expect(result.data.place).toBe("Bus stand");
    expect(result.data.travelMonth).toBe(4);
    expect(result.data.latitude).toBeUndefined();
  });

  it.each(["title", "body", "challenge", "lesson", "advice", "category", "destinationId"])(
    "requires %s",
    (field) => {
      expect(errorsFor({ [field]: undefined })[field as "title"]).toBeTruthy();
    },
  );

  it("rejects whitespace-only content", () => {
    expect(errorsFor({ title: "      " }).title).toMatch(/required/);
    expect(errorsFor({ body: "\n\n   \n" }).body).toMatch(/required/);
  });

  it("enforces length limits", () => {
    expect(errorsFor({ title: "abc" }).title).toMatch(/at least/);
    expect(errorsFor({ body: "x".repeat(3001) }).body).toMatch(/at most/);
    expect(errorsFor({ place: "x".repeat(141) }).place).toBeTruthy();
  });

  it("rejects an invalid destination id and unsupported category", () => {
    expect(errorsFor({ destinationId: "manali" }).destinationId).toBeTruthy();
    expect(errorsFor({ category: "hotel_review" }).category).toBeTruthy();
  });

  it("validates travel month and year", () => {
    expect(errorsFor({ travelMonth: "13" }).travelMonth).toBeTruthy();
    expect(errorsFor({ travelMonth: "abc" }).travelMonth).toBeTruthy();
    expect(errorsFor({ travelYear: "1800" }).travelYear).toBeTruthy();
    expect(errorsFor({ travelYear: String(new Date().getFullYear() + 1) }).travelYear).toBeTruthy();
  });

  it("validates coordinates and requires both or neither", () => {
    expect(errorsFor({ latitude: "95", longitude: "10" }).latitude).toBeTruthy();
    expect(errorsFor({ latitude: "10", longitude: "190" }).longitude).toBeTruthy();
    expect(errorsFor({ latitude: "10", longitude: "" }).latitude).toBeTruthy();
    expect(parseSubmission(validInput({ latitude: "32.2", longitude: "77.1" })).success).toBe(true);
  });

  it("requires consent, a valid submission key and an empty honeypot", () => {
    expect(errorsFor({ consent: undefined }).consent).toBeTruthy();
    expect(errorsFor({ submissionKey: "1" }).submissionKey).toBeTruthy();
    expect(errorsFor({ website: "http://spam.example" }).website).toBeTruthy();
  });

  it("rejects unexpected fields such as a forged status", () => {
    const result = parseSubmission({ ...validInput(), status: "published" });
    expect(result.success).toBe(false);
  });
});

describe("normalizeText", () => {
  it("trims, collapses spaces and limits blank lines", () => {
    expect(normalizeText("  a  b \r\n\r\n\r\n\r\n c  ")).toBe("a b\n\nc");
  });
});
