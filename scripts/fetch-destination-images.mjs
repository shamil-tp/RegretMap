// Finds a freely licensed photo for every published destination and writes
// src/data/destination-images.json (reviewable, committed; no runtime API calls).
//
//   node scripts/fetch-destination-images.mjs            # all destinations
//   node scripts/fetch-destination-images.mjs --missing  # only ones not in the file yet
//
// Source: the destination's Wikipedia lead image, kept ONLY if it is hosted on
// Wikimedia Commons under a free licence (CC0 / public domain / CC BY / CC BY-SA).
// Maps, flags, logos, diagrams and SVGs are skipped. Each entry stores the
// author and licence so the site can show attribution next to the photo.
// Reads destinations with the public (publishable) key from .env.local.

import { existsSync, readFileSync, writeFileSync } from "node:fs";

const OUT = "src/data/destination-images.json";
const UA = "RegretMap/0.1 (https://regret-map.shamiltp.me; travel-lessons site) node-fetch";
const WIDTH = 1280;

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, "")]),
);
const SUPABASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(url, headers = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, ...headers } });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  throw new Error(`gave up on ${url}`);
}

/** Reviewed by hand: the search matched the wrong place or an unhelpful photo. */
const EXCLUDE = new Set([
  "udaipur-tripura", // matched Udaipur, Rajasthan
  "serengeti", // matched "Mara Region"
  "sossusvlei", // photo taken from orbit
  "agatti", // airstrip photo
  "ekta-nagar", // railway station photo
  "santorini", // municipality map, not a photo
]);

const BAD_FILE = /map|flag|logo|locator|location|seal|emblem|coat[_ ]of[_ ]arms|diagram|chart|\.svg$|\.gif$|icon|symbol|plan\b/i;
const FREE_LICENCE = /^(cc0|public domain|pd|cc by(-sa)? ?\d|cc-by(-sa)?-\d)/i;

const stripHtml = (html = "") =>
  html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").replace(/&amp;/g, "&").trim();

/** Wikipedia search → lead image file name for the best-matching article. */
async function leadImage(query) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2" +
    "&generator=search&gsrlimit=1&gsrnamespace=0&prop=pageimages&piprop=name" +
    `&gsrsearch=${encodeURIComponent(query)}`;
  const data = await getJson(url);
  const page = data.query?.pages?.[0];
  return page?.pageimage ? { file: page.pageimage, article: page.title } : null;
}

/** Commons file info with licence; null if not on Commons or not free. */
async function commonsInfo(file) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2" +
    `&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=${WIDTH}` +
    `&titles=${encodeURIComponent(`File:${file}`)}`;
  const data = await getJson(url);
  const page = data.query?.pages?.[0];
  const info = page?.imageinfo?.[0];
  if (!info || page.missing) return null; // local (often non-free) file, not on Commons
  const meta = info.extmetadata ?? {};
  const licence = stripHtml(meta.LicenseShortName?.value);
  if (!FREE_LICENCE.test(licence)) return null;
  const author = stripHtml(meta.Artist?.value) || "Unknown author";
  const width = info.thumbwidth ?? info.width;
  const height = info.thumbheight ?? info.height;
  if (!width || !height || width < height * 0.9) return null; // prefer landscape-ish photos
  return {
    src: (info.thumburl ?? info.url).split("?")[0],
    width,
    height,
    author: author.slice(0, 120),
    licence,
    sourceUrl: info.descriptionurl,
  };
}

async function main() {
  const res = await fetch(
    `${SUPABASE}/rest/v1/destinations?select=slug,name,region,country&status=eq.published&limit=1000`,
    { headers: { apikey: KEY } },
  );
  if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
  const destinations = await res.json();
  const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
  const onlyMissing = process.argv.includes("--missing");
  const out = { ...existing };
  let found = 0;
  let skipped = 0;

  for (const d of destinations) {
    if (EXCLUDE.has(d.slug)) {
      delete out[d.slug];
      continue;
    }
    if (onlyMissing && out[d.slug]) continue;
    const name = d.name.replace(/\s*\(.*?\)\s*/g, " ").trim();
    const queries = [`${name} ${d.country ?? ""}`.trim(), `${name} ${d.region ?? ""}`.trim(), name];
    let result = null;
    for (const q of [...new Set(queries)]) {
      try {
        const lead = await leadImage(q);
        await sleep(120);
        if (!lead || BAD_FILE.test(lead.file)) continue;
        const info = await commonsInfo(lead.file);
        await sleep(120);
        if (info) {
          result = { ...info, article: lead.article };
          break;
        }
      } catch (error) {
        console.warn(`  ${d.slug}: ${error.message}`);
      }
    }
    if (result) {
      out[d.slug] = result;
      found++;
      console.log(`✓ ${d.slug} ← ${result.article} (${result.licence})`);
    } else {
      skipped++;
      console.log(`· ${d.slug}: no free photo found`);
    }
  }

  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(OUT, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`\n${found} found, ${skipped} without a photo; ${Object.keys(sorted).length} total in ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
