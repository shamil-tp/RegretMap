import { StoryCardSkeleton } from "@/components/story-card";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="sr-only" role="status">
        Loading stories…
      </p>
      <div className="divide-y divide-line">
        <StoryCardSkeleton />
        <StoryCardSkeleton />
        <StoryCardSkeleton />
      </div>
    </div>
  );
}
