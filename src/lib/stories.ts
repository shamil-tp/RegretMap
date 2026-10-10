/**
 * Domain types and pure helpers for destinations and travel stories,
 * independent of where the data is stored.
 */

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

export type Coordinates = { latitude: number; longitude: number };

export type Destination = {
  id: string;
  slug: string;
  name: string;
  region?: string;
  country?: string;
  description?: string;
  coordinates?: Coordinates;
  /** True for development-only illustrative content. */
  isDemo: boolean;
};

export type TravelStory = {
  id: string;
  destinationId: string;
  title: string;
  /** Specific public place within the destination, if known. */
  place?: string;
  category: StoryCategory;
  /** 1–12 */
  travelMonth?: number;
  travelYear?: number;
  /** What happened, in the traveller's own words. */
  body: string;
  /** What went wrong or surprised them. */
  challenge?: string;
  /** What they learned / would do differently. */
  lesson?: string;
  /** Practical advice for future travellers. */
  advice?: string;
  /** Approximate story location; destination-only stories may omit it. */
  coordinates?: Coordinates;
  /** ISO date the story was published (a sample date for demo stories). */
  publishedAt: string;
  /** True for development-only illustrative content. */
  isDemo: boolean;
};

/** A story with the minimal destination details needed to display it. */
export type StoryWithDestination = TravelStory & {
  destination: Pick<Destination, "slug" | "name" | "region" | "country">;
};

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  timeZone: "UTC",
});

export function formatTravelMonth(month: number) {
  return monthFormatter.format(new Date(Date.UTC(2000, month - 1, 1)));
}

export function formatTravelDate(story: Pick<TravelStory, "travelMonth" | "travelYear">) {
  if (!story.travelMonth) return story.travelYear ? String(story.travelYear) : null;
  const month = formatTravelMonth(story.travelMonth);
  return story.travelYear ? `${month} ${story.travelYear}` : month;
}

const publishedFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatPublishedDate(isoDate: string) {
  return publishedFormatter.format(new Date(isoDate));
}

/** Neutral month ranges; seasons differ by region, so no climate labels. */
export const travelSeasons = {
  dec_feb: { label: "Dec–Feb", months: [12, 1, 2] },
  mar_may: { label: "Mar–May", months: [3, 4, 5] },
  jun_aug: { label: "Jun–Aug", months: [6, 7, 8] },
  sep_nov: { label: "Sep–Nov", months: [9, 10, 11] },
} as const;

export type TravelSeason = keyof typeof travelSeasons;

export function seasonOf(month: number): TravelSeason {
  const entry = (Object.entries(travelSeasons) as [TravelSeason, { months: readonly number[] }][]).find(
    ([, season]) => season.months.includes(month),
  );
  return entry ? entry[0] : "dec_feb";
}

/** "Region, Country" from whichever parts are known. */
export function formatLocation(place: Pick<Destination, "region" | "country">) {
  return [place.region, place.country].filter(Boolean).join(", ");
}

/** Noun for story counts: demo content is always labelled as such. */
export function storyNoun(count: number, isDemo: boolean) {
  return pluralize(count, isDemo ? "demo story" : "story", isDemo ? "demo stories" : "stories");
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
