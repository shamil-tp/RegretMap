import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

/*
 * Runs the real public/sw.js in a sandbox and checks its routing policy:
 * what may be cached, what is network-only, and what it must never touch.
 */
const ORIGIN = "https://regret-map.shamiltp.me";
const source = readFileSync("public/sw.js", "utf8");

type Policy = (request: unknown) => "static" | "navigate" | "bypass";
function loadPolicy(): Policy {
  const self: Record<string, unknown> = {
    location: { origin: ORIGIN },
    addEventListener: () => {},
    registration: {},
  };
  runInNewContext(source, { self, URL, Response, caches: undefined, fetch: undefined });
  return self.__regretmapPolicy as Policy;
}

const policy = loadPolicy();
const req = (path: string, init: { method?: string; mode?: string; headers?: Record<string, string> } = {}) => ({
  url: path.startsWith("http") ? path : `${ORIGIN}${path}`,
  method: init.method ?? "GET",
  mode: init.mode ?? "cors",
  headers: new Headers(init.headers),
});

describe("service worker policy", () => {
  it("caches only hashed static assets and app icons", () => {
    expect(policy(req("/_next/static/chunks/app-123abc.js"))).toBe("static");
    expect(policy(req("/_next/static/media/font.woff2"))).toBe("static");
    expect(policy(req("/pwa-icon/192.png"))).toBe("static");
  });

  it("handles page navigations network-only (with the offline fallback), including auth pages", () => {
    expect(policy(req("/", { mode: "navigate" }))).toBe("navigate");
    expect(policy(req("/destinations/hampi", { mode: "navigate" }))).toBe("navigate");
    expect(policy(req("/auth/callback?code=x", { mode: "navigate" }))).toBe("navigate");
  });

  it("never touches other origins: Supabase, map tiles, place search, photos", () => {
    for (const url of [
      "https://xyz.supabase.co/auth/v1/token?grant_type=password",
      "https://xyz.supabase.co/rest/v1/stories?select=*",
      "https://a.tile.openstreetmap.org/3/4/2.png",
      "https://photon.komoot.io/api/?q=goa",
      "https://upload.wikimedia.org/wikipedia/commons/x.jpg",
    ]) {
      expect(policy(req(url)), url).toBe("bypass");
    }
  });

  it("never touches mutations, server actions, RSC data, API or auth requests", () => {
    expect(policy(req("/submit", { method: "POST" }))).toBe("bypass");
    expect(policy(req("/stories/abc", { method: "POST", headers: { "Next-Action": "abc" } }))).toBe("bypass");
    expect(policy(req("/destinations/hampi", { headers: { RSC: "1" } }))).toBe("bypass");
    expect(policy(req("/destinations/hampi?_rsc=1x2y"))).toBe("bypass");
    expect(policy(req("/api/places/autocomplete?q=goa"))).toBe("bypass");
    expect(policy(req("/auth/sign-in"))).toBe("bypass");
    expect(policy(req("/stories/abc"))).toBe("bypass"); // non-navigation fetch of a page
  });

  it("only ever writes to the cache from the static (cache-first) path", () => {
    expect(source.match(/cache\.put\(/g)).toHaveLength(1);
    expect(source).toMatch(/async function cacheFirst[\s\S]*cache\.put\(/);
    expect(source).toMatch(/response\.ok && response\.type === "basic"/);
  });
});

describe("web app manifest", () => {
  const m = manifest();

  it("is installable as a standalone app", () => {
    expect(m).toMatchObject({ name: "RegretMap", short_name: "RegretMap", start_url: "/", display: "standalone" });
    expect(m.description).toBe("Learn from real travellers' mistakes and travel smarter.");
  });

  it("has 192 and 512 icons plus a maskable icon", () => {
    const sizes = (m.icons ?? []).map((icon) => `${icon.sizes}:${icon.purpose}`);
    expect(sizes).toEqual(expect.arrayContaining(["192x192:any", "512x512:any", "512x512:maskable"]));
  });
});
