/** Canonical site constants shared by metadata, robots, sitemap and JSON-LD. */
export const SITE_URL = "https://regret-map.shamiltp.me";
export const SITE_NAME = "RegretMap";
export const SITE_TAGLINE = "Travel smarter. Regret less.";
export const SITE_DESCRIPTION =
  "Learn from real traveller experiences, discover travel lessons, and avoid common mistakes before your next trip.";

/**
 * The people who built RegretMap. Profile links are the ones the project
 * itself publishes (repository commits, README page); add nothing unverified.
 */
export const CREATORS = [
  {
    id: "shamil-tp",
    name: "Shamil T P",
    alternateName: ["Shamil TP"],
    url: "https://shamiltp.me",
    sameAs: ["https://github.com/shamil-tp", "https://www.linkedin.com/in/shamil-tp/"],
  },
  {
    id: "nihal-t",
    name: "Nihal T",
    alternateName: ["MrNihalT"],
    url: "https://github.com/MrNihalT",
    sameAs: ["https://github.com/MrNihalT", "https://www.linkedin.com/in/mrnihalt/"],
  },
] as const;

export const REPOSITORY_URL = "https://github.com/shamil-tp/RegretMap";

/** Absolute URL on the canonical origin for a site path ("/about" → https://…/about). */
export function absoluteUrl(path = "/"): string {
  const normalized = `/${path.replace(/^\/+/, "")}`.replace(/\/+$/, "") || "/";
  return normalized === "/" ? SITE_URL : `${SITE_URL}${normalized}`;
}

/**
 * Site social preview (src/app/opengraph-image.tsx). A page that sets its own
 * openGraph replaces the inherited one, so it must list the image again.
 */
export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
} as const;

/** Robots directive for utility and private pages: don't index, still follow links. */
export const NO_INDEX = { index: false, follow: true } as const;

/** JSON for a <script type="application/ld+json">, safe to inline in HTML. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** schema.org BreadcrumbList from [name, path] pairs. */
export function breadcrumbJsonLd(items: ReadonlyArray<readonly [name: string, path: string]>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: absoluteUrl(path),
    })),
  };
}

/** Site-wide identity graph: the website and the people who built it. */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: "Regret Map",
        description: SITE_DESCRIPTION,
        inLanguage: "en",
        creator: CREATORS.map((c) => ({ "@id": `${SITE_URL}/#${c.id}` })),
      },
      ...CREATORS.map((c) => ({
        "@type": "Person",
        "@id": `${SITE_URL}/#${c.id}`,
        name: c.name,
        alternateName: c.alternateName,
        url: c.url,
        sameAs: c.sameAs,
      })),
    ],
  };
}
