import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  images: {
    // Hero postcards: freely licensed Wikimedia Commons photos listed in
    // src/data/destination-images.json (credited on each postcard).
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/wikipedia/commons/**", search: "" },
      { protocol: "https", hostname: "thumb.wikimedia.org", pathname: "/**", search: "" },
    ],
  },
  // The map explorer moved to the home page; query strings (?country=) carry over.
  async headers() {
    return [
      {
        // Always fetch the newest worker; it may only load same-origin scripts.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/explore", destination: "/", permanent: true },
      // The old static about page became the /about route.
      { source: "/index.html", destination: "/about", permanent: true },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
