// Validates the worldwide editorial seed data and generates idempotent SQL.
//
//   node supabase/seed/world/build.mjs          validate, print coverage, write SQL
//   node supabase/seed/world/build.mjs --check  validate and fail if the SQL is out of date
//
// Outputs:
//   supabase/seed_world_editorial.sql   — the seed (run in the Supabase SQL Editor)
//   supabase/tests/world_seed_check.sql — read-only checks to run afterwards

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { regions as india } from "../india/build.mjs";
import americasAfricaOceania from "./americas-africa-oceania.mjs";
import europeAsia from "./europe-asia.mjs";
import morePlaces from "./more-places.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SEED_PATH = `${ROOT}seed_world_editorial.sql`;
const CHECK_PATH = `${ROOT}tests/world_seed_check.sql`;

/** @type {import("./types.mjs").Country[]} */
export const countries = [...europeAsia, ...americasAfricaOceania, ...morePlaces];

export const CONTINENTS = {
  Europe: ["France", "Italy", "Spain", "Netherlands", "United Kingdom", "Greece", "Switzerland", "Iceland", "Czechia", "Portugal", "Croatia", "Norway", "Germany", "Austria", "Hungary"],
  Asia: ["Türkiye", "Japan", "Thailand", "Indonesia", "Vietnam", "Cambodia", "Nepal", "South Korea", "Singapore", "Maldives", "Sri Lanka", "United Arab Emirates", "Jordan", "China", "Malaysia", "Laos", "Philippines", "Hong Kong"],
  Africa: ["Morocco", "Egypt", "South Africa", "Tanzania", "Zimbabwe", "Kenya", "Namibia"],
  "North America": ["United States", "Canada", "Mexico", "Costa Rica"],
  "South America": ["Peru", "Brazil", "Argentina", "Chile", "Ecuador", "Colombia"],
  Oceania: ["Australia", "New Zealand"],
};

// Generous [minLat, maxLat, minLng, maxLng] boxes to catch wrong-country or
// swapped coordinates. Mainland/main-island extents only where relevant.
const BOUNDS = {
  France: [41, 51.2, -5.5, 9.7],
  Italy: [36.5, 47.2, 6.5, 18.6],
  Spain: [35.9, 43.9, -9.5, 4.5],
  Netherlands: [50.7, 53.6, 3.3, 7.3],
  "United Kingdom": [49.8, 60.9, -8.7, 1.8],
  Greece: [34.7, 41.8, 19.3, 28.3],
  Switzerland: [45.8, 47.9, 5.9, 10.5],
  Iceland: [63.2, 66.6, -24.6, -13.4],
  Czechia: [48.5, 51.1, 12.0, 18.9],
  Portugal: [36.9, 42.2, -9.6, -6.1],
  Croatia: [42.3, 46.6, 13.4, 19.5],
  Norway: [57.9, 71.3, 4.5, 31.2],
  Türkiye: [35.8, 42.2, 25.6, 44.9],
  Japan: [24, 45.6, 122.9, 146],
  Thailand: [5.6, 20.5, 97.3, 105.7],
  Indonesia: [-11, 6, 95, 141.1],
  Vietnam: [8.4, 23.4, 102.1, 109.5],
  Cambodia: [10.4, 14.7, 102.3, 107.7],
  Nepal: [26.3, 30.5, 80, 88.3],
  "South Korea": [33.1, 38.7, 124.6, 131],
  Singapore: [1.15, 1.48, 103.6, 104.1],
  Maldives: [-0.8, 7.2, 72.6, 73.8],
  "Sri Lanka": [5.9, 9.9, 79.6, 81.9],
  "United Arab Emirates": [22.6, 26.1, 51.5, 56.4],
  Jordan: [29.2, 33.4, 34.9, 39.3],
  China: [18, 53.6, 73.5, 135.1],
  Morocco: [27.6, 35.95, -13.2, -1],
  Egypt: [22, 31.7, 24.7, 36.9],
  "South Africa": [-34.9, -22.1, 16.4, 32.9],
  Tanzania: [-11.8, -0.9, 29.3, 40.5],
  Zimbabwe: [-22.5, -15.6, 25.2, 33.1],
  // Contiguous US plus Hawaii.
  "United States": [18.9, 49.4, -160.3, -66.9],
  Canada: [41.7, 83.2, -141, -52.6],
  Mexico: [14.5, 32.7, -118.4, -86.7],
  "Costa Rica": [8, 11.3, -86, -82.5],
  Peru: [-18.4, -0.03, -81.4, -68.6],
  Brazil: [-33.8, 5.3, -74, -34.7],
  Argentina: [-55.1, -21.8, -73.6, -53.6],
  Chile: [-56, -17.5, -75.7, -66.4],
  Ecuador: [-5, 1.5, -92, -75.2],
  Australia: [-43.7, -10.6, 113.3, 153.7],
  Germany: [47.2, 55.1, 5.8, 15.1],
  Austria: [46.3, 49.1, 9.5, 17.2],
  Hungary: [45.7, 48.6, 16.1, 22.9],
  Malaysia: [0.8, 7.4, 99.6, 119.3],
  Laos: [13.9, 22.5, 100.1, 107.7],
  Philippines: [4.5, 21.2, 116.9, 126.7],
  "Hong Kong": [22.1, 22.6, 113.8, 114.5],
  Colombia: [-4.3, 13.4, -79.1, -66.8],
  Kenya: [-4.7, 5.1, 33.9, 41.9],
  Namibia: [-29, -16.9, 11.7, 25.3],
  "New Zealand": [-47.3, -34.4, 166.4, 178.6],
};

const CATEGORIES = new Set([
  "transport", "planning", "weather", "packing", "activity",
  "accessibility", "safety", "costs", "local_customs", "other",
]);
const MAX_NOTE_DISTANCE_KM = 100;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Deterministic UUID (v5 layout, SHA-1), separate namespace from the India seed. */
export function seedUuid(key) {
  const hash = createHash("sha1").update(`regretmap:world-editorial:${key}`).digest();
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

function inBounds(country, [lat, lng]) {
  const b = BOUNDS[country];
  return b && lat >= b[0] && lat <= b[1] && lng >= b[2] && lng <= b[3];
}

/** Returns { destinations, notes, problems } — pure, no I/O. */
export function validate(data, reservedSlugs = new Set()) {
  const problems = [];
  const destinations = [];
  const notes = [];
  const slugs = new Set();
  const ids = new Set();
  const titles = new Map();

  const text = (where, field, value, min, max, required = true) => {
    if (value == null) {
      if (required) problems.push(`${where}: missing ${field}`);
      return;
    }
    if (typeof value !== "string" || value.trim() !== value || value.length < min || value.length > max) {
      problems.push(`${where}: ${field} must be a trimmed string of ${min}–${max} characters`);
    }
  };

  for (const entry of data) {
    if (!BOUNDS[entry.country]) problems.push(`No bounds for country "${entry.country}"`);
    if (!Object.values(CONTINENTS).some((list) => list.includes(entry.country))) {
      problems.push(`Country "${entry.country}" isn't assigned to a continent`);
    }
    for (const d of entry.destinations) {
      const where = `destination ${d.slug}`;
      if (!SLUG.test(d.slug) || d.slug.length > 80) problems.push(`${where}: invalid slug`);
      if (slugs.has(d.slug)) problems.push(`${where}: duplicate slug`);
      if (reservedSlugs.has(d.slug)) problems.push(`${where}: slug already used by the India seed`);
      slugs.add(d.slug);
      text(where, "name", d.name, 1, 120);
      text(where, "region", d.region, 1, 120, false);
      text(where, "about", d.about, 1, 1000);
      if (!inBounds(entry.country, d.at)) problems.push(`${where}: coordinates ${d.at} are outside ${entry.country}`);
      if (d.notes.length === 0) problems.push(`${where}: has no notes`);
      destinations.push({ ...d, country: entry.country });

      for (const n of d.notes) {
        const key = `${d.slug}/${n.key}`;
        const w = `note ${key}`;
        if (!SLUG.test(n.key)) problems.push(`${w}: invalid key`);
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
        if (!inBounds(entry.country, n.at)) problems.push(`${w}: coordinates ${n.at} are outside ${entry.country}`);
        const km = distanceKm(d.at, n.at);
        if (km > MAX_NOTE_DISTANCE_KM) problems.push(`${w}: ${km.toFixed(0)} km from ${d.name}`);
        const titleKey = n.title.toLowerCase();
        if (titles.has(titleKey)) problems.push(`${w}: same title as ${titles.get(titleKey)}`);
        titles.set(titleKey, key);
        if (/always plan ahead/i.test(`${n.lesson} ${n.advice ?? ""}`)) problems.push(`${w}: uses "always plan ahead"`);
        notes.push({ ...n, id, seedKey: key, slug: d.slug, country: entry.country });
      }
    }
  }

  for (const [continent, list] of Object.entries(CONTINENTS)) {
    if (!list.some((c) => notes.some((n) => n.country === c))) problems.push(`Continent not covered: ${continent}`);
  }
  return { destinations, notes, problems };
}

const sql = (value) =>
  value == null ? "null" : typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;

/** Round-robin across countries so the feed mixes places. */
function interleave(notes) {
  const by = new Map();
  for (const n of notes) by.set(n.country, [...(by.get(n.country) ?? []), n]);
  const queues = [...by.values()];
  const out = [];
  while (queues.some((q) => q.length)) for (const q of queues) if (q.length) out.push(q.shift());
  return out;
}

export function buildSeedSql({ destinations, notes }) {
  const destinationRows = destinations
    .map((d) =>
      `  (${[d.slug, d.name, d.region ?? null, d.country, d.about, d.at[0], d.at[1]].map(sql).join(", ")}, 'published', false)`,
    )
    .join(",\n");
  const noteRows = interleave(notes)
    .map((n, index) =>
      `  (${[
        n.id, n.seedKey, n.slug, n.title, n.body, n.cat, n.place, n.at[0], n.at[1],
        n.month ?? null, n.challenge ?? null, n.lesson, n.advice ?? null, index + 1,
      ].map(sql).join(", ")})`,
    )
    .join(",\n");

  return `-- =============================================================================
-- RegretMap — worldwide editorial travel notes
-- =============================================================================
-- GENERATED by supabase/seed/world/build.mjs from supabase/seed/world/*.mjs.
-- Edit those files and re-run the build; don't edit this file by hand.
--
-- ${notes.length} practical travel notes for ${destinations.length} destinations in ${new Set(destinations.map((d) => d.country)).size} countries
-- on every inhabited continent, written by the RegretMap team from general travel
-- guidance. They are NOT personal experiences or user submissions: every row is
-- stored with source = 'editorial' (shown as "Travel note"), is_demo = false and
-- no author.
--
-- Requires: migration 20261011170000_story_source.sql (adds stories.source).
--
-- Safe to re-run: destinations are inserted only for new slugs (existing rows
-- are never modified); notes have fixed ids, so a re-run inserts missing notes
-- and refreshes only the text of existing EDITORIAL notes. Status is never
-- changed on re-run and community stories are never touched. Nothing is deleted.
-- Run supabase/tests/world_seed_check.sql afterwards.
-- =============================================================================

begin;

insert into public.destinations
  (slug, name, region, country, description, latitude, longitude, status, is_demo)
values
${destinationRows}
on conflict (slug) do nothing;

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
  const countryList = [...new Set(destinations.map((d) => d.country))].map(sql).join(", ");
  const slugList = destinations.map((d) => sql(d.slug)).join(", ");
  return `-- RegretMap — read-only checks for supabase/seed_world_editorial.sql.
-- GENERATED by supabase/seed/world/build.mjs. Changes nothing.
-- The DO block raises an error if a check fails; the final SELECT lists
-- coverage per country.

do $$
declare
  -- Ids of the seeded notes, kept in an array: this script writes nothing.
  seed_ids uuid[] := array[
${idList}
  ]::uuid[];
  expected int := ${notes.length};
  found int;
  wrong_source int;
  missing text;
begin
  select count(*) into found from public.stories s where s.id = any(seed_ids);
  if found <> expected then
    raise exception 'Expected % seeded notes, found %', expected, found;
  end if;

  select count(*) into wrong_source from public.stories s
  where s.id = any(seed_ids)
    and (s.source <> 'editorial' or s.is_demo or s.submission_key is not null);
  if wrong_source > 0 then
    raise exception '% seeded rows are not marked editorial', wrong_source;
  end if;

  select string_agg(c, ', ') into missing
  from unnest(array[${countryList}]) as c
  where not exists (
    select 1 from public.stories s
    join public.destinations d on d.id = s.destination_id
    where s.id = any(seed_ids) and d.country = c
      and s.status = 'published' and d.status = 'published'
  );
  if missing is not null then
    raise exception 'Countries without a visible seeded note: %', missing;
  end if;

  raise notice 'World seed check passed: % notes', expected;
end;
$$;

select d.country,
       count(distinct d.id) as destinations,
       count(s.id) filter (where s.source = 'editorial') as editorial_notes
from public.destinations d
left join public.stories s on s.destination_id = d.id and s.status = 'published'
where d.slug in (${slugList})
group by d.country
order by d.country;
`;
}

function report({ destinations, notes }) {
  const lines = ["", "Coverage (destinations / notes):"];
  for (const [continent, list] of Object.entries(CONTINENTS)) {
    const ns = notes.filter((n) => list.includes(n.country));
    const ds = destinations.filter((d) => list.includes(d.country));
    lines.push(`  ${continent.padEnd(14)} ${String(ds.length).padStart(3)} / ${String(ns.length).padStart(3)}  (${list.length} countries)`);
  }
  lines.push(`Total: ${destinations.length} destinations, ${notes.length} notes, ${new Set(destinations.map((d) => d.country)).size} countries`);
  console.log(lines.join("\n"));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const reserved = new Set(india.flatMap((r) => r.destinations.map((d) => d.slug)));
  const result = validate(countries, reserved);
  if (result.problems.length) {
    console.error(`World seed data has ${result.problems.length} problem(s):\n  ${result.problems.join("\n  ")}`);
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
      console.error("\nGenerated SQL is out of date. Run: node supabase/seed/world/build.mjs");
      process.exit(1);
    }
    console.log("\nGenerated SQL is up to date.");
  } else {
    writeFileSync(SEED_PATH, seed);
    writeFileSync(CHECK_PATH, check);
    console.log(`\nWrote ${SEED_PATH}\nWrote ${CHECK_PATH}`);
  }
}
