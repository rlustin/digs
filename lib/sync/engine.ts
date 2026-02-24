import { syncFolders } from "./folder-sync";
import {
  syncBasicReleases,
  syncBasicReleasesIncremental,
  syncReleaseDetails,
} from "./release-sync";
import { useSyncStore } from "@/stores/sync-store";
import { useAuthStore } from "@/stores/auth-store";
import { AuthExpiredError } from "@/lib/discogs/errors";
import { logout } from "@/lib/discogs/oauth";
import { queryClient } from "@/lib/query-client";
import type { ReleaseSyncCallbacks } from "./release-sync";

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

  const callbacks: ReleaseSyncCallbacks = {
    setPhase: store.setPhase,
    setProgress: store.setProgress,
  };

  try {
    await syncFolders(username, signal, callbacks);
    queryClient.invalidateQueries({ queryKey: ["folders"] });

    if (signal.aborted) return;

    await syncReleasesStep(signal, callbacks);
    queryClient.invalidateQueries({ queryKey: ["releases"] });

    if (signal.aborted) return;

    store.setLastFullSyncAt(new Date().toISOString());

    store.setPhase("details");
    await runDetailSyncLoop(signal);

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

/**
 * Run detail sync in batches of 10 until all releases are synced.
 * Relies on the rate limiter for pacing. Stops on abort or when
 * there is nothing left to sync.
 */
export async function runDetailSyncLoop(signal?: AbortSignal) {
  const store = useSyncStore.getState();
  let totalProcessed = 0;
  let totalFailed = 0;
  while (true) {
    if (signal?.aborted) break;
    try {
      const { processed, failed } = await syncReleaseDetails(10, signal);
      totalProcessed += processed;
      totalFailed += failed;
      if (failed > 0) store.setDetailSyncFailed(totalFailed);
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
