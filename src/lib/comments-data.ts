import "server-only";
import { connection } from "next/server";
import {
  buildThreads,
  COMMENT_COLUMNS,
  COMMENT_LIMITS,
  mapComment,
  type CommentRow,
  type CommentThread,
} from "@/lib/comments";
import { isUuid } from "@/lib/mappers";
import { getSupabase } from "@/lib/supabase/server";
import { createSessionClient } from "@/lib/supabase/session";

export type CommentsState =
  | { status: "ready"; threads: CommentThread[] }
  /** Table missing (migration not applied) or the database failed. */
  | { status: "unavailable" };

/**
 * Visible comments for one story. Reads with the public client, so RLS only
 * returns comments on publicly visible stories and never exposes user ids.
 * "Mine" comes from a security-definer helper using the viewer's own session.
 */
export async function getStoryComments(storyId: string, viewerId: string | null): Promise<CommentsState> {
  if (!isUuid(storyId)) return { status: "ready", threads: [] };
  await connection();
  try {
    const { data, error } = await getSupabase()
      .from("story_comments")
      .select(COMMENT_COLUMNS)
      .eq("story_id", storyId)
      .in("status", ["published", "deleted"])
      .order("created_at", { ascending: true })
      .limit(COMMENT_LIMITS.perStory);
    if (error) throw new Error(error.code ?? error.message);

    let mine = new Set<string>();
    if (viewerId) {
      const client = await createSessionClient();
      const own = await client.rpc("my_story_comment_ids", { p_story_id: storyId });
      if (!own.error && Array.isArray(own.data)) mine = new Set(own.data as string[]);
    }
    const rows = (data ?? []) as CommentRow[];
    return { status: "ready", threads: buildThreads(rows.map((row) => mapComment(row, mine))) };
  } catch (error) {
    console.error(`[comments] read failed: ${error instanceof Error ? error.message : "unknown"}`);
    return { status: "unavailable" };
  }
}
