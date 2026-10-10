import { NextResponse } from "next/server";
import type { PlaceSuggestion } from "@/lib/geoapify";

interface GeoapifyRawResult {
  place_id?: string;
  name?: string;
  formatted?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lon?: number;
  result_type?: string;
  category?: string;
  address_line1?: string;
  address_line2?: string;
}

interface GeoapifyRawFeature {
  properties?: GeoapifyRawResult;
  geometry?: {
    coordinates?: [number, number];
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text") || searchParams.get("q") || "";

  if (!text || text.trim().length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const apiKey =
    process.env.GEOAPIFY_API_KEY || process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        suggestions: [],
        missingKey: true,
        error: "GEOAPIFY_API_KEY is not configured in .env.local",
      },
      { status: 200 },
    );
  }

  try {
    const geoapifyUrl = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
    geoapifyUrl.searchParams.set("text", text.trim());
    geoapifyUrl.searchParams.set("limit", "7");
    geoapifyUrl.searchParams.set("format", "json");
    geoapifyUrl.searchParams.set("apiKey", apiKey);

    const res = await fetch(geoapifyUrl.toString(), {
      headers: { Accept: "application/json" },
      // Cache identical queries for 1 hour to respect rate limits
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      return NextResponse.json(
        {
          suggestions: [],
          error: `Geoapify responded with ${res.status}: ${errorText || res.statusText}`,
        },
        { status: 200 },
      );
    }

    const data = await res.json();
    const rawList: GeoapifyRawResult[] = Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data?.features)
        ? data.features.map((f: GeoapifyRawFeature) => ({
            ...f.properties,
            lon: f.geometry?.coordinates?.[0] ?? f.properties?.lon,
            lat: f.geometry?.coordinates?.[1] ?? f.properties?.lat,
          }))
        : [];

    const suggestions: PlaceSuggestion[] = rawList
      .filter((item) => typeof item.lat === "number" && typeof item.lon === "number")
      .map((item, index) => {
        const placeName =
          item.name ||
          item.city ||
          item.address_line1 ||
          item.formatted?.split(",")[0] ||
          "Unknown place";

        return {
          id: item.place_id || `${item.lat},${item.lon}-${index}`,
          name: placeName,
          formatted:
            item.formatted ||
            [placeName, item.state, item.country].filter(Boolean).join(", "),
          city: item.city,
          state: item.state,
          country: item.country,
          lat: item.lat as number,
          lon: item.lon as number,
          resultType: item.result_type,
          category: item.category,
        };
      });

    return NextResponse.json({ suggestions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch suggestions";
    return NextResponse.json(
      { suggestions: [], error: message },
      { status: 200 },
    );
  }
}
