import { MapPin, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  formatTravelMonth,
  storyCategories,
  type StoryPreview,
} from "@/lib/stories";

export function StoryCard({ story }: { story: StoryPreview }) {
  return (
    <article className="py-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{storyCategories[story.category]}</Badge>
        {story.travelMonth && (
          <Badge>Travelled in {formatTravelMonth(story.travelMonth)}</Badge>
        )}
        {story.isDemo && <Badge tone="demo">Demo example</Badge>}
      </div>

      <h3 className="mt-3 text-lg font-semibold leading-snug text-ink">
        {story.title}
      </h3>
      <p className="mt-1 inline-flex items-center gap-1 text-sm text-ink-muted">
        <MapPin aria-hidden className="size-3.5" />
        {story.destination}, {story.region}
      </p>

      <p className="mt-3 text-[0.95rem] leading-relaxed text-ink">
        {story.body}
      </p>

      {story.lesson && (
        <div className="mt-4 border-l-2 border-accent pl-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            What I&apos;d do differently
          </p>
          <p className="mt-1 text-[0.95rem] leading-relaxed text-ink">
            {story.lesson}
          </p>
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          disabled
          title="Reactions open when community stories go live"
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-ink-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ThumbsUp aria-hidden className="size-4" />
          Helpful
        </button>
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
