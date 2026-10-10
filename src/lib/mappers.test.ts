import { describe, expect, it } from "vitest";
import { isUuid, mapDestination, mapStory } from "@/lib/mappers";
import { storyRow } from "@/test/fixtures";

describe("mapStory", () => {
  it("maps database columns to the TravelStory shape", () => {
    const story = mapStory(storyRow());
    expect(story).toMatchObject({
      id: "0b6f1c1e-4d1a-4c3e-9a51-6d2f0c8b1a01",
      title: "A test story",
      category: "transport",
      place: "Test pass",
      coordinates: { latitude: 32.1, longitude: 77.1 },
      travelMonth: 5,
      lesson: "Leave earlier.",
      publishedAt: "2026-02-14T00:00:00+00:00",
      isDemo: false,
      destination: { slug: "testville", name: "Testville", region: "Test Region" },
    });
  });

  it("turns nulls into missing optional fields", () => {
    const story = mapStory(
      storyRow({ place_name: null, travel_month: null, challenge: null, advice: null }),
    );
    expect(story.place).toBeUndefined();
    expect(story.travelMonth).toBeUndefined();
    expect(story.challenge).toBeUndefined();
    expect(story.advice).toBeUndefined();
    expect(story.destination.country).toBeUndefined();
  });

  it("omits coordinates unless both latitude and longitude are present", () => {
    expect(mapStory(storyRow({ latitude: null, longitude: null })).coordinates).toBeUndefined();
    expect(mapStory(storyRow({ latitude: 10, longitude: null })).coordinates).toBeUndefined();
  });

  it("falls back to 'other' for an unknown category", () => {
    expect(mapStory(storyRow({ category: "hotels" })).category).toBe("other");
  });
});

describe("mapDestination", () => {
  it("maps optional fields and coordinates", () => {
    const destination = mapDestination({
      id: "d1",
      slug: "testville",
      name: "Testville",
      region: null,
      country: "India",
      description: null,
      latitude: null,
      longitude: null,
      is_demo: true,
    });
    expect(destination).toEqual({
      id: "d1",
      slug: "testville",
      name: "Testville",
      region: undefined,
      country: "India",
      description: undefined,
      coordinates: undefined,
      isDemo: true,
    });
  });
});

describe("isUuid", () => {
  it("accepts UUIDs and rejects other strings", () => {
    expect(isUuid("0b6f1c1e-4d1a-4c3e-9a51-6d2f0c8b1a01")).toBe(true);
    expect(isUuid("demo-manali-arrival")).toBe(false);
    expect(isUuid("1; drop table stories")).toBe(false);
    expect(isUuid("")).toBe(false);
  });

  it("maps story provenance, treating unknown values as community", () => {
    expect(mapStory(storyRow({ source: "editorial" })).source).toBe("editorial");
    expect(mapStory(storyRow({ source: "community" })).source).toBe("community");
    expect(mapStory(storyRow({ source: "something-else" })).source).toBe("community");
  });
});
