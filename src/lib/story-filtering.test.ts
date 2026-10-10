import { describe, expect, it } from "vitest";
import { defaultStoryFilters, filterAndSortStories } from "@/lib/story-filtering";
import { story } from "@/test/fixtures";

const stories = [
  story({ id: "a", category: "transport", travelMonth: 1, publishedAt: "2026-03-01" }),
  story({ id: "b", category: "packing", travelMonth: 7, publishedAt: "2026-01-01" }),
  story({ id: "c", category: "transport", travelMonth: 6, publishedAt: "2026-02-01" }),
  story({ id: "d", category: "transport", publishedAt: "2026-04-01" }),
];

const ids = (list: { id: string }[]) => list.map((s) => s.id);

describe("filterAndSortStories", () => {
  it("returns everything newest first by default", () => {
    expect(ids(filterAndSortStories(stories, defaultStoryFilters))).toEqual(["d", "a", "c", "b"]);
  });

  it("filters by category", () => {
    const result = filterAndSortStories(stories, { ...defaultStoryFilters, category: "packing" });
    expect(ids(result)).toEqual(["b"]);
  });

  it("filters by season and excludes stories without a travel month", () => {
    const result = filterAndSortStories(stories, { ...defaultStoryFilters, season: "jun_aug" });
    expect(ids(result)).toEqual(["c", "b"]);
  });

  it("combines filters and can return no results", () => {
    const result = filterAndSortStories(stories, {
      ...defaultStoryFilters,
      category: "packing",
      season: "dec_feb",
    });
    expect(result).toEqual([]);
  });

  it("sorts oldest first and by travel month (unknown months last)", () => {
    expect(ids(filterAndSortStories(stories, { ...defaultStoryFilters, sort: "oldest" }))).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
    expect(
      ids(filterAndSortStories(stories, { ...defaultStoryFilters, sort: "travel_month" })),
    ).toEqual(["a", "c", "b", "d"]);
  });

  it("does not mutate the input", () => {
    const before = ids(stories);
    filterAndSortStories(stories, { ...defaultStoryFilters, sort: "oldest" });
    expect(ids(stories)).toEqual(before);
  });
});
