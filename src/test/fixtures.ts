import type { StoryRow } from "@/lib/mappers";
import type { StoryWithDestination } from "@/lib/stories";

export function storyRow(overrides: Partial<StoryRow> = {}): StoryRow {
  return {
    id: "0b6f1c1e-4d1a-4c3e-9a51-6d2f0c8b1a01",
    destination_id: "5f0c2b7e-8a4d-4e6b-b1c2-3d4e5f6a7b8c",
    title: "A test story",
    body: "Something happened on this test trip.",
    category: "transport",
    place_name: "Test pass",
    latitude: 32.1,
    longitude: 77.1,
    travel_month: 5,
    travel_year: 2025,
    challenge: null,
    lesson: "Leave earlier.",
    advice: null,
    published_at: "2026-02-14T00:00:00+00:00",
    is_demo: false,
    destination: { slug: "testville", name: "Testville", region: "Test Region", country: null },
    ...overrides,
  };
}

let counter = 0;

export function story(overrides: Partial<StoryWithDestination> = {}): StoryWithDestination {
  counter += 1;
  return {
    id: `story-${counter}`,
    destinationId: "dest-1",
    title: `Story ${counter}`,
    body: "Body text for a test story.",
    category: "transport",
    publishedAt: "2026-01-01T00:00:00Z",
    isDemo: false,
    destination: { slug: "testville", name: "Testville" },
    ...overrides,
  };
}
