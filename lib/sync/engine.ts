import { syncFolders } from "./folder-sync";
import { syncBasicReleases, syncReleaseDetails } from "./release-sync";
import { useSyncStore } from "@/stores/sync-store";
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

  try {
    await syncFolders(username, signal);
    queryClient.invalidateQueries({ queryKey: ["folders"] });

    if (signal.aborted) return;

    await syncBasicReleases(username, signal);
    queryClient.invalidateQueries({ queryKey: ["releases"] });

    if (signal.aborted) return;

    store.setLastFullSyncAt(new Date().toISOString());
    store.setSyncing(false);
    store.setPhase("idle");

    // Detail sync continues silently in the background
    await runDetailSyncLoop(signal);
  } catch (err) {
    if (signal.aborted) return;
    store.setError(err instanceof Error ? err.message : "Sync failed");
    store.setSyncing(false);
  }
}

/**
 * Run detail sync in batches of 10, with a 12s pause between batches
 * to stay within rate limits.
 */
export async function runDetailSyncLoop(signal?: AbortSignal) {
  while (true) {
    if (signal?.aborted) break;
    try {
      const processed = await syncReleaseDetails(10, signal);
      queryClient.invalidateQueries({ queryKey: ["releases"] });

      if (processed === 0) break;

      // Pause between batches to respect rate limits
      await new Promise((r) => setTimeout(r, 12000));
    } catch (err) {
      if (signal?.aborted) break;
      console.warn("Detail sync loop stopped:", err);
      break;
    }
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
