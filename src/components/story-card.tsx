import { ArrowRight, MapPin, Navigation } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  formatPublishedDate,
  formatTravelDate,
  storyCategories,
  type StoryWithDestination,
} from "@/lib/stories";

export function StoryCard({
  story,
  highlighted = false,
  onShowOnMap,
}: {
  story: StoryWithDestination;
  highlighted?: boolean;
  /** When provided and the story has coordinates, shows a "Show on map" action. */
  onShowOnMap?: () => void;
}) {
  const travelDate = formatTravelDate(story);

  return (
    <article
      id={`story-${story.id}`}
      className={`scroll-mt-24 py-6 transition-colors ${
        highlighted ? "-mx-3 rounded-lg bg-accent-soft/60 px-3" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{storyCategories[story.category]}</Badge>
        {travelDate && <Badge>Travelled {travelDate}</Badge>}
        {story.isDemo && <Badge tone="demo">Demo example</Badge>}
      </div>

      <h3 className="mt-3 text-lg font-semibold leading-snug text-ink">
        <Link href={`/stories/${story.id}`} className="rounded hover:text-accent-hover">
          {story.title}
        </Link>
      </h3>
      <p className="mt-1 inline-flex items-center gap-1 text-sm text-ink-muted">
        <MapPin aria-hidden className="size-3.5 shrink-0" />
        {[story.place, story.destination.name, story.destination.region]
          .filter(Boolean)
          .join(", ")}
      </p>

      <p className="mt-3 line-clamp-3 text-[0.95rem] leading-relaxed text-ink">
        {story.body}
      </p>

      {story.lesson && (
        <div className="mt-4 border-l-2 border-accent pl-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            What I&apos;d do differently
          </p>
          <p className="mt-1 text-[0.95rem] leading-relaxed text-ink">{story.lesson}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link
          href={`/stories/${story.id}`}
          className="inline-flex items-center gap-1 rounded font-medium text-accent hover:underline"
        >
          Read full story
          <ArrowRight aria-hidden className="size-4" />
          <span className="sr-only">: {story.title}</span>
        </Link>
        {onShowOnMap && story.coordinates && (
          <button
            type="button"
            onClick={onShowOnMap}
            className="inline-flex items-center gap-1 rounded text-ink-muted hover:text-ink"
          >
            <Navigation aria-hidden className="size-3.5" />
            Show on map
          </button>
        )}
        <span className="text-ink-muted sm:ml-auto">
          {story.isDemo ? "Sample date" : "Published"}{" "}
          {formatPublishedDate(story.publishedAt)}
        </span>
      </div>
    </article>
  );
}

export function StoryCardSkeleton() {
  return (
    <div aria-hidden className="animate-pulse py-6">
      <div className="flex gap-2">
        <div className="h-5 w-20 rounded-full bg-surface" />
        <div className="h-5 w-28 rounded-full bg-surface" />
      </div>
      <div className="mt-4 h-5 w-3/4 rounded bg-surface" />
      <div className="mt-2 h-4 w-1/3 rounded bg-surface" />
      <div className="mt-4 h-4 w-full rounded bg-surface" />
      <div className="mt-2 h-4 w-5/6 rounded bg-surface" />
    </div>
  );
}
