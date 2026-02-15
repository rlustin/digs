import { expo } from "./client";

/**
 * Run all schema migrations. Call once at app startup before any queries.
 * Creates tables if they don't exist and sets up FTS5 virtual table with triggers.
 */
export function runMigrations() {
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
      folder_id INTEGER NOT NULL,
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
    CREATE TABLE IF NOT EXISTS sync_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_type TEXT NOT NULL,
      last_synced_at TEXT,
      status TEXT NOT NULL DEFAULT 'idle'
    );
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
  expo.execSync(`
    CREATE TRIGGER IF NOT EXISTS releases_ai AFTER INSERT ON releases BEGIN
      INSERT INTO releases_fts(rowid, title, artists, labels)
      VALUES (new.instance_id, new.title, new.artists, new.labels);
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
      VALUES (new.instance_id, new.title, new.artists, new.labels);
    END;
  `);
}
