import { type NextRequest, NextResponse } from "next/server";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import {
  PLACE_QUERY_MAX,
  PLACE_QUERY_MIN,
  type PlaceSearchResponse,
  type PlaceSuggestion,
} from "@/lib/place-search";

/*
 * Place autocomplete proxied to Photon (https://photon.komoot.io), an
 * OpenStreetMap-based geocoder built for search-as-you-type. No API key is
 * needed. The public instance is fair-use only ("extensive usage will be
 * throttled", no availability guarantee), so this route caps input length,
 * rate-limits per IP and caches results. Set PHOTON_API_URL to use a
 * self-hosted instance.
 */

const DEFAULT_PHOTON_URL = "https://photon.komoot.io/api/";
const RESULT_LIMIT = 6;
const TIMEOUT_MS = 4000;

/** Destination-like features only — no hotels, restaurants or addresses. */
const OSM_TAGS = [
  "place",
  "natural",
  "historic",
  "mountain_pass",
  "tourism:attraction",
  "tourism:viewpoint",
  "tourism:museum",
  "boundary:national_park",
  "leisure:nature_reserve",
  "waterway:waterfall",
];

function photonUrl() {
  const configured = process.env.PHOTON_API_URL?.trim();
  return configured?.startsWith("https://") ? configured : DEFAULT_PHOTON_URL;
}

// In-memory rate limit and cache. Per server instance only: good enough for
// development and a single instance; use a shared store if deployed at scale.
const rateLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });
// IP-independent cap: forged X-Forwarded-For values can't multiply the quota.
const globalLimiter = createRateLimiter({ windowMs: 60_000, max: 300 });

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { expires: number; suggestions: PlaceSuggestion[] }>();

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_type?: string;
    osm_id?: number;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
  };
};

function toSuggestion(feature: PhotonFeature): PlaceSuggestion | null {
  const p = feature.properties;
  const [longitude, latitude] = feature.geometry?.coordinates ?? [];
  if (!p?.name || typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }
  const region = p.state ?? p.county ?? p.city;
  return {
    id: `${p.osm_type ?? "x"}${p.osm_id ?? `${latitude},${longitude}`}`,
    name: p.name,
    context: [region !== p.name ? region : undefined, p.country].filter(Boolean).join(", "),
    region: region && region !== p.name ? region : undefined,
    country: p.country,
    // Some features are tagged like mountain_pass=yes; use the key then.
    kind: (p.osm_value && p.osm_value !== "yes" ? p.osm_value : (p.osm_key ?? "place")).replaceAll("_", " "),
    latitude,
    longitude,
  };
}

function json(body: PlaceSearchResponse, status = 200, headers?: HeadersInit) {
  return NextResponse.json(body, { status, headers });
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < PLACE_QUERY_MIN) return json({ suggestions: [] });
  if (q.length > PLACE_QUERY_MAX) {
    return json({ suggestions: [], error: "Search text is too long." }, 400);
  }

  if (rateLimiter.isLimited(clientIp(request.headers)) || globalLimiter.isLimited("all")) {
    return json({ suggestions: [], error: "Too many searches." }, 429, { "Retry-After": "60" });
  }

  const key = q.toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return json({ suggestions: cached.suggestions });
  }

  const url = new URL(photonUrl());
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(RESULT_LIMIT));
  url.searchParams.set("lang", "en");
  for (const tag of OSM_TAGS) url.searchParams.append("osm_tag", tag);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "RegretMap/0.1 (place autocomplete)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Photon responded with ${res.status}`);

    const data = (await res.json()) as { features?: PhotonFeature[] };
    const seen = new Set<string>();
    const suggestions = (data.features ?? [])
      .map(toSuggestion)
      .filter((s): s is PlaceSuggestion => {
        if (!s) return false;
        const dedupeKey = `${s.name}|${s.context}`;
        if (seen.has(dedupeKey)) return false;
        seen.add(dedupeKey);
        return true;
      });

    if (cache.size > 500) cache.clear();
    cache.set(key, { expires: Date.now() + CACHE_TTL_MS, suggestions });
    return json({ suggestions });
  } catch (error) {
    // Log server-side only; never forward provider details to the browser.
    console.error("Place search failed:", error instanceof Error ? error.message : error);
    return json({ suggestions: [], error: "Place search is unavailable right now." }, 503);
  }
}
