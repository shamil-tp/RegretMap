import { ArrowRight, MapPin, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CategoryBadge } from "@/components/category-badge";
import { renderDataError } from "@/components/data-states";
import { DestinationSearch } from "@/components/destination-search";
import { HeroIllustration } from "@/components/hero-illustration";
import { ShareCallout } from "@/components/share-callout";
import { buttonClasses } from "@/components/ui/button";
import {
  DataUnavailableError,
  getStoriesByIds,
  listDestinations,
  listStorySummaries,
} from "@/lib/data";
import { formatLocation, pluralize, type StoryWithDestination } from "@/lib/stories";

/*
 * Home: a travel-journal hero whose single job is the destination search,
 * plus a small amount of real discovery content from Supabase.
 *
 * Deliberately NO AI here — nothing on this page calls Gemini, the
 * recommendations service or the chat. Destination-specific AI lessons and
 * the chat load only on a destination page, after a place is chosen.
 * (Enforced by src/lib/home-no-ai.test.ts.)
 */

const LATEST_STORIES = 6;
const TOP_DESTINATIONS = 8;

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-x-clip border-b border-line bg-strawberry/30">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="relative z-10">
            <h1 className="animate-fade-up font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Travel smarter.
              <br />
              <span className="text-accent">Regret less.</span>
            </h1>
            <p
              className="mt-4 max-w-md animate-fade-up text-lg text-ink-muted"
              style={{ animationDelay: "80ms" }}
            >
              Little travel mistakes. Big lessons. Better trips.
            </p>
            <div className="mt-7 max-w-xl animate-fade-up" style={{ animationDelay: "160ms" }}>
              <Suspense fallback={<div className="h-14 animate-pulse rounded-full bg-card" />}>
                <HeroSearch />
              </Suspense>
            </div>
          </div>
          <HeroIllustration className="mx-auto hidden w-full max-w-md animate-fade-up md:block" />
        </div>
      </section>

      <Suspense fallback={<HomeSectionsSkeleton />}>
        <HomeSections />
      </Suspense>

      <ShareCallout />
    </>
  );
}

async function HeroSearch() {
  let destinations: Awaited<ReturnType<typeof listDestinations>> = [];
  try {
    destinations = await listDestinations();
  } catch (error) {
    // Place autocomplete still works without RegretMap destinations.
    if (!(error instanceof DataUnavailableError)) throw error;
  }
  const withStories = destinations.filter((d) => d.storyCount > 0).length;
  return (
    <>
      <DestinationSearch
        size="lg"
        destinations={destinations.map(({ slug, name, region, country, storyCount, isDemo, coordinates }) => ({
          slug,
          name,
          region,
          country,
          storyCount,
          isDemo,
          coordinates,
        }))}
      />
      {withStories > 0 && (
        <p className="text-sm text-ink-muted">
          {pluralize(withStories, "place")} with travel lessons so far — or search any town in the world.
        </p>
      )}
    </>
  );
}

async function HomeSections() {
  let latest: StoryWithDestination[];
  let top;
  try {
    const [summaries, destinations] = await Promise.all([listStorySummaries(), listDestinations()]);
    // Real community stories first, then the newest travel notes.
    const ordered = [
      ...summaries.filter((s) => s.source === "community"),
      ...summaries.filter((s) => s.source !== "community"),
    ];
    latest = await getStoriesByIds(ordered.slice(0, LATEST_STORIES).map((s) => s.id));
    top = destinations
      .filter((d) => d.storyCount > 0)
      .sort((a, b) => b.storyCount - a.storyCount || a.name.localeCompare(b.name))
      .slice(0, TOP_DESTINATIONS);
  } catch (error) {
    return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{renderDataError(error)}</div>;
  }

  return (
    <>
      {latest.length > 0 && (
        <section aria-labelledby="latest-heading" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="latest-heading" className="font-display text-2xl font-semibold tracking-tight text-ink">
              Fresh from the road
            </h2>
            <Link href="/explore" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
              All stories
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((story, index) => (
              <li key={story.id} className="animate-fade-up" style={{ animationDelay: `${index * 60}ms` }}>
                <StoryPostcard story={story} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {top.length > 0 && (
        <section aria-labelledby="places-heading" className="border-y border-line bg-card/60">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <h2 id="places-heading" className="font-display text-2xl font-semibold tracking-tight text-ink">
              Places with the most lessons
            </h2>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {top.map((destination) => (
                <li key={destination.slug}>
                  <Link
                    href={`/destinations/${destination.slug}`}
                    className="group flex h-full flex-col rounded-lg border border-line bg-card p-4 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-coral hover:shadow-md"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-ink group-hover:text-accent-hover">{destination.name}</span>
                      <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                    </span>
                    <span className="mt-0.5 text-sm text-ink-muted">{formatLocation(destination)}</span>
                    <span className="mt-auto pt-3 text-xs font-medium text-ink-muted">
                      {pluralize(destination.storyCount, "story", "stories")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-start gap-4 rounded-xl border border-line bg-sky/50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">See it on the map</h2>
            <p className="mt-1 max-w-lg text-ink-muted">
              Every pin is a lesson someone learned the hard way. Filter by country or by what went wrong.
            </p>
          </div>
          <Link href="/explore" className={buttonClasses("primary", "shrink-0")}>
            <MapIcon aria-hidden className="size-4" />
            Open the map
          </Link>
        </div>
      </section>
    </>
  );
}

function StoryPostcard({ story }: { story: StoryWithDestination }) {
  return (
    <article className="group relative flex h-full flex-col rounded-lg border border-line bg-card p-5 shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={story.category} />
        {story.source === "editorial" && (
          <span className="text-xs text-ink-muted">Travel note</span>
        )}
      </div>
      <h3 className="mt-3 break-words font-semibold leading-snug text-ink">
        <Link href={`/stories/${story.id}`} className="after:absolute after:inset-0 group-hover:text-accent-hover">
          {story.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">{story.body}</p>
      <p className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-medium text-ink">
        <MapPin aria-hidden className="size-3.5 text-accent" />
        {[story.destination.name, story.destination.country].filter(Boolean).join(", ")}
      </p>
    </article>
  );
}

function HomeSectionsSkeleton() {
  return (
    <div aria-hidden className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="h-7 w-56 animate-pulse rounded bg-surface" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-lg bg-surface" />
        ))}
      </div>
    </div>
  );
}
