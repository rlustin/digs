import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useSyncStore } from "@/stores/sync-store";
import { runFullSync, runIncrementalSync } from "@/lib/sync/engine";
import { registerBackgroundSync } from "@/lib/sync/background-task";

/**
 * Hook to trigger sync on first mount after authentication.
 * - First launch: runs full sync (folders + basic + detail)
 * - Subsequent: runs incremental sync
 * Always registers the background task for ongoing detail sync.
 */
export function useInitialSync() {
  const username = useAuthStore((s) => s.username);
  const lastFullSyncAt = useSyncStore((s) => s.lastFullSyncAt);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const started = useRef(false);

  useEffect(() => {
    if (!username || started.current) return;
    started.current = true;

    if (!lastFullSyncAt) {
      runFullSync(username);
    } else {
      runIncrementalSync(username);
    }
    registerBackgroundSync();
  }, [username, lastFullSyncAt]);

  return { isSyncing };
}
