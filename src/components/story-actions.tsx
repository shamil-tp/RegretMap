"use client";

import { Flag, ThumbsUp } from "lucide-react";
import { useState } from "react";

/** Local-only placeholders: nothing here is saved or sent anywhere yet. */
export function StoryActions({ isDemo }: { isDemo: boolean }) {
  const [helpful, setHelpful] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const buttonClasses =
    "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={helpful}
          onClick={() => setHelpful((value) => !value)}
          className={`${buttonClasses} ${
            helpful
              ? "border-accent bg-accent-soft text-accent-hover"
              : "border-line text-ink-muted hover:text-ink"
          }`}
        >
          <ThumbsUp aria-hidden className="size-4" />
          Helpful
        </button>
        <button
          type="button"
          aria-expanded={reportOpen}
          aria-controls="report-note"
          onClick={() => setReportOpen((value) => !value)}
          className={`${buttonClasses} border-line text-ink-muted hover:text-ink`}
        >
          <Flag aria-hidden className="size-4" />
          Report
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-xs text-ink-muted">
        {helpful && "Marked on this page only — reactions aren't saved yet."}
      </p>
      {reportOpen && (
        <p id="report-note" className="text-sm text-ink-muted">
          Reporting isn&apos;t available yet.{" "}
          {isDemo
            ? "This story is a demo example and isn't a real submission."
            : "Stories are reviewed by a moderator before they're published."}
        </p>
      )}
    </div>
  );
}
