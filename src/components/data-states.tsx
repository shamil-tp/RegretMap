import { CloudOff, Map as MapIcon } from "lucide-react";
import { StoryCardSkeleton } from "@/components/story-card";
import { StateMessage } from "@/components/ui/state-message";
import { DataUnavailableError } from "@/lib/data";

/** Shown when the database can't be reached; no technical details are exposed. */
export function DataUnavailable() {
  return (
    <StateMessage
      icon={CloudOff}
      tone="error"
      title="Stories can't be loaded right now"
      description="Something went wrong while loading destinations and stories. Please try again in a moment."
    />
  );
}

/** Renders the unavailable state for data errors; rethrows anything else. */
export function renderDataError(error: unknown) {
  if (error instanceof DataUnavailableError) return <DataUnavailable />;
  throw error;
}

export function NoStoriesYet({ destinationName }: { destinationName?: string }) {
  return (
    <StateMessage
      icon={MapIcon}
      title={
        destinationName
          ? `No published stories for ${destinationName} yet`
          : "No published stories yet"
      }
      description="When travellers share experiences and they're published, they'll appear here."
    />
  );
}

export function StoryListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: count }, (_, i) => (
        <StoryCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Placeholder for the map + feed layout while data loads. */
export function ExplorerSkeleton() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      <div className="h-72 animate-pulse rounded-lg bg-surface sm:h-96" />
      <div>
        <p role="status" className="sr-only">
          Loading stories…
        </p>
        <StoryListSkeleton />
      </div>
    </div>
  );
}
