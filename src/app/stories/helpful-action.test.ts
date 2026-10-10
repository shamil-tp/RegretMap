import { beforeEach, describe, expect, it, vi } from "vitest";

const STORY = "0b6f1c1e-4d1a-4c3e-9a51-6d2f0c8b1a01";
let viewer: { id: string; email: string; isModerator: boolean } | null = null;
const writes: { op: string; row?: unknown; filters: [string, unknown][] }[] = [];
let writeError: { code: string } | null = null;
let count = 3;

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
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { helpful_count: count }, error: null }) }) }) };
    },
  };
}

vi.mock("@/lib/supabase/session", () => ({
  getViewer: async () => viewer,
  createSessionClient: async () => client(),
}));

const { setHelpful } = await import("@/app/stories/helpful-action");

let userCounter = 0;
beforeEach(() => {
  viewer = { id: `user-${++userCounter}`, email: "a@example.com", isModerator: false };
  writes.length = 0;
  writeError = null;
  count = 3;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("setHelpful", () => {
  it("asks signed-out visitors to sign in and writes nothing", async () => {
    viewer = null;
    expect(await setHelpful({ storyId: STORY, helpful: true })).toEqual({ status: "signed_out" });
    expect(writes).toHaveLength(0);
  });

  it("marks helpful as the verified user and returns the database count", async () => {
    count = 4;
    expect(await setHelpful({ storyId: STORY, helpful: true })).toEqual({ status: "ok", helpful: true, count: 4 });
    expect(writes[0]).toMatchObject({ op: "insert", row: { story_id: STORY, user_id: viewer!.id } });
  });

  it("ignores any user id or count sent by the browser", async () => {
    const result = await setHelpful({ storyId: STORY, helpful: true, userId: "someone-else", count: 999 });
    expect(result).toMatchObject({ status: "error" });
    expect(writes).toHaveLength(0);
  });

  it("unmarks only the user's own reaction", async () => {
    await setHelpful({ storyId: STORY, helpful: false });
    expect(writes[0]).toMatchObject({ op: "delete" });
    expect(writes[0].filters).toContainEqual(["user_id", viewer!.id]);
    expect(writes[0].filters).toContainEqual(["story_id", STORY]);
  });

  it("treats a duplicate like (repeated request) as already done", async () => {
    writeError = { code: "23505" };
    expect(await setHelpful({ storyId: STORY, helpful: true })).toMatchObject({ status: "ok", helpful: true });
  });

  it("reports RLS refusals (e.g. unpublished story) and other failures honestly", async () => {
    writeError = { code: "42501" };
    expect(await setHelpful({ storyId: STORY, helpful: true })).toEqual({
      status: "error",
      message: "This story can't be marked helpful.",
    });
    writeError = { code: "08006" };
    expect(await setHelpful({ storyId: STORY, helpful: true })).toMatchObject({ status: "error" });
  });

  it("rejects malformed input", async () => {
    expect(await setHelpful({ storyId: "not-a-uuid", helpful: true })).toMatchObject({ status: "error" });
    expect(await setHelpful(null)).toMatchObject({ status: "error" });
  });

  it("rate-limits rapid toggling per user", async () => {
    const results = [];
    for (let i = 0; i < 31; i++) results.push(await setHelpful({ storyId: STORY, helpful: i % 2 === 0 }));
    expect(results.at(-1)).toMatchObject({ status: "error" });
  });
});
