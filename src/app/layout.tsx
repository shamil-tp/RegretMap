import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { ConnectionStatus } from "@/components/pwa/connection-status";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// Neo-brutalist type system (src/design/design.md §3). Self-hosted by
// next/font: no layout shift, no request to Google at runtime.
const display = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

const body = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RegretMap — Every journey leaves a lesson.",
  description:
    "Learn from real travellers' experiences, discover useful destination tips, and avoid repeating common travel mistakes.",
  applicationName: "RegretMap",
  appleWebApp: { capable: true, title: "RegretMap", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/pwa-icon/192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/pwa-icon/apple-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-canvas focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <ConnectionStatus />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
