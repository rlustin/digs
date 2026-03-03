import { Image } from "expo-image";
import { db } from "@/db/client";
import { releases } from "@/db/schema";

const BATCH_SIZE = 50;

/**
 * Query the database for all non-null image URLs.
 */
export function getAllImageUrls(): {
  thumbUrls: string[];
  coverUrls: string[];
} {
  const rows = db
    .select({ thumbUrl: releases.thumbUrl, coverUrl: releases.coverUrl })
    .from(releases)
    .all();

  const thumbUrls = new Set<string>();
  const coverUrls = new Set<string>();

  for (const row of rows) {
    if (row.thumbUrl) thumbUrls.add(row.thumbUrl);
    if (row.coverUrl) coverUrls.add(row.coverUrl);
  }

  return { thumbUrls: [...thumbUrls], coverUrls: [...coverUrls] };
}

/**
 * Prefetch URLs in batches via expo-image disk cache.
 * Catches batch-level errors and continues. Reports progress via callbacks.
 */
export async function prefetchImages(
  urls: string[],
  signal?: AbortSignal,
  callbacks?: { setProgress?: (current: number, total: number) => void },
  progressOffset: number = 0,
  progressTotal?: number,
) {
  const total = progressTotal ?? urls.length;
  if (urls.length === 0) return;

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    if (signal?.aborted) return;

    const batch = urls.slice(i, i + BATCH_SIZE);
    try {
      await Image.prefetch(batch, { cachePolicy: "disk" });
    } catch (err) {
      console.warn("Image prefetch batch failed:", err);
    }

    const done = Math.min(i + BATCH_SIZE, urls.length);
    callbacks?.setProgress?.(progressOffset + done, total);
  }
}

/**
 * Orchestrator: prefetch thumbnails first, then covers,
 * sharing a single progress bar across both.
 */
export async function runImageCacheSync(
  signal?: AbortSignal,
  callbacks?: { setProgress?: (current: number, total: number) => void },
) {
  const { thumbUrls, coverUrls } = getAllImageUrls();
  const total = thumbUrls.length + coverUrls.length;

  if (total === 0) return;

  await prefetchImages(thumbUrls, signal, callbacks, 0, total);

  if (signal?.aborted) return;

  await prefetchImages(coverUrls, signal, callbacks, thumbUrls.length, total);
}
