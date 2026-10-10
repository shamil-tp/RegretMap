"use client";

import { Flag } from "lucide-react";
import { useState } from "react";
import { StoryReactions, type HelpfulProps } from "@/components/helpful-button";

/** Helpful (saved, signed-in users) and Report (placeholder, nothing sent yet). */
export function StoryActions({ isDemo, helpful }: { isDemo: boolean; helpful?: HelpfulProps }) {
  const [reportOpen, setReportOpen] = useState(false);

  const buttonClasses =
    "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {helpful && <StoryReactions {...helpful} />}
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
      {reportOpen && (
        <p id="report-note" className="text-sm text-ink-muted">
          Reporting isn&apos;t available yet.{" "}
          {isDemo
            ? "This story is a demo example and isn't a real submission."
            : "Stories go live straight away; a moderator can hide anything that breaks the rules."}
        </p>
      )}
    </div>
  );
}
