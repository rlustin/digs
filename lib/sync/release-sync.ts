import { eq, and, notInArray } from "drizzle-orm";
import { db, expo } from "@/db/client";
import { releases } from "@/db/schema";
import { getAllFolders } from "@/db/queries/folders";
import {
  fetchReleasesInFolder,
  fetchReleaseDetail,
} from "@/lib/discogs/endpoints";
import {
  getReleasesNeedingDetailSync,
  getLocalReleaseCountByFolder,
} from "@/db/queries/releases";
import type { CollectionRelease } from "@/lib/discogs/types";
import type { SyncPhase } from "@/stores/sync-store";
import { mapReleaseDetailToRow } from "./detail-mapper";

export interface ReleaseSyncCallbacks {
  setPhase: (phase: SyncPhase) => void;
  setProgress: (current: number, total: number) => void;
}

/**
 * Map a Discogs collection release to a DB row for basic sync.
 */
export function mapBasicRelease(r: CollectionRelease, folderId: number) {
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
      db.insert(releases)
        .values(row)
        .onConflictDoUpdate({
          target: releases.instanceId,
          set: row,
        })
        .run();
    }
  });
}

/**
 * Sync releases from each real folder (skipping folder 0 which is virtual).
 * This ensures each release gets its correct folder_id.
 */
export async function syncBasicReleases(
  username: string,
  signal?: AbortSignal,
  callbacks?: ReleaseSyncCallbacks,
) {
  callbacks?.setPhase("basic-releases");

  const folders = getAllFolders().filter((f) => f.id !== 0);

  // If user has no custom folders, fall back to folder 1 (Uncategorized)
  const foldersToSync = folders.length > 0 ? folders : [{ id: 1, name: "Uncategorized", count: 0 }];

  let totalProcessed = 0;
  const totalItems = foldersToSync.reduce((sum, f) => sum + f.count, 0);

  for (const folder of foldersToSync) {
    if (signal?.aborted) return;
    let page = 1;
    let totalPages = 1;
    const syncedInstanceIds: number[] = [];

    while (page <= totalPages) {
      if (signal?.aborted) return;
      const response = await fetchReleasesInFolder(username, folder.id, page, 100, signal);
      totalPages = response.pagination.pages;

      totalProcessed += response.releases.length;
      callbacks?.setProgress(totalProcessed, totalItems);

      for (const r of response.releases) {
        syncedInstanceIds.push(r.instance_id);
      }

      upsertReleasePage(response.releases, folder.id);
      page++;
    }

    // Remove local releases that were deleted from this folder on Discogs
    if (syncedInstanceIds.length > 0) {
      db.delete(releases)
        .where(
          and(
            eq(releases.folderId, folder.id),
            notInArray(releases.instanceId, syncedInstanceIds),
          ),
        )
        .run();
    }
  }
}

/**
 * Incremental sync: fetch only new releases added since lastFullSyncAt.
 * Uses sort=added&sort_order=desc so newest releases come first.
 * Stops paginating a folder once we hit a release older than the cutoff.
 * Only runs full deletion reconciliation for folders where local count != API count.
 */
export async function syncBasicReleasesIncremental(
  username: string,
  lastFullSyncAt: string,
  signal?: AbortSignal,
  callbacks?: ReleaseSyncCallbacks,
) {
  callbacks?.setPhase("basic-releases");

  const folders = getAllFolders().filter((f) => f.id !== 0);
  const foldersToSync =
    folders.length > 0 ? folders : [{ id: 1, name: "Uncategorized", count: 0 }];

  for (const folder of foldersToSync) {
    if (signal?.aborted) return;

    let page = 1;
    let totalPages = 1;
    let reachedOldReleases = false;

    // Fetch new releases (newest first, stop when we hit known ones)
    while (page <= totalPages && !reachedOldReleases) {
      if (signal?.aborted) return;
      const response = await fetchReleasesInFolder(
        username,
        folder.id,
        page,
        100,
        signal,
        "added",
        "desc",
      );
      totalPages = response.pagination.pages;

      const newReleases = [];
      for (const r of response.releases) {
        if (r.date_added <= lastFullSyncAt) {
          reachedOldReleases = true;
          break;
        }
        newReleases.push(r);
      }

      if (newReleases.length > 0) {
        upsertReleasePage(newReleases, folder.id);
      }
      page++;
    }

    // Deletion detection: only reconcile folders where counts diverge
    if (signal?.aborted) return;
    const localCount = getLocalReleaseCountByFolder(folder.id);
    if (localCount !== folder.count) {
      // Full reconciliation for this folder
      let reconcilePage = 1;
      let reconcileTotalPages = 1;
      const syncedInstanceIds: number[] = [];

      while (reconcilePage <= reconcileTotalPages) {
        if (signal?.aborted) return;
        const response = await fetchReleasesInFolder(
          username,
          folder.id,
          reconcilePage,
          100,
          signal,
        );
        reconcileTotalPages = response.pagination.pages;

        for (const r of response.releases) {
          syncedInstanceIds.push(r.instance_id);
        }
        upsertReleasePage(response.releases, folder.id);
        reconcilePage++;
      }

      if (syncedInstanceIds.length > 0) {
        db.delete(releases)
          .where(
            and(
              eq(releases.folderId, folder.id),
              notInArray(releases.instanceId, syncedInstanceIds),
            ),
          )
          .run();
      }
    }
  }
}

/**
 * Fetch full details for a batch of releases that haven't been detail-synced yet.
 * Returns the number of releases processed (0 means all done).
 */
export async function syncReleaseDetails(
  batchSize: number = 10,
  signal?: AbortSignal
): Promise<number> {
  const pending = getReleasesNeedingDetailSync(batchSize);
  if (pending.length === 0) return 0;

  let processed = 0;
  for (let i = 0; i < pending.length; i++) {
    if (signal?.aborted) return processed;
    const release = pending[i];

    try {
      const detail = await fetchReleaseDetail(release.releaseId, signal);

      db.update(releases)
        .set(mapReleaseDetailToRow(detail))
        .where(eq(releases.instanceId, release.instanceId))
        .run();
      processed++;
    } catch (err) {
      if (signal?.aborted) return processed;
      // Re-throw auth errors so the caller can handle them
      if (err instanceof Error && err.message === "authentication_expired") {
        throw err;
      }
      console.warn(`Detail sync failed for release ${release.releaseId}:`, err);
    }
  }

  return processed;
}
