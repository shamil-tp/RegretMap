import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { DestinationSearch } from "@/components/destination-search";
import { ShareCallout } from "@/components/share-callout";
import { StoryExplorer } from "@/components/story-explorer";
import { listAllStories, listDestinations } from "@/lib/data";
import { pluralize } from "@/lib/stories";

export default async function ExplorePage() {
  const [destinations, stories] = await Promise.all([listDestinations(), listAllStories()]);

  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Every journey leaves a lesson.
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
            Learn from real travellers&apos; experiences, discover useful
            destination tips, and avoid repeating common travel mistakes.
          </p>
          <div className="relative z-10 mt-6">
            <DestinationSearch
              destinations={destinations.map(
                ({ slug, name, region, country, storyCount, coordinates }) => ({
                  slug,
                  name,
                  region,
                  country,
                  storyCount,
                  coordinates,
                }),
              )}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <StoryExplorer
          stories={stories}
          mapHeading="Explore the map"
          storiesHeading="Traveller stories"
          enableLocationPicker
          aside={
            <>
              <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink-muted">
                Destinations in the demo set
              </h2>
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
                        <span className="block text-sm text-ink-muted">
                          {destination.region}, {destination.country}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-sm text-ink-muted">
                        {pluralize(destination.storyCount, "demo story", "demo stories")}
                        <ChevronRight aria-hidden className="size-4" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          }
        />
      </div>

      <ShareCallout />
    </>
  );
}
