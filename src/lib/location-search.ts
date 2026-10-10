import type { PlaceSuggestion } from "@/lib/place-search";
import type { Coordinates } from "@/lib/stories";

/*
 * Shared location-search helpers for the home search and the story form:
 * RegretMap destinations are matched locally; real-world places come from the
 * place-search route (Photon) and are de-duplicated against destinations.
 */

export type SearchableDestination = {
  id?: string;
  slug: string;
  name: string;
  region?: string;
  country?: string;
  storyCount?: number;
  isDemo?: boolean;
  coordinates?: Coordinates;
};

export function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function matchDestinations<T extends SearchableDestination>(destinations: T[], query: string) {
  const q = normalize(query);
  if (!q) return [];
  return destinations
    .filter((d) =>
      [d.name, d.region, d.country].some((field) => field && normalize(field).includes(q)),
    )
    .sort(
      (a, b) =>
        Number(normalize(b.name).startsWith(q)) - Number(normalize(a.name).startsWith(q)),
    );
}

/** True when an external place is (roughly) the same as a destination we have. */
export function isSamePlace(place: PlaceSuggestion, destination: SearchableDestination) {
  if (normalize(place.name) !== normalize(destination.name)) return false;
  // Without coordinates, a matching name is the best signal available.
  if (!destination.coordinates) return true;
  return (
    Math.abs(place.latitude - destination.coordinates.latitude) < 0.5 &&
    Math.abs(place.longitude - destination.coordinates.longitude) < 0.5
  );
}
