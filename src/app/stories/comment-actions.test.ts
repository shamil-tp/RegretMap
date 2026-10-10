import { beforeEach, describe, expect, it, vi } from "vitest";

const STORY = "0b6f1c1e-4d1a-4c3e-9a51-6d2f0c8b1a01";
const COMMENT = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

let viewer: { id: string; email: string; isModerator: boolean } | null = null;
const calls: { op: string; payload?: unknown; filters: [string, unknown][] }[] = [];
let result: { data?: unknown; error: { code: string } | null } = { error: null };

function client() {
  return {
    from: (table: string) => {
      expect(table).toBe("story_comments");
      return {
        insert: async (payload: unknown) => (calls.push({ op: "insert", payload, filters: [] }), result),
        update: (payload: unknown) => {
          const entry = { op: "update", payload, filters: [] as [string, unknown][] };
          calls.push(entry);
          const chain = {
            eq: (column: string, value: unknown) => (entry.filters.push([column, value]), chain),
            select: async () => result,
          };
          return chain;
        },
      };
    },
    rpc: async (name: string, args: unknown) => (calls.push({ op: `rpc:${name}`, payload: args, filters: [] }), result),
  };
}

vi.mock("@/lib/supabase/session", () => ({
  getViewer: async () => viewer,
  createSessionClient: async () => client(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { postComment, editComment, deleteComment } = await import("@/app/stories/comment-actions");

let userCounter = 0;
beforeEach(() => {
  viewer = { id: `user-${++userCounter}`, email: "a@example.com", isModerator: false };
  calls.length = 0;
  result = { error: null };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("postComment", () => {
  it("inserts only story, parent and cleaned text — never an identity", async () => {
    const res = await postComment({ storyId: STORY, body: "  Thanks for this!  " });
    expect(res).toEqual({ status: "ok" });
    expect(calls[0]).toMatchObject({
      op: "insert",
      payload: { story_id: STORY, parent_id: null, body: "Thanks for this!" },
    });
  });

  it("supports replies to a parent comment", async () => {
    await postComment({ storyId: STORY, parentId: COMMENT, body: "Agreed" });
    expect(calls[0].payload).toMatchObject({ parent_id: COMMENT });
  });

  it("rejects attempts to supply a user id, author name or status", async () => {
    for (const extra of [{ userId: "someone-else" }, { user_id: "x" }, { authorName: "Admin" }, { status: "published" }]) {
      const res = await postComment({ storyId: STORY, body: "Hi", ...extra });
      expect(res.status).toBe("error");
    }
    expect(calls).toHaveLength(0);
  });

  it("requires sign-in", async () => {
    viewer = null;
    expect(await postComment({ storyId: STORY, body: "Hi" })).toEqual({ status: "signed_out" });
    expect(calls).toHaveLength(0);
  });

  it("rejects empty, oversized and malformed input before touching the database", async () => {
    expect((await postComment({ storyId: STORY, body: "   " })).status).toBe("error");
    expect((await postComment({ storyId: STORY, body: "x".repeat(1001) })).status).toBe("error");
    expect((await postComment({ storyId: "not-a-uuid", body: "Hi" })).status).toBe("error");
    expect((await postComment({ storyId: STORY, parentId: "nope", body: "Hi" })).status).toBe("error");
    expect(calls).toHaveLength(0);
  });

  it("reports RLS refusals (unpublished story, cross-story reply) without details", async () => {
    for (const code of ["42501", "23503", "23514"]) {
      result = { error: { code } };
      const res = await postComment({ storyId: STORY, parentId: COMMENT, body: "Hi" });
      expect(res).toEqual({ status: "error", message: "This comment can't be posted." });
    }
  });

  it("rate-limits a single user", async () => {
    const outcomes = [];
    for (let i = 0; i < 10; i++) outcomes.push((await postComment({ storyId: STORY, body: `Hi ${i}` })).status);
    expect(outcomes.slice(0, 8).every((s) => s === "ok")).toBe(true);
    expect(outcomes.at(-1)).toBe("error");
  });
});

describe("editComment", () => {
  it("updates only the body, scoped to the comment and story", async () => {
    result = { data: [{ id: COMMENT }], error: null };
    const res = await editComment({ storyId: STORY, commentId: COMMENT, body: "Updated" });
    expect(res).toEqual({ status: "ok" });
    expect(calls[0]).toMatchObject({ op: "update", payload: { body: "Updated" } });
    expect(calls[0].filters).toEqual([
      ["id", COMMENT],
      ["story_id", STORY],
    ]);
  });

  it("fails when RLS matches no row (someone else's comment)", async () => {
    result = { data: [], error: null };
    const res = await editComment({ storyId: STORY, commentId: COMMENT, body: "Hacked" });
    expect(res).toEqual({ status: "error", message: "This comment can't be edited." });
  });
});

describe("deleteComment", () => {
  it("deletes through the ownership-checking database function", async () => {
    result = { data: "deleted", error: null };
    expect(await deleteComment({ storyId: STORY, commentId: COMMENT })).toEqual({ status: "ok" });
    expect(calls[0]).toMatchObject({ op: "rpc:delete_story_comment", payload: { p_comment_id: COMMENT } });
  });

  it("refuses someone else's comment", async () => {
    result = { error: { code: "42501" } };
    expect(await deleteComment({ storyId: STORY, commentId: COMMENT })).toEqual({
      status: "error",
      message: "This comment can't be deleted.",
    });
  });

  it("requires sign-in", async () => {
    viewer = null;
    expect(await deleteComment({ storyId: STORY, commentId: COMMENT })).toEqual({ status: "signed_out" });
  });
});
