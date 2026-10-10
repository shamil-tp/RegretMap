# RegretMap

**Every journey leaves a lesson.**

RegretMap is a community-powered map of travel experiences. Travellers share what
happened on a trip, the mistakes they made, what they learned, and practical advice
for the next person. Others can search a destination, explore where stories happened
on a map, read the original experiences, and see a short "Before you go" summary
built from those stories.

RegretMap is about **destinations, places, journeys, activities and travel
conditions** — not a hotel, room or restaurant rating site.

> **Current status: development preview (Phase 10 of 11).**
> Destinations and stories are read from Supabase (PostgreSQL) with Row Level
> Security, and travellers can submit stories, which are saved as **pending review**
> (not public until a moderator publishes them). The current public content is a
> **clearly labelled demo seed** written for development. New submissions get an
> AI moderation check (Gemini) that only labels the human review queue — it never
> publishes or rejects anything; moderators publish from `/moderate`. Accounts
> (Supabase Auth, email + password) unlock "Helpful" and a list of your own
> submissions. See the [roadmap](#roadmap).

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
- **Story-concentration heatmap** with a **Pins / Heatmap / Both** switch and a
  legend ("Fewer stories → More stories"). Warmer areas mean more published
  stories — never more danger. See [Heatmap](#heatmap).
- **Location picker:** click anywhere on the map to see its coordinates (for the
  future story form; nothing is saved).
- **Story feed** with category filters, travel-time filter, sorting and reset.
  The map pins and heatmap always show the same filtered stories as the feed.
- **"Show on map"** on each story highlights its pin and opens its popup.
- List of destinations with their demo story counts.

### Destination page (`/destinations/[slug]`)

- Destination name, region, country, short description, number of stories and the
  months travellers visited.
- **Before you go:**
  - An **AI summary** (Gemini) of the destination's published stories: a short
    overview and 3–5 practical tips, each linked to the stories it's based on, with
    "One traveller reported this" / "Based on N stories" labels. Clearly marked as an
    AI summary of personal experiences, not verified facts. See
    [AI "Before you go" summaries](#ai-before-you-go-summaries).
  - **In travellers' own words:** lessons quoted directly from stories, grouped by
    topic, with evidence and season labels. Always shown, so the page stays useful
    if the AI summary is unavailable.
- Map fitted to the destination's story locations, plus the filterable story feed.
- **Ask about {destination}:** a chat that answers questions using only that
  destination's published stories, with "Based on these stories" links under each
  answer. See [Destination chat](#destination-chat).

### Story page (`/stories/[id]`)

- Full story: what happened, what went wrong, what they'd do differently, and advice
  for future travellers.
- Category, travel month/year, place, and a (sample) published date.
- Small map showing where it happened, and more stories from the same destination.
- **Helpful:** signed-in users can mark a story helpful (and undo it); the count is
  stored and shown to everyone. Visitors get a sign-in prompt. "Report" is still a
  placeholder.

### Share an experience (`/submit`)

- Reached from the header, the mobile menu, and the "Share your experience" section
  (destination pages preselect their destination with `/submit?destination=<slug>`).
- **Destination or place** (required): type to search — RegretMap destinations
  and real places (Photon) appear after a short pause; choose one with the mouse or
  keyboard. Changing the text clears the choice. A real place within 50 km of a
  RegretMap destination is filed under it (with the place's pin); otherwise it's
  **proposed as a new destination**, hidden until a moderator approves the story.
- Other fields: title, what happened, what went wrong, what you learned and advice
  (all required, with character counts), category, optional specific place, travel
  month/year and an optional **map pin**, plus a required "this is my own
  experience" confirmation.
- Validation runs in the browser for quick feedback and again on the server, with an
  error summary that links to each field.
- The submit button is disabled while sending; a one-time submission key makes
  double-clicks and retries harmless.
- On success: "submitted for review — it isn't public yet". On failure (validation,
  rate limit, database or network) an honest message is shown and the text is kept.
- **Anyone can submit.** If you're signed in, the story is linked to your account
  privately so you can follow its status on `/account`; stories are always shown
  anonymously.

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
| AI | Gemini (`GEMINI_MODEL`, currently `gemini-3.1-flash-lite`) via the REST API, server-side only, with a rotating key pool — moderation labels and "Before you go" summaries |
| Planned | Supabase Auth |

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
| `SUPABASE_SECRET_KEY` | **No — server only** | **Yes (for submissions)** | Secret (`sb_secret_…`) or legacy `service_role` key. Used only by the server to insert submitted stories as `pending`. Never expose it. |
| `GEMINI_API_KEY` | **No — server only** | Yes (AI) | Primary Gemini API key ([Google AI Studio](https://aistudio.google.com/apikey)). Without it, stories are still saved ("unmoderated") and pages show quoted lessons instead of an AI summary. |
| `GEMINI_API_KEY2`, `GEMINI_API_KEY3`, … | **No — server only** | Optional | Extra keys for rotation (`GEMINI_API_KEY_2` style also works). Empty ones are ignored. |
| `GEMINI_MODEL` | No | Yes (AI) | Gemini model id, e.g. `gemini-3.1-flash-lite`. |
| `MODERATOR_EMAILS` | **No — server only** | For `/moderate` | Comma-separated emails allowed to publish/reject pending stories (must sign in with a confirmed email). |

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
│   ├── submit/page.tsx               Share-an-experience page
│   ├── submit/actions.ts             Server Action: validate, rate-limit, submit
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
│   ├── story-actions.tsx             Helpful + Report (placeholder) on story pages
│   ├── helpful-button.tsx            Helpful toggle (optimistic, rolled back on failure)
│   ├── submit/location-picker.tsx    Destination/place autocomplete for the form
│   ├── moderation-item.tsx           One pending story with Publish / Reject
│   ├── auth/auth-form.tsx            Sign-in / sign-up form
│   ├── share-callout.tsx             "Share your experience" section
│   ├── submit/story-form.tsx         Submission form (validation, map pin, states)
│   ├── submit/submit-flow.tsx        Fresh form + one-time key per submission
│   ├── data-states.tsx               Unavailable / empty / loading states
│   ├── map/explore-map.tsx           Client-only map loader + error boundary
│   ├── map/story-map.tsx             Leaflet map (pins, popups, focus, picker)
│   ├── map/heat-layer.tsx            Story-density heat layer (leaflet.heat)
│   ├── map/map-layer-controls.tsx    Pins / Heatmap / Both switch + legend
│   ├── site-header.tsx · mobile-nav.tsx · site-footer.tsx · wordmark.tsx
│   └── ui/                           Button styles, Badge, StateMessage
├── lib/
│   ├── stories.ts                    Domain types (Destination, TravelStory, …) and formatters
│   ├── data.ts                       Data-access functions (only DB reader; server-only)
│   ├── mappers.ts                    Selected columns, row types, row → domain mapping
│   ├── supabase/server.ts            Server-only Supabase client (publishable key)
│   ├── supabase/admin.ts             Server-only privileged client (submissions only)
│   ├── story-submission.ts           Submission schema (zod), shared by form + server
│   ├── submissions.ts                Trusted submit: destination check, pending insert
│   ├── rate-limit.ts                 In-memory rate limiter
│   ├── moderation/policy.ts          Moderation policy, output schema, local signals
│   ├── moderation/gemini.ts          Server-only Gemini call (REST, JSON output)
│   ├── moderation/service.ts         Runs moderation, saves results, retries
│   ├── ai/gemini-client.ts           The one Gemini client: key pool, rotation, errors
│   ├── recommendations/evidence.ts   Evidence selection, prompt payload, output validation
│   ├── recommendations/service.ts    Summaries + caching (memory and private table)
│   ├── chat/evidence.ts              Question-aware story ranking, answer validation
│   ├── chat/service.ts               Destination chat: evidence, Gemini call, answer cache
│   ├── story-filtering.ts            Pure filter/sort used by the feed
│   ├── before-you-go.ts              Groups story lessons by topic
│   ├── map.ts                        Tile config, MapPoint type, story → map point
│   ├── heatmap.ts                    Heat points, weights and heatmap settings
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

### Heatmap

The heatmap answers one question: **where have more RegretMap stories been
shared?** It does not show danger, quality, popularity or risk, and the legend
says so.

- **Data:** exactly the stories the page already shows — published stories of
  published destinations (query filter + RLS), after the active category and
  travel-time filters. No extra database request, no pending or hidden stories.
- **Coordinates:** a story's own `latitude`/`longitude` only. Stories without a
  location (or with invalid values) are left off the map but stay in the feed;
  the map notes how many aren't shown. There is no fallback to the destination's
  coordinates, so no location is invented.
- **Weighting:** every story counts once with the same weight (1). There is no
  severity, sentiment or AI weighting.
- **Scope:** the Explore map uses all published stories; a destination page uses
  only that destination's stories; story pages show the single pin only.
- **Settings** (`src/lib/heatmap.ts`): radius 26 px, blur 20 px, two overlapping
  stories reach the strongest colour, warm peach→coral palette at 75% opacity so
  the base map stays readable. `maxZoom` is set to the map's minimum zoom so the
  plugin doesn't fade points when zoomed out.
- **Library:** [`leaflet.heat`](https://github.com/Leaflet/Leaflet.heat) 0.2.0,
  loaded in the browser only. It's a small, stable classic plugin that attaches to
  the global `L`, which `heat-layer.tsx` sets up before loading it.
- Heat reflects where people chose to write, so busy tourist areas naturally show
  more — a known bias of any submission-based map.

### Place search

`GET /api/places/autocomplete?q=…` (server route) calls Photon and returns
simplified suggestions. It:

- Accepts 2–100 characters (shorter returns nothing, longer returns `400`).
- Rate-limits each IP to 30 requests per minute, plus 300 per minute in total per
  server instance (`429` with `Retry-After`).
- Caches results for an hour and times out after 4 seconds.
- Returns only destination-like features (places, natural features, historic sites,
  mountain passes, attractions, viewpoints, museums, national parks, waterfalls) —
  not hotels, restaurants or street addresses.
- Never forwards provider error details to the browser.

The rate limit and cache are in memory per server instance — fine for development
and a single instance; a shared store is needed for a scaled deployment.

> **Client IPs can be forged.** Per-IP limits read `X-Forwarded-For`, which is only
> trustworthy behind a proxy you control that overwrites it (e.g. Vercel or your
> load balancer). That's why every per-IP limit is paired with an IP-independent
> total limit.

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

### How submissions are stored

Submissions (anonymous or signed in) go through a trusted server path instead of a
public insert policy:

1. The form posts to a Next.js **Server Action** (`src/app/submit/actions.ts`).
   Next.js checks the request origin; only known text fields are read.
2. The payload is validated with the shared zod schema (`src/lib/story-submission.ts`).
   Unknown fields, such as a forged `status`, are ignored or rejected.
3. Rate limits: 5 accepted submissions per IP per 10 minutes and 30 in total per
   server instance (both in memory), plus a hidden honeypot field for bots.
4. `src/lib/submissions.ts` checks the destination is published (through the
   public, RLS-enforced client), checks any map pin is within 200 km of it, and
   catches the same story being sent twice. It also counts pending stories created
   in the last hour **in the database** and refuses new ones above 60 — a shared
   cap that works across server instances and can't be bypassed with forged IP
   headers. If that count can't be read, nothing is written (fails closed).
5. The row is inserted with the server-only secret key, always with
   `status = 'pending'`, `published_at = null`, `is_demo = false` and the form's
   one-time `submission_key` (unique, so repeats can't create a second story).

Pending stories never appear in feeds, maps or story pages. Database errors are
logged on the server by code only — never with story text.

### Gemini key pool and rotation

All AI calls go through one server-only client (`src/lib/ai/gemini-client.ts`):

- Keys: `GEMINI_API_KEY` (primary), then `GEMINI_API_KEY2`, `GEMINI_API_KEY3`, …
  in number order. Empty values and duplicates are ignored.
- The primary key is tried first, and **each key at most once per request** (max 3
  attempts).
- **429 rate limit** → that key rests for the provider's `Retry-After` /
  `retryDelay` (default 60 s, between 5 s and 10 min), and the next key is tried.
- **Temporary 5xx** → the key rests 15 s, next key.
- **Invalid or forbidden key** (401/403, `API_KEY_INVALID`) → the key rests 10 min,
  next key.
- **Malformed request, timeout or network error** → stop; another key wouldn't help.
- If every key is resting, the request fails immediately without calling Gemini.
- Rotation does **not** bypass a quota shared by keys from the same Google Cloud
  project, and it doesn't guarantee availability. Rest periods are kept in memory
  per server instance (not shared between instances).
- Keys are sent only in a request header — never in URLs, logs, errors or responses.

### AI "Before you go" summaries

On a destination page, the server summarises that destination's **published**
stories (from the RLS-enforced data layer — the browser can't supply evidence):

1. **Evidence:** real stories are preferred; demo stories are used only if there
   are fewer than 2 real ones, and the summary is then labelled "Generated from demo
   example stories". At most 12 stories, newest first, with long fields trimmed.
   Fewer than 2 stories → an honest "not enough stories yet" note (no AI call).
2. **Prompt:** stories are sent as delimited data with short references (`S1`, `S2`…);
   the model is told to use only them, cite refs for every tip, never invent facts
   or numbers, flag disagreements, never rate the destination, and ignore any
   instructions inside stories.
3. **Validation:** the JSON answer is checked against a strict schema (1–5 tips,
   allowed categories, length limits, no links). Every ref must be one the server
   sent for this destination — **one fabricated citation rejects the whole answer**.
   Evidence counts are computed by the server, not the model.
4. **Caching:** results are keyed by a hash of the evidence set + model + prompt
   version, kept in memory and in the private `destination_recommendations` table
   for 7 days. New or changed published stories produce a new hash, so a fresh
   summary is generated; cached rows are re-checked against the current eligible
   stories before use. Concurrent page views share one generation; after a failure
   the destination waits 5 minutes before trying again.
5. **Fallback:** if Gemini is unavailable or the answer is invalid, the page shows
   the quoted lessons with a short note — nothing is invented.

The summary streams in separately, so the rest of the page never waits for it.

### Destination chat

The "Ask about {destination}" panel (`src/components/destination-chat.tsx`) calls
a Server Action (`src/app/destinations/[slug]/chat-action.ts`):

1. **Validation:** slug format, question 2–500 characters (whitespace collapsed),
   at most 20 history entries; unknown fields rejected. 10 questions per IP per
   minute plus 60 per minute in total (in memory, per instance).
2. **Evidence, on the server, every question:** the destination is resolved from
   the slug and its **published** stories are loaded through the RLS-enforced data
   layer. The browser never supplies evidence. Real stories are preferred over
   demo ones (as for summaries). Stories are ranked by simple keyword/category
   matching against the question and the top 8 are sent, trimmed — no embeddings.
3. **Prompt:** stories, the last 4 conversation turns (clipped, context only — never
   evidence) and the question are sent as delimited data; the model is told to use
   only the stories, cite refs, say when evidence is missing or stories disagree,
   suggest official sources for time-sensitive or safety matters, give no medical
   or legal advice, never rate the destination, stay on this destination, and
   ignore instructions inside any of that text. Answers are capped at ~150 words.
4. **Validation:** strict JSON schema; every cited ref must be one the server sent
   for this destination — one fabricated citation rejects the answer; links are
   rejected; an answer citing nothing is never marked as sufficiently supported.
   Source links are built from validated story ids only.
5. **Cost controls:** the shared Gemini client and key pool (bounded rotation);
   500 output tokens; identical questions (same evidence and history) are answered
   once and cached for 10 minutes; concurrent duplicates share one call; the UI
   blocks a second send while one is in flight.
6. **Failures:** unknown destination, no stories, Gemini not configured, rate
   limits/exhausted keys, timeouts, invalid output and database errors each show
   an honest message (with "Try again" where it makes sense) — never an invented
   answer.

Conversations live only in the page; nothing is stored.

### AI-assisted moderation (annotate only)

After a new story is saved as `pending`, the server asks Gemini to classify it
**after the response has been sent** (Next.js `after()`), so submitting stays
fast. The AI result is stored in the private `story_moderation` table and only
**labels the review queue** — it never changes `stories.status`. A human always
publishes or rejects. Passing moderation does not mean a story is true.

| Model decision | Meaning |
|---|---|
| `allow_review` | Ordinary travel story. Negative experiences, complaints, scam reports and strong language about a bad trip are normal. |
| `flag_review` | Personal info, harassment, accusations against a named private person, links/promotion, harmful instructions, or unsure. |
| `reject_recommended` | Clear spam/advertising, off-topic, abusive/threatening, or unusable text — a **recommendation** only. |

Categories (allowlist): spam, promotional, off_topic, harassment, threat, hate,
personal_info, suspicious_link, scam_attempt, dangerous_instructions, unusable.

**Server policy → queue label:** `reject_recommended` → `reject_recommended`;
`flag_review`, any category, confidence below 0.6, or a local signal →
`needs_attention`; a confident `allow_review` → `clear`; failed → `unmoderated`.
A deterministic local check (emails, phone numbers, links) adds `personal_info` /
`suspicious_link` regardless of the model.

**Safety:** one small request per story (temperature 0, minimal thinking, 300
output tokens, 8 s timeout, JSON-schema output). The story is sent as delimited
data and the model is told to ignore instructions inside it. The reply is treated
as untrusted and validated against the allowlists — anything else counts as a
failure. Timeouts, quota (429), provider errors and invalid output are stored as
`failed` with an error class only (never story text or provider messages) and
retried later (at most 3 attempts, at least 2 minutes apart, on later
submissions). Retries update the same row, so they can't duplicate a story.

### Accounts and sign-in

- Supabase Auth email + password (`@supabase/ssr` cookie sessions; `src/proxy.ts`
  refreshes sessions). Pages: `/auth/sign-in`, `/auth/sign-up` (confirmation email →
  `/auth/callback`), `/account` (your submissions and their status, sign out).
- The server identifies users with `auth.getUser()` (verified by Supabase), never
  with an id from the browser. Post-sign-in redirects only allow same-site paths.
- RLS: `story_authors` rows are readable only by their author; authors can read
  their own stories in any status; `story_reactions` allows users to add/remove
  only their own "helpful", only on published stories (one per user per story).
  `stories.helpful_count` is maintained by a database trigger.

**Supabase dashboard setup:** Authentication → URL Configuration → set **Site URL**
(e.g. `http://localhost:3000`) and add `http://localhost:3000/auth/callback` (and
your production URL's `/auth/callback`) to **Redirect URLs**. Email confirmation is
on by default; the confirmation link must be opened in the same browser.

### Moderating submissions

Moderators — signed-in users with a confirmed email listed in `MODERATOR_EMAILS` —
use **`/moderate`**: pending stories with their AI labels, most urgent first, with
**Publish** (also publishes a proposed destination) and **Reject**. Every action
re-checks moderator access on the server. You can also use the **SQL Editor**:

```sql
-- Review queue: pending stories with AI labels, most urgent first
select * from public.moderation_queue;

-- Publish one (makes it public)
update public.stories set status = 'published', published_at = now()
where id = '<story-id>' and status = 'pending';

-- Reject or hide one
update public.stories set status = 'rejected' where id = '<story-id>';
```

Publishing means a moderator allowed it on the site — not that it was verified.
When a story's status changes, `story_moderation.reviewed_status` and
`reviewed_at` are recorded automatically. `story_moderation` and
`moderation_queue` are not accessible to the public API.

### Set up a Supabase project

**Quickest:** paste `supabase/setup_all.sql` into **Supabase Dashboard → SQL Editor**
and run it. It creates everything below and inserts the demo data in one
transaction, and is safe to re-run. (It is generated from the migration and seed
files — edit those, not `setup_all.sql`.)

Or run the individual files in the SQL Editor (or `npx supabase db push` if you
use the Supabase CLI), in order:

1. `supabase/migrations/20261011120000_create_destinations_and_stories.sql`
2. `supabase/migrations/20261011120100_public_read_rls.sql`
3. `supabase/migrations/20261011130000_story_submission_key.sql`
4. `supabase/migrations/20261011140000_story_moderation.sql`
5. `supabase/migrations/20261011150000_destination_recommendations.sql`
6. `supabase/migrations/20261011160000_auth_authors_reactions.sql`
7. *(optional, development only)* `supabase/seed.sql` — labelled demo content
8. `supabase/tests/rls_check.sql` — should finish with "All RLS checks passed";
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
| 5 | Story submission with server-side validation, pending review | ✅ Done (reactions/reports not yet) |
| 6 | Story-concentration heatmap, pins/heatmap switch, filter-aware | ✅ Done (no clustering yet) |
| 7 | AI-assisted moderation (Gemini, annotate only) | ✅ Done |
| 8 | AI "Before you go" summaries with source links, caching and key rotation | ✅ Done |
| 9 | Destination-scoped AI chat with validated story citations | ✅ Done |
| 10 | Accounts, helpful reactions, moderator page, location autocomplete in the form | ✅ Done |
| 11 | Quality, accessibility and launch readiness | Planned |

Known gaps in the current version: "Report" is still a placeholder, no password
reset or account deletion yet, the submission form needs JavaScript, per-IP
rate limits and duplicate-content detection are in memory per server instance (the
database-backed hourly cap is shared), no pagination (lists are capped at 100–200 stories), not-found
pages for missing destinations/stories return HTTP 200 because they stream after the
page shell, and some landmark names don't match well in Photon (e.g. "Amer Fort").

## Contributing

1. Read [`CLAUDE.md`](CLAUDE.md) — it is the product spec and implementation contract.
2. Branch from `main`, keep changes to one phase or fix, and open a pull request.
3. Make sure `npm run lint`, the type-check and `npm run build` pass (CI runs them).
4. Never commit secrets or present demo content as real community data.
