import { buttonClasses } from "@/components/ui/button";

export function ShareCallout({ destinationName }: { destinationName?: string }) {
  return (
    <section
      id="share"
      aria-labelledby="share-heading"
      className="scroll-mt-6 border-t border-line bg-surface"
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
            traveller prepare better. Story submissions open in an upcoming
            release.
          </p>
        </div>
        <button
          type="button"
          disabled
          className={buttonClasses("primary", "self-start md:self-auto")}
        >
          Share an experience — coming soon
        </button>
      </div>
    </section>
  );
}
