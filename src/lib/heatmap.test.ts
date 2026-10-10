import { describe, expect, it } from "vitest";
import {
  HEATMAP_LEGEND_CSS,
  HEATMAP_OPTIONS,
  showsHeat,
  showsPins,
  STORY_WEIGHT,
  toHeatPoints,
} from "@/lib/heatmap";
import { MIN_ZOOM, storiesToMapPoints, type MapPoint } from "@/lib/map";
import { defaultStoryFilters, filterAndSortStories } from "@/lib/story-filtering";
import { story } from "@/test/fixtures";

const point = (overrides: Partial<MapPoint>): MapPoint => ({
  id: "p",
  latitude: 10,
  longitude: 20,
  title: "t",
  place: "p",
  category: "transport",
  isDemo: false,
  ...overrides,
});

describe("toHeatPoints", () => {
  it("gives every story the same weight (no severity or sentiment weighting)", () => {
    const heat = toHeatPoints([point({ id: "a" }), point({ id: "b", latitude: 11 })]);
    expect(heat).toEqual([
      [10, 20, STORY_WEIGHT],
      [11, 20, STORY_WEIGHT],
    ]);
    expect(STORY_WEIGHT).toBe(1);
  });

  it("skips invalid coordinates instead of guessing", () => {
    const heat = toHeatPoints([
      point({ id: "nan", latitude: Number.NaN }),
      point({ id: "inf", longitude: Number.POSITIVE_INFINITY }),
      point({ id: "lat", latitude: 91 }),
      point({ id: "lng", longitude: -181 }),
      point({ id: "ok" }),
    ]);
    expect(heat).toHaveLength(1);
  });

  it("counts each story once even if it appears twice", () => {
    expect(toHeatPoints([point({ id: "same" }), point({ id: "same" })])).toHaveLength(1);
  });

  it("returns nothing for no stories", () => {
    expect(toHeatPoints([])).toEqual([]);
  });
});

describe("heatmap input pipeline", () => {
  // Stories here are what the data layer returns: published-only (status filter + RLS).
  const stories = [
    story({ id: "m1", destinationId: "manali", category: "transport", travelMonth: 6, coordinates: { latitude: 32.2, longitude: 77.1 } }),
    story({ id: "m2", destinationId: "manali", category: "packing", travelMonth: 1, coordinates: { latitude: 32.3, longitude: 77.2 } }),
    story({ id: "m3", destinationId: "manali", category: "transport" }), // no location
    story({ id: "j1", destinationId: "jaipur", category: "transport", coordinates: { latitude: 26.9, longitude: 75.8 } }),
  ];
  const heatFor = (list: typeof stories) => toHeatPoints(storiesToMapPoints(list));

  it("excludes stories without a location but keeps them countable in the feed", () => {
    expect(heatFor(stories)).toHaveLength(3);
    expect(stories).toHaveLength(4);
  });

  it("follows the active category and season filters", () => {
    const transport = filterAndSortStories(stories, { ...defaultStoryFilters, category: "transport" });
    expect(heatFor(transport)).toHaveLength(2);
    const winter = filterAndSortStories(stories, { ...defaultStoryFilters, season: "dec_feb" });
    expect(heatFor(winter)).toEqual([[32.3, 77.2, 1]]);
  });

  it("only includes a destination's own stories when given its stories", () => {
    const manaliOnly = stories.filter((s) => s.destinationId === "manali");
    const lats = heatFor(manaliOnly).map(([lat]) => lat);
    expect(lats).toEqual([32.2, 32.3]);
  });
});

describe("heatmap configuration", () => {
  it("does not fade points when zoomed out (maxZoom = map minimum zoom)", () => {
    expect(HEATMAP_OPTIONS.maxZoom).toBe(MIN_ZOOM);
  });

  it("draws the legend gradient with stops in ascending order", () => {
    const percents = [...HEATMAP_LEGEND_CSS.matchAll(/(\d+)%/g)].map((m) => Number(m[1]));
    expect(percents).toEqual([...percents].sort((a, b) => a - b));
    expect(percents.at(-1)).toBe(100);
  });

  it("maps layer choices to pins and heat", () => {
    expect([showsPins("pins"), showsHeat("pins")]).toEqual([true, false]);
    expect([showsPins("heat"), showsHeat("heat")]).toEqual([false, true]);
    expect([showsPins("both"), showsHeat("both")]).toEqual([true, true]);
  });
});
