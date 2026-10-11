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
  async redirects() {
    return [{ source: "/explore", destination: "/", permanent: true }];
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
