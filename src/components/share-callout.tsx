import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export function ShareCallout({
  destinationName,
  destinationSlug,
}: {
  destinationName?: string;
  destinationSlug?: string;
}) {
  const href = destinationSlug
    ? `/submit?destination=${encodeURIComponent(destinationSlug)}`
    : "/submit";

  return (
    <section
      id="share"
      aria-labelledby="share-heading"
      className="scroll-mt-6 border-t border-line bg-peach/50"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2
            id="share-heading"
            className="font-display text-2xl font-semibold tracking-tight text-ink"
          >
            {destinationName ? `Been to ${destinationName}?` : "Share an experience"}
          </h2>
          <p className="mt-2 text-ink-muted">
            Had a trip that taught you something? Your story can help the next
            traveller prepare better. Stories are reviewed before they&apos;re published.
          </p>
        </div>
        <Link href={href} className={buttonClasses("primary", "self-start md:self-auto")}>
          Share your experience
        </Link>
      </div>
    </section>
  );
}
