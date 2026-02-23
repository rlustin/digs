import { expo } from "./client";

const CURRENT_VERSION = 2;

/**
 * Run all schema migrations. Call once at app startup before any queries.
 * Uses PRAGMA user_version to track which migrations have been applied.
 */
export function runMigrations() {
  const row = expo.getFirstSync<{ user_version: number }>(
    "PRAGMA user_version"
  );
  const version = row?.user_version ?? 0;

  if (version < 1) {
    migrateV1();
  }

  if (version < 2) {
    migrateV2();
  }

  if (version < CURRENT_VERSION) {
    expo.execSync(`PRAGMA user_version = ${CURRENT_VERSION}`);
  }
}

/** V1: Initial schema — folders, releases, FTS5, indexes, triggers. */
function migrateV1() {
  expo.execSync(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0
    );
  `);

  expo.execSync(`
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

  expo.execSync(`
    CREATE INDEX IF NOT EXISTS idx_releases_release_id ON releases(release_id);
  `);

  expo.execSync(`
    CREATE INDEX IF NOT EXISTS idx_releases_folder_id ON releases(folder_id);
  `);

  expo.execSync(`
    CREATE INDEX IF NOT EXISTS idx_releases_detail_synced_at ON releases(detail_synced_at);
  `);

  // FTS5 virtual table for full-text search
  expo.execSync(`
    CREATE VIRTUAL TABLE IF NOT EXISTS releases_fts USING fts5(
      title,
      artists,
      labels,
      content='releases',
      content_rowid='instance_id'
    );
  `);

  // Triggers to keep FTS index in sync
  // Extract plain-text names from JSON arrays so FTS5 indexes searchable text
  expo.execSync(`
    CREATE TRIGGER IF NOT EXISTS releases_ai AFTER INSERT ON releases BEGIN
      INSERT INTO releases_fts(rowid, title, artists, labels)
      VALUES (
        new.instance_id,
        new.title,
        (SELECT GROUP_CONCAT(json_extract(value, '$.name'), ', ') FROM json_each(new.artists)),
        (SELECT GROUP_CONCAT(json_extract(value, '$.name'), ', ') FROM json_each(new.labels))
      );
    END;
  `);

  expo.execSync(`
    CREATE TRIGGER IF NOT EXISTS releases_ad AFTER DELETE ON releases BEGIN
      INSERT INTO releases_fts(releases_fts, rowid, title, artists, labels)
      VALUES ('delete', old.instance_id, old.title, old.artists, old.labels);
    END;
  `);

  expo.execSync(`
    CREATE TRIGGER IF NOT EXISTS releases_au AFTER UPDATE ON releases BEGIN
      INSERT INTO releases_fts(releases_fts, rowid, title, artists, labels)
      VALUES ('delete', old.instance_id, old.title, old.artists, old.labels);
      INSERT INTO releases_fts(rowid, title, artists, labels)
      VALUES (
        new.instance_id,
        new.title,
        (SELECT GROUP_CONCAT(json_extract(value, '$.name'), ', ') FROM json_each(new.artists)),
        (SELECT GROUP_CONCAT(json_extract(value, '$.name'), ', ') FROM json_each(new.labels))
      );
    END;
  `);
}

/** V2: Fix FTS delete/update triggers to extract names from JSON instead of passing raw JSON. */
function migrateV2() {
  // Drop broken triggers
  expo.execSync(`DROP TRIGGER IF EXISTS releases_ad`);
  expo.execSync(`DROP TRIGGER IF EXISTS releases_au`);

  // Recreate delete trigger with JSON extraction
  expo.execSync(`
    CREATE TRIGGER releases_ad AFTER DELETE ON releases BEGIN
      INSERT INTO releases_fts(releases_fts, rowid, title, artists, labels)
      VALUES (
        'delete',
        old.instance_id,
        old.title,
        (SELECT GROUP_CONCAT(json_extract(value, '$.name'), ', ') FROM json_each(old.artists)),
        (SELECT GROUP_CONCAT(json_extract(value, '$.name'), ', ') FROM json_each(old.labels))
      );
    END;
  `);

  // Recreate update trigger with JSON extraction in the delete portion
  expo.execSync(`
    CREATE TRIGGER releases_au AFTER UPDATE ON releases BEGIN
      INSERT INTO releases_fts(releases_fts, rowid, title, artists, labels)
      VALUES (
        'delete',
        old.instance_id,
        old.title,
        (SELECT GROUP_CONCAT(json_extract(value, '$.name'), ', ') FROM json_each(old.artists)),
        (SELECT GROUP_CONCAT(json_extract(value, '$.name'), ', ') FROM json_each(old.labels))
      );
      INSERT INTO releases_fts(rowid, title, artists, labels)
      VALUES (
        new.instance_id,
        new.title,
        (SELECT GROUP_CONCAT(json_extract(value, '$.name'), ', ') FROM json_each(new.artists)),
        (SELECT GROUP_CONCAT(json_extract(value, '$.name'), ', ') FROM json_each(new.labels))
      );
    END;
  `);

  // Rebuild FTS index to fix any existing corruption
  expo.execSync(`INSERT INTO releases_fts(releases_fts) VALUES('rebuild')`);
}
