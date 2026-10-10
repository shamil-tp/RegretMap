# RegretMap

**Every journey leaves a lesson.**

RegretMap is a community-powered map of travel experiences. Travellers share what
happened on a trip, the mistakes they made, what they learned, and practical advice
for the next person. Others can search a destination, explore where stories happened
on a map, read the original experiences, and see a short "Before you go" summary
built from those stories.

RegretMap is about **destinations, places, journeys, activities and travel
conditions** — not a hotel, room or restaurant rating site.

> **Current status: development preview (Phase 4 of 11).**
> Destinations and stories are read from Supabase (PostgreSQL) with Row Level
> Security. The current content is a **clearly labelled demo seed** written for
> development — not real community submissions. There are no user accounts,
> story submission or AI yet. See the [roadmap](#roadmap).

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [Database (Supabase)](#database-supabase)
- [Demo data](#demo-data)
- [Maps, place search and usage policies](#maps-place-search-and-usage-policies)
- [Design principles](#design-principles)
- [Trust, safety and privacy principles](#trust-safety-and-privacy-principles)
- [CI and releases](#ci-and-releases)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

---

## Features

### Explore page (`/`)

- **Destination search with autocomplete.**
  - Destinations that have stories appear first, with their story count, and open
    the destination page.
  - Other real places (cities, towns, beaches, peaks, passes, landmarks) come from
    [Photon](https://photon.komoot.io) and are clearly marked
    **"Other places — no stories yet"**. Choosing one explains honestly that no
    stories exist for it yet.
  - Keyboard support: ↑/↓ to move, Enter to choose, Esc to close; screen-reader
    combobox semantics; clear button; loading and empty states.
- **Interactive map** (Leaflet + OpenStreetMap) with a pin for every story.
  Clicking a pin shows a popup with a link to the story.
- **Location picker:** click anywhere on the map to see its coordinates (for the
  future story form; nothing is saved).
- **Story feed** with category filters, travel-time filter, sorting and reset.
  The map pins always show the same filtered stories as the feed.
- **"Show on map"** on each story highlights its pin and opens its popup.
- List of destinations with their demo story counts.

### Destination page (`/destinations/[slug]`)

- Destination name, region, country, short description, number of stories and the
  months travellers visited.
- **Before you go:** travellers' own lessons grouped by topic (transport, planning,
  packing…). Every lesson is quoted from a story and links to it, with an honest
  evidence label ("One traveller reported this" / "Based on N stories") and a
  season label when all supporting stories share one. No text is generated.
- Map fitted to the destination's story locations, plus the filterable story feed.

### Story page (`/stories/[id]`)

- Full story: what happened, what went wrong, what they'd do differently, and advice
  for future travellers.
- Category, travel month/year, place, and a (sample) published date.
- Small map showing where it happened, and more stories from the same destination.
- "Helpful" and "Report" buttons are **local placeholders only** — nothing is saved
  or sent yet.

### General

- Light theme, responsive from phones to desktop, visible keyboard focus, skip link.
- Loading, empty, error and not-found states.
- The map degrades gracefully: loading state, tile-error notice, and an error panel
  that keeps the rest of the page usable if the map fails.

## Tech stack

| Area | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack, Cache Components) |
| UI | React 19, TypeScript (strict), Tailwind CSS v4, [Lucide](https://lucide.dev) icons |
| Map | [Leaflet](https://leafletjs.com) 1.9 + [React Leaflet](https://react-leaflet.js.org) 5, OpenStreetMap tiles |
| Place search | [Photon](https://photon.komoot.io) (OpenStreetMap-based geocoder), via a server route |
| Database | [Supabase](https://supabase.com) PostgreSQL with Row Level Security, `@supabase/supabase-js` (server-side only) |
| Testing | [Vitest](https://vitest.dev) (unit tests with a mocked Supabase client) |
| Linting | ESLint 9 with `eslint-config-next` |
| CI/CD | GitHub Actions (CI checks + tag-based GitHub Releases) |
| Planned | Supabase Auth, Gemini API (server-side only) |

## Getting started

### Requirements

- **Node.js 24** (Next.js 16 needs ≥ 20.9; CI uses Node 24)
- **npm 11.19 or newer** — CI uses the npm bundled with Node 24. Older npm versions
  (e.g. 11.6) write a lockfile that newer npm rejects in `npm ci`. Update with
  `npm install -g npm@11.19.0`.

### Install and run

```bash
git clone https://github.com/shamil-tp/RegretMap.git
cd RegretMap
npm install
cp .env.example .env.local   # then fill in the Supabase URL and publishable key
npm run dev
```

Open <http://localhost:3000>. Before stories appear, set up the database once —
see [Database (Supabase)](#database-supabase). Without it, pages still load and
show a friendly "Stories can't be loaded right now" message.

> Only one `next dev` server can run per project folder. If another one is already
> running, Next.js prints its URL and PID instead of starting a second server.

## Environment variables

Copy `.env.example` to `.env.local` (which is git-ignored). Only the two Supabase
variables are needed to load stories; everything else is optional or for later
phases.

| Variable | Exposed to browser | Used now | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_MAP_TILE_URL` | Yes | Yes (optional) | Custom tile URL template. Must be `https://` and contain `{z}`, `{x}`, `{y}`; otherwise the OpenStreetMap default is used. |
| `PHOTON_API_URL` | No | Yes (optional) | Self-hosted Photon endpoint (https). Empty uses the public `https://photon.komoot.io/api/`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | **Yes (required)** | Supabase project URL (Dashboard → Project Settings → Data API). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | **Yes (required)** | Publishable key (`sb_publishable_…`). Used on the server for public reads; RLS applies. |
| `SUPABASE_SECRET_KEY` | **No — server only** | Not yet | Secret key for trusted server operations in later phases. |
| `GEMINI_API_KEY` | **No — server only** | Phase 7+ | Gemini API key. |
| `GEMINI_MODEL` | No | Phase 7+ | Gemini model identifier. |

Rules: never put secret keys in `NEXT_PUBLIC_*` variables, client components, logs
or committed files.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (no network, no real credentials) |
| `npx next typegen && npx tsc --noEmit` | Type-check (`typegen` creates Next.js route types first) |

## Project structure

```text
src/
├── app/
│   ├── page.tsx                      Explore page
│   ├── destinations/[slug]/page.tsx  Destination page
│   ├── stories/[id]/page.tsx         Story page
│   ├── api/places/autocomplete/      Place search route (Photon proxy)
│   ├── layout.tsx                    Root layout, fonts, header/footer
│   ├── globals.css                   Design tokens + Leaflet styling
│   ├── loading.tsx · error.tsx · not-found.tsx
├── components/
│   ├── destination-search.tsx        Autocomplete combobox
│   ├── story-explorer.tsx            Map + filters + feed, kept in sync
│   ├── story-filters.tsx             Category / travel-time / sort controls
│   ├── story-card.tsx                Story preview card
│   ├── before-you-go.tsx             Lessons grouped by topic
│   ├── story-actions.tsx             Helpful / Report placeholders
│   ├── share-callout.tsx             "Share an experience" section
│   ├── map/explore-map.tsx           Client-only map loader + error boundary
│   ├── map/story-map.tsx             Leaflet map (pins, popups, focus, picker)
│   ├── site-header.tsx · mobile-nav.tsx · site-footer.tsx · wordmark.tsx
│   └── ui/                           Button styles, Badge, StateMessage
├── lib/
│   ├── stories.ts                    Domain types (Destination, TravelStory, …) and formatters
│   ├── data.ts                       Data-access functions (only DB reader; server-only)
│   ├── mappers.ts                    Selected columns, row types, row → domain mapping
│   ├── supabase/server.ts            Server-only Supabase client (publishable key)
│   ├── story-filtering.ts            Pure filter/sort used by the feed
│   ├── before-you-go.ts              Groups story lessons by topic
│   ├── map.ts                        Tile config, MapPoint type, story → map point
│   ├── place-search.ts               Place-search types and client helper
│   └── *.test.ts                     Unit tests
└── test/                             Test fixtures and stubs
supabase/
├── migrations/                       Versioned SQL migrations (schema + RLS)
├── seed.sql                          DEMO seed data (is_demo = true)
└── tests/rls_check.sql               Non-destructive RLS policy check
```

## How it works

### Data flow

```text
Supabase (RLS) ──► lib/supabase/server.ts ──► lib/data.ts ──► Server Components (pages)
                                                            └─► Client Components get only the props they need
```

- `src/lib/data.ts` is the only module that queries the database. It is
  `server-only`, filters on `status = 'published'` explicitly (in addition to RLS),
  selects only the columns the UI needs, bounds result sizes, and deduplicates
  repeated calls within a request with React `cache`.
- Database errors are logged on the server and reach users only as a generic
  "Stories can't be loaded right now" state — never raw error text. There is **no
  silent fallback** to fictional data.

Main types (`src/lib/stories.ts`): `Destination`, `TravelStory`, `StoryCategory`,
`Coordinates`, and `StoryWithDestination`.

Story categories: transport, planning, weather, packing, activity, accessibility,
safety, costs, local customs, other.

### Rendering

- Pages are React Server Components with Cache Components (Partial Prerendering):
  a static shell is prerendered, and database-backed sections stream in at request
  time inside `<Suspense>` boundaries with skeleton loading states. The database is
  never queried at build time, so builds (including CI) need no credentials and new
  stories appear without a rebuild. Unknown slugs/ids show the not-found page.
- Interactive pieces (search, filters, map, mobile menu, story actions) are Client
  Components.
- The map is browser-only (`next/dynamic` with `ssr: false`). It creates the Leaflet
  map in a single effect and removes it in that effect's cleanup, so React Strict
  Mode and hidden/re-shown routes always get exactly one working map.
- The map receives only the fields it needs (`MapPoint`: id, coordinates, title,
  place, category, demo flag, link) — never full story bodies.

### Place search

`GET /api/places/autocomplete?q=…` (server route) calls Photon and returns
simplified suggestions. It:

- Accepts 2–100 characters (shorter returns nothing, longer returns `400`).
- Rate-limits each IP to 30 requests per minute (`429` with `Retry-After`).
- Caches results for an hour and times out after 4 seconds.
- Returns only destination-like features (places, natural features, historic sites,
  mountain passes, attractions, viewpoints, museums, national parks, waterfalls) —
  not hotels, restaurants or street addresses.
- Never forwards provider error details to the browser.

The rate limit and cache are in memory per server instance — fine for development
and a single instance; a shared store is needed for a scaled deployment.

## Database (Supabase)

### Schema

| Table | Purpose | Key columns |
|---|---|---|
| `destinations` | Places travellers write about | `slug` (unique, URL-safe), `name`, `region`, `country`, `description`, `latitude`/`longitude`, `status` (`draft` / `published` / `hidden`), `is_demo`, timestamps |
| `stories` | Personal travel experiences | `destination_id` → `destinations.id` (**on delete restrict** — no orphans), `title`, `body`, `category`, `place_name`, coordinates, `travel_month`/`travel_year`, `challenge`, `lesson`, `advice`, `status` (`pending` / `published` / `hidden` / `rejected`), `published_at`, `is_demo`, timestamps |

Constraints enforce length limits, valid categories and months, coordinate ranges,
both-or-neither coordinates, and a `published_at` date for published stories.
Partial indexes cover published stories per destination and globally, newest first.
`updated_at` is maintained by a trigger.

### Row Level Security

- `anon` and `authenticated` can **only SELECT** published destinations, and
  published stories whose destination is also published.
- There are **no insert/update/delete policies**, and write privileges are revoked,
  so browsers cannot create, publish or modify content.
- The app never uses a secret/service-role key for these reads.

### Set up a Supabase project

Run these in **Supabase Dashboard → SQL Editor** (or `npx supabase db push` if you
use the Supabase CLI), in order:

1. `supabase/migrations/20261011120000_create_destinations_and_stories.sql`
2. `supabase/migrations/20261011120100_public_read_rls.sql`
3. *(optional, development only)* `supabase/seed.sql` — labelled demo content
4. `supabase/tests/rls_check.sql` — should finish with "All RLS checks passed";
   it rolls back everything it creates.

Migrations are additive (no drops or resets). Never run the seed automatically in
production.

## Demo data

`supabase/seed.sql` inserts **5 demo destinations** (Manali, Munnar, Jaipur, Leh,
Varkala) and **18 demo stories**, all with `is_demo = true`. It is safe to re-run
(it never overwrites rows). Remove it later with:

```sql
delete from public.stories where is_demo;
delete from public.destinations where is_demo;
```

- The UI labels demo records "Demo example", "Demo destination" or "Derived from
  demo stories"; non-demo records are shown without these labels.
- They are illustrative scenarios written for development — **not real people, real
  submissions, or verified facts**. Published dates are labelled "Sample date".
- Coordinates are approximate public locations chosen for map testing.
- Story counts shown in the app are counts of demo stories, not community statistics.

## Maps, place search and usage policies

- **Leaflet** provides the interactive map (pan, zoom, markers, popups, events).
- **OpenStreetMap** provides the map data and the default tiles
  (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`). No API key is needed.
  Attribution is always visible on the map. The public tile service is not unlimited
  production hosting — follow the
  [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/) and
  configure `NEXT_PUBLIC_MAP_TILE_URL` for a dedicated provider before heavy use.
- **Photon** provides place autocomplete from OpenStreetMap data. No key is needed;
  the public instance is fair-use ("extensive usage will be throttled") with no
  availability guarantee. Results show "Place search by Photon · © OpenStreetMap
  contributors". Use `PHOTON_API_URL` for a self-hosted instance in production.
- The public **Nominatim** service is not used: its policy forbids autocomplete.

## Design principles

- Light theme only: white and light-grey surfaces, charcoal text, coral-red accent.
- Calm, editorial travel feel; the map and readable stories are the main elements.
- No star ratings, popularity scores, AI mascots or decorative AI elements.
- Story counts and map density mean "more submissions", never danger or quality.

## Trust, safety and privacy principles

These guide current and future phases (see `CLAUDE.md` for the full specification):

- A story is a personal account, not a proven fact; the UI says so.
- Guidance must link to the stories it comes from and show honest sample sizes.
- AI (later phases) is a quiet helper for moderation flags and summaries — never a
  truth oracle, and always grounded in retrieved stories.
- Moderation status, author identity and counts are set by the server, never trusted
  from the browser. Public queries expose only safe, published fields.
- Secrets stay server-side; `.env.local` is git-ignored.

## CI and releases

GitHub Actions workflows live in `.github/workflows/`.

**CI (`ci.yml`)** runs on pull requests to `main` and pushes to `main`:
`npm ci` → lint → type-check → tests → production build, on Node 24 with npm caching
and a read-only token. Superseded runs are cancelled. No secrets are needed.

**Release (`release.yml`)** runs when a tag like `v1.2.3` is pushed:

1. Validates the tag is strict `vMAJOR.MINOR.PATCH` (rejects `v1.0`, `1.0.0`,
   `v1.0.0-beta.1`) and that the tagged commit is on `main`.
2. Runs the same quality checks on the exact tagged commit.
3. Creates a GitHub Release with auto-generated notes (fails safely if one exists).

```bash
git push origin main
git tag -a v1.2.0 -m "RegretMap v1.2.0"
git push origin v1.2.0
```

## Roadmap

Development follows the phases in [`CLAUDE.md`](CLAUDE.md):

| Phase | Scope | Status |
|---|---|---|
| 0 | Repository audit and setup | ✅ Done |
| 1 | Frontend foundation and design system | ✅ Done |
| 2 | Interactive map (Leaflet + OpenStreetMap) | ✅ Done |
| 3 | Destination and story UI, search, filters (demo data) | ✅ Done |
| 4 | Supabase schema, RLS and data access | ✅ Done |
| 5 | Submit and browse real community stories, reactions, reports | Planned |
| 6 | Heatmap, clusters and location filters | Planned |
| 7 | Gemini moderation (server-side) | Planned |
| 8 | "Before you go" recommendations grounded in stories | Planned |
| 9 | Destination-specific AI chat | Planned |
| 10 | Authentication and account controls | Planned |
| 11 | Quality, accessibility and launch readiness | Planned |

Known gaps in the current version: no story submission form yet, Helpful/Report
are placeholders, no pagination (lists are capped at 100–200 stories), not-found
pages for missing destinations/stories return HTTP 200 because they stream after the
page shell, and some landmark names don't match well in Photon (e.g. "Amer Fort").

## Contributing

1. Read [`CLAUDE.md`](CLAUDE.md) — it is the product spec and implementation contract.
2. Branch from `main`, keep changes to one phase or fix, and open a pull request.
3. Make sure `npm run lint`, the type-check and `npm run build` pass (CI runs them).
4. Never commit secrets or present demo content as real community data.
