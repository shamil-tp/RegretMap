import { Lightbulb } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { evidenceLabel, type BeforeYouGoItem } from "@/lib/before-you-go";

export function BeforeYouGo({
  items,
  destinationName,
  fromDemo,
  aiSummary,
}: {
  items: BeforeYouGoItem[];
  destinationName: string;
  /** True when the source stories include demo content. */
  fromDemo: boolean;
  /** Optional AI summary shown above the quoted lessons. */
  aiSummary?: React.ReactNode;
}) {
  const hasEditorial = items.some((item) => item.editorialCount > 0);
  return (
    <section aria-labelledby="before-you-go-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="before-you-go-heading"
          className="font-display text-2xl font-semibold tracking-tight text-ink"
        >
          Before you go
        </h2>
        {fromDemo && <Badge tone="demo">Derived from demo stories</Badge>}
      </div>
      <p className="mt-1 text-base text-ink">Lessons shared by travellers who have been there.</p>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        {hasEditorial
          ? "Drawn from travellers' stories and RegretMap travel notes about "
          : "Drawn from travellers' stories about "}
        {destinationName}. Not verified or current advice — check official sources for permits,
        weather, safety and transport.
      </p>

      {aiSummary}
      {aiSummary && items.length > 0 && (
        <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          {hasEditorial ? "Quoted from the stories" : <>In travellers&apos; own words</>}
        </h3>
      )}

      {items.length === 0 ? (
        <p className="mt-6 rounded-lg bg-butter/50 px-4 py-3 text-sm text-ink">
          No lessons have been shared for {destinationName} yet.{" "}
          <Link href="/submit" className="font-medium text-accent underline-offset-2 hover:underline">
            Share yours
          </Link>{" "}
          and help the next traveller.
        </p>
      ) : (
        <ul className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.category}>
              <h3 className="flex items-center gap-2 font-semibold text-ink">
                <Lightbulb aria-hidden className="size-4 text-accent" />
                {item.heading}
              </h3>
              <ul className="mt-2 space-y-2">
                {item.lessons.map((lesson) => (
                  <li key={lesson.storyId} className="text-[0.95rem] leading-relaxed text-ink">
                    “{lesson.text}”{" "}
                    <Link
                      href={`/stories/${lesson.storyId}`}
                      className="whitespace-nowrap text-sm font-medium text-accent hover:underline"
                    >
                      Read story
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink-muted">
                {evidenceLabel(item.storyCount, item.editorialCount, fromDemo)}
                {item.seasonLabel && ` · Travelled ${item.seasonLabel}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
