import "server-only";
import { createHash } from "node:crypto";
import { DataUnavailableError, getDestinationById } from "@/lib/data";
import type { StorySubmission } from "@/lib/story-submission";
import type { Coordinates } from "@/lib/stories";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/*
 * Trusted story submission. The payload must already be validated with
 * storySubmissionSchema. Whatever the browser sends, new stories are always
 * stored as status = 'pending' (not public) and is_demo = false. This module
 * uses the privileged client and must only be called from server code.
 */

/** A map pin must be within this distance of the chosen destination. */
export const MAX_PIN_DISTANCE_KM = 200;

/** Identical stories within this window are treated as accidental duplicates. */
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Shared cap on new pending stories, counted in the database so it holds across
 * server instances and can't be bypassed with forged IP headers.
 */
export const MAX_PENDING_PER_HOUR = 60;

export type SubmitResult =
  | {
      ok: true;
      destination: { name: string; slug: string };
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

export function distanceKm(a: Coordinates, b: Coordinates) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// fingerprint -> { submissionKey, at }. In memory, per instance (see rate-limit.ts).
const recentSubmissions = new Map<string, { submissionKey: string; at: number }>();

function fingerprint(input: StorySubmission) {
  return createHash("sha256")
    .update([input.destinationId, input.title, input.body].join("\u0000").toLowerCase())
    .digest("hex");
}

/** Clears duplicate-detection memory (tests only). */
export function resetSubmissionMemory() {
  recentSubmissions.clear();
}

export async function submitStory(input: StorySubmission): Promise<SubmitResult> {
  let destination;
  try {
    destination = await getDestinationById(input.destinationId);
  } catch (error) {
    if (error instanceof DataUnavailableError) return { ok: false, reason: "unavailable" };
    throw error;
  }
  if (!destination) return { ok: false, reason: "invalid_destination" };
  const accepted = { ok: true as const, destination: { name: destination.name, slug: destination.slug } };

  const pin =
    input.latitude !== undefined && input.longitude !== undefined
      ? { latitude: input.latitude, longitude: input.longitude }
      : undefined;
  if (pin && destination.coordinates && distanceKm(pin, destination.coordinates) > MAX_PIN_DISTANCE_KM) {
    return { ok: false, reason: "location_too_far" };
  }

  const now = Date.now();
  const print = fingerprint(input);
  const previous = recentSubmissions.get(print);
  if (previous && now - previous.at < DUPLICATE_WINDOW_MS) {
    // Same form re-submitted: it was already stored. Different form, same story: duplicate.
    return previous.submissionKey === input.submissionKey
      ? accepted
      : { ok: false, reason: "duplicate_content" };
  }

  const busy = await isOverPendingCap(now);
  if (busy !== false) return { ok: false, reason: busy === "unknown" ? "unavailable" : "busy" };

  let error: { code?: string; message?: string } | null;
  let created: { id: string } | null = null;
  try {
    ({ data: created, error } = await getSupabaseAdmin()
      .from("stories")
      .insert({
        destination_id: destination.id,
        title: input.title,
        body: input.body,
        category: input.category,
        challenge: input.challenge,
        lesson: input.lesson,
        advice: input.advice,
        place_name: input.place ?? null,
        travel_month: input.travelMonth ?? null,
        travel_year: input.travelYear ?? null,
        latitude: pin?.latitude ?? null,
        longitude: pin?.longitude ?? null,
        submission_key: input.submissionKey,
        // Never taken from the request:
        status: "pending",
        published_at: null,
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
      .eq("status", "pending")
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
