import type { Metadata } from "next";
import { Suspense } from "react";
import { ExplorerSkeleton } from "@/components/data-states";
import { ExploreContent, SearchWithDestinations } from "@/components/explore-section";
import { HeroCollage, type CollageItem } from "@/components/hero-collage";
import { HeroIllustration } from "@/components/hero-illustration";
import { ShareCallout } from "@/components/share-callout";
import { DataUnavailableError, listDestinations } from "@/lib/data";
import { destinationImage } from "@/lib/destination-images";
import { pluralize } from "@/lib/stories";

/*
 * Home: travel-journal hero (headline, destination search, photo postcards),
 * then the country map explorer with every story below it.
 *
 * Deliberately NO AI here — nothing on this page calls Gemini, the
 * recommendations service or the chat. Destination-specific AI lessons and
 * the chat load only on a destination page, after a place is chosen.
 * (Enforced by src/lib/home-no-ai.test.ts.)
 */

export const metadata: Metadata = { alternates: { canonical: "/" } };

/** Destinations shown as hero postcards (each must have a real photo and stories). */
const HERO_PICKS = ["kyoto", "machu-picchu", "hampi", "leh", "rome", "petra", "banff"];

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <section className="relative overflow-x-clip border-b-[2.5px] border-black">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="relative z-10">
            <h1 className="animate-fade-up font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Travel smarter.
              <br />
              <span className="relative inline-block bg-highlight px-2 text-black">Regret less.</span>
            </h1>
            <p className="mt-4 max-w-md animate-fade-up text-lg text-ink-muted" style={{ animationDelay: "80ms" }}>
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

      <div id="map" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-10 sm:px-6">
        <Suspense fallback={<ExplorerSkeleton />}>
          <ExploreContent searchParams={searchParams} />
        </Suspense>
      </div>

      <ShareCallout />
    </>
  );
}

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
  let withStories = 0;
  try {
    withStories = (await listDestinations()).filter((d) => d.storyCount > 0).length;
  } catch (error) {
    if (!(error instanceof DataUnavailableError)) throw error;
  }
  return (
    <>
      <SearchWithDestinations size="lg" />
      {withStories > 0 && (
        <p className="text-sm text-ink-muted">
          {pluralize(withStories, "place")} with travel lessons so far — or search any town in the world.
        </p>
      )}
    </>
  );
}
