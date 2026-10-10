export interface PlaceSuggestion {
  id: string;
  name: string;
  formatted: string;
  city?: string;
  state?: string;
  country?: string;
  lat: number;
  lon: number;
  resultType?: string;
  category?: string;
}

export interface AutocompleteApiResponse {
  suggestions: PlaceSuggestion[];
  missingKey?: boolean;
  error?: string;
}

/**
 * Client helper to fetch autocomplete suggestions from our Next.js API route.
 */
export async function fetchPlaceSuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<AutocompleteApiResponse> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { suggestions: [] };
  }

  try {
    const res = await fetch(
      `/api/places/autocomplete?text=${encodeURIComponent(trimmed)}`,
      {
        headers: { Accept: "application/json" },
        signal,
      },
    );

    if (!res.ok) {
      return {
        suggestions: [],
        error: `Search request failed with status ${res.status}`,
      };
    }

    const data = (await res.json()) as AutocompleteApiResponse;
    return data;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { suggestions: [] };
    }
    return {
      suggestions: [],
      error: "Unable to reach search service",
    };
  }
}
