import { describe, expect, it } from "vitest";
import {
  buildThreads,
  cleanCommentText,
  commentBodySchema,
  countComments,
  mapComment,
  type CommentRow,
  type StoryComment,
} from "@/lib/comments";

function row(overrides: Partial<CommentRow> = {}): CommentRow {
  return {
    id: "c1",
    story_id: "s1",
    parent_id: null,
    depth: 0,
    author_name: "Asha",
    body: "Great tip",
    status: "published",
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-01T10:00:00Z",
    ...overrides,
  };
}

const comment = (overrides: Partial<StoryComment>): StoryComment => ({
  ...mapComment(row(), new Set()),
  ...overrides,
});

describe("comment validation", () => {
  it("trims, strips control and bidi characters, and collapses blank lines", () => {
    expect(cleanCommentText("  hi\u0000 there‮\r\n\r\n\r\n\r\nbye  ")).toBe("hi there\n\nbye");
  });

  it("rejects empty and whitespace-only comments", () => {
    expect(commentBodySchema.safeParse("").success).toBe(false);
    expect(commentBodySchema.safeParse("   \n\n ").success).toBe(false);
  });

  it("rejects oversized comments", () => {
    expect(commentBodySchema.safeParse("x".repeat(1001)).success).toBe(false);
    expect(commentBodySchema.safeParse("x".repeat(1000)).success).toBe(true);
  });

  it("keeps markup as plain text (rendered escaped, never as HTML)", () => {
    const parsed = commentBodySchema.parse('<img src=x onerror="alert(1)">');
    expect(parsed).toBe('<img src=x onerror="alert(1)">');
  });
});

describe("mapComment", () => {
  it("only marks comments as mine when the server says so", () => {
    expect(mapComment(row(), new Set()).mine).toBe(false);
    expect(mapComment(row(), new Set(["c1"])).mine).toBe(true);
  });

  it("hides the author and text of deleted placeholders", () => {
    const deleted = mapComment(row({ status: "deleted", body: "[deleted]" }), new Set(["c1"]));
    expect(deleted).toMatchObject({ deleted: true, body: "", authorName: "", mine: false });
  });

  it("flags edits", () => {
    expect(mapComment(row({ updated_at: "2026-10-01T11:00:00Z" }), new Set()).edited).toBe(true);
  });
});

describe("buildThreads", () => {
  it("attaches replies to their parent in time order", () => {
    const threads = buildThreads([
      comment({ id: "r2", parentId: "p1", createdAt: "2026-10-01T12:00:00Z" }),
      comment({ id: "p1", createdAt: "2026-10-01T10:00:00Z" }),
      comment({ id: "r1", parentId: "p1", createdAt: "2026-10-01T11:00:00Z" }),
      comment({ id: "p2", createdAt: "2026-10-01T13:00:00Z" }),
    ]);
    expect(threads.map((t) => t.id)).toEqual(["p1", "p2"]);
    expect(threads[0].replies.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(countComments(threads)).toBe(4);
  });

  it("nests replies to replies at any depth", () => {
    const threads = buildThreads([
      comment({ id: "p1", createdAt: "2026-10-01T10:00:00Z" }),
      comment({ id: "r1", parentId: "p1", depth: 1, createdAt: "2026-10-01T11:00:00Z" }),
      comment({ id: "r2", parentId: "r1", depth: 2, createdAt: "2026-10-01T12:00:00Z" }),
      comment({ id: "r3", parentId: "r2", depth: 3, createdAt: "2026-10-01T13:00:00Z" }),
    ]);
    expect(threads[0].replies[0].replies[0].replies[0].id).toBe("r3");
    expect(countComments(threads)).toBe(4);
  });

  it("keeps a deleted reply as a placeholder while it has visible replies", () => {
    const threads = buildThreads([
      comment({ id: "p1", createdAt: "2026-10-01T10:00:00Z" }),
      comment({ id: "r1", parentId: "p1", deleted: true, createdAt: "2026-10-01T11:00:00Z" }),
      comment({ id: "r2", parentId: "r1", createdAt: "2026-10-01T12:00:00Z" }),
      comment({ id: "r3", parentId: "p1", deleted: true, createdAt: "2026-10-01T13:00:00Z" }),
    ]);
    expect(threads[0].replies.map((r) => r.id)).toEqual(["r1"]);
    expect(countComments(threads)).toBe(2);
  });

  it("drops replies whose parent isn't visible", () => {
    const threads = buildThreads([comment({ id: "orphan", parentId: "missing" })]);
    expect(threads).toEqual([]);
  });

  it("keeps a deleted parent only while it still has replies", () => {
    const withReply = buildThreads([
      comment({ id: "p1", deleted: true }),
      comment({ id: "r1", parentId: "p1", createdAt: "2026-10-02T00:00:00Z" }),
    ]);
    expect(withReply).toHaveLength(1);
    expect(countComments(withReply)).toBe(1);
    expect(buildThreads([comment({ id: "p1", deleted: true })])).toEqual([]);
  });
});
