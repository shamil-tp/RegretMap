"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { commentBodySchema } from "@/lib/comments";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSessionClient, getViewer } from "@/lib/supabase/session";

/*
 * Comment writes run with the signed-in user's own session, so RLS decides:
 * own identity only (user_id defaults to auth.uid() and can't be supplied),
 * published stories only, replies on the same story, own comments only for
 * edits and deletes. Nothing the browser sends is trusted for identity.
 */

const userLimiter = createRateLimiter({ windowMs: 60_000, max: 8 });
const globalLimiter = createRateLimiter({ windowMs: 60_000, max: 120 });

const postSchema = z
  .object({ storyId: z.uuid(), parentId: z.uuid().nullable().default(null), body: commentBodySchema })
  .strict();
const editSchema = z.object({ storyId: z.uuid(), commentId: z.uuid(), body: commentBodySchema }).strict();
const deleteSchema = z.object({ storyId: z.uuid(), commentId: z.uuid() }).strict();

export type CommentActionResult =
  | { status: "ok" }
  | { status: "signed_out" }
  | { status: "error"; message: string };

const TOO_FAST: CommentActionResult = {
  status: "error",
  message: "You're commenting quickly. Please wait a moment and try again.",
};

function invalid(error: z.ZodError): CommentActionResult {
  const bodyIssue = error.issues.find((issue) => issue.path[0] === "body");
  return { status: "error", message: bodyIssue?.message ?? "That comment couldn't be saved." };
}

function writeFailed(code: string | undefined, action: string): CommentActionResult {
  // 42501: RLS refused (story not public, not your comment); 23503/23514: bad reply target.
  if (code === "42501" || code === "23503" || code === "23514") {
    return { status: "error", message: `This comment can't be ${action}.` };
  }
  console.error(`[comments] ${action} failed: ${code ?? "unknown"}`);
  return { status: "error", message: "That didn't save. Please try again." };
}

async function guard() {
  const viewer = await getViewer();
  if (!viewer) return { viewer: null, limited: false };
  return { viewer, limited: userLimiter.isLimited(viewer.id) || globalLimiter.isLimited("all") };
}

export async function postComment(input: unknown): Promise<CommentActionResult> {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { viewer, limited } = await guard();
  if (!viewer) return { status: "signed_out" };
  if (limited) return TOO_FAST;

  const { storyId, parentId, body } = parsed.data;
  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("story_comments")
    .insert({ story_id: storyId, parent_id: parentId, body });
  if (error) return writeFailed(error.code, "posted");
  revalidatePath(`/stories/${storyId}`);
  return { status: "ok" };
}

export async function editComment(input: unknown): Promise<CommentActionResult> {
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { viewer, limited } = await guard();
  if (!viewer) return { status: "signed_out" };
  if (limited) return TOO_FAST;

  const { storyId, commentId, body } = parsed.data;
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("story_comments")
    .update({ body })
    .eq("id", commentId)
    .eq("story_id", storyId)
    .select("id");
  if (error) return writeFailed(error.code, "edited");
  // RLS filters other people's comments out: zero rows means not yours.
  if (!data || data.length === 0) return { status: "error", message: "This comment can't be edited." };
  revalidatePath(`/stories/${storyId}`);
  return { status: "ok" };
}

export async function deleteComment(input: unknown): Promise<CommentActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "That comment couldn't be deleted." };
  const { viewer, limited } = await guard();
  if (!viewer) return { status: "signed_out" };
  if (limited) return TOO_FAST;

  const { storyId, commentId } = parsed.data;
  const supabase = await createSessionClient();
  const { error } = await supabase.rpc("delete_story_comment", { p_comment_id: commentId });
  if (error) return writeFailed(error.code, "deleted");
  revalidatePath(`/stories/${storyId}`);
  return { status: "ok" };
}
