"use client";

import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import {
  defaultStoryFilters,
  filterAndSortStories,
  type StoryFilterState,
  type StorySort,
} from "@/lib/story-filtering";
import {
  storyCategories,
  travelSeasons,
  type StoryCategory,
  type TravelSeason,
  type TravelStory,
} from "@/lib/stories";

const sortLabels: Record<StorySort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  travel_month: "Travel month (Jan–Dec)",
};

type Filters = StoryFilterState;

const defaultFilters = defaultStoryFilters;

/** Client-side filtering and sorting over an already-loaded list of stories. */
export function useStoryFilters<T extends Pick<TravelStory, "category" | "travelMonth" | "publishedAt">>(
  stories: T[],
) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const visible = useMemo(() => filterAndSortStories(stories, filters), [stories, filters]);

  const categories = useMemo(
    () =>
      (Object.keys(storyCategories) as StoryCategory[]).filter((category) =>
        stories.some((story) => story.category === category),
      ),
    [stories],
  );

  return {
    filters,
    setFilters,
    visible,
    categories,
    isFiltered: filters.category !== "all" || filters.season !== "any",
    reset: () => setFilters((current) => ({ ...defaultFilters, sort: current.sort })),
  };
}

export function StoryFilters({
  filters,
  setFilters,
  categories,
  isFiltered,
  reset,
  visibleCount,
  totalCount,
}: Omit<ReturnType<typeof useStoryFilters>, "visible"> & {
  visibleCount: number;
  totalCount: number;
}) {
  const selectClasses =
    "rounded-md border border-line bg-canvas py-1.5 pl-2.5 pr-8 text-sm text-ink focus:border-ink-muted";

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label="Filter stories by category"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {(["all", ...categories] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filters.category === value}
            onClick={() => setFilters((f) => ({ ...f, category: value }))}
            className="shrink-0 rounded-full border border-line px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
          >
            {value === "all" ? "All" : storyCategories[value]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="flex items-center gap-2 text-ink-muted">
          Travelled
          <select
            value={filters.season}
            onChange={(e) =>
              setFilters((f) => ({ ...f, season: e.target.value as Filters["season"] }))
            }
            className={selectClasses}
          >
            <option value="any">Any time</option>
            {(Object.entries(travelSeasons) as [TravelSeason, { label: string }][]).map(
              ([value, season]) => (
                <option key={value} value={value}>
                  {season.label}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="flex items-center gap-2 text-ink-muted">
          Sort
          <select
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as StorySort }))}
            className={selectClasses}
          >
            {(Object.entries(sortLabels) as [StorySort, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {isFiltered && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 rounded text-accent hover:underline"
          >
            <RotateCcw aria-hidden className="size-3.5" />
            Reset filters
          </button>
        )}
        <p aria-live="polite" className="text-ink-muted sm:ml-auto">
          Showing {visibleCount} of {totalCount}
        </p>
      </div>
    </div>
  );
}
