import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import {
  ExplorerSkeleton,
  NoStoriesYet,
  renderDataError,
} from "@/components/data-states";
import { DestinationSearch } from "@/components/destination-search";
import { ShareCallout } from "@/components/share-callout";
import { StoryExplorer } from "@/components/story-explorer";
import {
  DataUnavailableError,
  getHelpfulState,
  type DestinationSummary,
  listAllStories,
  listDestinations,
} from "@/lib/data";
import { getViewer } from "@/lib/supabase/session";
import { formatLocation, storyNoun } from "@/lib/stories";

const FEATURED_DESTINATIONS = 10;

export default function ExplorePage() {
  return (
    <>
      <section className="border-b border-line bg-strawberry/30">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Every journey leaves a lesson.
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
            Travel lessons from around the world: stories shared by travellers and
            practical notes from the RegretMap team, so you can avoid repeating
            common travel mistakes.
          </p>
          <div className="relative z-10 mt-6">
            <Suspense fallback={<div className="h-11 max-w-xl animate-pulse rounded-md bg-surface" />}>
              <SearchWithDestinations />
            </Suspense>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Suspense fallback={<ExplorerSkeleton />}>
          <ExploreContent />
        </Suspense>
      </div>

      <ShareCallout />
    </>
  );
}

async function SearchWithDestinations() {
  let destinations: Awaited<ReturnType<typeof listDestinations>> = [];
  try {
    destinations = await listDestinations();
  } catch (error) {
    // Place autocomplete still works without RegretMap destinations.
    if (!(error instanceof DataUnavailableError)) throw error;
  }
  return (
    <DestinationSearch
      destinations={destinations.map(
        ({ slug, name, region, country, storyCount, isDemo, coordinates }) => ({
          slug,
          name,
          region,
          country,
          storyCount,
          isDemo,
          coordinates,
        }),
      )}
    />
  );
}

async function ExploreContent() {
  let destinations, stories;
  try {
    [destinations, stories] = await Promise.all([listDestinations(), listAllStories()]);
  } catch (error) {
    return renderDataError(error);
  }
  if (stories.length === 0) return <NoStoriesYet />;
  const viewer = await getViewer();
  const helpful = await getHelpfulState(stories.map((s) => s.id), viewer?.id ?? null);
  // Most-documented destinations first; the rest stay one click away.
  const byStories = [...destinations].sort(
    (a, b) => b.storyCount - a.storyCount || a.name.localeCompare(b.name),
  );
  const featured = byStories.slice(0, FEATURED_DESTINATIONS);
  const rest = byStories.slice(FEATURED_DESTINATIONS);

  return (
    <StoryExplorer
      stories={stories}
      mapHeading="Explore the map"
      storiesHeading="Stories and travel notes"
      enableLocationPicker
      helpful={helpful}
      aside={
        <>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Destinations
          </h2>
          <DestinationList destinations={featured} />
          {rest.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer rounded py-2 text-sm font-medium text-accent hover:underline">
                More destinations ({rest.length})
              </summary>
              <DestinationList destinations={rest} />
            </details>
          )}
        </>
      }
    />
  );
}

function DestinationList({ destinations }: { destinations: DestinationSummary[] }) {
  return (
    <ul className="mt-2 divide-y divide-line">
      {destinations.map((destination) => (
        <li key={destination.slug}>
          <Link
            href={`/destinations/${destination.slug}`}
            className="group flex items-center justify-between gap-4 rounded py-3"
          >
            <span>
              <span className="font-medium text-ink group-hover:text-accent-hover">
                {destination.name}
              </span>
              <span className="block text-sm text-ink-muted">{formatLocation(destination)}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-sm text-ink-muted">
              {storyNoun(destination.storyCount, destination.isDemo)}
              <ChevronRight aria-hidden className="size-4" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
