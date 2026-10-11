# RegretMap

**Travel smarter. Regret less.**

RegretMap is a community map of travel lessons. Travellers share what happened on a
trip — the mistakes, the surprises, and what they'd do differently — so the next
person doesn't repeat them. Visitors search a destination, explore where stories
happened on a map, read the original experiences, discuss them, and get a short
"Before you go" summary and a question-answering chat grounded **only** in those
stories.

RegretMap is about **destinations, places, journeys, activities and travel
conditions** — not a hotel, room or restaurant rating site.

**Live site:** <https://regret-map.shamiltp.me>

---

## Contents

- [Features](#features)
- [Content](#content)
- [How the AI stays honest](#how-the-ai-stays-honest)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database setup (Supabase)](#database-setup-supabase)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Security and privacy](#security-and-privacy)
- [Design](#design)
- [Maps, search and photo credits](#maps-search-and-photo-credits)
- [Testing, CI and releases](#testing-ci-and-releases)
- [Known limitations](#known-limitations)

---

## Features

### Home (`/`)

- **Destination search** with autocomplete: RegretMap destinations first, then any
  town worldwide (Photon / OpenStreetMap). Picking a place without stories suggests
  the nearest destination that has some, or invites you to share the first story.
- **Photo postcards** of real destinations (freely licensed, credited).
- **Map explorer** below the hero: every story as a pin, an optional story-density
  heatmap, a **country filter** (`/?country=Japan`), category / season / sort filters,
  and a feed that loads **10 stories at a time** ("Show more").
- No AI runs on the home page — AI only starts once a destination is chosen.

### Destination page (`/destinations/[slug]`)

- **Before you go** — lessons quoted from the stories, plus an AI summary where every
  tip links to the stories it came from.
- The destination's stories on a map and in a filterable feed, each with a reply count.
- **Ask travellers** — a chat that answers only from this destination's published
  stories. It loads only when opened.

### Story page (`/stories/[id]`)

- The full story: what happened, what went wrong, the lesson and advice.
- **Regret reactions**: 👍 Helpful, 😬 Yikes, 🙋 Been there, 💡 Good tip.
- **Threaded discussion** (Reddit-style): reply to any comment up to six levels deep,
  collapse threads, and edit or delete your own comments.

### Share an experience (`/submit`)

- A validated form with place autocomplete or map picking, category, travel month,
  lesson and advice. Stories are **published immediately**; an AI check only labels
  them for moderators, it never publishes or rejects anything.

### Accounts and moderation

- Email + password accounts (Supabase Auth) for reactions, comments and a list of your
  own submissions on `/account`.
- Moderators (listed in `MODERATOR_EMAILS`) see submissions awaiting review, with their
  AI labels, on `/moderate`. A published story is hidden with
  `update public.stories set status = 'hidden' where id = '…';`.

---

## Content

| Set                | What it contains                                                            |
| ------------------ | --------------------------------------------------------------------------- |
| Community stories  | Personal accounts submitted through the site.                               |
| India travel notes | 201 notes across all 28 states and 8 Union Territories.                     |
| World travel notes | 128 notes for 75 destinations in 52 countries on every inhabited continent. |

Travel notes are practical guidance written by the RegretMap team. They are stored
with `source = 'editorial'` and always shown as **"Travel note"**, never as a
personal experience. The AI is told the same, and counts them separately from
traveller stories.

---

## How the AI stays honest

All AI runs on the server with Google Gemini. The site keeps working without it.

- **Grounded in stories only.** The summary and chat see only published stories for
  the current destination, delimited as untrusted data; instructions inside stories
  are ignored.
- **Checked sources.** The model cites stories by short references; the server maps
  them back and rejects any reference it didn't send or that belongs to another
  destination.
- **No invented specifics.** Any number (price, time, distance, temperature) must
  appear in the cited stories, otherwise the tip or answer is rejected.
- **No uncited answers.** A chat answer that cites no story is replaced by a fixed
  "the stories don't cover that yet" reply, so general knowledge can't slip in.
- **Trip-planning questions** ("I want to go to Dubai, give me full guidelines")
  get a fixed note that answers come only from travellers' stories and regrets, plus a
  referral to **The Visa Guy** for full plans, visas or bookings. This wording is
  written by the server, not the model.
- **Failures are honest.** If Gemini is unavailable, the summary says it will appear
  later and the chat shows the stories most related to the question.
- **Reliability.** A pool of API keys (`GEMINI_API_KEY`, `GEMINI_API_KEY2`, …; up to
  ten tried per request) is used round-robin. Rate limits, overloads and timeouts move
  to the next key, with an optional `GEMINI_FALLBACK_MODEL`. Summaries are cached in
  the database and invalidated when the underlying stories change.

---

## Tech stack

- **Next.js 16** (App Router, Cache Components) · **React 19** · **TypeScript** (strict)
- **Tailwind CSS 4** · Space Grotesk / IBM Plex Sans / JetBrains Mono via `next/font`
- **Supabase**: PostgreSQL with Row Level Security, Auth
- **Leaflet** + React Leaflet + leaflet.heat, OpenStreetMap tiles
- **Google Gemini** (server-side REST)
- **zod**, **lucide-react**, **Vitest**

---

## Getting started

Requirements: **Node.js 24** and **npm 11.19+** (older npm writes a lockfile that CI's
`npm ci` rejects; update with `npm install -g npm@11.19.0`).

```bash
git clone https://github.com/shamil-tp/RegretMap.git
cd RegretMap
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Open <http://localhost:3000>. Set up the database once (below) for stories to appear;
without it, pages still load and show a friendly "can't load stories" message.

---

## Environment variables

Copy `.env.example` to `.env.local`. Never commit real values.

| Variable                               | Where                 | Purpose                                             |
| -------------------------------------- | --------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | public                | Supabase project URL                                |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public                | Publishable key (RLS always applies)                |
| `SUPABASE_SECRET_KEY`                  | **server only**       | Trusted server writes (submissions, AI cache)       |
| `GEMINI_API_KEY`, `GEMINI_API_KEY2`, … | **server only**       | Gemini key pool                                     |
| `GEMINI_MODEL`                         | server only           | e.g. `gemini-3.1-flash-lite`                        |
| `GEMINI_FALLBACK_MODEL`                | server only, optional | Second model used only when the main one is failing |
| `MODERATOR_EMAILS`                     | server only           | Comma-separated moderator emails                    |
| `SITE_URL`                             | server only           | Public URL used in sign-up confirmation emails      |
| `PHOTON_API_URL`                       | server only, optional | Self-hosted Photon instance                         |
| `NEXT_PUBLIC_MAP_TILE_URL`             | public, optional      | Custom map tile provider                            |

Secrets never use a `NEXT_PUBLIC_` prefix, and a test fails if a client component
imports server-only modules.

---

## Database setup (Supabase)

Run these in the Supabase **SQL Editor**, in order. Every script is safe to re-run.
If the editor asks about RLS when a script creates a table, choose **Run without RLS**
— each script enables RLS itself.

1. Migrations, in filename order, from `supabase/migrations/`:
    1. `20261011120000_create_destinations_and_stories.sql`
    2. `20261011120100_public_read_rls.sql`
    3. `20261011130000_story_submission_key.sql`
    4. `20261011140000_story_moderation.sql`
    5. `20261011150000_destination_recommendations.sql`
    6. `20261011160000_auth_authors_reactions.sql`
    7. `20261011170000_story_source.sql`
    8. `20261012100000_story_comments.sql`
    9. `20261012120000_regret_emoji_reactions.sql`
2. Content: `supabase/seed_india_editorial.sql`, then `supabase/seed_world_editorial.sql`.
3. Checks (read-only, or rolled back): `supabase/tests/rls_check.sql`,
   `comments_rls_check.sql`, `india_seed_check.sql`, `world_seed_check.sql`.

`supabase/setup_all.sql` bundles the migrations plus a small legacy demo seed;
`supabase/retire_demo_seed.sql` hides those demo stories if they were loaded.

In **Authentication → URL Configuration**, set the Site URL to your deployment and add
`<site>/auth/callback` (and `http://localhost:3000/auth/callback` for local work) to
the redirect URLs.

---

## Scripts

| Command                                               | What it does                                               |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `npm run dev`                                         | Development server                                         |
| `npm run build` / `npm start`                         | Production build / serve it                                |
| `npm run lint`                                        | ESLint                                                     |
| `npx tsc --noEmit`                                    | Type-check (run `npx next typegen` first on a fresh clone) |
| `npm test`                                            | Vitest (Gemini is always mocked; no API quota used)        |
| `npm run seed:india` / `npm run seed:world`           | Validate the travel-note data and regenerate the seed SQL  |
| `node scripts/fetch-destination-images.mjs --missing` | Find credited photos for new destinations                  |

---

## Project structure

```
src/
  app/                    routes: home, destinations, stories, submit, auth, account, moderate
  components/             UI (map, explorer, story cards, comments, chat, forms)
  lib/
    ai/                   Gemini client (key pool) and grounding checks
    chat/                 destination chat: retrieval, validation, trip-planning notes
    recommendations/      "Before you go" AI summaries and caching
    moderation/           AI moderation labels (annotate only)
    data.ts               the only place the app reads stories and destinations
  data/                   destination photo credits (generated, reviewed)
  design/                 design reference (neo-brutalist spec and static mock-up)
supabase/
  migrations/             versioned schema + RLS
  seed/india, seed/world  travel-note source data and SQL generators
  tests/                  SQL checks for RLS and seeds
scripts/                  maintenance scripts
```

---

## Security and privacy

- **Row Level Security on every table.** The public can read only published stories
  of published destinations, and visible comments on them. Clients cannot publish,
  moderate, or change counts.
- **Identity comes from the session.** Comments and reactions are written with the
  user's own session; `user_id` defaults to `auth.uid()` and can't be supplied or read
  by other users. Display names are set by the database.
- **Secrets stay server-side**: the Supabase secret key and Gemini keys are never sent
  to the browser, logged, or put in URLs.
- **Validated input**: zod schemas, length limits, control and bidi characters
  stripped, rate limits on submissions, comments, reactions and chat.
- **Anonymous by default**: public pages never show emails or account ids.
- User content is rendered as plain text (no HTML), so pasted markup can't run.

---

## Design

Rounded neo-brutalism (spec in `src/design/design.md`): a raw-paper canvas with a dot
grid, black ink borders, hard block shadows, caution-yellow calls to action, regret red
and map blue. Buttons and cards lift on hover and press in on click. All motion is CSS
(transform/opacity only) and turns off for visitors who prefer reduced motion.

---

## Maps, search and photo credits

- Map tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors,
  with attribution shown on every map. The public tile server is for light use; set
  `NEXT_PUBLIC_MAP_TILE_URL` to a provider for heavy traffic.
- Place search uses [Photon](https://photon.komoot.io) (OpenStreetMap data), debounced
  and called from the server.
- Destination photos are the Wikipedia lead images, kept only when hosted on Wikimedia
  Commons under CC0, public domain, CC BY or CC BY-SA. Each photo shows its author and
  licence and links to its Commons page. Mismatched images are excluded by hand.

---

## Testing, CI and releases

- About 300 unit and integration tests cover validation, RLS-dependent actions, AI
  grounding and failure handling, key rotation, comments, reactions and seeds.
- **CI** (`.github/workflows/ci.yml`) runs on pull requests and pushes to `main`:
  `npm ci` → lint → type-check → tests → production build, on Node 24.
- **Release** (`release.yml`) runs for tags like `v1.2.3`: it validates the tag, re-runs
  the checks on the tagged commit and publishes a GitHub Release.

```bash
git tag -a v1.0.0 -m "RegretMap v1.0.0"
git push origin v1.0.0
```

---

## Known limitations

- **Report** is a placeholder, and there's no "Hide" button for published stories yet
  (moderators hide them with SQL, see above).
- No password reset or account deletion yet.
- Rate limits are in memory per server instance (the database-backed submission cap is
  shared).
- Community stories are personal accounts, not verified facts; travel notes may go out
  of date. Always check official sources for permits, weather, safety and transport.

---
