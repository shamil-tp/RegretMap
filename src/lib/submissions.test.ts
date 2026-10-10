import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseSubmission, type StorySubmission } from "@/lib/story-submission";
import { DESTINATION_ID, validInput } from "@/test/submission-fixtures";

const getDestinationById = vi.fn();
const listDestinations = vi.fn();
vi.mock("@/lib/data", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/data")>()),
  getDestinationById: (id: string) => getDestinationById(id),
  listDestinations: () => listDestinations(),
}));

const insert = vi.fn();
const pendingCount = vi.fn();
const drafts = vi.fn();
const updates: { table: string; values: unknown }[] = [];
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => ({
      // insert(row).select(...).single(), or awaited directly (story_authors)
      insert: (row: unknown) => {
        const run = () => insert(table, row);
        return { select: () => ({ single: run }), then: (ok: never, fail: never) => run().then(ok, fail) };
      },
      select: () => ({
        eq: () => ({
          // Hourly cap query: .eq("is_demo", false).gte("created_at", ...)
          gte: () => pendingCount(),
          // Draft-proposal lookup: .eq("status","draft").ilike("name", ...).limit(...)
          ilike: () => ({ limit: () => drafts() }),
        }),
      }),
      // Publishing a reused draft: .update({...}).eq("id", ...)
      update: (values: unknown) => ({ eq: async () => (updates.push({ table, values }), { error: null }) }),
    }),
  }),
}));
const storyInserts = () => insert.mock.calls.filter(([table]) => table === "stories");

const { submitStory, resetSubmissionMemory, distanceKm, MAX_PENDING_PER_HOUR } = await import(
  "@/lib/submissions"
);
const { DataUnavailableError } = await import("@/lib/data");

const manali = {
  id: DESTINATION_ID,
  slug: "manali",
  name: "Manali",
  coordinates: { latitude: 32.24, longitude: 77.19 },
  isDemo: false,
};

function submission(overrides: Record<string, string> = {}): StorySubmission {
  const result = parseSubmission(validInput(overrides));
  if (!result.success) throw new Error(JSON.stringify(result.fieldErrors));
  return result.data;
}

beforeEach(() => {
  resetSubmissionMemory();
  getDestinationById.mockReset().mockResolvedValue(manali);
  listDestinations.mockReset().mockResolvedValue([manali]);
  drafts.mockReset().mockResolvedValue({ data: [], error: null });
  updates.length = 0;
  insert.mockReset().mockResolvedValue({ data: { id: "new-story-id" }, error: null });
  pendingCount.mockReset().mockResolvedValue({ count: 0, error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("submitStory", () => {
  it("publishes a valid story immediately as non-demo", async () => {
    const result = await submitStory(submission({ place: "Bus stand", travelMonth: "5" }));

    expect(result).toEqual({
      ok: true,
      destination: { name: "Manali", slug: "manali" },
      proposedDestination: false,
      storyId: "new-story-id",
    });
    expect(insert).toHaveBeenCalledTimes(1);
    const [table, row] = insert.mock.calls[0];
    expect(table).toBe("stories");
    expect(row).toMatchObject({
      destination_id: DESTINATION_ID,
      title: "The bus left earlier than listed",
      place_name: "Bus stand",
      travel_month: 5,
      latitude: null,
      longitude: null,
      status: "published",
      published_at: expect.any(String),
      is_demo: false,
    });
  });

  it("rejects a destination that doesn't exist or isn't published", async () => {
    getDestinationById.mockResolvedValue(null);
    expect(await submitStory(submission())).toEqual({ ok: false, reason: "invalid_destination" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects a map pin far from the destination", async () => {
    const result = await submitStory(submission({ latitude: "8.73", longitude: "76.71" }));
    expect(result).toEqual({ ok: false, reason: "location_too_far" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("stores a nearby map pin", async () => {
    await submitStory(submission({ latitude: "32.37", longitude: "77.25" }));
    expect(insert.mock.calls[0][1]).toMatchObject({ latitude: 32.37, longitude: 77.25 });
  });

  it("reports failure (not success) when the database write fails", async () => {
    insert.mockResolvedValue({ error: { code: "42501", message: "permission denied" } });
    expect(await submitStory(submission())).toEqual({ ok: false, reason: "unavailable" });
  });

  it("reports failure when the request throws (network error)", async () => {
    insert.mockRejectedValue(new Error("fetch failed"));
    expect(await submitStory(submission())).toEqual({ ok: false, reason: "unavailable" });
  });

  it("reports unavailable when destinations can't be loaded", async () => {
    getDestinationById.mockRejectedValue(new DataUnavailableError());
    expect(await submitStory(submission())).toEqual({ ok: false, reason: "unavailable" });
  });

  it("treats a repeated submission key as already received (no second write)", async () => {
    const input = submission();
    const first = await submitStory(input);
    const second = await submitStory(input);
    expect(first).toMatchObject({ ok: true, storyId: "new-story-id" });
    // No new row, so no storyId: moderation won't run twice for one story.
    expect(second).toMatchObject({ ok: true });
    expect(second).not.toHaveProperty("storyId");
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("treats a unique-key conflict from the database as already received", async () => {
    insert.mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate key" } });
    const result = await submitStory(submission());
    expect(result.ok).toBe(true);
    expect(result.ok && result.storyId).toBeFalsy();
  });

  it("flags the same story sent again from a new form as a duplicate", async () => {
    await submitStory(submission());
    const again = await submitStory(
      submission({ submissionKey: "1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d" }),
    );
    expect(again).toEqual({ ok: false, reason: "duplicate_content" });
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("does not log story content on failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    insert.mockResolvedValue({
      error: { code: "23514", message: "check violation", details: "Failing row contains (The bus left…)" },
    });
    await submitStory(submission());
    expect(log.mock.calls.flat().join(" ")).not.toContain("The bus left");
  });
});

describe("shared pending cap", () => {
  it("refuses new stories once the hourly pending cap is reached (nothing written)", async () => {
    pendingCount.mockResolvedValue({ count: MAX_PENDING_PER_HOUR, error: null });
    expect(await submitStory(submission())).toEqual({ ok: false, reason: "busy" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("fails closed when the cap can't be checked", async () => {
    pendingCount.mockResolvedValue({ count: null, error: { code: "57014", message: "timeout" } });
    expect(await submitStory(submission())).toEqual({ ok: false, reason: "unavailable" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("allows stories below the cap", async () => {
    pendingCount.mockResolvedValue({ count: MAX_PENDING_PER_HOUR - 1, error: null });
    expect((await submitStory(submission())).ok).toBe(true);
  });
});

describe("distanceKm", () => {
  it("is roughly right for known places", () => {
    const manaliToLeh = distanceKm(
      { latitude: 32.24, longitude: 77.19 },
      { latitude: 34.15, longitude: 77.58 },
    );
    expect(manaliToLeh).toBeGreaterThan(200);
    expect(manaliToLeh).toBeLessThan(230);
  });
});

const place = (overrides: Record<string, string> = {}) =>
  submission({
    locationType: "place",
    destinationId: undefined as unknown as string,
    placeName: "Solang Valley",
    placeContext: "Himachal Pradesh, India",
    placeRegion: "Himachal Pradesh",
    placeCountry: "India",
    placeKind: "valley",
    placeLatitude: "32.3166",
    placeLongitude: "77.1567",
    ...overrides,
  });

describe("place locations", () => {
  it("files a nearby place under the existing destination, with the place's pin", async () => {
    const result = await submitStory(place());
    expect(result).toMatchObject({ ok: true, destination: { slug: "manali" }, proposedDestination: false });
    expect(storyInserts()[0][1]).toMatchObject({
      destination_id: DESTINATION_ID,
      place_name: "Solang Valley",
      latitude: 32.3166,
      longitude: 77.1567,
      status: "published",
    });
  });

  it("prefers the user's own map pin over the place coordinates", async () => {
    await submitStory(place({ latitude: "32.30", longitude: "77.15" }));
    expect(storyInserts()[0][1]).toMatchObject({ latitude: 32.3, longitude: 77.15 });
  });

  it("creates and publishes a new destination for a place far from any destination", async () => {
    insert.mockImplementation(async (table: string) =>
      table === "destinations"
        ? { data: { id: "draft-1", name: "Baga Beach", slug: "baga-beach" }, error: null }
        : { data: { id: "new-story-id" }, error: null },
    );
    const result = await submitStory(
      place({ placeName: "Baga Beach", placeRegion: "Goa", placeLatitude: "15.5553", placeLongitude: "73.7517" }),
    );
    expect(result).toMatchObject({ ok: true, proposedDestination: true, destination: { name: "Baga Beach", slug: "baga-beach" } });
    const destinationInsert = insert.mock.calls.find(([table]) => table === "destinations")?.[1];
    expect(destinationInsert).toMatchObject({ slug: "baga-beach", name: "Baga Beach", region: "Goa", status: "published", is_demo: false });
    expect(storyInserts()[0][1]).toMatchObject({ destination_id: "draft-1", latitude: 15.5553, status: "published" });
  });

  it("reuses (and publishes) a nearby draft with the same name instead of creating another", async () => {
    drafts.mockResolvedValue({ data: [{ id: "draft-9", name: "Baga Beach", latitude: 15.556, longitude: 73.752 }], error: null });
    await submitStory(place({ placeName: "Baga Beach", placeLatitude: "15.5553", placeLongitude: "73.7517" }));
    expect(insert.mock.calls.some(([table]) => table === "destinations")).toBe(false);
    expect(storyInserts()[0][1]).toMatchObject({ destination_id: "draft-9" });
    expect(updates).toEqual([{ table: "destinations", values: { status: "published" } }]);
  });

  it("tries a new slug when the first one is taken", async () => {
    let destinationAttempts = 0;
    insert.mockImplementation(async (table: string, row: { slug?: string }) => {
      if (table !== "destinations") return { data: { id: "s" }, error: null };
      destinationAttempts += 1;
      return row.slug === "baga-beach"
        ? { data: null, error: { code: "23505" } }
        : { data: { id: "draft-2", name: "Baga Beach" }, error: null };
    });
    await submitStory(place({ placeName: "Baga Beach", placeLatitude: "15.55", placeLongitude: "73.75" }));
    expect(destinationAttempts).toBe(2);
    expect(insert.mock.calls.filter(([t]) => t === "destinations").map(([, r]) => r.slug)).toEqual(["baga-beach", "baga-beach-2"]);
  });

  it("rejects a place request without coordinates", () => {
    expect(() => place({ placeLatitude: "" })).toThrow();
  });

  it("reports unavailable (nothing saved) if destinations can't be loaded", async () => {
    listDestinations.mockRejectedValue(new DataUnavailableError());
    expect(await submitStory(place())).toEqual({ ok: false, reason: "unavailable" });
    expect(storyInserts()).toHaveLength(0);
  });
});

describe("authorship", () => {
  it("links a signed-in author privately; anonymous stories get no author row", async () => {
    await submitStory(submission(), { authorId: "user-1" });
    expect(insert.mock.calls.find(([table]) => table === "story_authors")?.[1]).toEqual({
      story_id: "new-story-id",
      user_id: "user-1",
    });
    insert.mockClear();
    resetSubmissionMemory();
    await submitStory(submission({ submissionKey: "1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d", title: "Another bus story here" }));
    expect(insert.mock.calls.some(([table]) => table === "story_authors")).toBe(false);
  });
});
