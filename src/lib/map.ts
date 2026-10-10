import {
  formatLocation,
  type Coordinates,
  type StoryCategory,
  type StorySummary,
} from "@/lib/stories";

/**
 * Standard OpenStreetMap tile service. No API key is required, but usage must
 * follow https://operations.osmfoundation.org/policies/tiles/ — it is not
 * unlimited production hosting.
 */
export const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Initial view when a map is not fitted to its points (the whole world). */
export const DEFAULT_CENTER: [number, number] = [20, 15];
export const DEFAULT_ZOOM = 2;
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
  /** Link to the full story, shown in the popup. */
  href?: string;
};

export type LatLng = Coordinates;

/** Converts stories with coordinates into the minimal points the map needs. */
export function storiesToMapPoints(stories: StorySummary[]): MapPoint[] {
  return stories.flatMap((story) =>
    story.coordinates
      ? [
          {
            id: story.id,
            latitude: story.coordinates.latitude,
            longitude: story.coordinates.longitude,
            title: story.title,
            place: story.place
              ? `${story.place}, ${story.destination.name}`
              : [story.destination.name, formatLocation(story.destination)].filter(Boolean).join(", "),
            category: story.category,
            isDemo: story.isDemo,
            href: `/stories/${story.id}`,
          },
        ]
      : [],
  );
}
