import { seasonOf, type StoryCategory, type TravelSeason, type TravelStory } from "@/lib/stories";

export type StorySort = "newest" | "oldest" | "travel_month";

export type StoryFilterState = {
  category: StoryCategory | "all";
  season: TravelSeason | "any";
  sort: StorySort;
};

export const defaultStoryFilters: StoryFilterState = {
  category: "all",
  season: "any",
  sort: "newest",
};

/** Filters and sorts an already-loaded list of stories (pure; no mutation). */
export function filterAndSortStories<T extends TravelStory>(
  stories: T[],
  filters: StoryFilterState,
): T[] {
  const matches = stories.filter(
    (story) =>
      (filters.category === "all" || story.category === filters.category) &&
      (filters.season === "any" ||
        (story.travelMonth != null && seasonOf(story.travelMonth) === filters.season)),
  );
  return [...matches].sort((a, b) => {
    if (filters.sort === "oldest") return a.publishedAt.localeCompare(b.publishedAt);
    if (filters.sort === "travel_month") return (a.travelMonth ?? 13) - (b.travelMonth ?? 13);
    return b.publishedAt.localeCompare(a.publishedAt);
  });
}
