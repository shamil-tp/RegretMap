import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  images: {
    // Destination photos: freely licensed Wikimedia Commons files listed in
    // src/data/destination-images.json (credited next to each photo).
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/wikipedia/commons/**", search: "" },
      { protocol: "https", hostname: "thumb.wikimedia.org", pathname: "/**", search: "" },
    ],
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
