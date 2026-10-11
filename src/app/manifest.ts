import type { MetadataRoute } from "next";

/** Web app manifest (served at /manifest.webmanifest and linked automatically). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "RegretMap",
    short_name: "RegretMap",
    description: "Learn from real travellers' mistakes and travel smarter.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    // Header white for the title bar; raw-paper canvas for the splash screen.
    theme_color: "#FFFFFF",
    background_color: "#F7F6F2",
    categories: ["travel", "lifestyle"],
    icons: [
      { src: "/pwa-icon/192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
