import { eq, sql } from "drizzle-orm";
import { db, expo } from "../client";
import { releases } from "../schema";

export function getReleasesByFolder(folderId: number) {
  if (folderId === 0) {
    return db.select().from(releases).all();
  }
  return db.select().from(releases).where(eq(releases.folderId, folderId)).all();
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

export function searchReleases(query: string) {
  if (!query.trim()) return [];

  // Add prefix matching wildcard for partial word matches
  const ftsQuery = query
    .trim()
    .split(/\s+/)
    .map((term) => `"${term}"*`)
    .join(" ");

  const results = expo.getAllSync<{
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
    tracklist: string | null;
    images: string | null;
    community_rating: number | null;
    community_have: number | null;
    community_want: number | null;
    videos: string | null;
    detail_synced_at: string | null;
    basic_synced_at: string | null;
  }>(
    `SELECT r.* FROM releases r
     JOIN releases_fts fts ON r.instance_id = fts.rowid
     WHERE releases_fts MATCH ?`,
    [ftsQuery]
  );

  return results;
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
