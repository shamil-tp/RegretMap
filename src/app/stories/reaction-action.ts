"use server";

import { z } from "zod";
import { cleanReactionCounts, REACTION_TYPES, type ReactionType } from "@/lib/reactions";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSessionClient, getViewer } from "@/lib/supabase/session";

/**
 * Adds or removes one of the signed-in user's emoji reactions on a story.
 * Runs with the user's own session, so RLS enforces: own reactions only, on
 * published stories only. Counts come back from the trigger-maintained
 * columns — never from the client.
 */

const userLimiter = createRateLimiter({ windowMs: 60_000, max: 40 });
const inputSchema = z
  .object({ storyId: z.uuid(), type: z.enum(REACTION_TYPES), on: z.boolean() })
  .strict();

export type ReactionResult =
  | { status: "ok"; counts: Partial<Record<ReactionType, number>> }
  | { status: "signed_out" }
  | { status: "error"; message: string };

export async function setReaction(input: unknown): Promise<ReactionResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "That reaction couldn't be saved." };
  const { storyId, type, on } = parsed.data;

  const viewer = await getViewer();
  if (!viewer) return { status: "signed_out" };
  if (userLimiter.isLimited(viewer.id)) {
    return { status: "error", message: "You're reacting quickly. Please wait a moment." };
  }

  const supabase = await createSessionClient();
  const write = on
    ? await supabase.from("story_reactions").insert({ story_id: storyId, user_id: viewer.id, reaction_type: type })
    : await supabase
        .from("story_reactions")
        .delete()
        .eq("story_id", storyId)
        .eq("user_id", viewer.id)
        .eq("reaction_type", type);

  // 23505: already reacted (e.g. a double tap) — that's the desired state.
  if (write.error && write.error.code !== "23505") {
    const denied = write.error.code === "42501" || write.error.code === "23514";
    if (!denied) console.error(`[reactions] write failed: ${write.error.code ?? "unknown"}`);
    return {
      status: "error",
      message: denied ? "This story can't take that reaction yet." : "That didn't save. Please try again.",
    };
  }

  const { data, error } = await supabase
    .from("stories")
    .select("reaction_counts")
    .eq("id", storyId)
    .maybeSingle();
  if (error || !data) return { status: "error", message: "That didn't save. Please try again." };
  return { status: "ok", counts: cleanReactionCounts((data as { reaction_counts: unknown }).reaction_counts) };
}
