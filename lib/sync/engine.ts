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
  store.setSyncing(true);

  try {
    await syncFolders(username);
    queryClient.invalidateQueries({ queryKey: ["folders"] });

    await syncBasicReleases(username);
    queryClient.invalidateQueries({ queryKey: ["releases"] });

    // Start detail sync in batches
    await runDetailSyncLoop();

    store.setLastFullSyncAt(new Date().toISOString());
  } catch (err) {
    store.setError(err instanceof Error ? err.message : "Sync failed");
  } finally {
    store.setSyncing(false);
    store.setPhase("idle");
  }
}

/**
 * Run detail sync in batches of 10, with a 12s pause between batches
 * to stay within rate limits.
 */
export async function runDetailSyncLoop() {
  const store = useSyncStore.getState();

  while (true) {
    const processed = await syncReleaseDetails(10);
    queryClient.invalidateQueries({ queryKey: ["releases"] });

    if (processed === 0) break;

    // Pause between batches to respect rate limits
    await new Promise((r) => setTimeout(r, 12000));

    // Stop if sync was cancelled
    if (!useSyncStore.getState().isSyncing) break;
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
