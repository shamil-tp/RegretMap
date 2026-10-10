"use server";

import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSessionClient, getViewer } from "@/lib/supabase/session";

/**
 * Mark / unmark a story as helpful for the signed-in user. Runs with the user's
 * own session, so RLS enforces: only your own reaction, only on published
 * stories. The count comes from the trigger-maintained column, never the client.
 */

const userLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });
const inputSchema = z.object({ storyId: z.uuid(), helpful: z.boolean() }).strict();

export type HelpfulResult =
  | { status: "ok"; helpful: boolean; count: number }
  | { status: "signed_out" }
  | { status: "error"; message: string };

export async function setHelpful(input: unknown): Promise<HelpfulResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "That story couldn't be updated." };
  const { storyId, helpful } = parsed.data;

  const viewer = await getViewer();
  if (!viewer) return { status: "signed_out" };
  if (userLimiter.isLimited(viewer.id)) {
    return { status: "error", message: "You're doing that too quickly. Please wait a moment." };
  }

  const supabase = await createSessionClient();
  // Idempotent: set the desired state rather than toggling blindly.
  const write = helpful
    ? await supabase.from("story_reactions").insert({ story_id: storyId, user_id: viewer.id })
    : await supabase
        .from("story_reactions")
        .delete()
        .eq("story_id", storyId)
        .eq("user_id", viewer.id)
        .eq("reaction_type", "helpful");

  // 23505: already marked helpful (e.g. a repeated request) — that's the desired state.
  if (write.error && write.error.code !== "23505") {
    const denied = write.error.code === "42501";
    if (!denied) console.error(`[helpful] write failed: ${write.error.code ?? "unknown"}`);
    return {
      status: "error",
      message: denied ? "This story can't be marked helpful." : "That didn't save. Please try again.",
    };
  }

  const { data, error } = await supabase
    .from("stories")
    .select("helpful_count")
    .eq("id", storyId)
    .maybeSingle();
  if (error || !data) {
    return { status: "error", message: "That didn't save. Please try again." };
  }
  return { status: "ok", helpful, count: (data as { helpful_count: number }).helpful_count };
}
