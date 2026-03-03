import { syncFolders } from "./folder-sync";
import {
  syncBasicReleases,
  syncBasicReleasesIncremental,
  syncReleaseDetails,
} from "./release-sync";
import { runImageCacheSync } from "./image-cache";
import { useSyncStore } from "@/stores/sync-store";
import { useAuthStore } from "@/stores/auth-store";
import { AuthExpiredError } from "@/lib/discogs/errors";
import { logout } from "@/lib/discogs/oauth";
import { queryClient } from "@/lib/query-client";
import { getDetailSyncCounts } from "@/db/queries/releases";
import type { ReleaseSyncCallbacks } from "./release-sync";

/** Weight each phase occupies in the 0–100% overall progress. */
export const PHASE_WEIGHTS = {
  folders: 2,
  "basic-releases": 18,
  details: 60,
  "caching-images": 20,
} as const;

/**
 * Create a setProgress callback that maps per-phase (current, total)
 * into the overall 0–100 range.
 */
export function makeProgressCallback(
  setProgress: (current: number, total: number) => void,
  offset: number,
  weight: number,
): (current: number, total: number) => void {
  return (current: number, total: number) => {
    const fraction = total > 0 ? current / total : 1;
    setProgress(Math.round(offset + fraction * weight), 100);
  };
}

/**
 * Shared sync pipeline: guards, folder sync, release sync step, detail sync, cleanup.
 */
async function runSyncPipeline(
  username: string,
  syncReleasesStep: (signal: AbortSignal, callbacks: ReleaseSyncCallbacks) => Promise<void>,
) {
  const store = useSyncStore.getState();

  if (store.isSyncing) return;
  const controller = store.startSync();
  const signal = controller.signal;

  store.setProgress(0, 100);

  try {
    await syncFolders(username, signal, { setPhase: store.setPhase });
    store.setProgress(PHASE_WEIGHTS.folders, 100);
    queryClient.invalidateQueries({ queryKey: ["folders"] });

    if (signal.aborted) return;

    const basicReleasesCallbacks: ReleaseSyncCallbacks = {
      setPhase: store.setPhase,
      setProgress: makeProgressCallback(
        store.setProgress,
        PHASE_WEIGHTS.folders,
        PHASE_WEIGHTS["basic-releases"],
      ),
    };
    await syncReleasesStep(signal, basicReleasesCallbacks);
    queryClient.invalidateQueries({ queryKey: ["releases"] });

    if (signal.aborted) return;

    store.setLastFullSyncAt(new Date().toISOString());

    store.loadDetailCounts();

    store.setPhase("details");
    const detailsOffset = PHASE_WEIGHTS.folders + PHASE_WEIGHTS["basic-releases"];
    const detailsProgress = makeProgressCallback(
      store.setProgress,
      detailsOffset,
      PHASE_WEIGHTS.details,
    );
    await runDetailSyncLoop(signal, {
      onProgress: detailsProgress,
      onFailed: store.setDetailSyncFailed,
      onBatchComplete: store.loadDetailCounts,
    });

    if (signal.aborted) return;

    store.setPhase("caching-images");
    const imageCacheOffset = detailsOffset + PHASE_WEIGHTS.details;
    try {
      await runImageCacheSync(signal, {
        setProgress: makeProgressCallback(
          store.setProgress,
          imageCacheOffset,
          PHASE_WEIGHTS["caching-images"],
        ),
      });
    } catch (err) {
      console.warn("Image caching failed:", err);
    }

    store.setProgress(100, 100);
    store.finishSync();
  } catch (err) {
    if (signal.aborted) return;
    if (err instanceof AuthExpiredError) {
      await logout();
      useAuthStore.getState().clearAuth();
      store.finishSync();
      return;
    }
    store.setError(err instanceof Error ? err.message : "Sync failed");
  }
}

/**
 * Run the full sync pipeline:
 * 1. Sync folders
 * 2. Sync basic release info (paginated)
 * 3. Start progressive detail sync
 */
export async function runFullSync(username: string) {
  return runSyncPipeline(username, (signal, callbacks) =>
    syncBasicReleases(username, signal, callbacks),
  );
}

/**
 * Run an incremental sync: fetch only new releases since last full sync,
 * then run bounded detail sync.
 */
export async function runIncrementalSync(username: string) {
  const { lastFullSyncAt } = useSyncStore.getState();
  if (!lastFullSyncAt) return;

  return runSyncPipeline(username, (signal, callbacks) =>
    syncBasicReleasesIncremental(username, lastFullSyncAt, signal, callbacks),
  );
}

export interface DetailSyncLoopCallbacks {
  onProgress?: (current: number, total: number) => void;
  onFailed?: (count: number) => void;
  onBatchComplete?: () => void;
}

/**
 * Run detail sync in batches of 10 until all releases are synced.
 * Relies on the rate limiter for pacing. Stops on abort or when
 * there is nothing left to sync.
 */
export async function runDetailSyncLoop(
  signal?: AbortSignal,
  callbacks?: DetailSyncLoopCallbacks,
) {
  const { total, synced } = getDetailSyncCounts();
  const totalToSync = total - synced;

  let totalProcessed = 0;
  let totalFailed = 0;
  while (true) {
    if (signal?.aborted) break;
    try {
      const { processed, failed } = await syncReleaseDetails(10, signal);
      totalProcessed += processed;
      totalFailed += failed;
      if (failed > 0) callbacks?.onFailed?.(totalFailed);
      if (totalToSync > 0) {
        callbacks?.onProgress?.(totalProcessed, totalToSync);
      }
      callbacks?.onBatchComplete?.();
      if (processed === 0 && failed === 0) break;
    } catch (err) {
      if (signal?.aborted) break;
      console.warn("Detail sync loop stopped:", err);
      break;
    }
  }
  if (totalProcessed > 0) {
    queryClient.invalidateQueries({ queryKey: ["releases"] });
  }
}

/**
 * Run multiple batches of detail sync (for background task usage).
 * Processes up to maxReleases before stopping, relying on the rate
 * limiter for pacing.
 */
export async function runDetailSyncBatch(maxReleases: number = 500) {
  const batchSize = 10;
  let totalProcessed = 0;
  try {
    while (totalProcessed < maxReleases) {
      const { processed, failed } = await syncReleaseDetails(batchSize);
      totalProcessed += processed;
      if (processed === 0 && failed === 0) break;
    }
    if (totalProcessed > 0) {
      queryClient.invalidateQueries({ queryKey: ["releases"] });
    }
  } catch (err) {
    console.warn("Background detail sync batch failed:", err);
  }
}
