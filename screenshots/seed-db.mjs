#!/usr/bin/env node

/**
 * Build a pre-seeded SQLite database from fixture data.
 * Used for App Store screenshot automation — the seeded DB is pushed
 * into the simulator so Maestro flows capture populated screens.
 *
 * Usage: node screenshots/seed-db.mjs
 * Output: screenshots/fixtures/discogs.db
 *
 * Fixtures are loaded from screenshots/fixtures/ (created by fetch-collection.mjs)
 * or falls back to __fixtures__/ (the test fixtures with limited data).
 */

import Database from "better-sqlite3";
import { readFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FIXTURES_DIR = join(__dirname, "fixtures");
const OUTPUT = join(FIXTURES_DIR, "discogs.db");

mkdirSync(dirname(OUTPUT), { recursive: true });

// Remove stale DB files so we start fresh
for (const suffix of ["", "-wal", "-shm"]) {
  rmSync(OUTPUT + suffix, { force: true });
}

const db = new Database(OUTPUT);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema (mirrors db/migrations.ts V1–V3) ──

db.exec(`
  CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS releases (
    instance_id INTEGER PRIMARY KEY,
    release_id INTEGER NOT NULL,
    folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    year INTEGER,
    artists TEXT,
    labels TEXT,
    formats TEXT,
    genres TEXT,
    styles TEXT,
    thumb_url TEXT,
    cover_url TEXT,
    date_added TEXT,
    tracklist TEXT,
    images TEXT,
    community_rating REAL,
    community_have INTEGER,
    community_want INTEGER,
    videos TEXT,
    detail_synced_at TEXT,
    basic_synced_at TEXT
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_releases_release_id ON releases(release_id);
  CREATE INDEX IF NOT EXISTS idx_releases_folder_id ON releases(folder_id);
  CREATE INDEX IF NOT EXISTS idx_releases_detail_synced_at ON releases(detail_synced_at);
`);

db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS releases_fts USING fts5(
    title,
    artists,
    labels,
    content='releases',
    content_rowid='instance_id'
  );
`);

// V3 triggers with COALESCE
db.exec(`
  CREATE TRIGGER releases_ai AFTER INSERT ON releases BEGIN
    INSERT INTO releases_fts(rowid, title, artists, labels)
    VALUES (
      new.instance_id,
      new.title,
      COALESCE((SELECT GROUP_CONCAT(json_extract(value, '$.name'), ', ') FROM json_each(new.artists)), ''),
      COALESCE((SELECT GROUP_CONCAT(json_extract(value, '$.name'), ', ') FROM json_each(new.labels)), '')
    );
  END;
`);

db.exec(`PRAGMA user_version = 3;`);

// ── Load fixtures ──
// Prefer full collection from fetch-collection.mjs, fall back to test fixtures

const hasFullCollection =
  existsSync(join(FIXTURES_DIR, "folders.json")) &&
  existsSync(join(FIXTURES_DIR, "releases.json"));

const insertFolder = db.prepare(
  "INSERT OR REPLACE INTO folders (id, name, count) VALUES (?, ?, ?)"
);

const insertRelease = db.prepare(`
  INSERT OR REPLACE INTO releases
    (instance_id, release_id, folder_id, title, year, artists, labels,
     formats, genres, styles, thumb_url, cover_url, date_added,
     tracklist, images, community_rating, community_have, community_want,
     videos, detail_synced_at, basic_synced_at)
  VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let folderCount = 0;
let releaseCount = 0;

if (hasFullCollection) {
  // ── Full collection from Discogs API ──
  console.log("Using full collection fixtures from fetch-collection.mjs");

  const folders = JSON.parse(
    readFileSync(join(FIXTURES_DIR, "folders.json"), "utf-8")
  ).folders;

  const releasesByFolder = JSON.parse(
    readFileSync(join(FIXTURES_DIR, "releases.json"), "utf-8")
  );

  const insertAll = db.transaction(() => {
    for (const f of folders) {
      insertFolder.run(f.id, f.name, f.count);
      folderCount++;
    }

    for (const [folderId, releases] of Object.entries(releasesByFolder)) {
      for (const r of releases) {
        const bi = r.basic_information;
        insertRelease.run(
          r.instance_id,
          bi.id,
          parseInt(folderId, 10),
          bi.title,
          bi.year,
          JSON.stringify(bi.artists),
          JSON.stringify(bi.labels),
          JSON.stringify(bi.formats),
          JSON.stringify(bi.genres),
          JSON.stringify(bi.styles),
          bi.thumb,
          bi.cover_image,
          r.date_added,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          new Date().toISOString()
        );
        releaseCount++;
      }
    }
  });

  insertAll();
} else {
  // ── Fallback: duplicate test fixtures across folders ──
  console.log("No full collection found, falling back to test fixtures");
  console.log(
    "Run: DISCOGS_TOKEN=<token> node screenshots/fetch-collection.mjs"
  );

  const folders = JSON.parse(
    readFileSync(join(ROOT, "__fixtures__/folders.json"), "utf-8")
  ).folders;

  const fixtureReleases = JSON.parse(
    readFileSync(
      join(ROOT, "__fixtures__/collection-releases.json"),
      "utf-8"
    )
  ).releases;

  const folderIds = folders.filter((f) => f.id !== 0).map((f) => f.id);

  const insertAll = db.transaction(() => {
    for (const f of folders) {
      insertFolder.run(f.id, f.name, f.count);
      folderCount++;
    }

    for (let fi = 0; fi < folderIds.length; fi++) {
      const offset = (fi + 1) * 100000;
      for (let i = 0; i < fixtureReleases.length; i++) {
        const r = fixtureReleases[i];
        const bi = r.basic_information;
        insertRelease.run(
          offset + i,
          bi.id,
          folderIds[fi],
          bi.title,
          bi.year,
          JSON.stringify(bi.artists),
          JSON.stringify(bi.labels),
          JSON.stringify(bi.formats),
          JSON.stringify(bi.genres),
          JSON.stringify(bi.styles),
          bi.thumb,
          bi.cover_image,
          r.date_added,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          new Date().toISOString()
        );
        releaseCount++;
      }
    }
  });

  insertAll();
}

// Rebuild FTS index
db.exec(`INSERT INTO releases_fts(releases_fts) VALUES('rebuild')`);

console.log(`Inserted ${folderCount} folders`);
console.log(`Inserted ${releaseCount} releases`);
console.log(`Database written to ${OUTPUT}`);

db.close();
