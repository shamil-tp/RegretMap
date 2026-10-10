import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BeforeYouGo } from "@/components/before-you-go";
import { ShareCallout } from "@/components/share-callout";
import { StoryExplorer } from "@/components/story-explorer";
import { Badge } from "@/components/ui/badge";
import { buildBeforeYouGo } from "@/lib/before-you-go";
import { getDestinationBySlug, listDestinations, listStoriesForDestination } from "@/lib/data";
import { pluralize } from "@/lib/stories";

export async function generateStaticParams() {
  const destinations = await listDestinations();
  return destinations.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/destinations/[slug]">): Promise<Metadata> {
  const destination = await getDestinationBySlug((await params).slug);
  if (!destination) return { title: "Destination not found — RegretMap" };
  return {
    title: `${destination.name} travel lessons — RegretMap`,
    description: `Traveller experiences, mistakes and practical lessons from ${destination.name}, ${destination.region}.`,
  };
}

const shortMonth = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });

function listMonths(months: number[]) {
  const names = [...new Set(months)]
    .sort((a, b) => a - b)
    .map((m) => shortMonth.format(new Date(Date.UTC(2000, m - 1, 1))));
  return names.length > 1
    ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
    : names[0];
}

export default async function DestinationPage({ params }: PageProps<"/destinations/[slug]">) {
  const destination = await getDestinationBySlug((await params).slug);
  if (!destination) notFound();

  const stories = await listStoriesForDestination(destination.id);
  const months = stories.flatMap((s) => (s.travelMonth ? [s.travelMonth] : []));

  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="rounded hover:text-ink">
                  Explore
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-ink">
                {destination.name}
              </li>
            </ol>
          </nav>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {destination.name}
            </h1>
            {destination.isDemo && <Badge tone="demo">Demo destination</Badge>}
          </div>
          <p className="mt-1 text-ink-muted">
            {destination.region}, {destination.country}
          </p>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink">{destination.description}</p>
          <p className="mt-4 text-sm text-ink-muted">
            {pluralize(stories.length, "demo story", "demo stories")}
            {months.length > 0 && <> · Travelled in {listMonths(months)}</>}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <BeforeYouGo items={buildBeforeYouGo(stories)} destinationName={destination.name} />
      </div>

      <div className="mx-auto max-w-6xl border-t border-line px-4 py-10 sm:px-6">
        <StoryExplorer
          stories={stories}
          mapHeading="Where these stories happened"
          storiesHeading={`Stories from ${destination.name}`}
          fitMapToStories
        />
      </div>

      <ShareCallout destinationName={destination.name} />
    </>
  );
}
