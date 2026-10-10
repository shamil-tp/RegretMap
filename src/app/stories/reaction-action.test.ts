import { beforeEach, describe, expect, it, vi } from "vitest";

const STORY = "0b6f1c1e-4d1a-4c3e-9a51-6d2f0c8b1a01";
let viewer: { id: string; email: string; isModerator: boolean } | null = null;
const writes: { op: string; row?: unknown; filters: [string, unknown][] }[] = [];
let writeError: { code: string } | null = null;

function client() {
  return {
    from: (table: string) => {
      if (table === "story_reactions") {
        return {
          insert: async (row: unknown) => (writes.push({ op: "insert", row, filters: [] }), { error: writeError }),
          delete: () => {
            const entry = { op: "delete", filters: [] as [string, unknown][] };
            writes.push(entry);
            const chain = {
              eq: (column: string, value: unknown) => (entry.filters.push([column, value]), chain),
              then: (ok: (v: unknown) => unknown) => Promise.resolve(ok({ error: writeError })),
            };
            return chain;
          },
        };
      }
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: { reaction_counts: { yikes: 2, bogus: 9, helpful: -1 } }, error: null }) }),
        }),
      };
    },
  };
}

vi.mock("@/lib/supabase/session", () => ({
  getViewer: async () => viewer,
  createSessionClient: async () => client(),
}));

const { setReaction } = await import("@/app/stories/reaction-action");

let n = 0;
beforeEach(() => {
  viewer = { id: `user-${++n}`, email: "a@example.com", isModerator: false };
  writes.length = 0;
  writeError = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("setReaction", () => {
  it("adds the viewer's own reaction and returns cleaned server counts", async () => {
    const result = await setReaction({ storyId: STORY, type: "yikes", on: true });
    expect(result).toEqual({ status: "ok", counts: { yikes: 2 } });
    expect(writes[0]).toMatchObject({ op: "insert", row: { story_id: STORY, user_id: viewer!.id, reaction_type: "yikes" } });
  });

  it("removes only the viewer's own reaction of that type", async () => {
    await setReaction({ storyId: STORY, type: "good_tip", on: false });
    expect(writes[0].filters).toEqual([
      ["story_id", STORY],
      ["user_id", viewer!.id],
      ["reaction_type", "good_tip"],
    ]);
  });

  it("rejects unknown reaction types and extra fields such as a user id", async () => {
    expect((await setReaction({ storyId: STORY, type: "love", on: true })).status).toBe("error");
    expect((await setReaction({ storyId: STORY, type: "yikes", on: true, userId: "someone" })).status).toBe("error");
    expect(writes).toHaveLength(0);
  });

  it("requires sign-in", async () => {
    viewer = null;
    expect(await setReaction({ storyId: STORY, type: "yikes", on: true })).toEqual({ status: "signed_out" });
  });

  it("treats a duplicate tap as success and RLS refusals as a clear error", async () => {
    writeError = { code: "23505" };
    expect((await setReaction({ storyId: STORY, type: "yikes", on: true })).status).toBe("ok");
    writeError = { code: "42501" };
    expect(await setReaction({ storyId: STORY, type: "yikes", on: true })).toMatchObject({ status: "error" });
  });
});
