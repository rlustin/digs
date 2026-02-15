import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useSyncStore } from "@/stores/sync-store";
import { runFullSync } from "@/lib/sync/engine";
import { registerBackgroundSync } from "@/lib/sync/background-task";

/**
 * Hook to trigger sync on first mount after authentication.
 * - First launch: runs full sync (folders + basic + detail)
 * - Subsequent: registers background task for detail sync
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
      // First sync ever
      runFullSync(username);
    } else {
      // Already synced before — just register background task
      registerBackgroundSync();
    }
  }, [username, lastFullSyncAt]);

  return { isSyncing };
}
