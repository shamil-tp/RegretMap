import { z } from "zod";

/*
 * Story comments: shared types, input validation and threading. Pure — no
 * database access. Comment text is untrusted user input: it is only ever
 * rendered as plain text (React escapes it), never as HTML.
 */

export const COMMENT_LIMITS = { bodyMax: 1000, perStory: 300 } as const;

export type CommentRow = {
  id: string;
  story_id: string;
  parent_id: string | null;
  author_name: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export const COMMENT_COLUMNS = "id, story_id, parent_id, author_name, body, status, created_at, updated_at";

export type StoryComment = {
  id: string;
  parentId: string | null;
  authorName: string;
  /** Empty for a deleted placeholder. */
  body: string;
  deleted: boolean;
  edited: boolean;
  createdAt: string;
  /** True only for the signed-in viewer's own comments (decided on the server). */
  mine: boolean;
};

export type CommentThread = StoryComment & { replies: StoryComment[] };

/** Normalises untrusted text: no control characters, at most one blank line in a row. */
export function cleanCommentText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const commentBodySchema = z
  .string()
  .max(COMMENT_LIMITS.bodyMax * 2)
  .transform(cleanCommentText)
  .pipe(
    z
      .string()
      .min(1, "Write something before posting.")
      .max(COMMENT_LIMITS.bodyMax, `Please keep comments under ${COMMENT_LIMITS.bodyMax} characters.`),
  );

export function mapComment(row: CommentRow, mine: Set<string>): StoryComment {
  const deleted = row.status !== "published";
  return {
    id: row.id,
    parentId: row.parent_id,
    authorName: deleted ? "" : row.author_name,
    body: deleted ? "" : row.body,
    deleted,
    // Small tolerance: the row's own insert can set the two timestamps apart.
    edited: !deleted && Date.parse(row.updated_at) - Date.parse(row.created_at) > 5_000,
    createdAt: row.created_at,
    mine: !deleted && mine.has(row.id),
  };
}

/**
 * Top-level comments (oldest first) with their replies. Replies whose parent
 * isn't visible are dropped, and deleted placeholders without replies too.
 */
export function buildThreads(comments: StoryComment[]): CommentThread[] {
  const sorted = [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const threads = new Map<string, CommentThread>();
  for (const comment of sorted) {
    if (comment.parentId === null) threads.set(comment.id, { ...comment, replies: [] });
  }
  for (const comment of sorted) {
    if (comment.parentId !== null && !comment.deleted) {
      threads.get(comment.parentId)?.replies.push(comment);
    }
  }
  return [...threads.values()].filter((thread) => !thread.deleted || thread.replies.length > 0);
}

/** Number of visible comments and replies (placeholders don't count). */
export function countComments(threads: CommentThread[]) {
  return threads.reduce((total, t) => total + (t.deleted ? 0 : 1) + t.replies.length, 0);
}
