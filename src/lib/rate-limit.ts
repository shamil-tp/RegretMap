import "server-only";

/**
 * Fixed-window-per-key limiter kept in memory. Per server instance only: fine
 * for development and a single instance; use a shared store when scaling out.
 */
export function createRateLimiter({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>();

  return {
    /** Records a hit and returns true if the key is now over the limit. */
    isLimited(key: string, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > 10_000) hits.clear();
      return recent.length > max;
    },
  };
}

/** Best-effort client IP from proxy headers; "local" when unknown. */
export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}
