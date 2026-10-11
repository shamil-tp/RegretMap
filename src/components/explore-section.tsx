import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { CountryFilter } from "@/components/country-filter";
import { NoStoriesYet, renderDataError } from "@/components/data-states";
import { DestinationSearch } from "@/components/destination-search";
import { StoryExplorer } from "@/components/story-explorer";
import {
  DataUnavailableError,
  getCommentCounts,
  getHelpfulState,
  getStoriesByIds,
  type DestinationSummary,
  listCountries,
  listDestinations,
  listStorySummaries,
} from "@/lib/data";
import { defaultStoryFilters, filterAndSortStories } from "@/lib/story-filtering";
import { getViewer } from "@/lib/supabase/session";
import { formatLocation, pluralize, storyNoun } from "@/lib/stories";

/*
 * The map explorer (country filter + map/heatmap + paged story feed), shown
 * front and centre on the home page. No AI here.
 */

const FEATURED_DESTINATIONS = 10;
/** Cards rendered on the server; more load 10 at a time from the browser. */
const FIRST_PAGE = 10;

export async function SearchWithDestinations() {
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

export async function ExploreContent({ searchParams }: { searchParams: Promise<{ country?: string | string[] }> }) {
  const requested = (await searchParams).country;
  let destinations, countries, totalCount;
  try {
    [destinations, countries] = await Promise.all([listDestinations(), listCountries()]);
    totalCount = destinations.reduce((sum, d) => sum + d.storyCount, 0);
  } catch (error) {
    return renderDataError(error);
  }
  // Only a country that actually has stories is accepted from the URL.
  const country =
    typeof requested === "string" && countries.some((c) => c.country === requested) ? requested : null;

  let stories, firstPage;
  try {
    stories = await listStorySummaries(country ?? undefined);
    // The first page of cards is rendered on the server; the rest load on demand.
    const firstIds = filterAndSortStories(stories, defaultStoryFilters)
      .slice(0, FIRST_PAGE)
      .map((s) => s.id);
    firstPage = await getStoriesByIds(firstIds);
  } catch (error) {
    return renderDataError(error);
  }
  if (stories.length === 0) return <NoStoriesYet />;
  const viewer = await getViewer();
  const [helpful, commentCounts] = await Promise.all([
    getHelpfulState(firstPage.map((s) => s.id), viewer?.id ?? null),
    getCommentCounts(stories.map((s) => s.id)),
  ]);

  // Most-documented destinations first (within the chosen country); the rest stay one click away.
  const byStories = destinations
    .filter((d) => d.storyCount > 0 && (!country || d.country === country))
    .sort((a, b) => b.storyCount - a.storyCount || a.name.localeCompare(b.name));
  const featured = byStories.slice(0, FEATURED_DESTINATIONS);
  const rest = byStories.slice(FEATURED_DESTINATIONS);

  return (
    <>
      {/* Stacks on phones; one row from sm up. min-w-0 lets the filter shrink inside the card. */}
      <div className="brutal-card mb-8 flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <CountryFilter countries={countries} selected={country} totalCount={totalCount} />
        <p className="shrink-0 text-sm text-ink-muted">
          {country ? `${pluralize(stories.length, "story", "stories")} from ${country}` : `${countries.length} countries`}
        </p>
      </div>
      <StoryExplorer
        key={country ?? "all"}
        stories={stories}
        cards={firstPage}
        mapHeading={country ? `Stories in ${country}` : "Explore the map"}
        storiesHeading={country ? `Stories and travel notes from ${country}` : "Stories and travel notes"}
        fitMapToStories={Boolean(country)}
        enableLocationPicker
        helpful={helpful}
        commentCounts={commentCounts}
        aside={
          <>
            <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Destinations{country ? ` in ${country}` : ""}
            </h2>
            <DestinationList destinations={featured} />
            {rest.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer rounded py-2 text-sm font-medium text-accent hover:underline">
                  More destinations ({rest.length})
                </summary>
                {/* Compact on purpose: this list can run to hundreds of places. */}
                <ul className="flex flex-wrap gap-x-3 gap-y-1.5 pb-2 text-sm">
                  {rest.map((destination) => (
                    <li key={destination.slug}>
                      <Link
                        href={`/destinations/${destination.slug}`}
                        prefetch={false}
                        className="rounded text-ink hover:text-accent-hover hover:underline"
                      >
                        {destination.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        }
      />
    </>
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
