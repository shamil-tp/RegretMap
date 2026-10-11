"use client";

import { MessageCircleQuestion } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";

// The chat's code loads only when a visitor opens it.
const DestinationChat = dynamic(
  () => import("@/components/destination-chat").then((m) => m.DestinationChat),
  {
    ssr: false,
    loading: () => (
      <div role="status" className="h-64 animate-pulse rounded-lg border-2 border-line bg-card">
        <span className="sr-only">Opening the chat…</span>
      </div>
    ),
  },
);

/**
 * "Ask travellers" entry point. Nothing is requested from the server or the
 * AI until the visitor opens the chat and asks a question.
 */
export function ChatLauncher({ slug, destinationName }: { slug: string; destinationName: string }) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div className="animate-fade-up">
        <DestinationChat slug={slug} destinationName={destinationName} />
      </div>
    );
  }

  return (
    <section
      aria-labelledby="ask-heading"
      className="brutal-card flex flex-col items-start gap-4 bg-sky p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div>
        <h2 id="ask-heading" className="font-display text-xl font-semibold text-ink">
          Ask travellers
        </h2>
        <p className="mt-1 max-w-md text-sm text-ink-muted">
          Get answers from experiences shared on RegretMap about {destinationName}. If the stories
          don&apos;t cover your question, it will say so.
        </p>
      </div>
      <button type="button" onClick={() => setOpen(true)} className={buttonClasses("primary", "shrink-0")}>
        <MessageCircleQuestion aria-hidden className="size-4" />
        Ask a question
      </button>
    </section>
  );
}
