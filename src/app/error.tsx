"use client";

import { TriangleAlert } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <StateMessage
        icon={TriangleAlert}
        tone="error"
        headingLevel="h1"
        title="Something went wrong"
        description="This page couldn't be loaded. Please try again."
      >
        <button
          type="button"
          onClick={() => retry()}
          className={buttonClasses("secondary")}
        >
          Try again
        </button>
      </StateMessage>
    </div>
  );
}
