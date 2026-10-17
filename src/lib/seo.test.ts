import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { buildSitemap } from "@/app/sitemap";
import type { DestinationSummary } from "@/lib/data";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CREATORS,
  jsonLdScript,
  SITE_URL,
  siteJsonLd,
} from "@/lib/site";

const destination = (over: Partial<DestinationSummary>): DestinationSummary => ({
  id: "d1",
  slug: "kyoto",
  name: "Kyoto",
  region: undefined,
  country: "Japan",
  description: undefined,
  isDemo: false,
  storyCount: 2,
  ...over,
});

const story = (id: string, over: Partial<{ destinationId: string; publishedAt: string; isDemo: boolean }> = {}) => ({
  id,
  destinationId: "d1",
  publishedAt: "2026-10-01T00:00:00Z",
  isDemo: false,
  ...over,
});

describe("canonical URLs", () => {
  it("uses the HTTPS production origin with normalised paths", () => {
    expect(SITE_URL).toBe("https://regret-map.shamiltp.me");
    expect(absoluteUrl("/")).toBe(SITE_URL);
    expect(absoluteUrl("about/")).toBe(`${SITE_URL}/about`);
    expect(absoluteUrl("//stories/x")).toBe(`${SITE_URL}/stories/x`);
  });
});

describe("sitemap", () => {
  const entries = buildSitemap(
    [
      destination({}),
      destination({ id: "d2", slug: "empty", storyCount: 0 }),
      destination({ id: "d3", slug: "demo-town", isDemo: true }),
    ],
    [
      story("s1", { publishedAt: "2026-09-01T00:00:00Z" }),
      story("s2", { publishedAt: "2026-10-05T00:00:00Z" }),
      story("demo", { isDemo: true, publishedAt: "2026-12-01T00:00:00Z" }),
    ],
  );
  const urls = entries.map((e) => e.url);

  it("lists unique canonical URLs on the production origin", () => {
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(url.startsWith(SITE_URL)).toBe(true);
      expect(url).not.toMatch(/[?#]|\/$|index\.html/);
    }
  });

  it("includes home, about, destinations with stories and published stories", () => {
    expect(urls).toEqual(
      expect.arrayContaining([
        SITE_URL,
        `${SITE_URL}/about`,
        `${SITE_URL}/destinations/kyoto`,
        `${SITE_URL}/stories/s1`,
        `${SITE_URL}/stories/s2`,
      ]),
    );
  });

  it("excludes empty and demo destinations, demo stories and private pages", () => {
    expect(urls).not.toContain(`${SITE_URL}/destinations/empty`);
    expect(urls).not.toContain(`${SITE_URL}/destinations/demo-town`);
    expect(urls).not.toContain(`${SITE_URL}/stories/demo`);
    expect(urls.some((u) => /\/(auth|account|moderate|submit|api)\b/.test(u))).toBe(false);
  });

  it("dates a destination by its newest real story, never inventing dates", () => {
    const kyoto = entries.find((e) => e.url.endsWith("/destinations/kyoto"));
    expect(kyoto?.lastModified).toBe("2026-10-05T00:00:00Z");
    expect(entries.find((e) => e.url === SITE_URL)?.lastModified).toBeUndefined();
  });
});

describe("robots.txt", () => {
  const rules = robots();
  const rule = Array.isArray(rules.rules) ? rules.rules[0] : rules.rules;

  it("points at the canonical sitemap", () => {
    expect(rules.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it("blocks private endpoints but not public pages or noindex pages", () => {
    expect(rule.disallow).toEqual(expect.arrayContaining(["/api/", "/auth/callback", "/account", "/moderate"]));
    const blocked = [rule.disallow].flat();
    for (const path of ["/", "/about", "/destinations/", "/stories/", "/auth/sign-in", "/submit", "/pwa-icon/"]) {
      expect(blocked.some((d) => d && path.startsWith(d))).toBe(false);
    }
  });
});

describe("structured data", () => {
  it("is valid JSON that can't break out of its script tag", () => {
    const html = jsonLdScript({ name: "</script><script>alert(1)</script>" });
    expect(html).not.toContain("</script>");
    expect(JSON.parse(html).name).toBe("</script><script>alert(1)</script>");
  });

  it("describes the website and both creators with stable identifiers", () => {
    const graph = JSON.parse(jsonLdScript(siteJsonLd()))["@graph"];
    const website = graph.find((n: { "@type": string }) => n["@type"] === "WebSite");
    expect(website["@id"]).toBe(`${SITE_URL}/#website`);
    const people = graph.filter((n: { "@type": string }) => n["@type"] === "Person");
    expect(people.map((p: { name: string }) => p.name)).toEqual(["Shamil T P", "Nihal T"]);
    expect(website.creator).toEqual(CREATORS.map((c) => ({ "@id": `${SITE_URL}/#${c.id}` })));
  });

  it("builds breadcrumbs with absolute URLs", () => {
    const crumbs = breadcrumbJsonLd([
      ["Home", "/"],
      ["Kyoto", "/destinations/kyoto"],
    ]);
    expect(crumbs.itemListElement.map((i) => [i.position, i.item])).toEqual([
      [1, SITE_URL],
      [2, `${SITE_URL}/destinations/kyoto`],
    ]);
  });
});

describe("page metadata", () => {
  const source = (path: string) => readFileSync(path, "utf8");

  it.each([
    "src/app/account/page.tsx",
    "src/app/moderate/page.tsx",
    "src/app/submit/page.tsx",
    "src/app/auth/sign-in/page.tsx",
    "src/app/auth/sign-up/page.tsx",
    "src/app/not-found.tsx",
  ])("%s is noindex", (path) => {
    expect(source(path)).toMatch(/robots: NO_INDEX/);
  });

  it.each([
    ["src/app/page.tsx", 'canonical: "/"'],
    ["src/app/about/page.tsx", 'canonical: "/about"'],
    ["src/app/destinations/[slug]/page.tsx", "canonical: path"],
    ["src/app/stories/[id]/page.tsx", "canonical: path"],
  ])("%s has a title, description and canonical URL", (path, canonical) => {
    const page = source(path);
    expect(page).toContain(canonical);
    expect(page).toMatch(/\btitle\b/);
    expect(page).toMatch(/\bdescription\b/);
  });

  it.each(["src/app/about/page.tsx", "src/app/destinations/[slug]/page.tsx", "src/app/stories/[id]/page.tsx"])(
    "%s keeps the social preview image when it overrides Open Graph",
    (path) => {
      expect(source(path)).toContain("images: [OG_IMAGE]");
    },
  );

  it("story and destination metadata use only public story fields", () => {
    for (const path of ["src/app/destinations/[slug]/page.tsx", "src/app/stories/[id]/page.tsx"]) {
      const page = source(path);
      const start = page.indexOf("export async function generateMetadata");
      const metadata = page.slice(start, page.indexOf("export default", start));
      expect(metadata).not.toMatch(/email|user_?id|viewer|author_id/i);
    }
  });
});
