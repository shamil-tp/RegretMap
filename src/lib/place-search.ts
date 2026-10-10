/** A place suggestion from the external place-search provider (Photon). */
export type PlaceSuggestion = {
  id: string;
  name: string;
  /** e.g. "Himachal Pradesh, India" */
  context: string;
  region?: string;
  country?: string;
  /** OSM feature type, e.g. "town", "beach", "peak". */
  kind: string;
  latitude: number;
  longitude: number;
};

export type PlaceSearchResponse = {
  suggestions: PlaceSuggestion[];
  error?: string;
};

export const PLACE_QUERY_MIN = 2;
export const PLACE_QUERY_MAX = 100;

/** Client helper for our own autocomplete route (never calls Photon directly). */
export async function fetchPlaceSuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceSearchResponse> {
  const q = query.trim();
  if (q.length < PLACE_QUERY_MIN) return { suggestions: [] };

  try {
    const res = await fetch(
      `/api/places/autocomplete?q=${encodeURIComponent(q.slice(0, PLACE_QUERY_MAX))}`,
      { headers: { Accept: "application/json" }, signal },
    );
    const data = (await res.json().catch(() => null)) as PlaceSearchResponse | null;
    if (!res.ok || !data) {
      return {
        suggestions: [],
        error:
          res.status === 429
            ? "Too many searches — please wait a moment."
            : "Place search is unavailable right now.",
      };
    }
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { suggestions: [] };
    }
    return { suggestions: [], error: "Place search is unavailable right now." };
  }
}
