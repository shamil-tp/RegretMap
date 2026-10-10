"use client";

import { SearchX } from "lucide-react";
import { useState } from "react";
import { StoryCard } from "@/components/story-card";
import { StateMessage } from "@/components/ui/state-message";
import {
  storyCategories,
  type StoryCategory,
  type StoryPreview,
} from "@/lib/stories";

type Filter = StoryCategory | "all";

const filters: [Filter, string][] = [
  ["all", "All"],
  ...(Object.entries(storyCategories) as [StoryCategory, string][]),
];

export function StoryFeed({ stories }: { stories: StoryPreview[] }) {
  const [active, setActive] = useState<Filter>("all");
  const visible =
    active === "all"
      ? stories
      : stories.filter((story) => story.category === active);

  return (
    <div>
      <div
        role="group"
        aria-label="Filter stories by category"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {filters.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={active === value}
            onClick={() => setActive(value)}
            className="shrink-0 rounded-full border border-line px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length > 0 ? (
        <div className="mt-2 divide-y divide-line">
          {visible.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      ) : (
        <StateMessage
          icon={SearchX}
          title="No stories in this category yet"
          description="Try another category, or share your own experience once submissions open."
        />
      )}
    </div>
  );
}
