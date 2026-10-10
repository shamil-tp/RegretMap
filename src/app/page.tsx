import { Info } from "lucide-react";
import { DestinationSearch } from "@/components/destination-search";
import { ExploreMap } from "@/components/map/explore-map";
import { StoryFeed } from "@/components/story-feed";
import { buttonClasses } from "@/components/ui/button";
import { demoStories } from "@/lib/demo-stories";
import type { MapPoint } from "@/lib/map";

/** Only the fields the map needs are sent to the client map component. */
function demoMapPoints(): MapPoint[] {
  return demoStories.flatMap((story) =>
    story.latitude != null && story.longitude != null
      ? [
          {
            id: story.id,
            latitude: story.latitude,
            longitude: story.longitude,
            title: story.title,
            place: `${story.destination}, ${story.region}`,
            category: story.category,
            isDemo: story.isDemo,
          },
        ]
      : [],
  );
}

function demoDestinations() {
  const byName = new Map<string, { region: string; count: number }>();
  for (const story of demoStories) {
    const entry = byName.get(story.destination);
    if (entry) entry.count += 1;
    else byName.set(story.destination, { region: story.region, count: 1 });
  }
  return [...byName].map(([name, value]) => ({ name, ...value }));
}

export default function ExplorePage() {
  const destinations = demoDestinations();

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
          <div className="mt-6">
            <DestinationSearch />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <aside aria-labelledby="map-heading" className="lg:sticky lg:top-6 lg:self-start">
          <h2 id="map-heading" className="text-lg font-semibold text-ink">
            Explore the map
          </h2>
          <div className="mt-4">
            <ExploreMap points={demoMapPoints()} />
          </div>

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Destinations in the demo set
          </h2>
          <ul className="mt-2 divide-y divide-line">
            {destinations.map((destination) => (
              <li
                key={destination.name}
                className="flex items-baseline justify-between gap-4 py-3"
              >
                <span>
                  <span className="font-medium text-ink">{destination.name}</span>
                  <span className="block text-sm text-ink-muted">
                    {destination.region}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-ink-muted">
                  {destination.count} demo{" "}
                  {destination.count === 1 ? "example" : "examples"}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <section aria-labelledby="stories-heading">
          <h2 id="stories-heading" className="text-lg font-semibold text-ink">
            Traveller stories
          </h2>
          <p className="mt-2 flex gap-2 rounded-md bg-surface px-3 py-2.5 text-sm text-ink-muted">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            These are illustrative demo examples for development, not real
            community submissions.
          </p>
          <div className="mt-4">
            <StoryFeed stories={demoStories} />
          </div>
        </section>
      </div>

      <section
        id="share"
        aria-labelledby="share-heading"
        className="scroll-mt-6 border-t border-line bg-surface"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2
              id="share-heading"
              className="font-display text-2xl font-semibold tracking-tight text-ink"
            >
              Share an experience
            </h2>
            <p className="mt-2 text-ink-muted">
              Had a trip that taught you something? Your story can help the
              next traveller prepare better. Story submissions open in an
              upcoming release.
            </p>
          </div>
          <button
            type="button"
            disabled
            className={buttonClasses("primary", "self-start md:self-auto")}
          >
            Share an experience — coming soon
          </button>
        </div>
      </section>
    </>
  );
}
