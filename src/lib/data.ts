import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import {
  DESTINATION_COLUMNS,
  isUuid,
  mapDestination,
  mapStory,
  STORY_COLUMNS,
  type DestinationRow,
  type StoryRow,
} from "@/lib/mappers";
import type { Destination, StoryWithDestination } from "@/lib/stories";
import { getSupabase } from "@/lib/supabase/server";

/*
 * Data-access layer: the only place the app reads destinations and stories.
 * Queries filter on status = 'published' explicitly, in addition to RLS, and
 * select only the columns the UI needs. Failures throw DataUnavailableError
 * (details are logged on the server, never shown to users).
 */

export class DataUnavailableError extends Error {
  constructor() {
    super("Destination and story data is unavailable right now.");
  }
}

export type DestinationSummary = Destination & { storyCount: number };

/** Upper bounds until pagination arrives in a later phase. */
export const STORY_LIMIT = { all: 100, perDestination: 200 } as const;
const DESTINATION_LIMIT = 500;

function fail(operation: string, error: unknown): never {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  console.error(`[data] ${operation} failed: ${message}`);
  throw new DataUnavailableError();
}

/**
 * Runs a query and returns its rows typed as T. Without generated database
 * types Supabase can't infer row shapes, so T must match the selected columns
 * (see mappers.ts).
 */
async function run<T>(
  operation: string,
  query: () => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<T | null> {
  // Reads always happen at request time, never during (partial) prerendering,
  // where Next.js aborts in-flight fetches and they'd look like DB failures.
  await connection();
  let result: { data: unknown; error: unknown };
  try {
    result = await query();
  } catch (error) {
    fail(operation, error);
  }
  if (result.error) fail(operation, result.error);
  return result.data as T | null;
}

export const listDestinations = cache(async (): Promise<DestinationSummary[]> => {
  const rows = await run<(DestinationRow & { stories: { count: number }[] })[]>(
    "listDestinations",
    () =>
      getSupabase()
        .from("destinations")
        .select(`${DESTINATION_COLUMNS}, stories(count)`)
        .eq("status", "published")
        .eq("stories.status", "published")
        .order("name")
        .limit(DESTINATION_LIMIT),
  );
  return (rows ?? []).map((row) => ({
    ...mapDestination(row),
    storyCount: row.stories?.[0]?.count ?? 0,
  }));
});

export const getDestinationBySlug = cache(async (slug: string): Promise<Destination | null> => {
  const row = await run<DestinationRow>("getDestinationBySlug", () =>
    getSupabase()
      .from("destinations")
      .select(DESTINATION_COLUMNS)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle(),
  );
  return row ? mapDestination(row) : null;
});

export const listStoriesForDestination = cache(
  async (destinationId: string): Promise<StoryWithDestination[]> => {
    const rows = await run<StoryRow[]>("listStoriesForDestination", () =>
      getSupabase()
        .from("stories")
        .select(STORY_COLUMNS)
        .eq("destination_id", destinationId)
        .eq("status", "published")
        .eq("destination.status", "published")
        .order("published_at", { ascending: false })
        .limit(STORY_LIMIT.perDestination),
    );
    return (rows ?? []).map(mapStory);
  },
);

export const listAllStories = cache(async (): Promise<StoryWithDestination[]> => {
  const rows = await run<StoryRow[]>("listAllStories", () =>
    getSupabase()
      .from("stories")
      .select(STORY_COLUMNS)
      .eq("status", "published")
      .eq("destination.status", "published")
      .order("published_at", { ascending: false })
      .limit(STORY_LIMIT.all),
  );
  return (rows ?? []).map(mapStory);
});

export const getStoryById = cache(async (id: string): Promise<StoryWithDestination | null> => {
  if (!isUuid(id)) return null;
  const row = await run<StoryRow>("getStoryById", () =>
    getSupabase()
      .from("stories")
      .select(STORY_COLUMNS)
      .eq("id", id)
      .eq("status", "published")
      .eq("destination.status", "published")
      .maybeSingle(),
  );
  return row ? mapStory(row) : null;
});

/** Published destination by id (used to validate story submissions). */
export const getDestinationById = cache(async (id: string): Promise<Destination | null> => {
  if (!isUuid(id)) return null;
  const row = await run<DestinationRow>("getDestinationById", () =>
    getSupabase()
      .from("destinations")
      .select(DESTINATION_COLUMNS)
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle(),
  );
  return row ? mapDestination(row) : null;
});
