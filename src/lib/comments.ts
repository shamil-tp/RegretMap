import { z } from "zod";

/*
 * Story comments: shared types, input validation and threading. Pure — no
 * database access. Comment text is untrusted user input: it is only ever
 * rendered as plain text (React escapes it), never as HTML.
 */

export const COMMENT_LIMITS = {
  bodyMax: 1000,
  perStory: 500,
  /** Deepest reply level the database accepts (0 = top-level). */
  maxDepth: 5,
} as const;

export type CommentRow = {
  id: string;
  story_id: string;
  parent_id: string | null;
  depth: number;
  author_name: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export const COMMENT_COLUMNS =
  "id, story_id, parent_id, depth, author_name, body, status, created_at, updated_at";

export type StoryComment = {
  id: string;
  parentId: string | null;
  depth: number;
  authorName: string;
  /** Empty for a deleted placeholder. */
  body: string;
  deleted: boolean;
  edited: boolean;
  createdAt: string;
  /** True only for the signed-in viewer's own comments (decided on the server). */
  mine: boolean;
};

/** A comment with its replies, which can have replies of their own. */
export type CommentThread = StoryComment & { replies: CommentThread[] };

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
    depth: row.depth ?? 0,
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
 * Builds the reply tree, oldest first at every level (conversation order).
 * Replies whose parent isn't visible are dropped. A deleted comment stays as a
 * placeholder only while something visible still hangs below it.
 */
export function buildThreads(comments: StoryComment[]): CommentThread[] {
  const sorted = [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const nodes = new Map<string, CommentThread>();
  for (const comment of sorted) nodes.set(comment.id, { ...comment, replies: [] });

  const roots: CommentThread[] = [];
  for (const node of nodes.values()) {
    if (node.parentId === null) roots.push(node);
    else nodes.get(node.parentId)?.replies.push(node);
  }

  const prune = (list: CommentThread[]): CommentThread[] =>
    list
      .map((node) => ({ ...node, replies: prune(node.replies) }))
      .filter((node) => !node.deleted || node.replies.length > 0);
  return prune(roots);
}

/** Visible comments and replies at every level (placeholders don't count). */
export function countComments(threads: CommentThread[]): number {
  return threads.reduce((total, t) => total + (t.deleted ? 0 : 1) + countComments(t.replies), 0);
}
