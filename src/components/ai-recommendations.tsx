import { Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getDestinationRecommendations } from "@/lib/recommendations/service";
import {
  formatPublishedDate,
  pluralize,
  storyCategories,
  type Destination,
  type StoryWithDestination,
} from "@/lib/stories";

/** AI summary of the destination's published stories, with linked sources. */
export async function AiRecommendations({
  destination,
  stories,
}: {
  destination: Destination;
  stories: StoryWithDestination[];
}) {
  const result = await getDestinationRecommendations(destination, stories);

  if (result.status === "insufficient") {
    return (
      <Note>
        There aren&apos;t enough published stories about {destination.name} yet for a
        summary. The lessons below are quoted directly from travellers.
      </Note>
    );
  }
  if (result.status === "unavailable") {
    return (
      <Note>
        The AI summary isn&apos;t available right now. The lessons below are quoted
        directly from travellers.
      </Note>
    );
  }

  const { data } = result;
  return (
    <div className="mt-6 rounded-lg border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <Sparkles aria-hidden className="size-3.5 text-accent" />
        <span>
          AI summary of {pluralize(data.storyCount, "published story", "published stories")}
        </span>
        {data.fromDemo && <Badge tone="demo">Generated from demo example stories</Badge>}
      </div>
      <p className="mt-3 max-w-3xl leading-relaxed text-ink">{data.overview}</p>

      <ol className="mt-5 space-y-5">
        {data.recommendations.map((rec, index) => (
          <li key={index} className="border-l-2 border-accent pl-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">{storyCategories[rec.category]}</Badge>
              <h3 className="font-semibold text-ink">{rec.title}</h3>
            </div>
            <p className="mt-1 text-[0.95rem] leading-relaxed text-ink">{rec.advice}</p>
            <p className="mt-1.5 text-xs text-ink-muted">
              {rec.evidenceCount === 1
                ? "One traveller reported this"
                : `Based on ${rec.evidenceCount} stories`}
              {rec.mixedExperiences && " · Experiences differ"}
              {" · "}
              <span className="sr-only">Sources: </span>
              {rec.sources.map((source, i) => (
                <span key={source.id}>
                  {i > 0 && ", "}
                  <Link
                    href={`/stories/${source.id}`}
                    className="rounded text-accent-hover underline-offset-2 hover:underline"
                  >
                    {source.title}
                  </Link>
                </span>
              ))}
            </p>
          </li>
        ))}
      </ol>

      {data.limitations && <p className="mt-4 text-sm text-ink-muted">{data.limitations}</p>}
      <p className="mt-4 border-t border-line pt-3 text-xs text-ink-muted">
        Summarised by AI from travellers&apos; personal stories — not verified facts or
        current advice. Generated {formatPublishedDate(data.generatedAt)}.
      </p>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 rounded-md bg-surface px-4 py-3 text-sm text-ink-muted">{children}</p>;
}

export function AiRecommendationsSkeleton() {
  return (
    <div className="mt-6 rounded-lg border border-line bg-surface p-6" aria-hidden>
      <div className="h-3 w-40 animate-pulse rounded bg-line" />
      <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded bg-line" />
      <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-line" />
      <div className="mt-6 h-4 w-1/2 animate-pulse rounded bg-line" />
      <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-line" />
    </div>
  );
}
