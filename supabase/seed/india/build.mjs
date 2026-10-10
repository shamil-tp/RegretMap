// Validates the India editorial seed data and generates idempotent SQL.
//
//   node supabase/seed/india/build.mjs          validate, print coverage, write SQL
//   node supabase/seed/india/build.mjs --check  validate and fail if the SQL is out of date
//
// Outputs:
//   supabase/seed_india_editorial.sql  — the seed (run in the Supabase SQL Editor)
//   supabase/tests/india_seed_check.sql — read-only checks to run afterwards

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import east from "./east.mjs";
import north from "./north.mjs";
import south from "./south.mjs";
import west from "./west.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SEED_PATH = `${ROOT}seed_india_editorial.sql`;
const CHECK_PATH = `${ROOT}tests/india_seed_check.sql`;

/** @type {import("./types.mjs").Region[]} */
const regions = [...north, ...east, ...south, ...west];

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];
const UNION_TERRITORIES = [
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];

// Generous [minLat, maxLat, minLng, maxLng] boxes, used only to catch
// coordinates that landed in the wrong state or were typed backwards.
const BOUNDS = {
  "Andhra Pradesh": [12.6, 19.2, 76.7, 84.8],
  "Arunachal Pradesh": [26.6, 29.5, 91.5, 97.5],
  Assam: [24.1, 28.0, 89.7, 96.1],
  Bihar: [24.2, 27.6, 83.3, 88.3],
  Chhattisgarh: [17.7, 24.2, 80.2, 84.4],
  Goa: [14.85, 15.85, 73.6, 74.4],
  Gujarat: [20.0, 24.8, 68.1, 74.5],
  Haryana: [27.6, 31.0, 74.4, 77.7],
  "Himachal Pradesh": [30.3, 33.3, 75.5, 79.1],
  Jharkhand: [21.9, 25.4, 83.3, 87.9],
  Karnataka: [11.5, 18.5, 74.0, 78.6],
  Kerala: [8.2, 12.8, 74.8, 77.5],
  "Madhya Pradesh": [21.0, 26.9, 74.0, 82.9],
  Maharashtra: [15.6, 22.1, 72.6, 80.9],
  Manipur: [23.8, 25.7, 92.9, 94.8],
  Meghalaya: [25.0, 26.2, 89.8, 92.9],
  Mizoram: [21.9, 24.6, 92.2, 93.5],
  Nagaland: [25.2, 27.1, 93.3, 95.3],
  Odisha: [17.8, 22.6, 81.3, 87.5],
  Punjab: [29.5, 32.6, 73.8, 77.0],
  Rajasthan: [23.0, 30.2, 69.4, 78.3],
  Sikkim: [27.0, 28.2, 88.0, 88.95],
  "Tamil Nadu": [8.0, 13.6, 76.2, 80.4],
  Telangana: [15.8, 19.95, 77.2, 81.4],
  Tripura: [22.9, 24.6, 91.1, 92.4],
  "Uttar Pradesh": [23.8, 30.5, 77.0, 84.7],
  Uttarakhand: [28.7, 31.5, 77.5, 81.1],
  "West Bengal": [21.5, 27.3, 85.8, 89.9],
  "Andaman and Nicobar Islands": [6.5, 14.0, 92.2, 94.0],
  Chandigarh: [30.65, 30.8, 76.68, 76.85],
  "Dadra and Nagar Haveli and Daman and Diu": [20.0, 20.8, 70.8, 73.3],
  Delhi: [28.4, 28.9, 76.8, 77.4],
  "Jammu and Kashmir": [32.2, 35.1, 73.2, 76.0],
  Ladakh: [32.3, 36.0, 75.3, 80.4],
  Lakshadweep: [8.0, 12.5, 71.5, 74.0],
  // Puducherry district only (the UT's other enclaves aren't seeded).
  Puducherry: [11.7, 12.1, 79.6, 79.95],
};

const CATEGORIES = new Set([
  "transport", "planning", "weather", "packing", "activity",
  "accessibility", "safety", "costs", "local_customs", "other",
]);
/** A note may sit this far from its destination (e.g. Leh → Pangong Tso). */
const MAX_NOTE_DISTANCE_KM = 100;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Deterministic UUID (v5 layout, SHA-1) so reruns target the same rows. */
export function seedUuid(key) {
  const hash = createHash("sha1").update(`regretmap:india-editorial:${key}`).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function distanceKm([lat1, lng1], [lat2, lng2]) {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

function inBounds(region, [lat, lng]) {
  const b = BOUNDS[region];
  return b && lat >= b[0] && lat <= b[1] && lng >= b[2] && lng <= b[3];
}

/** Returns { destinations, notes, problems, warnings } — pure, no I/O. */
export function validate(data) {
  const problems = [];
  const warnings = [];
  const destinations = [];
  const notes = [];
  const slugs = new Set();
  const ids = new Set();
  const titles = new Map();
  const lessons = new Map();

  const text = (where, field, value, min, max, required = true) => {
    if (value == null) {
      if (required) problems.push(`${where}: missing ${field}`);
      return;
    }
    if (typeof value !== "string" || value.trim() !== value || value.length < min || value.length > max) {
      problems.push(`${where}: ${field} must be a trimmed string of ${min}–${max} characters`);
    }
  };

  for (const region of data) {
    const known = STATES.includes(region.region) || UNION_TERRITORIES.includes(region.region);
    if (!known) problems.push(`Unknown state/UT "${region.region}"`);
    const expectedKind = STATES.includes(region.region) ? "state" : "ut";
    if (known && region.kind !== expectedKind) problems.push(`${region.region}: kind should be ${expectedKind}`);

    for (const d of region.destinations) {
      const where = `destination ${d.slug}`;
      if (!SLUG.test(d.slug) || d.slug.length > 80) problems.push(`${where}: invalid slug`);
      if (slugs.has(d.slug)) problems.push(`${where}: duplicate slug`);
      slugs.add(d.slug);
      text(where, "name", d.name, 1, 120);
      text(where, "about", d.about, 1, 1000);
      if (!inBounds(region.region, d.at)) problems.push(`${where}: coordinates ${d.at} are outside ${region.region}`);
      if (d.notes.length === 0) problems.push(`${where}: has no notes`);
      destinations.push({ ...d, region: region.region, kind: region.kind });

      for (const n of d.notes) {
        const key = `${d.slug}/${n.key}`;
        const w = `note ${key}`;
        if (!KEY.test(n.key)) problems.push(`${w}: invalid key`);
        const id = seedUuid(key);
        if (ids.has(id)) problems.push(`${w}: duplicate key`);
        ids.add(id);
        if (!CATEGORIES.has(n.cat)) problems.push(`${w}: unknown category ${n.cat}`);
        text(w, "title", n.title, 3, 140);
        text(w, "place", n.place, 1, 140);
        text(w, "body", n.body, 20, 5000);
        text(w, "challenge", n.challenge, 1, 2000, false);
        text(w, "lesson", n.lesson, 1, 2000);
        text(w, "advice", n.advice, 1, 2000, false);
        if (n.month != null && !(Number.isInteger(n.month) && n.month >= 1 && n.month <= 12)) {
          problems.push(`${w}: month must be 1–12`);
        }
        if (!inBounds(region.region, n.at)) problems.push(`${w}: coordinates ${n.at} are outside ${region.region}`);
        const km = distanceKm(d.at, n.at);
        if (km > MAX_NOTE_DISTANCE_KM) problems.push(`${w}: ${km.toFixed(0)} km from ${d.name}`);

        const titleKey = n.title.toLowerCase();
        if (titles.has(titleKey)) problems.push(`${w}: same title as ${titles.get(titleKey)}`);
        titles.set(titleKey, key);
        const lessonKey = n.lesson.toLowerCase();
        if (lessons.has(lessonKey)) problems.push(`${w}: same lesson as ${lessons.get(lessonKey)}`);
        lessons.set(lessonKey, key);

        notes.push({ ...n, id, seedKey: key, slug: d.slug, region: region.region });
      }
    }
  }

  for (const state of STATES) {
    if (!data.some((r) => r.region === state && r.destinations.some((d) => d.notes.length > 0))) {
      problems.push(`State not covered: ${state}`);
    }
  }

  // Variety: flag repeated openings and over-used closing phrases.
  const openings = new Map();
  for (const n of notes) {
    const opening = n.body.split(/\s+/).slice(0, 3).join(" ").toLowerCase();
    openings.set(opening, (openings.get(opening) ?? 0) + 1);
  }
  for (const [opening, count] of openings) {
    if (count > 4) warnings.push(`${count} notes open with "${opening}…"`);
  }
  const planAhead = notes.filter((n) => /always plan ahead/i.test(`${n.lesson} ${n.advice ?? ""}`));
  if (planAhead.length) problems.push(`"always plan ahead" used in ${planAhead.length} notes`);

  return { destinations, notes, problems, warnings };
}

/** Round-robin across regions so the newest-first feed isn't one state at a time. */
function interleave(notes) {
  const byRegion = new Map();
  for (const n of notes) byRegion.set(n.region, [...(byRegion.get(n.region) ?? []), n]);
  const queues = [...byRegion.values()];
  const out = [];
  while (queues.some((q) => q.length)) for (const q of queues) if (q.length) out.push(q.shift());
  return out;
}

const sql = (value) =>
  value == null ? "null" : typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;

export function buildSeedSql({ destinations, notes }) {
  const ordered = interleave(notes);
  const destinationRows = destinations
    .map((d) =>
      `  (${[d.slug, d.name, d.region, "India", d.about, d.at[0], d.at[1]].map(sql).join(", ")}, 'published', false)`,
    )
    .join(",\n");
  const noteRows = ordered
    .map((n, index) =>
      `  (${[
        n.id, n.seedKey, n.slug, n.title, n.body, n.cat, n.place, n.at[0], n.at[1],
        n.month ?? null, n.challenge ?? null, n.lesson, n.advice ?? null, index + 1,
      ].map(sql).join(", ")})`,
    )
    .join(",\n");

  return `-- =============================================================================
-- RegretMap — India editorial travel notes (Phase 11 seed)
-- =============================================================================
-- GENERATED by supabase/seed/india/build.mjs from supabase/seed/india/*.mjs.
-- Edit those files and re-run the build; don't edit this file by hand.
--
-- What this is: ${notes.length} practical travel notes for ${destinations.length} destinations across all
-- 28 states and ${new Set(destinations.filter((d) => d.kind === "ut").map((d) => d.region)).size} Union Territories, written by the RegretMap team from general
-- travel guidance. They are NOT personal experiences or user submissions:
-- every row is stored with source = 'editorial' (the app labels it
-- "Travel note"), is_demo = false and no author.
--
-- Requires: migration 20261011170000_story_source.sql (adds stories.source).
--
-- Safe to re-run:
--   * Destinations: inserted only when the slug doesn't exist yet. Existing
--     destinations (including user-created ones) are never modified.
--   * Notes use fixed ids derived from their seed key. A re-run inserts any
--     missing notes and refreshes the text of existing EDITORIAL notes only;
--     community stories are never touched, and status (e.g. a moderator's
--     'hidden') is never changed on re-run.
-- Nothing is deleted. Run supabase/tests/india_seed_check.sql afterwards.
-- =============================================================================

begin;

-- 1. Destinations (new slugs only) ---------------------------------------------
insert into public.destinations
  (slug, name, region, country, description, latitude, longitude, status, is_demo)
values
${destinationRows}
on conflict (slug) do nothing;

-- 2. Editorial travel notes --------------------------------------------------------
-- Columns: id, seed key (comment only), destination slug, title, body, category,
-- place, latitude, longitude, travel month, challenge, lesson, advice, feed order.
insert into public.stories as s
  (id, destination_id, title, body, category, place_name, latitude, longitude,
   travel_month, challenge, lesson, advice, status, published_at, is_demo, source)
select v.id::uuid, d.id, v.title, v.body, v.category, v.place_name, v.latitude, v.longitude,
       v.travel_month::smallint, v.challenge, v.lesson, v.advice,
       'published', now() - make_interval(mins => v.ord), false, 'editorial'
from (values
${noteRows}
) as v(id, seed_key, destination_slug, title, body, category, place_name, latitude, longitude,
       travel_month, challenge, lesson, advice, ord)
join public.destinations d on d.slug = v.destination_slug
on conflict (id) do update set
  title = excluded.title,
  body = excluded.body,
  category = excluded.category,
  place_name = excluded.place_name,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  travel_month = excluded.travel_month,
  challenge = excluded.challenge,
  lesson = excluded.lesson,
  advice = excluded.advice
where s.source = 'editorial'
  and (s.title, s.body, s.category, s.place_name, s.latitude, s.longitude,
       s.travel_month, s.challenge, s.lesson, s.advice)
      is distinct from
      (excluded.title, excluded.body, excluded.category, excluded.place_name,
       excluded.latitude, excluded.longitude, excluded.travel_month,
       excluded.challenge, excluded.lesson, excluded.advice);

commit;
`;
}

export function buildCheckSql({ destinations, notes }) {
  const idList = notes.map((n) => `    '${n.id}'`).join(",\n");
  const slugList = destinations.map((d) => sql(d.slug)).join(", ");
  const states = STATES.map(sql).join(", ");
  return `-- RegretMap — read-only checks for supabase/seed_india_editorial.sql.
-- GENERATED by supabase/seed/india/build.mjs. Changes nothing.
-- Run in the Supabase SQL Editor after the seed. The DO block raises an error
-- if a check fails; the final SELECT lists coverage per state/UT.

do $$
declare
  -- Ids of the seeded notes, kept in an array: this script writes nothing.
  seed_ids uuid[] := array[
${idList}
  ]::uuid[];
  expected int := ${notes.length};
  found int;
  visible int;
  wrong_source int;
  missing_states text;
  dup_titles int;
begin
  select count(*) into found from public.stories s where s.id = any(seed_ids);
  if found <> expected then
    raise exception 'Expected % seeded notes, found %', expected, found;
  end if;

  select count(*) into wrong_source
  from public.stories s
  where s.id = any(seed_ids)
    and (s.source <> 'editorial' or s.is_demo or s.submission_key is not null);
  if wrong_source > 0 then
    raise exception '% seeded rows are not marked editorial (or look like submissions)', wrong_source;
  end if;

  select count(*) into visible
  from public.stories s
  join public.destinations d on d.id = s.destination_id
  where s.id = any(seed_ids) and s.status = 'published' and d.status = 'published'
    and s.latitude between -90 and 90 and s.longitude between -180 and 180;
  raise notice '% of % seeded notes are publicly visible with coordinates', visible, expected;

  select string_agg(st, ', ') into missing_states
  from unnest(array[${states}]) as st
  where not exists (
    select 1 from public.stories s
    join public.destinations d on d.id = s.destination_id
    where s.id = any(seed_ids) and d.region = st and s.status = 'published' and d.status = 'published'
  );
  if missing_states is not null then
    raise exception 'States without a visible seeded note: %', missing_states;
  end if;

  select count(*) into dup_titles from (
    select title from public.stories where source = 'editorial'
    group by title having count(*) > 1
  ) t;
  if dup_titles > 0 then
    raise exception '% editorial titles appear more than once', dup_titles;
  end if;

  raise notice 'India seed check passed: % notes, all 28 states covered', expected;
end;
$$;

-- Coverage per state/UT (editorial notes on published destinations).
select d.region,
       count(distinct d.id) as destinations,
       count(s.id) filter (where s.source = 'editorial') as editorial_notes,
       count(s.id) filter (where s.source = 'community') as community_stories
from public.destinations d
left join public.stories s on s.destination_id = d.id and s.status = 'published'
where d.slug in (${slugList})
group by d.region
order by d.region;
`;
}

function report({ destinations, notes, warnings }) {
  const lines = ["", "Coverage (destinations / notes):"];
  for (const name of [...STATES, ...UNION_TERRITORIES]) {
    const ds = destinations.filter((d) => d.region === name);
    const ns = notes.filter((n) => n.region === name);
    const kind = STATES.includes(name) ? "state" : "UT   ";
    lines.push(`  ${kind}  ${name.padEnd(42)} ${String(ds.length).padStart(2)} / ${String(ns.length).padStart(2)}`);
  }
  const byCategory = {};
  for (const n of notes) byCategory[n.cat] = (byCategory[n.cat] ?? 0) + 1;
  lines.push("", `Categories: ${Object.entries(byCategory).map(([c, k]) => `${c} ${k}`).join(", ")}`);
  const withChallenge = notes.filter((n) => n.challenge).length;
  const withAdvice = notes.filter((n) => n.advice).length;
  lines.push(`Optional fields: challenge ${withChallenge}, advice ${withAdvice}, month ${notes.filter((n) => n.month).length}`);
  lines.push(
    `States covered: ${STATES.filter((s) => notes.some((n) => n.region === s)).length}/28; ` +
      `UTs covered: ${UNION_TERRITORIES.filter((u) => notes.some((n) => n.region === u)).length}/${UNION_TERRITORIES.length}`,
  );
  lines.push(`Total: ${destinations.length} destinations, ${notes.length} notes`);
  for (const w of warnings) lines.push(`warning: ${w}`);
  console.log(lines.join("\n"));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const result = validate(regions);
  if (result.problems.length) {
    console.error(`Seed data has ${result.problems.length} problem(s):\n  ${result.problems.join("\n  ")}`);
    process.exit(1);
  }
  report(result);
  const seed = buildSeedSql(result);
  const check = buildCheckSql(result);
  if (process.argv.includes("--check")) {
    const current = (path) => {
      try {
        return readFileSync(path, "utf8");
      } catch {
        return "";
      }
    };
    if (current(SEED_PATH) !== seed || current(CHECK_PATH) !== check) {
      console.error("\nGenerated SQL is out of date. Run: node supabase/seed/india/build.mjs");
      process.exit(1);
    }
    console.log("\nGenerated SQL is up to date.");
  } else {
    writeFileSync(SEED_PATH, seed);
    writeFileSync(CHECK_PATH, check);
    console.log(`\nWrote ${SEED_PATH}\nWrote ${CHECK_PATH}`);
  }
}

export { regions, STATES, UNION_TERRITORIES };
