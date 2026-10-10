"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/supabase/session";

/*
 * Human moderation decisions. Every call re-checks that the signed-in user is a
 * moderator (MODERATOR_EMAILS, verified email) — the page being visible is not
 * a security boundary. Only pending stories can be decided; the AI never calls
 * this.
 */

const inputSchema = z.object({ storyId: z.uuid(), decision: z.enum(["publish", "reject"]) }).strict();

export type ModerationActionResult =
  | { status: "ok"; decision: "publish" | "reject"; destinationSlug?: string }
  | { status: "error"; message: string };

export async function decideStory(input: unknown): Promise<ModerationActionResult> {
  const viewer = await getViewer();
  if (!viewer?.isModerator) return { status: "error", message: "You don't have permission to do that." };

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "That story couldn't be updated." };
  const { storyId, decision } = parsed.data;

  const admin = getSupabaseAdmin();
  const { data: story, error: loadError } = await admin
    .from("stories")
    .select("id, status, destination:destinations(id, slug, status)")
    .eq("id", storyId)
    .maybeSingle();
  if (loadError) return { status: "error", message: "That story couldn't be loaded. Please try again." };
  if (!story || story.status !== "pending") {
    return { status: "error", message: "This story has already been reviewed." };
  }
  const destination = story.destination as unknown as { id: string; slug: string; status: string } | null;

  if (decision === "publish" && destination?.status === "draft") {
    // A proposed destination goes public together with its first approved story.
    const { error } = await admin
      .from("destinations")
      .update({ status: "published" })
      .eq("id", destination.id)
      .eq("status", "draft");
    if (error) return { status: "error", message: "The destination couldn't be published. Please try again." };
  }

  const { data: updated, error } = await admin
    .from("stories")
    .update(
      decision === "publish"
        ? { status: "published", published_at: new Date().toISOString() }
        : { status: "rejected" },
    )
    .eq("id", storyId)
    .eq("status", "pending")
    .select("id");
  if (error) return { status: "error", message: "That didn't save. Please try again." };
  if (!updated || updated.length === 0) {
    return { status: "error", message: "This story has already been reviewed." };
  }

  console.info(`[moderation] story ${storyId} ${decision}ed by moderator ${viewer.id}`);
  revalidatePath("/moderate");
  if (decision === "publish") {
    revalidatePath("/");
    if (destination?.slug) revalidatePath(`/destinations/${destination.slug}`);
  }
  return { status: "ok", decision, destinationSlug: destination?.slug };
}
