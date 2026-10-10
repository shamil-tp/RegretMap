import {
  storyCategories,
  type Coordinates,
  type Destination,
  type StoryCategory,
  type StoryWithDestination,
} from "@/lib/stories";

/*
 * Database row shapes (only the columns we select) and pure mappers to the
 * app's domain types. Kept separate from data access so they're easy to test.
 */

export const DESTINATION_COLUMNS =
  "id, slug, name, region, country, description, latitude, longitude, is_demo";

export const STORY_COLUMNS =
  "id, destination_id, title, body, category, place_name, latitude, longitude, " +
  "travel_month, travel_year, challenge, lesson, advice, published_at, is_demo, source, " +
  "destination:destinations!inner(slug, name, region, country)";

export type DestinationRow = {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  country: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  is_demo: boolean;
};

export type StoryRow = {
  id: string;
  destination_id: string;
  title: string;
  body: string;
  category: string;
  place_name: string | null;
  latitude: number | null;
  longitude: number | null;
  travel_month: number | null;
  travel_year: number | null;
  challenge: string | null;
  lesson: string | null;
  advice: string | null;
  published_at: string | null;
  is_demo: boolean;
  source: string;
  destination: {
    slug: string;
    name: string;
    region: string | null;
    country: string | null;
  };
};

const optional = <T>(value: T | null): T | undefined => value ?? undefined;

function coordinates(latitude: number | null, longitude: number | null): Coordinates | undefined {
  return latitude != null && longitude != null ? { latitude, longitude } : undefined;
}

function isCategory(value: string): value is StoryCategory {
  return value in storyCategories;
}

export function mapDestination(row: DestinationRow): Destination {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    region: optional(row.region),
    country: optional(row.country),
    description: optional(row.description),
    coordinates: coordinates(row.latitude, row.longitude),
    isDemo: row.is_demo,
  };
}

export function mapStory(row: StoryRow): StoryWithDestination {
  return {
    id: row.id,
    destinationId: row.destination_id,
    title: row.title,
    body: row.body,
    // The database constrains categories; fall back defensively anyway.
    category: isCategory(row.category) ? row.category : "other",
    place: optional(row.place_name),
    coordinates: coordinates(row.latitude, row.longitude),
    travelMonth: optional(row.travel_month),
    travelYear: optional(row.travel_year),
    challenge: optional(row.challenge),
    lesson: optional(row.lesson),
    advice: optional(row.advice),
    // Published rows always have published_at (DB constraint).
    publishedAt: row.published_at ?? new Date(0).toISOString(),
    isDemo: row.is_demo,
    // Anything unexpected is treated as a community story (the DB constrains it).
    source: row.source === "editorial" ? "editorial" : "community",
    destination: {
      slug: row.destination.slug,
      name: row.destination.name,
      region: optional(row.destination.region),
      country: optional(row.destination.country),
    },
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}
