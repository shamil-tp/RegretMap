import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth-redirect";
import { nearestWithin } from "@/lib/geo";
import { isSamePlace, matchDestinations } from "@/lib/location-search";

describe("safeNextPath (open-redirect protection)", () => {
  it.each([
    ["/account", "/account"],
    ["/destinations/manali?x=1", "/destinations/manali?x=1"],
    ["https://evil.example", "/account"],
    ["//evil.example", "/account"],
    ["/\\evil.example", "/account"],
    ["/ok\r\nSet-Cookie: x", "/account"],
    [undefined, "/account"],
    [42, "/account"],
  ])("%s → %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});

describe("location helpers", () => {
  const destinations = [
    { slug: "manali", name: "Manali", region: "Himachal Pradesh", country: "India", coordinates: { latitude: 32.24, longitude: 77.19 } },
    { slug: "leh", name: "Leh", region: "Ladakh", country: "India", coordinates: { latitude: 34.15, longitude: 77.58 } },
  ];

  it("matches destinations by name, region or country, name prefixes first", () => {
    expect(matchDestinations(destinations, "lad").map((d) => d.slug)).toEqual(["leh"]);
    expect(matchDestinations(destinations, "ma")[0].slug).toBe("manali");
    expect(matchDestinations(destinations, "  ")).toEqual([]);
  });

  it("finds the nearest destination within a radius", () => {
    expect(nearestWithin(destinations, { latitude: 32.32, longitude: 77.16 }, 50)?.item.slug).toBe("manali");
    expect(nearestWithin(destinations, { latitude: 15.55, longitude: 73.75 }, 50)).toBeNull();
  });

  it("de-duplicates a place that is a known destination", () => {
    const place = { id: "x", name: "Manali", context: "", kind: "town", latitude: 32.25, longitude: 77.18 };
    expect(isSamePlace(place, destinations[0])).toBe(true);
    expect(isSamePlace({ ...place, latitude: 13.1 }, destinations[0])).toBe(false);
  });
});
