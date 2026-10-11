import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AiRecommendations, AiRecommendationsSkeleton } from "@/components/ai-recommendations";
import { BeforeYouGo } from "@/components/before-you-go";
import { ChatLauncher } from "@/components/chat-launcher";
import { DestinationPhoto } from "@/components/destination-photo";
import {
  ExplorerSkeleton,
  NoStoriesYet,
  renderDataError,
} from "@/components/data-states";
import { ShareCallout } from "@/components/share-callout";
import { StoryExplorer } from "@/components/story-explorer";
import { Badge } from "@/components/ui/badge";
import { buildBeforeYouGo } from "@/lib/before-you-go";
import { destinationImage } from "@/lib/destination-images";
import { getDestinationBySlug, getHelpfulState, listStoriesForDestination } from "@/lib/data";
import { getViewer } from "@/lib/supabase/session";
import { formatLocation, storyNoun, type Destination } from "@/lib/stories";

type Props = PageProps<"/destinations/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const destination = await getDestinationBySlug((await params).slug);
    if (!destination) return { title: "Destination not found — RegretMap" };
    const location = formatLocation(destination);
    return {
      title: `${destination.name} travel lessons — RegretMap`,
      description: `Traveller experiences, mistakes and practical lessons from ${destination.name}${location ? `, ${location}` : ""}.`,
    };
  } catch {
    return { title: "RegretMap" };
  }
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

export default function DestinationPage({ params }: Props) {
  return (
    <Suspense fallback={<DestinationSkeleton />}>
      <DestinationContent params={params} />
    </Suspense>
  );
}

async function DestinationContent({ params }: Pick<Props, "params">) {
  const { slug } = await params;

  let destination: Destination | null;
  try {
    destination = await getDestinationBySlug(slug);
  } catch (error) {
    return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{renderDataError(error)}</div>;
  }
  if (!destination) notFound();

  return (
    <>
      <DestinationHeader destination={destination} />
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <ExplorerSkeleton />
          </div>
        }
      >
        <DestinationStories destination={destination} />
      </Suspense>
      <ShareCallout destinationName={destination.name} destinationSlug={destination.slug} />
    </>
  );
}

function DestinationHeader({ destination }: { destination: Destination }) {
  const location = formatLocation(destination);
  const image = destinationImage(destination.slug);
  return (
    <section className="border-b border-line bg-sky/50">
      <div
        className={`mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 sm:py-12 ${
          image ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-10" : ""
        }`}
      >
        <div className="animate-fade-up">
          <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="rounded hover:text-ink">
                  Home
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
          {location && <p className="mt-1 text-ink-muted">{location}</p>}
          {destination.description && (
            <p className="mt-4 max-w-2xl leading-relaxed text-ink">{destination.description}</p>
          )}
        </div>
        {image && (
          <DestinationPhoto
            image={image}
            alt={`${destination.name}${location ? `, ${location}` : ""}`}
            sizes="(min-width: 768px) 560px, 100vw"
            priority
            className="order-first aspect-[16/9] animate-fade-up rounded-xl shadow-md ring-1 ring-line md:order-none md:aspect-[4/3]"
          />
        )}
      </div>
    </section>
  );
}

async function DestinationStories({ destination }: { destination: Destination }) {
  let stories;
  try {
    stories = await listStoriesForDestination(destination.id);
  } catch (error) {
    return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{renderDataError(error)}</div>;
  }

  if (stories.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <NoStoriesYet destinationName={destination.name} />
      </div>
    );
  }

  const months = stories.flatMap((s) => (s.travelMonth ? [s.travelMonth] : []));
  const hasDemo = stories.some((s) => s.isDemo);
  const viewer = await getViewer();
  const helpful = await getHelpfulState(stories.map((s) => s.id), viewer?.id ?? null);

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <p className="text-sm text-ink-muted">
          {storyNoun(stories.length, hasDemo)}
          {months.length > 0 && <> · Travelled in {listMonths(months)}</>}
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <BeforeYouGo
          items={buildBeforeYouGo(stories)}
          destinationName={destination.name}
          fromDemo={hasDemo}
          aiSummary={
            <Suspense fallback={<AiRecommendationsSkeleton />}>
              <AiRecommendations destination={destination} stories={stories} />
            </Suspense>
          }
        />
      </div>

      <div className="mx-auto max-w-6xl border-t border-line px-4 py-10 sm:px-6">
        <StoryExplorer
          stories={stories}
          cards={stories}
          mapHeading="Where these stories happened"
          storiesHeading={`Stories from ${destination.name}`}
          fitMapToStories
          helpful={helpful}
        />
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-12 sm:px-6">
        <ChatLauncher slug={destination.slug} destinationName={destination.name} />
      </div>
    </>
  );
}

function DestinationSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p role="status" className="sr-only">
        Loading destination…
      </p>
      <div className="h-4 w-32 animate-pulse rounded bg-surface" />
      <div className="mt-6 h-9 w-56 animate-pulse rounded bg-surface" />
      <div className="mt-3 h-4 w-40 animate-pulse rounded bg-surface" />
      <div className="mt-6 h-4 w-full max-w-xl animate-pulse rounded bg-surface" />
      <div className="mt-12">
        <ExplorerSkeleton />
      </div>
    </div>
  );
}
