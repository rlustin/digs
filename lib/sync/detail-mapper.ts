import type { ReleaseDetail } from "@/lib/discogs/types";

/**
 * Map a Discogs release detail response to the DB columns
 * used by both the sync engine and on-demand detail fetch.
 */
export function mapReleaseDetailToRow(detail: ReleaseDetail) {
  return {
    tracklist: detail.tracklist.map((track) => ({
      position: track.position,
      title: track.title,
      duration: track.duration,
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
  };
}
