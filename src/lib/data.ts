import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import {
  DESTINATION_COLUMNS,
  isUuid,
  mapDestination,
  mapStory,
  mapStorySummary,
  STORY_COLUMNS,
  STORY_SUMMARY_COLUMNS,
  withoutSource,
  type StorySummaryRow,
  type DestinationRow,
  type StoryRow,
} from "@/lib/mappers";
import type { CountrySummary, Destination, StorySummary, StoryWithDestination } from "@/lib/stories";
import type { HelpfulState } from "@/lib/helpful";
import { getSupabase } from "@/lib/supabase/server";
import { createSessionClient } from "@/lib/supabase/session";

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
export const STORY_LIMIT = { all: 400, perDestination: 200, summaries: 1000, cardsPerRequest: 20 } as const;
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

/*
 * Until migration 20261011170000_story_source.sql is applied, stories have no
 * `source` column. Story queries then retry without it (every story is shown
 * as a community story) instead of taking the whole site down. The fallback is
 * re-checked every few minutes, so applying the migration takes effect without
 * a redeploy.
 */
const SOURCE_RECHECK_MS = 5 * 60 * 1000;
let sourceColumnMissingUntil = 0;

function isMissingSourceColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return code === "42703" && String(message).includes("source");
}

async function runStories<T>(
  operation: string,
  query: (columns: string) => PromiseLike<{ data: unknown; error: unknown }>,
  columns: string = STORY_COLUMNS,
): Promise<T | null> {
  // Request time only (see run()); this also makes Date.now() safe to call.
  await connection();
  if (Date.now() >= sourceColumnMissingUntil) {
    let result: { data: unknown; error: unknown };
    try {
      result = await query(columns);
    } catch (error) {
      fail(operation, error);
    }
    if (!isMissingSourceColumn(result.error)) {
      if (result.error) fail(operation, result.error);
      return result.data as T | null;
    }
    sourceColumnMissingUntil = Date.now() + SOURCE_RECHECK_MS;
    console.warn(
      "[data] stories.source is missing; apply supabase/migrations/20261011170000_story_source.sql. " +
        "Showing all stories as community stories until then.",
    );
  }
  return run<T>(operation, () => query(withoutSource(columns)));
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
    const rows = await runStories<StoryRow[]>("listStoriesForDestination", (columns) =>
      getSupabase()
        .from("stories")
        .select(columns)
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
  const rows = await runStories<StoryRow[]>("listAllStories", (columns) =>
    getSupabase()
      .from("stories")
      .select(columns)
      .eq("status", "published")
      .eq("destination.status", "published")
      .order("published_at", { ascending: false })
      .limit(STORY_LIMIT.all),
  );
  return (rows ?? []).map(mapStory);
});

/**
 * Lightweight published stories (no long text) for the map, filters and
 * counts, optionally limited to one country. Cards load their text separately
 * with getStoriesByIds, a page at a time.
 */
export const listStorySummaries = cache(async (country?: string): Promise<StorySummary[]> => {
  const rows = await runStories<StorySummaryRow[]>(
    "listStorySummaries",
    (columns) => {
      let query = getSupabase()
        .from("stories")
        .select(columns)
        .eq("status", "published")
        .eq("destination.status", "published");
      if (country) query = query.eq("destination.country", country);
      return query.order("published_at", { ascending: false }).limit(STORY_LIMIT.summaries);
    },
    STORY_SUMMARY_COLUMNS,
  );
  return (rows ?? []).map(mapStorySummary);
});

/** Full published stories for the given ids (one feed page), in the requested order. */
export async function getStoriesByIds(ids: string[]): Promise<StoryWithDestination[]> {
  const wanted = [...new Set(ids)].filter(isUuid).slice(0, STORY_LIMIT.cardsPerRequest);
  if (wanted.length === 0) return [];
  const rows = await runStories<StoryRow[]>("getStoriesByIds", (columns) =>
    getSupabase()
      .from("stories")
      .select(columns)
      .in("id", wanted)
      .eq("status", "published")
      .eq("destination.status", "published"),
  );
  const byId = new Map((rows ?? []).map((row) => [row.id, mapStory(row)]));
  return wanted.flatMap((id) => byId.get(id) ?? []);
}

/** Countries that have published stories, most stories first. */
export async function listCountries(): Promise<CountrySummary[]> {
  const totals = new Map<string, number>();
  for (const destination of await listDestinations()) {
    if (!destination.country || destination.storyCount === 0) continue;
    totals.set(destination.country, (totals.get(destination.country) ?? 0) + destination.storyCount);
  }
  return [...totals]
    .map(([country, storyCount]) => ({ country, storyCount }))
    .sort((a, b) => b.storyCount - a.storyCount || a.country.localeCompare(b.country));
}

export const getStoryById = cache(async (id: string): Promise<StoryWithDestination | null> => {
  if (!isUuid(id)) return null;
  const row = await runStories<StoryRow>("getStoryById", (columns) =>
    getSupabase()
      .from("stories")
      .select(columns)
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

/**
 * Helpful counts (public, trigger-maintained column) and the viewer's own
 * reactions (RLS: own rows only). Failures degrade to "unavailable" instead of
 * breaking the page.
 */
export async function getHelpfulState(
  storyIds: string[],
  viewerId: string | null,
): Promise<HelpfulState> {
  const ids = [...new Set(storyIds)].filter(isUuid).slice(0, 300);
  const empty: HelpfulState = { available: false, counts: {}, liked: [], signedIn: Boolean(viewerId) };
  if (ids.length === 0) return { ...empty, available: true };
  try {
    await connection();
    const { data, error } = await getSupabase()
      .from("stories")
      .select("id, helpful_count")
      .in("id", ids);
    if (error) throw new Error(error.code ?? error.message);
    const counts = Object.fromEntries(
      (data as { id: string; helpful_count: number }[]).map((row) => [row.id, row.helpful_count]),
    );

    let liked: string[] = [];
    if (viewerId) {
      const client = await createSessionClient();
      const own = await client
        .from("story_reactions")
        .select("story_id")
        .eq("reaction_type", "helpful")
        .in("story_id", ids);
      if (own.error) throw new Error(own.error.code ?? own.error.message);
      liked = (own.data as { story_id: string }[]).map((row) => row.story_id);
    }
    return { available: true, counts, liked, signedIn: Boolean(viewerId) };
  } catch (error) {
    console.error(`[data] getHelpfulState failed: ${error instanceof Error ? error.message : "unknown"}`);
    return empty;
  }
}
