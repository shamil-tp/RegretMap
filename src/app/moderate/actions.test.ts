import { beforeEach, describe, expect, it, vi } from "vitest";

const STORY = "0b6f1c1e-4d1a-4c3e-9a51-6d2f0c8b1a01";
let viewer: { id: string; email: string; isModerator: boolean } | null = null;
let story: Record<string, unknown> | null = null;
const updates: { table: string; values: Record<string, unknown> }[] = [];

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/supabase/session", () => ({ getViewer: async () => viewer }));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: story, error: null }) }) }),
      update: (values: Record<string, unknown>) => {
        updates.push({ table, values });
        const chain = {
          eq: () => chain,
          select: async () => ({ data: [{ id: STORY }], error: null }),
          then: (ok: (v: unknown) => unknown) => Promise.resolve(ok({ error: null })),
        };
        return chain;
      },
    }),
  }),
}));

const { decideStory } = await import("@/app/moderate/actions");

beforeEach(() => {
  viewer = { id: "mod-1", email: "mod@example.com", isModerator: true };
  story = { id: STORY, status: "pending", destination: { id: "d1", slug: "manali", status: "published" } };
  updates.length = 0;
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("decideStory", () => {
  it("refuses non-moderators and signed-out users without touching data", async () => {
    viewer = { id: "u1", email: "user@example.com", isModerator: false };
    expect(await decideStory({ storyId: STORY, decision: "publish" })).toMatchObject({ status: "error" });
    viewer = null;
    expect(await decideStory({ storyId: STORY, decision: "publish" })).toMatchObject({ status: "error" });
    expect(updates).toHaveLength(0);
  });

  it("publishes a pending story with a published_at date", async () => {
    expect(await decideStory({ storyId: STORY, decision: "publish" })).toMatchObject({ status: "ok" });
    expect(updates).toEqual([{ table: "stories", values: { status: "published", published_at: expect.any(String) } }]);
  });

  it("also publishes a proposed (draft) destination", async () => {
    story = { ...story, destination: { id: "d2", slug: "baga-beach", status: "draft" } };
    await decideStory({ storyId: STORY, decision: "publish" });
    expect(updates[0]).toEqual({ table: "destinations", values: { status: "published" } });
  });

  it("rejects without publishing the destination", async () => {
    story = { ...story, destination: { id: "d2", slug: "baga-beach", status: "draft" } };
    await decideStory({ storyId: STORY, decision: "reject" });
    expect(updates).toEqual([{ table: "stories", values: { status: "rejected" } }]);
  });

  it("only decides pending stories", async () => {
    story = { ...story, status: "published" };
    expect(await decideStory({ storyId: STORY, decision: "reject" })).toMatchObject({ status: "error" });
    expect(updates).toHaveLength(0);
  });

  it("rejects malformed input", async () => {
    expect(await decideStory({ storyId: STORY, decision: "delete" })).toMatchObject({ status: "error" });
    expect(updates).toHaveLength(0);
  });
});
