import { eq } from "drizzle-orm";
import { db, expo } from "@/db/client";
import { releases } from "@/db/schema";
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
function mapBasicRelease(r: CollectionRelease) {
  const info = r.basic_information;
  return {
    instanceId: r.instance_id,
    releaseId: info.id,
    folderId: r.folder_id,
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

/**
 * Paginate through folder 0 (All) and upsert all basic release info.
 */
export async function syncBasicReleases(username: string) {
  const store = useSyncStore.getState();
  store.setPhase("basic-releases");

  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await fetchReleasesInFolder(username, 0, page);
    totalPages = response.pagination.pages;
    store.setProgress(page, totalPages);

    expo.withTransactionSync(() => {
      for (const r of response.releases) {
        const row = mapBasicRelease(r);
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

    page++;
  }
}

/**
 * Fetch full details for a batch of releases that haven't been detail-synced yet.
 * Returns the number of releases processed (0 means all done).
 */
export async function syncReleaseDetails(
  batchSize: number = 10
): Promise<number> {
  const store = useSyncStore.getState();
  store.setPhase("details");

  const pending = getReleasesNeedingDetailSync(batchSize);
  if (pending.length === 0) return 0;

  for (let i = 0; i < pending.length; i++) {
    const release = pending[i];
    store.setProgress(i + 1, pending.length);

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
