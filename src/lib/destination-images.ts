import images from "@/data/destination-images.json";

/**
 * Freely licensed destination photos (Wikimedia Commons), generated and
 * reviewed with scripts/fetch-destination-images.mjs. Missing entries simply
 * fall back to a plain coloured panel — no placeholder or stock imagery.
 */
export type DestinationImage = {
  src: string;
  width: number;
  height: number;
  author: string;
  licence: string;
  sourceUrl: string;
  article: string;
};

const table = images as Record<string, DestinationImage>;

export function destinationImage(slug: string): DestinationImage | null {
  return table[slug] ?? null;
}
