import { Sparkles } from "lucide-react";
import Link from "next/link";
import { CategoryBadge } from "@/components/category-badge";
import { Badge } from "@/components/ui/badge";

/** Rotating macaron surfaces so tips read like separate notes. */
const TIP_SURFACES = ["bg-peach/50", "bg-mint/50", "bg-sky/50", "bg-lavender/50", "bg-butter/50"];
import { evidenceLabel } from "@/lib/before-you-go";
import { getDestinationRecommendations } from "@/lib/recommendations/service";
import {
  formatPublishedDate,
  pluralize,
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
  const editorialIds = new Set(stories.filter((s) => s.source === "editorial").map((s) => s.id));
  const quotedFrom = editorialIds.size > 0 ? "the stories and travel notes" : "travellers";

  if (result.status === "insufficient") {
    return (
      <Note>
        There aren&apos;t enough published stories about {destination.name} yet for a
        summary. The lessons below are quoted directly from {quotedFrom}.
      </Note>
    );
  }
  if (result.status === "unavailable") {
    return (
      <Note>
        The AI summary isn&apos;t available right now. The lessons below are quoted
        directly from {quotedFrom}.
      </Note>
    );
  }

  const { data } = result;
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <Sparkles aria-hidden className="size-3.5 text-accent" />
        <span>
          Summarised from {pluralize(data.storyCount, "published story", "published stories")}
        </span>
        {data.fromDemo && <Badge tone="demo">Generated from demo example stories</Badge>}
      </div>
      <p className="mt-3 max-w-3xl leading-relaxed text-ink">{data.overview}</p>

      <ol className="mt-5 grid gap-4 sm:grid-cols-2">
        {data.recommendations.map((rec, index) => (
          <li
            key={index}
            className={`rounded-lg border border-line p-5 shadow-sm ${TIP_SURFACES[index % TIP_SURFACES.length]}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={rec.category} />
            </div>
            <h3 className="mt-2 font-semibold text-ink">{rec.title}</h3>
            <p className="mt-1 text-[0.95rem] leading-relaxed text-ink">{rec.advice}</p>
            <p className="mt-1.5 text-xs text-ink-muted">
              {evidenceLabel(
                rec.evidenceCount,
                rec.sources.filter((source) => editorialIds.has(source.id)).length,
                false,
              )}
              {rec.mixedExperiences && " · Experiences differ"}
            </p>
            <p className="mt-2 text-xs font-medium text-ink-muted">Based on these stories:</p>
            <p className="mt-0.5 text-sm">
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
        Summarised by AI from{" "}
        {editorialIds.size > 0
          ? "travellers' stories and RegretMap travel notes"
          : "travellers' personal stories"}{" "}
        — not verified facts or
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
