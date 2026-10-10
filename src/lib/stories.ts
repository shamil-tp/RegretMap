export const storyCategories = {
  transport: "Transport",
  planning: "Planning",
  weather: "Weather",
  packing: "Packing",
  activity: "Activity",
  accessibility: "Accessibility",
  safety: "Safety",
  costs: "Costs",
  local_customs: "Local customs",
  other: "Other",
} as const;

export type StoryCategory = keyof typeof storyCategories;

export type StoryPreview = {
  id: string;
  title: string;
  destination: string;
  region: string;
  category: StoryCategory;
  /** 1–12 */
  travelMonth?: number;
  body: string;
  lesson?: string;
  /** True for development-only illustrative content. */
  isDemo: boolean;
};

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  timeZone: "UTC",
});

export function formatTravelMonth(month: number) {
  return monthFormatter.format(new Date(Date.UTC(2000, month - 1, 1)));
}
