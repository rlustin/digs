#!/usr/bin/env node

/**
 * Fetch your Discogs collection and save as fixtures for screenshot seeding.
 *
 * Usage:
 *   DISCOGS_TOKEN=<personal_access_token> node screenshots/fetch-collection.mjs
 *
 * Generate a personal access token at https://www.discogs.com/settings/developers
 *
 * Output:
 *   screenshots/fixtures/folders.json
 *   screenshots/fixtures/releases.json
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "fixtures");

const TOKEN = process.env.DISCOGS_TOKEN;
if (!TOKEN) {
  console.error(
    "Missing DISCOGS_TOKEN. Generate one at https://www.discogs.com/settings/developers"
  );
  process.exit(1);
}

const USERNAME = process.env.DISCOGS_USERNAME ?? "rlustin";
const BASE_URL = "https://api.discogs.com";
const USER_AGENT = "Digs-Screenshots/1.0";

// Rate limiting
let remaining = 60;
async function rateLimitedFetch(url) {
  if (remaining <= 2) {
    console.log("  Rate limit low, waiting 2s...");
    await new Promise((r) => setTimeout(r, 2000));
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Discogs token=${TOKEN}`,
      "User-Agent": USER_AGENT,
    },
  });

  const rl = response.headers.get("X-Discogs-Ratelimit-Remaining");
  if (rl) remaining = parseInt(rl, 10);

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("Retry-After") ?? "5", 10);
    console.log(`  Rate limited, waiting ${retryAfter}s...`);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return rateLimitedFetch(url);
  }

  if (!response.ok) {
    throw new Error(`Discogs API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ── Fetch folders ──

async function fetchFolders() {
  console.log("Fetching folders...");
  const data = await rateLimitedFetch(
    `${BASE_URL}/users/${USERNAME}/collection/folders`
  );
  console.log(`  Found ${data.folders.length} folders`);
  return data.folders;
}

// ── Fetch all releases in a folder (paginated) ──

async function fetchReleasesInFolder(folderId, folderName) {
  const releases = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${BASE_URL}/users/${USERNAME}/collection/folders/${folderId}/releases?per_page=100&page=${page}`;
    const data = await rateLimitedFetch(url);
    totalPages = data.pagination.pages;
    releases.push(...data.releases);
    process.stdout.write(
      `  ${folderName}: page ${page}/${totalPages} (${releases.length} releases)\r`
    );
    page++;
  }

  console.log(
    `  ${folderName}: ${releases.length} releases                    `
  );
  return releases;
}

// ── Main ──

mkdirSync(FIXTURES_DIR, { recursive: true });

const folders = await fetchFolders();

// Save folders
writeFileSync(
  join(FIXTURES_DIR, "folders.json"),
  JSON.stringify({ folders }, null, 2)
);
console.log(`Saved ${folders.length} folders to fixtures/folders.json`);

// Fetch releases from each real folder (skip folder 0 "All")
const allReleases = {};
for (const folder of folders.filter((f) => f.id !== 0)) {
  if (folder.count === 0) continue;
  const releases = await fetchReleasesInFolder(folder.id, folder.name);
  allReleases[folder.id] = releases;
}

// Save releases
writeFileSync(
  join(FIXTURES_DIR, "releases.json"),
  JSON.stringify(allReleases, null, 2)
);

const totalReleases = Object.values(allReleases).reduce(
  (sum, arr) => sum + arr.length,
  0
);
console.log(
  `Saved ${totalReleases} releases across ${Object.keys(allReleases).length} folders to fixtures/releases.json`
);
