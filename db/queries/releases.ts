import { desc, eq, sql } from "drizzle-orm";
import { db, expo } from "../client";
import { releases } from "../schema";

export function getReleasesByFolder(folderId: number) {
  if (folderId === 0) {
    return db.select().from(releases).orderBy(desc(releases.dateAdded)).all();
  }
  return db.select().from(releases).where(eq(releases.folderId, folderId)).orderBy(desc(releases.dateAdded)).all();
}

export function getReleaseByReleaseId(releaseId: number) {
  return db
    .select()
    .from(releases)
    .where(eq(releases.releaseId, releaseId))
    .get() ?? null;
}

export function getReleasesNeedingDetailSync(limit: number = 10) {
  return db
    .select()
    .from(releases)
    .where(sql`${releases.detailSyncedAt} IS NULL`)
    .limit(limit)
    .all();
}

export function getDetailSyncCounts() {
  const row = db
    .select({
      total: sql<number>`count(*)`,
      synced: sql<number>`count(${releases.detailSyncedAt})`,
    })
    .from(releases)
    .get();
  return { total: row?.total ?? 0, synced: row?.synced ?? 0 };
}

export interface SearchResult {
  instanceId: number;
  releaseId: number;
  folderId: number;
  title: string;
  year: number | null;
  artists: { name: string; id: number }[] | null;
  labels: { name: string; catno: string }[] | null;
  formats: { name: string; qty: string; descriptions?: string[] }[] | null;
  genres: string[] | null;
  styles: string[] | null;
  thumbUrl: string | null;
  coverUrl: string | null;
  dateAdded: string | null;
}

export function searchReleases(query: string): SearchResult[] {
  if (!query.trim()) return [];

  // Add prefix matching wildcard for partial word matches
  const ftsQuery = query
    .trim()
    .split(/\s+/)
    .map((term) => term.replace(/"/g, ""))
    .filter((term) => term.length > 0)
    .map((term) => `"${term}"*`)
    .join(" ");

  const rows = expo.getAllSync<{
    instance_id: number;
    release_id: number;
    folder_id: number;
    title: string;
    year: number | null;
    artists: string | null;
    labels: string | null;
    formats: string | null;
    genres: string | null;
    styles: string | null;
    thumb_url: string | null;
    cover_url: string | null;
    date_added: string | null;
  }>(
    `SELECT r.* FROM releases r
     JOIN releases_fts fts ON r.instance_id = fts.rowid
     WHERE releases_fts MATCH ?`,
    [ftsQuery]
  );

  return rows.map((row) => ({
    instanceId: row.instance_id,
    releaseId: row.release_id,
    folderId: row.folder_id,
    title: row.title,
    year: row.year,
    artists: row.artists ? JSON.parse(row.artists) : null,
    labels: row.labels ? JSON.parse(row.labels) : null,
    formats: row.formats ? JSON.parse(row.formats) : null,
    genres: row.genres ? JSON.parse(row.genres) : null,
    styles: row.styles ? JSON.parse(row.styles) : null,
    thumbUrl: row.thumb_url,
    coverUrl: row.cover_url,
    dateAdded: row.date_added,
  }));
}

export function getCollectionStats() {
  const row = expo.getFirstSync<{
    total_releases: number;
    total_artists: number;
  }>(
    `SELECT
      COUNT(*) as total_releases,
      COUNT(DISTINCT json_each.value) as total_artists
    FROM releases, json_each(releases.artists, '$[*].name')
    WHERE releases.artists IS NOT NULL`
  );
  return {
    totalReleases: row?.total_releases ?? 0,
    totalArtists: row?.total_artists ?? 0,
  };
}

export function clearAllReleases() {
  db.delete(releases).run();
  expo.execSync("INSERT INTO releases_fts(releases_fts) VALUES('rebuild')");
}

export function getRandomRelease(folderId?: number) {
  if (folderId && folderId !== 0) {
    return db
      .select()
      .from(releases)
      .where(eq(releases.folderId, folderId))
      .orderBy(sql`RANDOM()`)
      .limit(1)
      .get() ?? null;
  }
  return db.select().from(releases).orderBy(sql`RANDOM()`).limit(1).get() ?? null;
}
