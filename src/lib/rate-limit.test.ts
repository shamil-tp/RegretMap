import { describe, expect, it } from "vitest";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

describe("createRateLimiter", () => {
  it("allows up to max hits per window, then limits, then recovers", () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 2 });
    expect(limiter.isLimited("a", 0)).toBe(false);
    expect(limiter.isLimited("a", 10)).toBe(false);
    expect(limiter.isLimited("a", 20)).toBe(true);
    expect(limiter.isLimited("b", 20)).toBe(false);
    expect(limiter.isLimited("a", 2000)).toBe(false);
  });
});

describe("clientIp", () => {
  it("reads the first forwarded address, then x-real-ip, then a fallback", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("local");
  });
});
