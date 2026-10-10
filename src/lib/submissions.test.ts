import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseSubmission, type StorySubmission } from "@/lib/story-submission";
import { DESTINATION_ID, validInput } from "@/test/submission-fixtures";

const getDestinationById = vi.fn();
vi.mock("@/lib/data", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/data")>()),
  getDestinationById: (id: string) => getDestinationById(id),
}));

const insert = vi.fn();
const pendingCount = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => ({
      // insert(row).select("id").single()
      insert: (row: unknown) => ({ select: () => ({ single: () => insert(table, row) }) }),
      // Pending-cap query: select(...).eq("status","pending").gte("created_at", ...)
      select: () => ({ eq: () => ({ gte: () => pendingCount() }) }),
    }),
  }),
}));

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
  insert.mockReset().mockResolvedValue({ data: { id: "new-story-id" }, error: null });
  pendingCount.mockReset().mockResolvedValue({ count: 0, error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("submitStory", () => {
  it("stores a valid story as pending, non-demo and unpublished", async () => {
    const result = await submitStory(submission({ place: "Bus stand", travelMonth: "5" }));

    expect(result).toEqual({
      ok: true,
      destination: { name: "Manali", slug: "manali" },
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
      status: "pending",
      published_at: null,
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
