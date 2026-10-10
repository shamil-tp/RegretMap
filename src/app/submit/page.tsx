import { randomUUID } from "node:crypto";
import { CloudOff, MapPinOff } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { SubmitFlow } from "@/components/submit/submit-flow";
import { StateMessage } from "@/components/ui/state-message";
import { DataUnavailableError, listDestinations } from "@/lib/data";

export const metadata: Metadata = {
  title: "Share an experience — RegretMap",
  description:
    "Share what happened on your trip, what you'd do differently and advice for future travellers.",
};

export default function SubmitPage({ searchParams }: PageProps<"/submit">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Share an experience
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">
        What happened on your trip, what went wrong, and what would you tell the next
        traveller? Stories are reviewed before they appear on RegretMap.
      </p>
      <div className="mt-10">
        <Suspense
          fallback={
            <div className="space-y-4" aria-hidden>
              <div className="h-10 animate-pulse rounded-md bg-surface" />
              <div className="h-10 animate-pulse rounded-md bg-surface" />
              <div className="h-32 animate-pulse rounded-md bg-surface" />
            </div>
          }
        >
          <SubmitContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function SubmitContent({ searchParams }: Pick<PageProps<"/submit">, "searchParams">) {
  const { destination: slug } = await searchParams;

  let destinations;
  try {
    destinations = await listDestinations();
  } catch (error) {
    if (!(error instanceof DataUnavailableError)) throw error;
    return (
      <StateMessage
        icon={CloudOff}
        tone="error"
        title="The form can't load right now"
        description="We couldn't load the list of destinations. Please try again in a moment."
      />
    );
  }

  if (destinations.length === 0) {
    return (
      <StateMessage
        icon={MapPinOff}
        title="No destinations are open for stories yet"
        description="Stories can be shared once destinations are added to RegretMap."
      />
    );
  }

  const initial = destinations.find((d) => d.slug === slug);

  return (
    <SubmitFlow
      destinations={destinations.map(({ id, slug, name, region, country, coordinates }) => ({
        id,
        slug,
        name,
        region,
        country,
        coordinates,
      }))}
      initialDestinationId={initial?.id}
      initialSubmissionKey={randomUUID()}
    />
  );
}
