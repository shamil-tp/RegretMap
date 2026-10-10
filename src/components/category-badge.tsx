import { Badge } from "@/components/ui/badge";
import { categoryEmoji, storyCategories, type StoryCategory } from "@/lib/stories";

/** Each category gets its own macaron colour; the label always carries the meaning. */
const categoryTones = {
  transport: "sky",
  planning: "lavender",
  weather: "sky",
  packing: "peach",
  activity: "mint",
  accessibility: "lavender",
  safety: "accent",
  costs: "butter",
  local_customs: "peach",
  other: "neutral",
} as const satisfies Record<StoryCategory, Parameters<typeof Badge>[0]["tone"]>;

export function CategoryBadge({ category }: { category: StoryCategory }) {
  return (
    <Badge tone={categoryTones[category]}>
      <span aria-hidden className="mr-1">
        {categoryEmoji[category]}
      </span>
      {storyCategories[category]}
    </Badge>
  );
}
