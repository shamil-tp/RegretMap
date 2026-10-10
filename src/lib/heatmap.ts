import { MIN_ZOOM, type MapPoint } from "@/lib/map";

/*
 * Story-density heatmap. Heat shows where MORE PUBLISHED STORIES were shared —
 * never danger, quality or risk. Every story counts exactly once with the same
 * weight; there is no severity, sentiment or AI weighting.
 */

/** Each eligible story contributes the same amount. */
export const STORY_WEIGHT = 1;

/** [latitude, longitude, weight] as expected by leaflet.heat. */
export type HeatPoint = [number, number, number];

/** Warm sequential palette shared by the layer and its legend (stop, colour). */
export const HEATMAP_STOPS: readonly [number, string][] = [
  [0.25, "#fde7c8"],
  [0.55, "#f8b07a"],
  [0.8, "#ee7a5d"],
  [1, "#d1383d"],
];

const HEATMAP_GRADIENT = Object.fromEntries(HEATMAP_STOPS);

/** CSS gradient matching the layer, for the legend. Stops stay in order. */
export const HEATMAP_LEGEND_CSS = `linear-gradient(to right, ${HEATMAP_STOPS.map(
  ([stop, color]) => `${color} ${Math.round(stop * 100)}%`,
).join(", ")})`;

/**
 * leaflet.heat options, kept in one place so they're easy to tune:
 * - radius/blur: screen pixels; nearby stories merge into one area.
 * - max: how many overlapping stories reach the strongest colour (a single story
 *   sits mid-scale so it stays visible on the map).
 * - maxZoom: set to the map's minimum zoom so leaflet.heat does NOT fade points
 *   when zoomed out (by default it divides intensity by 2^(maxZoom - zoom)).
 */
export const HEATMAP_OPTIONS = {
  radius: 26,
  blur: 20,
  max: 2,
  minOpacity: 0.3,
  maxZoom: MIN_ZOOM,
  gradient: HEATMAP_GRADIENT,
};

function isValidCoordinate(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Heat input from the same points the map shows (already published-only and
 * filtered). Invalid coordinates are skipped, and each story id counts once.
 */
export function toHeatPoints(points: MapPoint[]): HeatPoint[] {
  const seen = new Set<string>();
  const heat: HeatPoint[] = [];
  for (const point of points) {
    if (seen.has(point.id) || !isValidCoordinate(point.latitude, point.longitude)) continue;
    seen.add(point.id);
    heat.push([point.latitude, point.longitude, STORY_WEIGHT]);
  }
  return heat;
}

export type MapLayers = "pins" | "heat" | "both";

export const mapLayerLabels: Record<MapLayers, string> = {
  pins: "Pins",
  heat: "Heatmap",
  both: "Both",
};

export const showsPins = (layers: MapLayers) => layers !== "heat";
export const showsHeat = (layers: MapLayers) => layers !== "pins";
