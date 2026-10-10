"use client";

import { Info, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { ExploreMap } from "@/components/map/explore-map";
import { HeatmapLegend, MapLayerToggle } from "@/components/map/map-layer-controls";
import { StoryCard } from "@/components/story-card";
import { StoryFilters, useStoryFilters } from "@/components/story-filters";
import { buttonClasses } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { showsHeat, type MapLayers } from "@/lib/heatmap";
import type { HelpfulState } from "@/lib/helpful";
import { storiesToMapPoints } from "@/lib/map";
import type { StoryWithDestination } from "@/lib/stories";

/** Story cards rendered at a time; the map always shows every filtered story. */
const FEED_PAGE = 20;

/**
 * Map + filterable story feed. The same filtered list drives the map pins, the
 * story-density heatmap and the feed, so they always stay consistent.
 */
export function StoryExplorer({
  stories,
  mapHeading,
  storiesHeading,
  fitMapToStories = false,
  enableLocationPicker = false,
  aside,
  helpful,
}: {
  stories: StoryWithDestination[];
  mapHeading: string;
  storiesHeading: string;
  fitMapToStories?: boolean;
  enableLocationPicker?: boolean;
  /** Extra content shown under the map. */
  aside?: React.ReactNode;
  /** Helpful counts and the viewer's own reactions. */
  helpful?: HelpfulState;
}) {
  const { visible, ...filterState } = useStoryFilters(stories);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ id: string; key: number } | null>(
    null,
  );
  // Pins only by default; the story-density heatmap is one tap away.
  const [layers, setLayers] = useState<MapLayers>("pins");
  const points = useMemo(() => storiesToMapPoints(visible), [visible]);
  const hasDemo = stories.some((story) => story.isDemo);
  const withoutLocation = visible.length - points.length;
  // The page size resets whenever the filtered list changes.
  const [page, setPage] = useState({ list: visible, count: FEED_PAGE });
  const highlightedIndex = highlightedId ? visible.findIndex((s) => s.id === highlightedId) : -1;
  const shownCount = Math.max(page.list === visible ? page.count : FEED_PAGE, highlightedIndex + 1);
  const shown = visible.slice(0, shownCount);

  function showOnMap(id: string) {
    // A single story is found by its pin, so make sure pins are visible.
    if (layers === "heat") setLayers("both");
    setHighlightedId(id);
    setFocusRequest((previous) => ({ id, key: (previous?.key ?? 0) + 1 }));
    document.getElementById("story-map")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      <aside aria-labelledby="map-heading" className="lg:sticky lg:top-6 lg:self-start">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="map-heading" className="text-lg font-semibold text-ink">
            {mapHeading}
          </h2>
          <MapLayerToggle value={layers} onChange={setLayers} />
        </div>
        <div className="mt-4">
          <ExploreMap
            points={points}
            layers={layers}
            fitToPoints={fitMapToStories}
            highlightedPointId={highlightedId}
            focusRequest={focusRequest}
            onPointSelect={setHighlightedId}
            enableLocationPicker={enableLocationPicker}
            showDemoNote={hasDemo}
          />
        </div>
        <div aria-live="polite" className="mt-3 space-y-3">
          {points.length === 0 ? (
            <p className="text-sm text-ink-muted">
              {visible.length === 0
                ? "No stories match these filters, so the map is empty."
                : "None of these stories has a map location yet."}
            </p>
          ) : (
            withoutLocation > 0 && (
              <p className="text-xs text-ink-muted">
                {withoutLocation === 1
                  ? "1 story without a map location isn't shown on the map."
                  : `${withoutLocation} stories without a map location aren't shown on the map.`}
              </p>
            )
          )}
          {showsHeat(layers) && points.length > 0 && <HeatmapLegend />}
        </div>
        {aside}
      </aside>

      <section aria-labelledby="stories-heading">
        <h2 id="stories-heading" className="text-lg font-semibold text-ink">
          {storiesHeading}
        </h2>
        {hasDemo && (
          <p className="mt-2 flex gap-2 rounded-md bg-surface px-3 py-2.5 text-sm text-ink-muted">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            Stories marked &ldquo;Demo example&rdquo; are illustrative examples for
            development, not real community submissions.
          </p>
        )}
        <div className="mt-4">
          <StoryFilters
            {...filterState}
            visibleCount={visible.length}
            totalCount={stories.length}
          />
        </div>

        {visible.length > 0 && (
          <div className="mt-4 space-y-4">
            {shown.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                highlighted={story.id === highlightedId}
                onShowOnMap={() => showOnMap(story.id)}
                helpful={
                  helpful?.available
                    ? {
                        storyId: story.id,
                        count: helpful.counts[story.id] ?? 0,
                        helpful: helpful.liked.includes(story.id),
                        signedIn: helpful.signedIn,
                      }
                    : undefined
                }
              />
            ))}
          </div>
        )}
        {shown.length < visible.length && (
          <div className="mt-6 flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => setPage({ list: visible, count: shownCount + FEED_PAGE })}
              className={buttonClasses("secondary")}
            >
              Show more stories
            </button>
            <p className="text-xs text-ink-muted">
              Showing {shown.length} of {visible.length}
            </p>
          </div>
        )}
        {visible.length === 0 && (
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
