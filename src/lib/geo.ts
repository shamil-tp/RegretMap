import type { Coordinates } from "@/lib/stories";

/** Great-circle distance in kilometres (haversine). */
export function distanceKm(a: Coordinates, b: Coordinates) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Nearest item with coordinates within maxKm, or null. */
export function nearestWithin<T extends { coordinates?: Coordinates }>(
  items: T[],
  point: Coordinates,
  maxKm: number,
): { item: T; km: number } | null {
  let best: { item: T; km: number } | null = null;
  for (const item of items) {
    if (!item.coordinates) continue;
    const km = distanceKm(point, item.coordinates);
    if (km <= maxKm && (!best || km < best.km)) best = { item, km };
  }
  return best;
}
