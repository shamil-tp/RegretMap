import { describe, expect, it } from "vitest";
import { OSM_TILE_URL, resolveTileUrl, storiesToMapPoints } from "@/lib/map";
import { story } from "@/test/fixtures";

describe("storiesToMapPoints", () => {
  it("skips stories without coordinates instead of inventing them", () => {
    const points = storiesToMapPoints([
      story({ id: "with", coordinates: { latitude: 10, longitude: 20 } }),
      story({ id: "without" }),
    ]);
    expect(points.map((p) => p.id)).toEqual(["with"]);
  });

  it("links each point to its story and exposes only map fields", () => {
    const [point] = storiesToMapPoints([
      story({
        id: "s1",
        title: "Title",
        place: "Pass",
        body: "Full private-ish body text",
        coordinates: { latitude: 1, longitude: 2 },
      }),
    ]);
    expect(point).toEqual({
      id: "s1",
      latitude: 1,
      longitude: 2,
      title: "Title",
      place: "Pass, Testville",
      category: "transport",
      isDemo: false,
      href: "/stories/s1",
    });
  });
});

describe("resolveTileUrl", () => {
  it("uses OpenStreetMap when unset", () => {
    expect(resolveTileUrl(undefined)).toMatchObject({ url: OSM_TILE_URL, isCustom: false });
    expect(resolveTileUrl("  ")).toMatchObject({ url: OSM_TILE_URL, isInvalid: false });
  });

  it("accepts a valid https template and rejects invalid ones", () => {
    expect(resolveTileUrl("https://tiles.example.com/{z}/{x}/{y}.png")).toMatchObject({
      isCustom: true,
    });
    expect(resolveTileUrl("http://tiles.example.com/{z}/{x}/{y}.png")).toMatchObject({
      url: OSM_TILE_URL,
      isInvalid: true,
    });
    expect(resolveTileUrl("https://tiles.example.com/tile.png")).toMatchObject({
      isInvalid: true,
    });
  });
});
