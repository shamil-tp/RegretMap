import type { MetadataRoute } from "next";
import { listDestinations, listStorySummaries, type DestinationSummary } from "@/lib/data";
import { absoluteUrl } from "@/lib/site";
import type { StorySummary } from "@/lib/stories";

/**
 * Canonical, indexable URLs only: the home and about pages, destinations with
 * published stories, and published stories. Demo content, forms, accounts and
 * filtered views are left out (they are noindex or canonicalise elsewhere).
 */
export function buildSitemap(
  destinations: DestinationSummary[],
  stories: Pick<StorySummary, "id" | "destinationId" | "publishedAt" | "isDemo">[],
): MetadataRoute.Sitemap {
  const realStories = stories.filter((s) => !s.isDemo);
  // A destination's last change is its newest published story.
  const latest = new Map<string, string>();
  for (const s of realStories) {
    const current = latest.get(s.destinationId);
    if (!current || s.publishedAt > current) latest.set(s.destinationId, s.publishedAt);
  }

  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.5 },
  ];
  for (const d of destinations) {
    if (d.storyCount === 0 || d.isDemo) continue;
    entries.push({
      url: absoluteUrl(`/destinations/${d.slug}`),
      lastModified: latest.get(d.id),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }
  for (const s of realStories) {
    entries.push({
      url: absoluteUrl(`/stories/${s.id}`),
      lastModified: s.publishedAt,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }
  return entries;
}

// Built per request from the public, RLS-restricted data layer.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [destinations, stories] = await Promise.all([listDestinations(), listStorySummaries()]);
    return buildSitemap(destinations, stories);
  } catch {
    // Database unavailable: serve the static entries only.
    return buildSitemap([], []);
  }
}
