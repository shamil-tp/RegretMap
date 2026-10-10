import { demoDestinations, demoStories } from "@/lib/demo-data";
import type { Destination, StoryWithDestination, TravelStory } from "@/lib/stories";

/*
 * Data-access layer. UI code calls only these functions, never the demo data
 * directly, so Phase 4 can swap this source for Supabase without touching
 * components. Functions are async to match that future contract.
 */

export type DestinationSummary = Destination & { storyCount: number };

function withDestination(story: TravelStory): StoryWithDestination {
  const destination = demoDestinations.find((d) => d.id === story.destinationId);
  if (!destination) {
    throw new Error(`Story ${story.id} references unknown destination ${story.destinationId}`);
  }
  const { slug, name, region, country } = destination;
  return { ...story, destination: { slug, name, region, country } };
}

function newestFirst(a: TravelStory, b: TravelStory) {
  return b.publishedAt.localeCompare(a.publishedAt);
}

export async function listDestinations(): Promise<DestinationSummary[]> {
  return demoDestinations.map((destination) => ({
    ...destination,
    storyCount: demoStories.filter((s) => s.destinationId === destination.id).length,
  }));
}

export async function getDestinationBySlug(slug: string): Promise<Destination | null> {
  return demoDestinations.find((d) => d.slug === slug) ?? null;
}

export async function listStoriesForDestination(
  destinationId: string,
): Promise<StoryWithDestination[]> {
  return demoStories
    .filter((s) => s.destinationId === destinationId)
    .sort(newestFirst)
    .map(withDestination);
}

export async function listAllStories(): Promise<StoryWithDestination[]> {
  return [...demoStories].sort(newestFirst).map(withDestination);
}

export async function getStoryById(id: string): Promise<StoryWithDestination | null> {
  const story = demoStories.find((s) => s.id === id);
  return story ? withDestination(story) : null;
}
