import "server-only";
import { classifyStory } from "@/lib/moderation/gemini";
import { localSignals, queueLabelFor, type ModerationCategory } from "@/lib/moderation/policy";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/*
 * Runs AI moderation for a stored story and saves the result in the private
 * story_moderation table. It NEVER changes stories.status: publication stays a
 * human decision. Idempotent per story (one row, keyed by story_id).
 */

export const MAX_MODERATION_ATTEMPTS = 3;
/**
 * Retries wait this long after the last attempt: avoids hammering the provider
 * after a quota error, and treats an older 'queued' row as an interrupted run.
 */
const RETRY_AFTER_MS = 2 * 60 * 1000;

export type ModerationOutcome = "completed" | "failed" | "skipped";

function log(message: string) {
  // Never log story text, model output or keys — ids and error classes only.
  console.error(`[moderation] ${message}`);
}

export async function moderateStory(storyId: string): Promise<ModerationOutcome> {
  const admin = getSupabaseAdmin();

  const { data: story, error: storyError } = await admin
    .from("stories")
    .select("id, status, title, category, place_name, body, challenge, lesson, advice")
    .eq("id", storyId)
    .maybeSingle();
  if (storyError || !story) {
    log(`story ${storyId} not loaded: ${storyError?.code ?? "not_found"}`);
    return "skipped";
  }
  if (story.status !== "pending") return "skipped";

  const { data: existing } = await admin
    .from("story_moderation")
    .select("status, attempts")
    .eq("story_id", storyId)
    .maybeSingle();
  if (existing?.status === "completed") return "skipped";
  const attempts = (existing?.attempts ?? 0) + 1;
  if (attempts > MAX_MODERATION_ATTEMPTS) return "skipped";

  // Mark the attempt first so an interrupted run can be found and retried.
  const queued = await admin
    .from("story_moderation")
    .upsert({ story_id: storyId, status: "queued", attempts }, { onConflict: "story_id" });
  if (queued.error) {
    log(`story ${storyId} queue write failed: ${queued.error.code ?? "unknown"}`);
    return "failed";
  }

  const text = [story.title, story.place_name, story.body, story.challenge, story.lesson, story.advice]
    .filter(Boolean)
    .join("\n");
  const signals = localSignals(text);
  const classified = await classifyStory({
    title: story.title,
    category: story.category,
    place: story.place_name,
    body: story.body,
    challenge: story.challenge,
    lesson: story.lesson,
    advice: story.advice,
  });

  const row = classified.ok
    ? {
        status: "completed",
        decision: classified.result.decision,
        queue_label: queueLabelFor(classified.result, signals),
        categories: [...new Set<ModerationCategory>([...classified.result.categories, ...signals])],
        reason_codes: classified.result.reason_codes,
        summary: classified.result.summary,
        confidence: classified.result.confidence ?? null,
        model: classified.model,
        last_error: null,
        moderated_at: new Date().toISOString(),
      }
    : {
        status: "failed",
        decision: null,
        queue_label: queueLabelFor(null, signals),
        categories: signals,
        reason_codes: [],
        summary: null,
        confidence: null,
        model: classified.model ?? null,
        last_error: classified.error,
      };

  const saved = await admin
    .from("story_moderation")
    .update(row)
    .eq("story_id", storyId);
  if (saved.error) {
    log(`story ${storyId} result write failed: ${saved.error.code ?? "unknown"}`);
    return "failed";
  }
  if (!classified.ok) log(`story ${storyId} attempt ${attempts} failed: ${classified.error}`);
  return classified.ok ? "completed" : "failed";
}

/** Retries a few failed or interrupted moderations (bounded, per call). */
export async function retryPendingModerations(limit = 2): Promise<number> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("story_moderation")
    .select("story_id")
    .in("status", ["failed", "queued"])
    .lt("attempts", MAX_MODERATION_ATTEMPTS)
    .lt("updated_at", new Date(Date.now() - RETRY_AFTER_MS).toISOString())
    .order("updated_at")
    .limit(limit);
  if (error) {
    log(`retry lookup failed: ${error.code ?? "unknown"}`);
    return 0;
  }
  let retried = 0;
  for (const { story_id } of data ?? []) {
    await moderateStory(story_id);
    retried += 1;
  }
  return retried;
}
