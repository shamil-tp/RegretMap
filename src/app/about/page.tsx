import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CREATORS,
  jsonLdScript,
  OG_IMAGE,
  REPOSITORY_URL,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

/*
 * About RegretMap: what it is, how it works, and who built it. Static and
 * factual; the details mirror README.md and must stay in step with it.
 */

const title = "About RegretMap";
const description =
  "What RegretMap is, how its map, travel notes and story-grounded AI work, and who built it: Shamil T P and Nihal T.";

export const metadata: Metadata = {
  title: { absolute: `${title} — Who built it and how it works` },
  description,
  alternates: { canonical: "/about" },
  openGraph: { type: "website", url: "/about", title, description, images: [OG_IMAGE] },
};

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": `${SITE_URL}/about#page`,
      url: absoluteUrl("/about"),
      name: title,
      description,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#app` },
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "TravelApplication",
      operatingSystem: "Any (web browser)",
      creator: CREATORS.map((c) => ({ "@id": `${SITE_URL}/#${c.id}` })),
    },
    breadcrumbJsonLd([
      ["Home", "/"],
      [title, "/about"],
    ]),
  ],
};

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">{heading}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-ink">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(aboutJsonLd) }} />
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="rounded hover:text-ink">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink">
            About
          </li>
        </ol>
      </nav>

      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        About RegretMap
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-muted">
        RegretMap is a community map of travel lessons. Travellers share what happened on a
        trip — the mistakes, the surprises and what they would do differently — so the next
        person doesn&apos;t repeat them.
      </p>

      <Section heading="The problem it addresses">
        <p>
          Most travel content describes what to see. The small mistakes — the wrong season,
          the missed permit, the transport that didn&apos;t run — are usually learned the
          hard way. RegretMap collects those lessons by destination so you can read them
          before you go.
        </p>
      </Section>

      <Section heading="How travellers use it">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Search a destination, or pick one on the map.</li>
          <li>Read what happened, what went wrong, and the lesson.</li>
          <li>Plan with the &ldquo;Before you go&rdquo; summary and ask questions.</li>
          <li>
            Back home? <Link href="/submit" className="font-medium text-accent hover:underline">Share your own experience</Link>.
            It is published right away and shown anonymously.
          </li>
        </ol>
      </Section>

      <Section heading="Traveller stories and travel notes">
        <p>
          <strong>Community stories</strong> are personal accounts submitted through the site.
          They are one traveller&apos;s experience, not verified or current advice.
        </p>
        <p>
          <strong>Travel notes</strong> are practical guidance written by the RegretMap team from
          general travel information. They are always labelled &ldquo;Travel note&rdquo; and are
          never presented as a personal experience. Stories marked as demo examples are
          illustrations, not real submissions.
        </p>
      </Section>

      <Section heading="The map and destinations">
        <p>
          Every story is a pin on an OpenStreetMap map. You can filter by country, category
          and season, switch on a heatmap of where stories cluster, and open any destination
          for its stories, a map of where they happened, and its &ldquo;Before you go&rdquo;
          lessons.
        </p>
      </Section>

      <Section heading="How the AI answers stay grounded">
        <p>
          AI only runs on destination pages, on the server, with Google Gemini. The
          &ldquo;Before you go&rdquo; summary and the &ldquo;Ask travellers&rdquo; chat see only
          that destination&apos;s published stories, and every tip or answer must cite the
          stories it came from. Answers that cite no story, or that state numbers the stories
          don&apos;t contain, are rejected. If the stories don&apos;t cover a question, the chat
          says so instead of guessing.
        </p>
      </Section>

      <Section heading="Who built it">
        <p>
          RegretMap was built by{" "}
          {CREATORS.map((c, i) => (
            <span key={c.id}>
              {i > 0 && " and "}
              <a href={c.url} rel="author" className="font-medium text-accent hover:underline">
                {c.name}
              </a>
            </span>
          ))}
          . The source code is on{" "}
          <a href={REPOSITORY_URL} className="font-medium text-accent hover:underline">
            GitHub
          </a>
          , where you can also report problems or send feedback.
        </p>
      </Section>

      <p className="mt-12 rounded-md bg-surface px-3 py-2.5 text-sm text-ink-muted">
        Stories and notes may be out of date. Check official sources for permits, weather,
        safety and transport.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className={buttonClasses("primary")}>
          Explore destinations
        </Link>
        <Link href="/submit" className={buttonClasses("secondary")}>
          Share an experience
        </Link>
      </div>
    </div>
  );
}
