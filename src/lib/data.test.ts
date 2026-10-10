import { beforeEach, describe, expect, it, vi } from "vitest";
import { storyRow } from "@/test/fixtures";

type Call = [method: string, ...args: unknown[]];

/** Minimal chainable stand-in for the Supabase query builder. */
function fakeQuery(result: { data: unknown; error: unknown } | Error) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["from", "select", "eq", "order", "limit", "maybeSingle"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    result instanceof Error ? reject(result) : resolve(result);
  return { client: builder, calls };
}

const getSupabase = vi.fn();
vi.mock("@/lib/supabase/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabase/server")>()),
  getSupabase: () => getSupabase(),
}));

const data = await import("@/lib/data");
const { SupabaseConfigError } = await import("@/lib/supabase/server");

beforeEach(() => {
  getSupabase.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("listStoriesForDestination", () => {
  it("queries only published stories of published destinations, newest first, bounded", async () => {
    const { client, calls } = fakeQuery({ data: [storyRow()], error: null });
    getSupabase.mockReturnValue(client);

    const stories = await data.listStoriesForDestination("dest-a");

    expect(stories).toHaveLength(1);
    expect(stories[0].title).toBe("A test story");
    expect(calls).toContainEqual(["from", "stories"]);
    expect(calls).toContainEqual(["eq", "destination_id", "dest-a"]);
    expect(calls).toContainEqual(["eq", "status", "published"]);
    expect(calls).toContainEqual(["eq", "destination.status", "published"]);
    expect(calls).toContainEqual(["order", "published_at", { ascending: false }]);
    expect(calls).toContainEqual(["limit", data.STORY_LIMIT.perDestination]);
  });

  it("selects only the columns the UI needs (no internal fields)", async () => {
    const { client, calls } = fakeQuery({ data: [], error: null });
    getSupabase.mockReturnValue(client);

    await data.listStoriesForDestination("dest-b");

    const select = calls.find(([method]) => method === "select")?.[1] as string;
    expect(select).not.toContain("*");
    expect(select).not.toMatch(/\bstatus\b|author|moderation/);
  });

  it("throws DataUnavailableError on a Supabase error without leaking details", async () => {
    const { client } = fakeQuery({ data: null, error: { message: "permission denied for table stories" } });
    getSupabase.mockReturnValue(client);

    const promise = data.listStoriesForDestination("dest-c");
    await expect(promise).rejects.toBeInstanceOf(data.DataUnavailableError);
    await expect(promise).rejects.not.toThrow(/permission denied/);
  });

  it("throws DataUnavailableError when the request itself fails", async () => {
    const { client } = fakeQuery(new Error("fetch failed"));
    getSupabase.mockReturnValue(client);

    await expect(data.listStoriesForDestination("dest-d")).rejects.toBeInstanceOf(
      data.DataUnavailableError,
    );
  });

  it("throws DataUnavailableError when Supabase is not configured", async () => {
    getSupabase.mockImplementation(() => {
      throw new SupabaseConfigError("not configured");
    });

    await expect(data.listStoriesForDestination("dest-e")).rejects.toBeInstanceOf(
      data.DataUnavailableError,
    );
  });
});

describe("getStoryById", () => {
  it("returns null for a non-UUID id without querying the database", async () => {
    expect(await data.getStoryById("demo-manali-arrival")).toBeNull();
    expect(getSupabase).not.toHaveBeenCalled();
  });

  it("returns null when no published story matches", async () => {
    const { client, calls } = fakeQuery({ data: null, error: null });
    getSupabase.mockReturnValue(client);

    expect(await data.getStoryById("0b6f1c1e-4d1a-4c3e-9a51-6d2f0c8b1a99")).toBeNull();
    expect(calls).toContainEqual(["eq", "status", "published"]);
    expect(calls).toContainEqual(["maybeSingle"]);
  });
});

describe("getDestinationBySlug", () => {
  it("looks up a published destination by slug", async () => {
    const { client, calls } = fakeQuery({
      data: {
        id: "d1",
        slug: "manali",
        name: "Manali",
        region: "Himachal Pradesh",
        country: "India",
        description: null,
        latitude: 32.2,
        longitude: 77.2,
        is_demo: true,
      },
      error: null,
    });
    getSupabase.mockReturnValue(client);

    const destination = await data.getDestinationBySlug("manali");
    expect(destination?.name).toBe("Manali");
    expect(calls).toContainEqual(["eq", "slug", "manali"]);
    expect(calls).toContainEqual(["eq", "status", "published"]);
  });
});

describe("listDestinations", () => {
  it("returns published destinations with published story counts", async () => {
    const { client, calls } = fakeQuery({
      data: [
        {
          id: "d1",
          slug: "leh",
          name: "Leh",
          region: "Ladakh",
          country: "India",
          description: null,
          latitude: null,
          longitude: null,
          is_demo: false,
          stories: [{ count: 3 }],
        },
      ],
      error: null,
    });
    getSupabase.mockReturnValue(client);

    const [leh] = await data.listDestinations();
    expect(leh).toMatchObject({ slug: "leh", storyCount: 3, coordinates: undefined });
    expect(calls).toContainEqual(["eq", "status", "published"]);
    expect(calls).toContainEqual(["eq", "stories.status", "published"]);
  });
});

describe("stories.source migration not applied yet", () => {
  it("retries without the source column instead of failing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const missing = fakeQuery({
      data: null,
      error: { code: "42703", message: "column stories.source does not exist" },
    });
    const legacyRow = { ...storyRow(), source: undefined };
    const legacy = fakeQuery({ data: [legacyRow], error: null });
    getSupabase.mockReturnValueOnce(missing.client).mockReturnValueOnce(legacy.client);

    const stories = await data.listAllStories();

    expect(stories).toHaveLength(1);
    expect(stories[0].source).toBe("community");
    const legacySelect = legacy.calls.find(([method]) => method === "select")?.[1] as string;
    expect(legacySelect).not.toMatch(/\bsource\b/);
  });
});
