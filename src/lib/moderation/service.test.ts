import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassifyResult } from "@/lib/moderation/gemini";

/*
 * In-memory stand-in for the two tables the service touches, supporting just
 * the query shapes it uses. Records every write so tests can assert that
 * stories.status is never changed.
 */
type Row = Record<string, unknown>;
const db: { stories: Row[]; story_moderation: Row[] } = { stories: [], story_moderation: [] };
const writes: { table: string; op: string; values: Row }[] = [];

function query(table: keyof typeof db) {
  const filters: ((row: Row) => boolean)[] = [];
  let mode: "select" | "update" = "select";
  let updateValues: Row = {};
  let limit = Infinity;
  const rows = () => db[table].filter((row) => filters.every((f) => f(row)));
  const builder = {
    select: () => builder,
    eq: (col: string, value: unknown) => (filters.push((r) => r[col] === value), builder),
    in: (col: string, values: unknown[]) => (filters.push((r) => values.includes(r[col])), builder),
    lt: (col: string, value: unknown) =>
      (filters.push((r) => (r[col] as number | string) < (value as number | string)), builder),
    order: () => builder,
    limit: (n: number) => ((limit = n), builder),
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    upsert: async (values: Row) => {
      writes.push({ table, op: "upsert", values });
      const existing = db[table].find((r) => r.story_id === values.story_id);
      if (existing) Object.assign(existing, values, { updated_at: new Date().toISOString() });
      else db[table].push({ ...values, updated_at: new Date().toISOString() });
      return { error: null };
    },
    update: (values: Row) => ((mode = "update"), (updateValues = values), builder),
    then: (resolve: (v: unknown) => unknown) => {
      if (mode === "update") {
        writes.push({ table, op: "update", values: updateValues });
        rows().forEach((r) => Object.assign(r, updateValues));
        return Promise.resolve(resolve({ error: null }));
      }
      return Promise.resolve(resolve({ data: rows().slice(0, limit), error: null }));
    },
  };
  return builder;
}

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({ from: (table: keyof typeof db) => query(table) }),
}));

const classifyStory = vi.fn<() => Promise<ClassifyResult>>();
vi.mock("@/lib/moderation/gemini", () => ({ classifyStory: () => classifyStory() }));

const { moderateStory, retryPendingModerations, MAX_MODERATION_ATTEMPTS } = await import(
  "@/lib/moderation/service"
);

const STORY_ID = "11111111-1111-4111-8111-111111111111";
const baseStory = {
  id: STORY_ID,
  status: "pending",
  title: "Missed the last bus",
  category: "transport",
  place_name: null,
  body: "The timetable online was wrong and I missed the last bus.",
  challenge: null,
  lesson: "Check locally.",
  advice: null,
};
const allow: ClassifyResult = {
  ok: true,
  model: "gemini-test",
  result: {
    decision: "allow_review",
    categories: [],
    reason_codes: ["ordinary_story"],
    summary: "Ordinary travel experience.",
    confidence: 0.9,
  },
};
const moderation = () => db.story_moderation.find((r) => r.story_id === STORY_ID);

beforeEach(() => {
  db.stories = [{ ...baseStory }];
  db.story_moderation = [];
  writes.length = 0;
  classifyStory.mockReset().mockResolvedValue(allow);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("moderateStory", () => {
  it("stores a validated result as a queue label and never changes the story", async () => {
    expect(await moderateStory(STORY_ID)).toBe("completed");
    expect(moderation()).toMatchObject({
      status: "completed",
      decision: "allow_review",
      queue_label: "clear",
      model: "gemini-test",
      attempts: 1,
      last_error: null,
    });
    expect(db.stories[0].status).toBe("pending");
    expect(writes.every((w) => w.table === "story_moderation")).toBe(true);
  });

  it("keeps a rejection as a recommendation; the story stays pending", async () => {
    classifyStory.mockResolvedValue({
      ok: true,
      model: "gemini-test",
      result: { decision: "reject_recommended", categories: ["spam"], reason_codes: ["advertising"], summary: "Advertising." },
    });
    await moderateStory(STORY_ID);
    expect(moderation()).toMatchObject({ queue_label: "reject_recommended", categories: ["spam"] });
    expect(db.stories[0].status).toBe("pending");
  });

  it("adds local contact/link signals to the model's categories", async () => {
    db.stories[0].body = "Message our guide at tours@example.com for discounts.";
    await moderateStory(STORY_ID);
    expect(moderation()).toMatchObject({ queue_label: "needs_attention", categories: ["personal_info"] });
  });

  it.each(["timeout", "quota", "network", "invalid_response"] as const)(
    "records a %s failure and keeps the story unpublished",
    async (error) => {
      classifyStory.mockResolvedValue({ ok: false, error, model: "gemini-test" });
      expect(await moderateStory(STORY_ID)).toBe("failed");
      expect(moderation()).toMatchObject({ status: "failed", last_error: error, queue_label: "unmoderated" });
      expect(db.stories[0].status).toBe("pending");
    },
  );

  it("is idempotent: a completed story is not sent to the model again", async () => {
    await moderateStory(STORY_ID);
    await moderateStory(STORY_ID);
    expect(classifyStory).toHaveBeenCalledTimes(1);
    expect(db.story_moderation).toHaveLength(1);
  });

  it("skips stories that are no longer pending (e.g. already published by a human)", async () => {
    db.stories[0].status = "published";
    expect(await moderateStory(STORY_ID)).toBe("skipped");
    expect(classifyStory).not.toHaveBeenCalled();
  });

  it("stops after the maximum number of attempts", async () => {
    classifyStory.mockResolvedValue({ ok: false, error: "quota" });
    for (let i = 0; i < MAX_MODERATION_ATTEMPTS + 2; i++) await moderateStory(STORY_ID);
    expect(classifyStory).toHaveBeenCalledTimes(MAX_MODERATION_ATTEMPTS);
    expect(moderation()?.attempts).toBe(MAX_MODERATION_ATTEMPTS);
    expect(db.story_moderation).toHaveLength(1);
  });
});

describe("retryPendingModerations", () => {
  it("retries an old failed moderation without creating another row", async () => {
    classifyStory.mockResolvedValueOnce({ ok: false, error: "timeout" });
    await moderateStory(STORY_ID);
    moderation()!.updated_at = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    expect(await retryPendingModerations(2)).toBe(1);
    expect(moderation()).toMatchObject({ status: "completed", attempts: 2 });
    expect(db.story_moderation).toHaveLength(1);
    expect(db.stories).toHaveLength(1);
  });

  it("does not immediately retry a failure that just happened", async () => {
    classifyStory.mockResolvedValueOnce({ ok: false, error: "quota" });
    await moderateStory(STORY_ID);
    expect(await retryPendingModerations(2)).toBe(0);
  });
});
