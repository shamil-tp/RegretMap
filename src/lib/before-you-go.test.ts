import { describe, expect, it } from "vitest";
import { buildBeforeYouGo, evidenceLabel } from "@/lib/before-you-go";
import { story } from "@/test/fixtures";

describe("buildBeforeYouGo", () => {
  it("quotes lessons with links back to their source stories", () => {
    const items = buildBeforeYouGo([
      story({ id: "s1", category: "packing", lesson: "Bring boots.", travelMonth: 1 }),
      story({ id: "s2", category: "packing", lesson: "Spare socks.", travelMonth: 2 }),
      story({ id: "s3", category: "transport", lesson: "Leave early.", travelMonth: 7 }),
    ]);

    expect(items[0]).toMatchObject({
      category: "packing",
      storyCount: 2,
      lessons: [
        { storyId: "s1", text: "Bring boots." },
        { storyId: "s2", text: "Spare socks." },
      ],
      seasonLabel: "Dec–Feb",
    });
    expect(items[1]).toMatchObject({ category: "transport", storyCount: 1 });
  });

  it("only cites stories that were passed in", () => {
    const input = [story({ id: "x", lesson: "A lesson." }), story({ id: "y", lesson: "Another." })];
    const cited = buildBeforeYouGo(input).flatMap((item) => item.lessons.map((l) => l.storyId));
    expect(cited.every((id) => input.some((s) => s.id === id))).toBe(true);
  });

  it("omits the season label when supporting stories span seasons", () => {
    const [item] = buildBeforeYouGo([
      story({ category: "costs", lesson: "One.", travelMonth: 1 }),
      story({ category: "costs", lesson: "Two.", travelMonth: 7 }),
    ]);
    expect(item.seasonLabel).toBeUndefined();
  });

  it("returns nothing when no story has a lesson", () => {
    expect(buildBeforeYouGo([story(), story()])).toEqual([]);
  });
});

describe("evidence labels", () => {
  it("counts editorial travel notes separately from traveller stories", () => {
    const items = buildBeforeYouGo([
      story({ id: "c1", category: "transport", lesson: "Leave early." }),
      story({ id: "e1", category: "transport", lesson: "Check the ferry.", source: "editorial" }),
      story({ id: "e2", category: "planning", lesson: "Book ahead.", source: "editorial" }),
    ]);
    const transport = items.find((i) => i.category === "transport")!;
    expect(transport.editorialCount).toBe(1);
    expect(evidenceLabel(transport.storyCount, transport.editorialCount, false)).toBe(
      "Based on 1 traveller story and 1 travel note",
    );
  });

  it("never calls an editorial note a traveller's report", () => {
    expect(evidenceLabel(1, 1, false)).toBe("From one RegretMap travel note");
    expect(evidenceLabel(3, 3, false)).toBe("Based on 3 RegretMap travel notes");
    expect(evidenceLabel(1, 0, false)).toBe("One traveller reported this");
    expect(evidenceLabel(2, 0, false)).toBe("Based on 2 stories");
  });
});
