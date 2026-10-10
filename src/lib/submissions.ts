import "server-only";
import { createHash } from "node:crypto";
import {
  DataUnavailableError,
  getDestinationById,
  listDestinations,
} from "@/lib/data";
import { distanceKm, nearestWithin } from "@/lib/geo";
import type { StorySubmission } from "@/lib/story-submission";
import type { Coordinates } from "@/lib/stories";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/*
 * Trusted story submission. The payload must already be validated with
 * storySubmissionSchema. Whatever the browser sends, new stories are stored as
 * status = 'published' (public immediately — product decision) and
 * is_demo = false; moderators can still hide or reject them later. This module
 * uses the privileged client and must only be called from server code.
 *
 * Location: either an existing published destination, or a real-world place
 * chosen from the suggestions. A place within ATTACH_RADIUS_KM of a published
 * destination is attached to it (the place becomes the story's place name and
 * pin); otherwise a new destination is created and published with the story.
 */

/** A map pin must be within this distance of the story's location. */
export const MAX_PIN_DISTANCE_KM = 200;
/** A selected place this close to a published destination is filed under it. */
export const ATTACH_RADIUS_KM = 50;
/** A proposal this close to an existing draft with the same name reuses it. */
const PROPOSAL_REUSE_KM = 25;

/** Identical stories within this window are treated as accidental duplicates. */
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Shared cap on new (non-demo) stories, counted in the database so it holds across
 * server instances and can't be bypassed with forged IP headers.
 */
export const MAX_PENDING_PER_HOUR = 60;

export type SubmitResult =
  | {
      ok: true;
      destination: { name: string; slug: string | null };
      /** True when the story created/uses a proposed (draft) destination. */
      proposedDestination: boolean;
      /** Set only when a new story row was created (not for a repeated submit). */
      storyId?: string;
    }
  | {
      ok: false;
      reason:
        | "invalid_destination"
        | "location_too_far"
        | "duplicate_content"
        | "busy"
        | "unavailable";
    };

export { distanceKm };

// fingerprint -> { submissionKey, at }. In memory, per instance (see rate-limit.ts).
const recentSubmissions = new Map<string, { submissionKey: string; at: number }>();

/** Clears duplicate-detection memory (tests only). */
export function resetSubmissionMemory() {
  recentSubmissions.clear();
}

type LocationPlan =
  | {
      kind: "existing";
      destination: { id: string; name: string; slug: string; coordinates?: Coordinates };
      placeName?: string;
      placeCoordinates?: Coordinates;
    }
  | { kind: "propose"; name: string; region?: string; country?: string; coordinates: Coordinates };

async function planLocation(input: StorySubmission): Promise<LocationPlan | "invalid" | "unavailable"> {
  try {
    if (input.locationType === "destination") {
      const destination = input.destinationId ? await getDestinationById(input.destinationId) : null;
      return destination ? { kind: "existing", destination } : "invalid";
    }
    if (!input.placeName || input.placeLatitude === undefined || input.placeLongitude === undefined) {
      return "invalid";
    }
    const coordinates = { latitude: input.placeLatitude, longitude: input.placeLongitude };
    const nearest = nearestWithin(await listDestinations(), coordinates, ATTACH_RADIUS_KM);
    if (nearest) {
      return {
        kind: "existing",
        destination: nearest.item,
        placeName: input.placeName,
        placeCoordinates: coordinates,
      };
    }
    return {
      kind: "propose",
      name: input.placeName,
      region: input.placeRegion,
      country: input.placeCountry,
      coordinates,
    };
  } catch (error) {
    if (error instanceof DataUnavailableError) return "unavailable";
    throw error;
  }
}

export function slugify(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "place";
}

/** Reuses a nearby draft with the same name, or creates a new draft destination. */
async function findOrCreateProposal(
  plan: Extract<LocationPlan, { kind: "propose" }>,
): Promise<{ id: string; name: string; slug: string } | null> {
  const admin = getSupabaseAdmin();
  const { data: drafts, error: lookupError } = await admin
    .from("destinations")
    .select("id, name, slug, latitude, longitude")
    .eq("status", "draft")
    .ilike("name", plan.name.replace(/[%_]/g, "\\$&"))
    .limit(20);
  if (lookupError) {
    console.error(`[submissions] proposal lookup failed: ${lookupError.code ?? "unknown"}`);
    return null;
  }
  const reuse = (drafts as { id: string; name: string; slug: string; latitude: number | null; longitude: number | null }[])
    .find(
      (d) =>
        d.latitude != null &&
        d.longitude != null &&
        distanceKm(plan.coordinates, { latitude: d.latitude, longitude: d.longitude }) <= PROPOSAL_REUSE_KM,
    );
  if (reuse) {
    // An older hidden draft becomes public along with the new story.
    const { error: publishError } = await admin.from("destinations").update({ status: "published" }).eq("id", reuse.id);
    if (publishError) console.error(`[submissions] draft publish failed: ${publishError.code ?? "unknown"}`);
    return { id: reuse.id, name: reuse.name, slug: reuse.slug };
  }

  const base = slugify(plan.name);
  for (let attempt = 0; attempt < 6; attempt++) {
    const slug =
      attempt === 0 ? base : attempt < 5 ? `${base}-${attempt + 1}` : `${base}-${createHash("sha1").update(`${Date.now()}`).digest("hex").slice(0, 6)}`;
    const { data, error } = await admin
      .from("destinations")
      .insert({
        slug,
        name: plan.name,
        region: plan.region ?? null,
        country: plan.country ?? null,
        description: null,
        latitude: plan.coordinates.latitude,
        longitude: plan.coordinates.longitude,
        // Published together with the story (no moderator approval step).
        status: "published",
        is_demo: false,
      })
      .select("id, name, slug")
      .single();
    if (!error && data) return data as { id: string; name: string; slug: string };
    if (error?.code !== "23505") {
      console.error(`[submissions] proposal insert failed: ${error?.code ?? "unknown"}`);
      return null;
    }
  }
  return null;
}

function fingerprint(locationKey: string, input: StorySubmission) {
  return createHash("sha256")
    .update([locationKey, input.title, input.body].join("\u0000").toLowerCase())
    .digest("hex");
}

export async function submitStory(
  input: StorySubmission,
  options: { authorId?: string } = {},
): Promise<SubmitResult> {
  const plan = await planLocation(input);
  if (plan === "invalid") return { ok: false, reason: "invalid_destination" };
  if (plan === "unavailable") return { ok: false, reason: "unavailable" };

  const pin =
    input.latitude !== undefined && input.longitude !== undefined
      ? { latitude: input.latitude, longitude: input.longitude }
      : undefined;
  const anchor =
    plan.kind === "existing" ? (plan.placeCoordinates ?? plan.destination.coordinates) : plan.coordinates;
  if (pin && anchor && distanceKm(pin, anchor) > MAX_PIN_DISTANCE_KM) {
    return { ok: false, reason: "location_too_far" };
  }

  const locationKey =
    plan.kind === "existing"
      ? plan.destination.id
      : `${plan.name.toLowerCase()}@${plan.coordinates.latitude.toFixed(2)},${plan.coordinates.longitude.toFixed(2)}`;
  const accepted = {
    ok: true as const,
    destination:
      plan.kind === "existing"
        ? { name: plan.destination.name, slug: plan.destination.slug }
        : { name: plan.name, slug: null as string | null },
    proposedDestination: plan.kind === "propose",
  };

  const now = Date.now();
  const print = fingerprint(locationKey, input);
  const previous = recentSubmissions.get(print);
  if (previous && now - previous.at < DUPLICATE_WINDOW_MS) {
    // Same form re-submitted: it was already stored. Different form, same story: duplicate.
    return previous.submissionKey === input.submissionKey
      ? accepted
      : { ok: false, reason: "duplicate_content" };
  }

  const busy = await isOverPendingCap(now);
  if (busy !== false) return { ok: false, reason: busy === "unknown" ? "unavailable" : "busy" };

  let destinationId: string;
  if (plan.kind === "existing") {
    destinationId = plan.destination.id;
  } else {
    const proposal = await findOrCreateProposal(plan);
    if (!proposal) return { ok: false, reason: "unavailable" };
    destinationId = proposal.id;
    accepted.destination.slug = proposal.slug;
  }

  // Coordinates only from a map pin or a selected place — never invented.
  const coordinates = pin ?? (plan.kind === "existing" ? plan.placeCoordinates : plan.coordinates);
  const placeName = input.place ?? (plan.kind === "existing" ? plan.placeName : undefined);

  let error: { code?: string; message?: string } | null;
  let created: { id: string } | null = null;
  try {
    ({ data: created, error } = await getSupabaseAdmin()
      .from("stories")
      .insert({
        destination_id: destinationId,
        title: input.title,
        body: input.body,
        category: input.category,
        challenge: input.challenge,
        lesson: input.lesson,
        advice: input.advice,
        place_name: placeName ?? null,
        travel_month: input.travelMonth ?? null,
        travel_year: input.travelYear ?? null,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
        submission_key: input.submissionKey,
        // Never taken from the request:
        status: "published",
        published_at: new Date(now).toISOString(),
        is_demo: false,
      })
      .select("id")
      .single());
  } catch (thrown) {
    error = { message: thrown instanceof Error ? thrown.message : String(thrown) };
  }

  if (error) {
    // 23505: this submission key was already stored (double submit) — not an error.
    if (error.code === "23505") return accepted;
    if (error.code === "23503") return { ok: false, reason: "invalid_destination" };
    // Log the code and message only — never the details, which can echo story text.
    console.error(`[submissions] insert failed: ${error.code ?? "network"} ${error.message ?? ""}`);
    return { ok: false, reason: "unavailable" };
  }

  // Link the signed-in author privately (anonymous submissions have no author).
  if (options.authorId && created?.id) {
    const { error: authorError } = await getSupabaseAdmin()
      .from("story_authors")
      .insert({ story_id: created.id, user_id: options.authorId });
    if (authorError) console.error(`[submissions] author link failed: ${authorError.code ?? "unknown"}`);
  }

  if (recentSubmissions.size > 10_000) recentSubmissions.clear();
  recentSubmissions.set(print, { submissionKey: input.submissionKey, at: now });
  return { ...accepted, storyId: created?.id };
}

/**
 * True when too many stories were submitted in the last hour (any source).
 * Fails closed: if the count can't be read, report "unknown" so nothing is written.
 */
async function isOverPendingCap(now: number): Promise<boolean | "unknown"> {
  try {
    const { count, error } = await getSupabaseAdmin()
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("is_demo", false)
      .gte("created_at", new Date(now - 60 * 60 * 1000).toISOString());
    if (error) throw new Error(`${error.code ?? ""} ${error.message ?? ""}`);
    return (count ?? 0) >= MAX_PENDING_PER_HOUR;
  } catch (thrown) {
    console.error(
      `[submissions] pending-cap check failed: ${thrown instanceof Error ? thrown.message : String(thrown)}`,
    );
    return "unknown";
  }
}
