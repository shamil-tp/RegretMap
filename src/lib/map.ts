import type { StoryCategory } from "@/lib/stories";

/**
 * Standard OpenStreetMap tile service. No API key is required, but usage must
 * follow https://operations.osmfoundation.org/policies/tiles/ — it is not
 * unlimited production hosting.
 */
export const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Initial view: India, where the current demo stories are located. */
export const DEFAULT_CENTER: [number, number] = [22.5, 79];
export const DEFAULT_ZOOM = 4;
export const MIN_ZOOM = 2;
export const MAX_ZOOM = 18;

/**
 * Returns a configured tile URL template if it looks valid (https and contains
 * {z}, {x} and {y}); otherwise falls back to the OpenStreetMap default.
 */
export function resolveTileUrl(configured: string | undefined) {
  const value = configured?.trim();
  if (!value) return { url: OSM_TILE_URL, isCustom: false, isInvalid: false };

  const isValid =
    value.startsWith("https://") &&
    ["{z}", "{x}", "{y}"].every((token) => value.includes(token));

  return isValid
    ? { url: value, isCustom: true, isInvalid: false }
    : { url: OSM_TILE_URL, isCustom: false, isInvalid: true };
}

export const tileConfig = resolveTileUrl(process.env.NEXT_PUBLIC_MAP_TILE_URL);

/**
 * Minimal data a map point needs. Map components receive only these fields,
 * never full story bodies or private data.
 */
export type MapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  place: string;
  category: StoryCategory;
  isDemo: boolean;
};

export type LatLng = { latitude: number; longitude: number };
