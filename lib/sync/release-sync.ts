import { eq } from "drizzle-orm";
import { db, expo } from "@/db/client";
import { releases } from "@/db/schema";
import { getAllFolders } from "@/db/queries/folders";
import {
  fetchReleasesInFolder,
  fetchReleaseDetail,
} from "@/lib/discogs/endpoints";
import { useSyncStore } from "@/stores/sync-store";
import { getReleasesNeedingDetailSync } from "@/db/queries/releases";
import type { CollectionRelease } from "@/lib/discogs/types";

/**
 * Map a Discogs collection release to a DB row for basic sync.
 */
function mapBasicRelease(r: CollectionRelease, folderId: number) {
  const info = r.basic_information;
  return {
    instanceId: r.instance_id,
    releaseId: info.id,
    folderId,
    title: info.title,
    year: info.year,
    artists: info.artists.map((a) => ({ name: a.name, id: a.id })),
    labels: info.labels.map((l) => ({ name: l.name, catno: l.catno })),
    formats: info.formats.map((f) => ({
      name: f.name,
      qty: f.qty,
      descriptions: f.descriptions,
    })),
    genres: info.genres,
    styles: info.styles,
    thumbUrl: info.thumb,
    coverUrl: info.cover_image,
    dateAdded: r.date_added,
    basicSyncedAt: new Date().toISOString(),
  };
}

function upsertReleasePage(
  releasePage: CollectionRelease[],
  folderId: number
) {
  expo.withTransactionSync(() => {
    for (const r of releasePage) {
      const row = mapBasicRelease(r, folderId);
      const existing = db
        .select()
        .from(releases)
        .where(eq(releases.instanceId, r.instance_id))
        .get();

      if (existing) {
        db.update(releases)
          .set(row)
          .where(eq(releases.instanceId, r.instance_id))
          .run();
      } else {
        db.insert(releases).values(row).run();
      }
    }
  });
}

/**
 * Sync releases from each real folder (skipping folder 0 which is virtual).
 * This ensures each release gets its correct folder_id.
 */
export async function syncBasicReleases(username: string) {
  const store = useSyncStore.getState();
  store.setPhase("basic-releases");

  const folders = getAllFolders().filter((f) => f.id !== 0);

  // If user has no custom folders, fall back to folder 1 (Uncategorized)
  const foldersToSync = folders.length > 0 ? folders : [{ id: 1, name: "Uncategorized", count: 0 }];

  let totalProcessed = 0;
  const totalItems = foldersToSync.reduce((sum, f) => sum + f.count, 0);

  for (const folder of foldersToSync) {
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const response = await fetchReleasesInFolder(username, folder.id, page);
      totalPages = response.pagination.pages;

      totalProcessed += response.releases.length;
      store.setProgress(totalProcessed, totalItems);

      upsertReleasePage(response.releases, folder.id);
      page++;
    }
  }
}

/**
 * Fetch full details for a batch of releases that haven't been detail-synced yet.
 * Returns the number of releases processed (0 means all done).
 */
export async function syncReleaseDetails(
  batchSize: number = 10
): Promise<number> {
  const pending = getReleasesNeedingDetailSync(batchSize);
  if (pending.length === 0) return 0;

  for (let i = 0; i < pending.length; i++) {
    const release = pending[i];

    const detail = await fetchReleaseDetail(release.releaseId);

    db.update(releases)
      .set({
        tracklist: detail.tracklist.map((t) => ({
          position: t.position,
          title: t.title,
          duration: t.duration,
        })),
        images: detail.images?.map((img) => ({
          type: img.type,
          uri: img.uri,
          width: img.width,
          height: img.height,
        })),
        communityRating: detail.community?.rating?.average ?? null,
        communityHave: detail.community?.have ?? null,
        communityWant: detail.community?.want ?? null,
        videos: detail.videos?.map((v) => ({
          uri: v.uri,
          title: v.title,
          duration: v.duration,
        })),
        detailSyncedAt: new Date().toISOString(),
      })
      .where(eq(releases.instanceId, release.instanceId))
      .run();
  }

  return pending.length;
}
