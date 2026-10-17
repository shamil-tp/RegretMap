import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/*
 * Only machine endpoints and private pages are blocked from crawling. Sign-in,
 * sign-up and the submit form stay crawlable so their noindex tags are seen.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/callback", "/account", "/moderate"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
