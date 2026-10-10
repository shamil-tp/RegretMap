import {
  seasonOf,
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
        seasonLabel:
          seasons.size === 1 && onlySeason ? travelSeasons[onlySeason].label : undefined,
      };
    });
}
