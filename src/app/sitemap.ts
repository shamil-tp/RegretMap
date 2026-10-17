import type { MetadataRoute } from "next";
import { listAllStories, listDestinations } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

// Static pages always; destinations and stories when the database is reachable.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/index.html`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/submit`, changeFrequency: "monthly", priority: 0.6 },
  ];
  try {
    const [destinations, stories] = await Promise.all([listDestinations(), listAllStories()]);
    for (const d of destinations) {
      if (d.storyCount > 0) {
        entries.push({ url: `${SITE_URL}/destinations/${d.slug}`, changeFrequency: "weekly", priority: 0.8 });
      }
    }
    for (const s of stories) {
      entries.push({
        url: `${SITE_URL}/stories/${s.id}`,
        lastModified: s.publishedAt,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch {
    // Database unavailable: serve the static entries only.
  }
  return entries;
}
