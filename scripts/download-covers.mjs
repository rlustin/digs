#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const COVERS_DIR = join(ROOT, "assets", "covers");
const COUNT = 200;
const FORCE = process.argv.includes("--force");

// Discogs has 15 top-level genres; sub-categories use the "style" parameter.
const SEARCHES = [
  { style: "Acid" },
  { style: "Afrobeat" },
  { style: "Ambient" },
  { style: "Breaks" },
  { genre: "Classical" },
  { style: "Disco" },
  { style: "Downtempo" },
  { style: "Drum n Bass" },
  { style: "Dub" },
  { style: "Dubstep" },
  { style: "Electro" },
  { genre: "Funk / Soul" },
  { style: "House" },
  { style: "IDM" },
  { genre: "Jazz" },
  { style: "Jungle" },
  { genre: "Latin" },
  { style: "Psychedelic Rock" },
  { genre: "Reggae" },
  { style: "Techno" },
];

function loadEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return null;
  const env = {};
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^\s*([\w]+)\s*=\s*(.+?)\s*$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

function allExist() {
  for (let i = 1; i <= COUNT; i++) {
    const name = `cover-${String(i).padStart(3, "0")}.jpg`;
    if (!existsSync(join(COVERS_DIR, name))) return false;
  }
  return true;
}

async function main() {
  if (!FORCE && allExist()) {
    console.log(`All ${COUNT} covers already exist. Use --force to re-download.`);
    return;
  }

  const env = loadEnv();
  if (!env) {
    console.warn("Skipping cover download: .env file not found.");
    return;
  }
  const key = env.EXPO_PUBLIC_DISCOGS_KEY;
  const secret = env.EXPO_PUBLIC_DISCOGS_SECRET;
  if (!key || !secret) {
    console.warn("Skipping cover download: EXPO_PUBLIC_DISCOGS_KEY and EXPO_PUBLIC_DISCOGS_SECRET must be set in .env");
    return;
  }

  mkdirSync(COVERS_DIR, { recursive: true });

  const authHeaders = {
    "User-Agent": "Digs/1.0",
    Authorization: `Discogs key=${key}, secret=${secret}`,
  };

  // Fetch more per search to compensate for deduplication
  const perSearch = 15;
  const results = [];
  const seenIds = new Set();

  for (const search of SEARCHES) {
    const label = search.genre ?? search.style;
    const param = search.genre
      ? `genre=${encodeURIComponent(search.genre)}`
      : `style=${encodeURIComponent(search.style)}`;
    console.log(`Searching Discogs for ${label}...`);
    const searchUrl = `https://api.discogs.com/database/search?type=master&sort=have&sort_order=desc&per_page=${perSearch}&${param}`;
    const res = await fetch(searchUrl, { headers: authHeaders });

    if (!res.ok) {
      if (res.status === 429) {
        console.warn(`  Rate limited on ${label}, waiting 60s...`);
        await sleep(60000);
      } else {
        console.warn(`  Search for ${label} failed: ${res.status}, skipping`);
      }
      continue;
    }

    // Stay under Discogs rate limit (60 req/min)
    await sleep(1000);

    const data = await res.json();
    let added = 0;
    for (const r of data.results ?? []) {
      if (!r.thumb || seenIds.has(r.id)) continue;
      seenIds.add(r.id);
      results.push(r);
      added++;
    }
    console.log(`  Got ${added} unique results for ${label}`);
  }

  // Shuffle so genres are interleaved visually
  for (let i = results.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [results[i], results[j]] = [results[j], results[i]];
  }

  if (results.length === 0) {
    console.error("No results returned from Discogs search.");
    process.exit(1);
  }

  console.log(`Got ${results.length} total results. Downloading thumbnails...`);

  let downloaded = 0;
  for (let i = 0; i < Math.min(results.length, COUNT); i++) {
    const name = `cover-${String(i + 1).padStart(3, "0")}.jpg`;
    const dest = join(COVERS_DIR, name);

    if (!FORCE && existsSync(dest)) {
      console.log(`  ${name} exists, skipping`);
      continue;
    }

    const thumbUrl = results[i].thumb;
    if (!thumbUrl) {
      console.warn(`  ${name} has no thumbnail, skipping`);
      continue;
    }

    const imgRes = await fetch(thumbUrl, {
      headers: { "User-Agent": "Digs/1.0" },
    });

    if (!imgRes.ok) {
      console.warn(`  ${name} download failed: ${imgRes.status}`);
      continue;
    }

    // eslint-disable-next-line no-undef
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    writeFileSync(dest, buffer);
    downloaded++;
    console.log(`  ${name} ✓`);
  }

  console.log(`Downloaded ${downloaded} cover images to assets/covers/`);

  // Generate constants/covers.ts based on actual files on disk
  const files = readdirSync(COVERS_DIR)
    .filter((f) => f.endsWith(".jpg"))
    .sort();

  if (files.length === 0) {
    console.error("No cover images found after download. Aborting.");
    process.exit(1);
  }

  const requires = files
    .map((f) => `  require("@/assets/covers/${f}")`)
    .join(",\n");
  const coversTs = `export const COVER_IMAGES: number[] = [\n${requires},\n];\n`;
  writeFileSync(join(ROOT, "constants", "covers.ts"), coversTs);
  console.log(`Generated constants/covers.ts with ${files.length} images.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
