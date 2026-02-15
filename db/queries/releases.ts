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
    .get();
}

export function getReleasesNeedingDetailSync(limit: number = 10) {
  return db
    .select()
    .from(releases)
    .where(sql`${releases.detailSyncedAt} IS NULL`)
    .limit(limit)
    .all();
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

export function getRandomRelease(folderId?: number) {
  if (folderId && folderId !== 0) {
    return db
      .select()
      .from(releases)
      .where(eq(releases.folderId, folderId))
      .orderBy(sql`RANDOM()`)
      .limit(1)
      .get();
  }
  return db.select().from(releases).orderBy(sql`RANDOM()`).limit(1).get();
}
