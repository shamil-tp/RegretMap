# RegretMap — Handoff Report

Written 2026-10-11 to hand the project to a new Claude Code account/session.
Read `CLAUDE.md` first (product rules + phase plan), then this file.

## 1. Where the project is

| Phase | Title | State |
| --- | --- | --- |
| 0–9 | Audit → UI → map → pages → Supabase schema/RLS → submissions → heatmap → Gemini moderation → "Before you go" → destination chat | Done, committed |
| 10 | Auth, Helpful reactions, `/moderate`, location autocomplete | Done, committed as `8f4039c` ("implemented authentication") |
| Post-10 change | **Stories publish immediately** (no moderator approval) + confirmation redirect to production | Done locally, **NOT committed** |
| 11 | Quality, accessibility, launch readiness | Not started — next phase |

Production URL: **https://regret-map.shamiltp.me**

## 2. Uncommitted change (this session)

**Why:** the owner does not want moderator approval. After submitting, the form used to
say "saved but isn't public yet"; now stories go live immediately.

- `src/lib/submissions.ts`: stories are inserted with `status: "published"` and `published_at: now`.
  A new far-away place creates a destination with `status: "published"`. Reusing an old
  draft also publishes it. The hourly cap now counts non-demo stories, not pending ones.
  The result carries the new destination's slug.
- `src/app/submit/actions.ts`: revalidates `/` and the destination page after a submit.
  AI moderation still runs in `after()`; it only labels stories and never changes status.
- `src/components/submit/story-form.tsx`, `src/app/submit/page.tsx`: copy now says
  "Thanks — your story is published", "Publish story" button, "published right away".
- `src/app/auth/actions.ts`: the sign-up confirmation link uses `SITE_URL`
  (falls back to the request origin) and lands on `/` after confirmation.
  `src/app/auth/sign-up/page.tsx`: default `next` is `/`.
- `.env.example`: adds `SITE_URL=`. `.env.local` (git-ignored) now has
  `SITE_URL=https://regret-map.shamiltp.me`. This means confirmation emails from a local
  dev server also point at production. Remove it locally if that is unwanted.
- Tests updated: `src/lib/submissions.test.ts`, `src/app/submit/actions.test.ts`,
  `src/app/auth/actions.test.ts` (a new test covers `SITE_URL`).
- `README.md`: wording updated for direct publishing.

**Verified:**
- `npx tsc --noEmit`: 0 errors.
- `npm run lint`: clean.
- `npx vitest run`: 231/231 passed.
- `npm run build`: compiled successfully.

**Not verified:** a real submission against live Supabase after this change, and a real confirmation email.

## 3. Owner must still do (remote, manual)

1. **Apply the Phase 10 migration.** It is NOT on Supabase yet; checked 2026-10-11:
   `story_reactions` returns 404 and `stories.helpful_count` returns 400.
   In the Supabase SQL Editor, run `supabase/migrations/20261011160000_auth_authors_reactions.sql`,
   or re-run `supabase/setup_all.sql` (it is idempotent and doesn't delete data).
   Then run `supabase/tests/rls_check.sql`; it should print "All RLS checks passed".
   Until this is applied: Helpful buttons stay hidden (the server logs `getHelpfulState failed: 42703`), and story authorship
   linking fails silently (`[submissions] author link failed`). The story itself still saves.
2. **Supabase dashboard → Authentication → URL Configuration:**
   - Site URL: `https://regret-map.shamiltp.me`
   - Redirect URLs: `https://regret-map.shamiltp.me/auth/callback` (add `http://localhost:3000/auth/callback` for local dev)
3. **Hosting env vars:** set `SITE_URL=https://regret-map.shamiltp.me` and `MODERATOR_EMAILS=<owner email>`,
   plus all variables already in `.env.example`.
4. **Commit** the uncommitted change. Per `CLAUDE.md`, commits are under the owner's identity,
   with no AI co-author trailers. Claude must not commit or push unless asked.

## 4. Known gaps / suggested next work

- **Moderators can't take down published stories from the UI.** `/moderate` only lists
  `pending` stories, and with direct publishing nothing is pending. Suggested: list
  recent published stories, plus any flagged by AI moderation (`moderation_queue`
  view / `story_moderation` table), with a **Hide** action. Hide sets `status='hidden'`
  through `src/app/moderate/actions.ts` and re-checks `viewer.isModerator`. Until then, hide via SQL:
  `update public.stories set status='hidden' where id='<id>';`
- Option to consider: auto-hide when Gemini returns `decision: "reject"`. AI is only a
  flagging aid per CLAUDE.md, so keep a human able to restore the story.
- **Report** button is still a placeholder (the `story_reports` table is not built).
- No password reset or account deletion.
- `destination_recommendations` cache: new stories invalidate it by TTL only.
- Phase 11 tasks per `CLAUDE.md` §10.

## 5. Architecture cheat-sheet

- **Next.js 16.4** App Router with Cache Components:
  - Database reads sit inside `<Suspense>`, and `await connection()` in `src/lib/data.ts`.
  - `src/proxy.ts` replaces middleware.
- **Stack:** React 19, Tailwind v4 (light theme only), lucide-react, zod 4, Vitest 4.
- **Installs:** use `npx -y npm@11.19.0 install` so the lockfile stays CI-compatible.
- **Supabase:**
  - `src/lib/supabase/server.ts` is the public client (RLS applies).
  - `src/lib/supabase/admin.ts` is the secret key, server only, allowlisted in `src/lib/security.test.ts`.
  - `src/lib/supabase/session.ts` handles cookies. `getViewer()` returns `{id, email, isModerator}` and uses `auth.getUser()`.
- **Submissions:** `src/lib/story-submission.ts` (zod schema) → `src/app/submit/actions.ts` → `src/lib/submissions.ts`.
  - The picker is `src/components/submit/location-picker.tsx`: local destinations plus Photon via `/api/places/autocomplete`.
  - A place within 50 km is filed under an existing destination; otherwise a new destination is created.
- **Helpful:** `src/app/stories/helpful-action.ts` writes through the session client, so RLS applies. The count is maintained by a DB trigger.
- **AI:**
  - `src/lib/ai/gemini-client.ts` rotates the key pool `GEMINI_API_KEY`, `GEMINI_API_KEY2`, `GEMINI_API_KEY3`. Model: `gemini-3.1-flash-lite`.
  - Moderation: `src/lib/moderation/`. Recommendations: `src/lib/recommendations/`. Chat: `src/lib/chat/`.
  - Tests mock Gemini. Ask the owner before any live Gemini call.
- **Map:** Leaflet + react-leaflet 5 (client only), leaflet.heat.
- **DB:** migrations live in `supabase/migrations/`. `supabase/setup_all.sql` is a generated all-in-one script. RLS checks are in `supabase/tests/rls_check.sql`.

## 6. Commands

```
npm run dev
npx tsc --noEmit
npm run lint
npx vitest run
npm run build
```

## 7. Working rules the owner expects

- One phase at a time: plan first, ask questions before implementing, verify, report, then stop.
- Never claim a remote migration, deploy or API call succeeded unless it was actually run and checked.
- Never print secrets. Never use `NEXT_PUBLIC_` for secrets. Never disable RLS.
- No commits, pushes or tags unless asked. No AI attribution in commits.
- The owner has a limited Claude usage budget, so keep work and reports concise.
