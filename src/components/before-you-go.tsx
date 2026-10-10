import { Lightbulb } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { BeforeYouGoItem } from "@/lib/before-you-go";
import { pluralize } from "@/lib/stories";

export function BeforeYouGo({
  items,
  destinationName,
}: {
  items: BeforeYouGoItem[];
  destinationName: string;
}) {
  return (
    <section aria-labelledby="before-you-go-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="before-you-go-heading"
          className="font-display text-2xl font-semibold tracking-tight text-ink"
        >
          Before you go
        </h2>
        <Badge tone="demo">Derived from demo stories</Badge>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Lessons quoted from travellers&apos; stories about {destinationName}, grouped by
        topic. They are personal experiences, not verified or current advice — check
        official sources for permits, weather, safety and transport.
      </p>

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          No lessons have been shared for {destinationName} yet.
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
                {item.storyCount === 1
                  ? "One traveller reported this"
                  : `Based on ${pluralize(item.storyCount, "demo story", "demo stories")}`}
                {item.seasonLabel && ` · Travelled ${item.seasonLabel}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
