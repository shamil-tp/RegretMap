import { beforeEach, describe, expect, it, vi } from "vitest";
import { toFormData, validInput } from "@/test/submission-fixtures";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": currentIp }),
}));
let currentIp = "203.0.113.1";

const submitStory = vi.fn();
vi.mock("@/lib/submissions", () => ({ submitStory: (input: unknown) => submitStory(input) }));

// Capture work scheduled with after() instead of running it.
const scheduled: (() => Promise<void>)[] = [];
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
  after: (task: () => Promise<void>) => scheduled.push(task),
}));

const moderateStory = vi.fn();
const retryPendingModerations = vi.fn();
vi.mock("@/lib/moderation/service", () => ({
  moderateStory: (id: string) => moderateStory(id),
  retryPendingModerations: (n: number) => retryPendingModerations(n),
}));

const { submitStoryAction } = await import("@/app/submit/actions");
const idle = { status: "idle" } as const;

let ipCounter = 0;
beforeEach(() => {
  scheduled.length = 0;
  moderateStory.mockReset().mockResolvedValue("completed");
  retryPendingModerations.mockReset().mockResolvedValue(0);
  currentIp = `203.0.113.${++ipCounter}`;
  submitStory.mockReset().mockResolvedValue({
    ok: true,
    destination: { name: "Manali", slug: "manali" },
  });
});

describe("submitStoryAction", () => {
  it("returns a 'submitted' state only after the story is stored", async () => {
    const state = await submitStoryAction(idle, toFormData(validInput()));
    expect(state).toEqual({ status: "submitted", destinationName: "Manali", destinationSlug: "manali" });
    expect(submitStory).toHaveBeenCalledTimes(1);
  });

  it("ignores a forged status field in the payload", async () => {
    await submitStoryAction(idle, toFormData({ ...validInput(), status: "published" }));
    const input = submitStory.mock.calls[0][0];
    expect(input).not.toHaveProperty("status");
  });

  it("returns field errors and does not write invalid input", async () => {
    const state = await submitStoryAction(idle, toFormData(validInput({ title: "", category: "x" })));
    expect(state.status).toBe("invalid");
    if (state.status !== "invalid") return;
    expect(state.fieldErrors.title).toBeTruthy();
    expect(state.fieldErrors.category).toBeTruthy();
    expect(submitStory).not.toHaveBeenCalled();
  });

  it("rejects non-text values such as uploaded files", async () => {
    const formData = toFormData(validInput());
    formData.set("body", new File(["x"], "story.txt"));
    const state = await submitStoryAction(idle, formData);
    expect(state.status).toBe("error");
    expect(submitStory).not.toHaveBeenCalled();
  });

  it("rejects bot submissions caught by the honeypot", async () => {
    const state = await submitStoryAction(idle, toFormData(validInput({ website: "spam" })));
    expect(state.status).toBe("error");
    expect(submitStory).not.toHaveBeenCalled();
  });

  it("maps a database failure to an honest error message", async () => {
    submitStory.mockResolvedValue({ ok: false, reason: "unavailable" });
    const state = await submitStoryAction(idle, toFormData(validInput()));
    expect(state.status).toBe("error");
    if (state.status === "error") expect(state.message).toMatch(/couldn't save/);
  });

  it("maps an invalid destination and far pin to field errors", async () => {
    submitStory.mockResolvedValueOnce({ ok: false, reason: "invalid_destination" });
    const a = await submitStoryAction(idle, toFormData(validInput()));
    expect(a.status === "invalid" && a.fieldErrors.destinationId).toBeTruthy();

    submitStory.mockResolvedValueOnce({ ok: false, reason: "location_too_far" });
    const b = await submitStoryAction(idle, toFormData(validInput()));
    expect(b.status === "invalid" && b.fieldErrors.latitude).toBeTruthy();
  });

  it("maps a full moderation queue to an honest 'busy' message", async () => {
    submitStory.mockResolvedValue({ ok: false, reason: "busy" });
    const state = await submitStoryAction(idle, toFormData(validInput()));
    expect(state.status === "error" && state.message).toMatch(/Nothing was saved/);
  });

  it("rate-limits repeated submissions from one IP", async () => {
    const states = [];
    for (let i = 0; i < 6; i++) states.push(await submitStoryAction(idle, toFormData(validInput())));
    expect(states.slice(0, 5).every((s) => s.status === "submitted")).toBe(true);
    expect(states[5].status).toBe("error");
    expect(submitStory).toHaveBeenCalledTimes(5);
  });

  it("caps submissions globally even when every request forges a new IP", async () => {
    // Fresh module so the per-instance counters start at zero.
    vi.resetModules();
    const { submitStoryAction: fresh } = await import("@/app/submit/actions");
    const states = [];
    for (let i = 0; i < 31; i++) {
      currentIp = `10.9.${Math.floor(i / 200)}.${i}`; // forged X-Forwarded-For each time
      states.push(await fresh(idle, toFormData(validInput())));
    }
    expect(states.slice(0, 30).every((s) => s.status === "submitted")).toBe(true);
    expect(states[30].status).toBe("error");
  });

  it("schedules AI moderation for a newly stored story, after responding", async () => {
    submitStory.mockResolvedValue({
      ok: true,
      destination: { name: "Manali", slug: "manali" },
      storyId: "new-story-id",
    });
    const state = await submitStoryAction(idle, toFormData(validInput()));
    expect(state.status).toBe("submitted");
    expect(moderateStory).not.toHaveBeenCalled(); // not before the response
    expect(scheduled).toHaveLength(1);
    await scheduled[0]();
    expect(moderateStory).toHaveBeenCalledWith("new-story-id");
    expect(retryPendingModerations).toHaveBeenCalledWith(2);
  });

  it("does not schedule moderation for a repeated submit (no new story)", async () => {
    await submitStoryAction(idle, toFormData(validInput()));
    expect(scheduled).toHaveLength(0);
  });

  it("keeps the user's result honest even if moderation crashes later", async () => {
    submitStory.mockResolvedValue({
      ok: true,
      destination: { name: "Manali", slug: "manali" },
      storyId: "new-story-id",
    });
    moderateStory.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const state = await submitStoryAction(idle, toFormData(validInput()));
    await expect(scheduled[0]()).resolves.toBeUndefined();
    expect(state.status).toBe("submitted");
  });
});
