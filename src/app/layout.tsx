import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { ConnectionStatus } from "@/components/pwa/connection-status";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
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
  metadataBase: new URL(SITE_URL),
  title: "RegretMap — Every journey leaves a lesson. | by Shamil TP",
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Shamil TP",
    "RegretMap",
    "travel mistakes",
    "travel lessons",
    "travel regrets",
    "travel tips",
    "destination guide",
    "traveller stories",
  ],
  authors: [AUTHOR],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [{ url: "/pwa-icon/512.png", width: 512, height: 512, alt: "RegretMap logo" }],
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ["/pwa-icon/512.png"],
  },
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, title: "RegretMap", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/pwa-icon/192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/pwa-icon/apple-180.png", sizes: "180x180", type: "image/png" }],
  },
};

// Structured data: the site and its creator, for search engines.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      creator: { "@id": `${SITE_URL}/#shamil-tp` },
    },
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#shamil-tp`,
      name: AUTHOR.name,
      url: AUTHOR.url,
      sameAs: ["https://github.com/shamil-tp", "https://www.linkedin.com/in/shamil-tp/"],
    },
  ],
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
        <script
          type="application/ld+json"
          // Static object built above; no user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
