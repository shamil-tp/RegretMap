import {
  pluralize,
  seasonOf,
  storyNoun,
  travelSeasons,
  type StoryCategory,
  type TravelStory,
} from "@/lib/stories";

const headings: Record<StoryCategory, string> = {
  transport: "Getting there and around",
  planning: "Planning and timing",
  weather: "Weather and seasons",
  packing: "What to pack",
  activity: "Activities and pacing",
  accessibility: "Accessibility",
  safety: "Staying safe",
  costs: "Money and costs",
  local_customs: "Local customs",
  other: "Other lessons",
};

export type BeforeYouGoItem = {
  category: StoryCategory;
  heading: string;
  /** Lessons quoted from the source stories, each linked to its story. */
  lessons: { storyId: string; text: string }[];
  storyCount: number;
  /** How many of those are RegretMap travel notes rather than personal accounts. */
  editorialCount: number;
  /** Set only when every supporting story shares the same travel season. */
  seasonLabel?: string;
};

/**
 * Groups stories' own "lesson" text by category. No text is generated or
 * rewritten — each item quotes travellers and links back to the source story.
 */
export function buildBeforeYouGo(stories: TravelStory[], limit = 4): BeforeYouGoItem[] {
  const groups = new Map<StoryCategory, TravelStory[]>();
  for (const story of stories) {
    if (!story.lesson) continue;
    groups.set(story.category, [...(groups.get(story.category) ?? []), story]);
  }

  return [...groups.entries()]
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, limit)
    .map(([category, group]) => {
      const seasons = new Set(
        group.map((s) => (s.travelMonth ? seasonOf(s.travelMonth) : null)),
      );
      const [onlySeason] = seasons;
      return {
        category,
        heading: headings[category],
        lessons: group.slice(0, 3).map((s) => ({ storyId: s.id, text: s.lesson! })),
        storyCount: group.length,
        editorialCount: group.filter((s) => s.source === "editorial").length,
        seasonLabel:
          seasons.size === 1 && onlySeason ? travelSeasons[onlySeason].label : undefined,
      };
    });
}

/** Honest evidence label: personal accounts and editorial notes are counted separately. */
export function evidenceLabel(storyCount: number, editorialCount: number, fromDemo: boolean) {
  const community = storyCount - editorialCount;
  if (editorialCount === 0) {
    return storyCount === 1 ? "One traveller reported this" : `Based on ${storyNoun(storyCount, fromDemo)}`;
  }
  if (community === 0) {
    return editorialCount === 1
      ? "From one RegretMap travel note"
      : `Based on ${pluralize(editorialCount, "RegretMap travel note")}`;
  }
  return `Based on ${pluralize(community, "traveller story", "traveller stories")} and ${pluralize(editorialCount, "travel note")}`;
}
