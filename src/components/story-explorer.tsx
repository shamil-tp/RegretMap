"use client";

import { Info, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { ExploreMap } from "@/components/map/explore-map";
import { StoryCard } from "@/components/story-card";
import { StoryFilters, useStoryFilters } from "@/components/story-filters";
import { StateMessage } from "@/components/ui/state-message";
import { storiesToMapPoints } from "@/lib/map";
import type { StoryWithDestination } from "@/lib/stories";

/**
 * Map + filterable story feed. The same filtered list drives both the map pins
 * and the feed, so they always stay consistent.
 */
export function StoryExplorer({
  stories,
  mapHeading,
  storiesHeading,
  fitMapToStories = false,
  enableLocationPicker = false,
  aside,
}: {
  stories: StoryWithDestination[];
  mapHeading: string;
  storiesHeading: string;
  fitMapToStories?: boolean;
  enableLocationPicker?: boolean;
  /** Extra content shown under the map. */
  aside?: React.ReactNode;
}) {
  const { visible, ...filterState } = useStoryFilters(stories);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ id: string; key: number } | null>(
    null,
  );
  const points = useMemo(() => storiesToMapPoints(visible), [visible]);

  function showOnMap(id: string) {
    setHighlightedId(id);
    setFocusRequest((previous) => ({ id, key: (previous?.key ?? 0) + 1 }));
    document.getElementById("story-map")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      <aside aria-labelledby="map-heading" className="lg:sticky lg:top-6 lg:self-start">
        <h2 id="map-heading" className="text-lg font-semibold text-ink">
          {mapHeading}
        </h2>
        <div className="mt-4">
          <ExploreMap
            points={points}
            fitToPoints={fitMapToStories}
            highlightedPointId={highlightedId}
            focusRequest={focusRequest}
            onPointSelect={setHighlightedId}
            enableLocationPicker={enableLocationPicker}
          />
        </div>
        {aside}
      </aside>

      <section aria-labelledby="stories-heading">
        <h2 id="stories-heading" className="text-lg font-semibold text-ink">
          {storiesHeading}
        </h2>
        <p className="mt-2 flex gap-2 rounded-md bg-surface px-3 py-2.5 text-sm text-ink-muted">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          These are illustrative demo examples for development, not real community
          submissions.
        </p>
        <div className="mt-4">
          <StoryFilters
            {...filterState}
            visibleCount={visible.length}
            totalCount={stories.length}
          />
        </div>

        {visible.length > 0 ? (
          <div className="mt-2 divide-y divide-line">
            {visible.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                highlighted={story.id === highlightedId}
                onShowOnMap={() => showOnMap(story.id)}
              />
            ))}
          </div>
        ) : (
          <StateMessage
            icon={SearchX}
            title="No stories match these filters"
            description="Try another category or travel time."
          >
            <button
              type="button"
              onClick={filterState.reset}
              className="text-sm font-medium text-accent hover:underline"
            >
              Reset filters
            </button>
          </StateMessage>
        )}
      </section>
    </div>
  );
}
