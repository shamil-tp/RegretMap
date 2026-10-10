"use client";

import { useState } from "react";
import { StoryForm, type SubmittableDestination } from "@/components/submit/story-form";

/** Owns the one-time submission key; "Share another story" starts a fresh form. */
export function SubmitFlow({
  destinations,
  initialDestinationId,
  initialSubmissionKey,
}: {
  destinations: SubmittableDestination[];
  initialDestinationId?: string;
  initialSubmissionKey: string;
}) {
  const [submissionKey, setSubmissionKey] = useState(initialSubmissionKey);

  return (
    <StoryForm
      key={submissionKey}
      destinations={destinations}
      initialDestinationId={initialDestinationId}
      submissionKey={submissionKey}
      onSubmitAnother={() => {
        setSubmissionKey(crypto.randomUUID());
        window.scrollTo({ top: 0 });
      }}
    />
  );
}
