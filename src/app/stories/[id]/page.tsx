import { ArrowLeft, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExploreMap } from "@/components/map/explore-map";
import { StoryActions } from "@/components/story-actions";
import { Badge } from "@/components/ui/badge";
import { getStoryById, listAllStories, listStoriesForDestination } from "@/lib/data";
import { storiesToMapPoints } from "@/lib/map";
import {
  formatPublishedDate,
  formatTravelDate,
  storyCategories,
} from "@/lib/stories";

export async function generateStaticParams() {
  const stories = await listAllStories();
  return stories.map(({ id }) => ({ id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/stories/[id]">): Promise<Metadata> {
  const story = await getStoryById((await params).id);
  if (!story) return { title: "Story not found — RegretMap" };
  return {
    title: `${story.title} — ${story.destination.name} — RegretMap`,
    description: story.lesson ?? story.body.slice(0, 150),
  };
}

function StorySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</h2>
      <p className="mt-2 text-base leading-relaxed text-ink">{children}</p>
    </section>
  );
}

export default async function StoryPage({ params }: PageProps<"/stories/[id]">) {
  const story = await getStoryById((await params).id);
  if (!story) notFound();

  const travelDate = formatTravelDate(story);
  const related = (await listStoriesForDestination(story.destinationId))
    .filter((s) => s.id !== story.id)
    .slice(0, 3);
  const point = storiesToMapPoints([story]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href={`/destinations/${story.destination.slug}`}
        className="inline-flex items-center gap-1 rounded text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All stories from {story.destination.name}
      </Link>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
        <article>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{storyCategories[story.category]}</Badge>
            {travelDate && <Badge>Travelled {travelDate}</Badge>}
            {story.isDemo && <Badge tone="demo">Demo example</Badge>}
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight text-ink">
            {story.title}
          </h1>
          <p className="mt-2 flex items-start gap-1 text-ink-muted">
            <MapPin aria-hidden className="mt-1 size-4 shrink-0" />
            <span>
              {story.place ? `${story.place}, ` : ""}
              <Link
                href={`/destinations/${story.destination.slug}`}
                className="rounded underline-offset-2 hover:underline"
              >
                {story.destination.name}
              </Link>
              {`, ${story.destination.region}`}
            </span>
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {story.isDemo ? "Sample date" : "Published"} {formatPublishedDate(story.publishedAt)} ·{" "}
            {story.isDemo ? "Illustrative demo story, not a real submission" : "Community story"}
          </p>

          <StorySection title="What happened">{story.body}</StorySection>
          {story.challenge && (
            <StorySection title="What went wrong">{story.challenge}</StorySection>
          )}
          {story.lesson && (
            <section className="mt-8 border-l-2 border-accent pl-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                What I&apos;d do differently
              </h2>
              <p className="mt-2 text-base leading-relaxed text-ink">{story.lesson}</p>
            </section>
          )}
          {story.advice && (
            <StorySection title="Advice for future travellers">{story.advice}</StorySection>
          )}

          <p className="mt-8 rounded-md bg-surface px-3 py-2.5 text-sm text-ink-muted">
            This is one traveller&apos;s personal account, not verified or current advice.
            Check official sources for permits, weather, safety and transport.
          </p>

          <div className="mt-6">
            <StoryActions />
          </div>
        </article>

        <aside className="space-y-10 lg:sticky lg:top-6 lg:self-start">
          {point.length > 0 && (
            <section aria-labelledby="story-map-heading">
              <h2 id="story-map-heading" className="text-lg font-semibold text-ink">
                Where it happened
              </h2>
              <div className="mt-4">
                <ExploreMap points={point} fitToPoints highlightedPointId={story.id} />
              </div>
            </section>
          )}

          {related.length > 0 && (
            <section aria-labelledby="related-heading">
              <h2 id="related-heading" className="text-lg font-semibold text-ink">
                More from {story.destination.name}
              </h2>
              <ul className="mt-3 divide-y divide-line">
                {related.map((s) => (
                  <li key={s.id} className="py-3">
                    <Link
                      href={`/stories/${s.id}`}
                      className="rounded font-medium text-ink hover:text-accent-hover"
                    >
                      {s.title}
                    </Link>
                    <p className="text-sm text-ink-muted">
                      {storyCategories[s.category]}
                      {s.place && ` · ${s.place}`}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
