import { ArrowRight, MapPin, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CategoryBadge } from "@/components/category-badge";
import { renderDataError } from "@/components/data-states";
import { DestinationSearch } from "@/components/destination-search";
import { DestinationPhoto } from "@/components/destination-photo";
import { HeroCollage, type CollageItem } from "@/components/hero-collage";
import { HeroIllustration } from "@/components/hero-illustration";
import { ShareCallout } from "@/components/share-callout";
import { buttonClasses } from "@/components/ui/button";
import {
  DataUnavailableError,
  getStoriesByIds,
  listDestinations,
  listStorySummaries,
} from "@/lib/data";
import { destinationImage } from "@/lib/destination-images";
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
      <section className="relative overflow-x-clip border-b-[2.5px] border-black">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="relative z-10">
            <h1 className="animate-fade-up font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Travel smarter.
              <br />
              <span className="relative inline-block bg-highlight px-2 text-black [box-decoration-break:clone]">Regret less.</span>
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
          <div className="hidden md:block">
            <Suspense fallback={<HeroIllustration className="mx-auto w-full max-w-md" />}>
              <HeroVisual />
            </Suspense>
          </div>
        </div>
      </section>

      <Suspense fallback={<HomeSectionsSkeleton />}>
        <HomeSections />
      </Suspense>

      <ShareCallout />
    </>
  );
}

/** Destinations shown as hero postcards when they have a photo and stories. */
const HERO_PICKS = ["kyoto", "santorini", "machu-picchu", "hampi", "leh", "rome", "petra", "banff"];

async function HeroVisual() {
  let destinations: Awaited<ReturnType<typeof listDestinations>> = [];
  try {
    destinations = await listDestinations();
  } catch (error) {
    if (!(error instanceof DataUnavailableError)) throw error;
  }
  const items: CollageItem[] = HERO_PICKS.flatMap((slug) => {
    const destination = destinations.find((d) => d.slug === slug && d.storyCount > 0);
    const image = destinationImage(slug);
    return destination && image ? [{ slug, name: destination.name, image }] : [];
  });
  return items.length >= 3 ? (
    <HeroCollage items={items} />
  ) : (
    <HeroIllustration className="mx-auto w-full max-w-md animate-fade-up" />
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
            <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {top.map((destination, index) => (
                <li
                  key={destination.slug}
                  className="brutal-card brutal-card-hover group relative flex animate-pop-in flex-col overflow-hidden"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <DestinationPhoto
                    image={destinationImage(destination.slug)}
                    alt={destination.name}
                    sizes="(min-width: 1024px) 270px, 50vw"
                    className="aspect-[4/3]"
                  />
                  <div className="flex flex-1 flex-col p-3 sm:p-4">
                    <Link
                      href={`/destinations/${destination.slug}`}
                      className="font-semibold text-ink after:absolute after:inset-0 group-hover:text-accent-hover"
                    >
                      {destination.name}
                    </Link>
                    <span className="mt-0.5 truncate text-sm text-ink-muted">{formatLocation(destination)}</span>
                    <span className="mt-auto pt-2 text-xs font-medium text-ink-muted">
                      {pluralize(destination.storyCount, "story", "stories")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-start gap-4 rounded-xl border-2 border-line bg-sky/50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
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
    <article className="brutal-card brutal-card-hover group relative flex h-full flex-col overflow-hidden">
      <DestinationPhoto
        image={destinationImage(story.destination.slug)}
        alt={story.destination.name}
        sizes="(min-width: 1024px) 370px, (min-width: 640px) 50vw, 100vw"
        className="aspect-[16/9]"
      />
      <div className="flex flex-1 flex-col p-5">
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
      </div>
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
