import { syncFolders } from "./folder-sync";
import {
  syncBasicReleases,
  syncBasicReleasesIncremental,
  syncReleaseDetails,
} from "./release-sync";
import { useSyncStore } from "@/stores/sync-store";
import { useAuthStore } from "@/stores/auth-store";
import { AuthExpiredError } from "@/lib/discogs/errors";
import { queryClient } from "@/lib/query-client";

/**
 * Run the full sync pipeline:
 * 1. Sync folders
 * 2. Sync basic release info (paginated)
 * 3. Start progressive detail sync
 */
export async function runFullSync(username: string) {
  const store = useSyncStore.getState();

  if (store.isSyncing) return;
  const controller = store.startSync();
  const signal = controller.signal;

  const callbacks = {
    setPhase: store.setPhase,
    setProgress: store.setProgress,
  };

  try {
    await syncFolders(username, signal, callbacks);
    queryClient.invalidateQueries({ queryKey: ["folders"] });

    if (signal.aborted) return;

    await syncBasicReleases(username, signal, callbacks);
    queryClient.invalidateQueries({ queryKey: ["releases"] });

    if (signal.aborted) return;

    store.setLastFullSyncAt(new Date().toISOString());

    // Detail sync continues while isSyncing remains true
    store.setPhase("details");
    await runDetailSyncLoop(signal);

    store.finishSync();
  } catch (err) {
    if (signal.aborted) return;
    if (err instanceof AuthExpiredError) {
      useAuthStore.getState().clearAuth();
      store.finishSync();
      return;
    }
    store.setError(err instanceof Error ? err.message : "Sync failed");
  }
}

/**
 * Run an incremental sync: fetch only new releases since last full sync,
 * then run bounded detail sync.
 */
export async function runIncrementalSync(username: string) {
  const store = useSyncStore.getState();

  if (store.isSyncing) return;
  if (!store.lastFullSyncAt) return;

  const controller = store.startSync();
  const signal = controller.signal;

  const callbacks = {
    setPhase: store.setPhase,
    setProgress: store.setProgress,
  };

  try {
    await syncFolders(username, signal, callbacks);
    queryClient.invalidateQueries({ queryKey: ["folders"] });

    if (signal.aborted) return;

    await syncBasicReleasesIncremental(
      username,
      store.lastFullSyncAt,
      signal,
      callbacks,
    );
    queryClient.invalidateQueries({ queryKey: ["releases"] });

    if (signal.aborted) return;

    store.setLastFullSyncAt(new Date().toISOString());

    // Detail sync continues while isSyncing remains true
    store.setPhase("details");
    await runDetailSyncLoop(signal);

    store.finishSync();
  } catch (err) {
    if (signal.aborted) return;
    if (err instanceof AuthExpiredError) {
      useAuthStore.getState().clearAuth();
      store.finishSync();
      return;
    }
    store.setError(err instanceof Error ? err.message : "Sync failed");
  }
}

/**
 * Run detail sync in batches of 10, with a 12s pause between batches
 * to stay within rate limits. Stops after maxBatches foreground batches.
 */
export async function runDetailSyncLoop(
  signal?: AbortSignal,
  maxBatches: number = 5,
) {
  let totalProcessed = 0;
  for (let i = 0; i < maxBatches; i++) {
    if (signal?.aborted) break;
    try {
      const processed = await syncReleaseDetails(10, signal);
      totalProcessed += processed;
      if (processed === 0) break;

      if (i < maxBatches - 1) {
        // Pause between batches to respect rate limits
        await new Promise((r) => setTimeout(r, 12000));
      }
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
 * Run a single batch of detail sync (for background task usage).
 */
export async function runDetailSyncBatch(batchSize: number = 10) {
  try {
    await syncReleaseDetails(batchSize);
    queryClient.invalidateQueries({ queryKey: ["releases"] });
  } catch (err) {
    console.warn("Background detail sync batch failed:", err);
  }
}
