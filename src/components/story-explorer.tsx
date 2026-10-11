"use client";

import { Info, Loader2, SearchX } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { loadStoryCards } from "@/app/stories/cards-action";
import { ExploreMap } from "@/components/map/explore-map";
import { HeatmapLegend, MapLayerToggle } from "@/components/map/map-layer-controls";
import { StoryCard, StoryCardSkeleton } from "@/components/story-card";
import { StoryFilters, useStoryFilters } from "@/components/story-filters";
import { buttonClasses } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { showsHeat, type MapLayers } from "@/lib/heatmap";
import type { HelpfulState } from "@/lib/helpful";
import { storiesToMapPoints } from "@/lib/map";
import type { StorySummary, StoryWithDestination } from "@/lib/stories";

/** Story cards per page; the map always shows every filtered story. */
const FEED_PAGE = 10;

/**
 * Map + filterable story feed. The same filtered list drives the map pins, the
 * story-density heatmap and the feed, so they always stay consistent.
 *
 * `stories` can be lightweight summaries: the full text for each card comes
 * from `cards` when already known, otherwise it's fetched a page at a time
 * (10 cards) as the visitor filters or presses "Show more".
 */
export function StoryExplorer({
  stories,
  cards = [],
  mapHeading,
  storiesHeading,
  fitMapToStories = false,
  enableLocationPicker = false,
  aside,
  helpful,
  commentCounts,
}: {
  stories: StorySummary[];
  /** Full stories already loaded on the server (e.g. the first page). */
  cards?: StoryWithDestination[];
  mapHeading: string;
  storiesHeading: string;
  fitMapToStories?: boolean;
  enableLocationPicker?: boolean;
  /** Extra content shown under the map. */
  aside?: React.ReactNode;
  /** Helpful counts and the viewer's own reactions. */
  helpful?: HelpfulState;
  /** Visible comment count per story id. */
  commentCounts?: Record<string, number>;
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

  const [cardCache, setCardCache] = useState(() => new Map(cards.map((card) => [card.id, card])));
  const [helpfulState, setHelpfulState] = useState(helpful);
  const [loadError, setLoadError] = useState<{ key: string; message: string } | null>(null);
  const [loadingCards, startLoading] = useTransition();
  const missing = shown.filter((story) => !cardCache.has(story.id)).map((story) => story.id);
  const missingKey = missing.join(",");

  useEffect(() => {
    if (!missingKey || loadingCards || loadError?.key === missingKey) return;
    startLoading(async () => {
      const result = await loadStoryCards({ ids: missingKey.split(",") }).catch(() => null);
      if (!result || result.status !== "ok") {
        setLoadError({
          key: missingKey,
          message: result?.message ?? "Stories couldn't be loaded. Check your connection.",
        });
        return;
      }
      setLoadError(null);
      setCardCache((previous) => {
        const next = new Map(previous);
        for (const story of result.stories) next.set(story.id, story);
        return next;
      });
      setHelpfulState((previous) =>
        previous && result.helpful.available
          ? {
              ...previous,
              counts: { ...previous.counts, ...result.helpful.counts },
              emoji: result.helpful.emoji ? { ...previous.emoji, ...result.helpful.emoji } : previous.emoji,
              mine: result.helpful.mine ? { ...previous.mine, ...result.helpful.mine } : previous.mine,
              liked: [...new Set([...previous.liked, ...result.helpful.liked])],
            }
          : previous,
      );
    });
  }, [missingKey, loadingCards, loadError]);

  function showOnMap(id: string) {
    // A single story is found by its pin, so make sure pins are visible.
    if (layers === "heat") setLayers("both");
    setHighlightedId(id);
    setFocusRequest((previous) => ({ id, key: (previous?.key ?? 0) + 1 }));
    document.getElementById("story-map")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      <aside aria-labelledby="map-heading" className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:pb-3 lg:pr-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="map-heading" className="text-lg font-semibold text-ink">
            {mapHeading}
          </h2>
          <MapLayerToggle value={layers} onChange={setLayers} />
        </div>
        <div className="mt-4">
          <ExploreMap
            tall
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
            {shown.map((summary) => {
              const story = cardCache.get(summary.id);
              if (!story) return <StoryCardSkeleton key={summary.id} />;
              return (
                <StoryCard
                  key={story.id}
                  story={story}
                  highlighted={story.id === highlightedId}
                  onShowOnMap={() => showOnMap(story.id)}
                  replies={commentCounts?.[story.id]}
                  helpful={
                    helpfulState?.available
                      ? {
                          storyId: story.id,
                          count: helpfulState.counts[story.id] ?? 0,
                          helpful: helpfulState.liked.includes(story.id),
                          signedIn: helpfulState.signedIn,
                          emoji: helpfulState.emoji ? (helpfulState.emoji[story.id] ?? {}) : undefined,
                          mine: helpfulState.mine?.[story.id] ?? [],
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>
        )}
        {loadError?.key === missingKey && missing.length > 0 && (
          <p role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm text-ink">
            {loadError.message}
            <button
              type="button"
              onClick={() => setLoadError(null)}
              className="font-medium text-accent hover:underline"
            >
              Try again
            </button>
          </p>
        )}
        <p aria-live="polite" className="sr-only">
          {loadingCards ? "Loading more stories…" : ""}
        </p>
        {shown.length < visible.length && (
          <div className="mt-6 flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => setPage({ list: visible, count: shownCount + FEED_PAGE })}
              disabled={loadingCards}
              className={buttonClasses("secondary")}
            >
              {loadingCards && <Loader2 aria-hidden className="size-4 animate-spin" />}
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
