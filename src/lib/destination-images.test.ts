import { describe, expect, it } from "vitest";
import images from "@/data/destination-images.json";

describe("destination photos", () => {
  const entries = Object.entries(images as Record<string, Record<string, unknown>>);

  it("only uses freely licensed Wikimedia Commons files with attribution", () => {
    expect(entries.length).toBeGreaterThan(100);
    for (const [slug, image] of entries) {
      expect(String(image.src), slug).toMatch(/^https:\/\/(upload|thumb)\.wikimedia\.org\/[^?]+$/);
      expect(String(image.licence), slug).toMatch(/^(cc0|public domain|pd|cc by(-sa)? ?\d|cc-by(-sa)?-\d)/i);
      expect(String(image.author).length, slug).toBeGreaterThan(0);
      expect(String(image.sourceUrl), slug).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
      expect(Number(image.width), slug).toBeGreaterThan(0);
    }
  });

  it("keeps hand-reviewed wrong matches out", () => {
    for (const slug of ["udaipur-tripura", "serengeti", "sossusvlei", "agatti", "ekta-nagar", "santorini"]) {
      expect(images).not.toHaveProperty(slug);
    }
  });
});
