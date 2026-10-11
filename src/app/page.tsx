import { Suspense } from "react";
import { ExplorerSkeleton } from "@/components/data-states";
import { ExploreContent, SearchWithDestinations } from "@/components/explore-section";
import { ShareCallout } from "@/components/share-callout";

/*
 * Home: a compact headline + destination search, then the map with every
 * story front and centre (country filter, heatmap, paged feed).
 *
 * Deliberately NO AI here — nothing on this page calls Gemini, the
 * recommendations service or the chat. Destination-specific AI lessons and
 * the chat load only on a destination page, after a place is chosen.
 * (Enforced by src/lib/home-no-ai.test.ts.)
 */
export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <section className="border-b-[2.5px] border-black">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <div className="animate-fade-up">
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Travel smarter.{" "}
              <span className="inline-block bg-highlight px-2 text-black">Regret less.</span>
            </h1>
            <p className="mt-2 text-ink-muted">Little travel mistakes. Big lessons. Better trips.</p>
          </div>
          <div className="relative z-10 animate-fade-up" style={{ animationDelay: "80ms" }}>
            <Suspense fallback={<div className="h-12 animate-pulse rounded-full bg-card" />}>
              <SearchWithDestinations />
            </Suspense>
          </div>
        </div>
      </section>

      <div id="map" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-8 sm:px-6">
        <Suspense fallback={<ExplorerSkeleton />}>
          <ExploreContent searchParams={searchParams} />
        </Suspense>
      </div>

      <ShareCallout />
    </>
  );
}
