import { db, expo } from "@/db/client";
import { folders } from "@/db/schema";
import { fetchFolders } from "@/lib/discogs/endpoints";
import type { SyncPhase } from "@/stores/sync-store";

export interface FolderSyncCallbacks {
  setPhase: (phase: SyncPhase) => void;
}

/**
 * Fetch all folders from Discogs and upsert into SQLite.
 */
export async function syncFolders(
  username: string,
  signal?: AbortSignal,
  callbacks?: FolderSyncCallbacks,
) {
  callbacks?.setPhase("folders");

  const response = await fetchFolders(username, signal);

  expo.withTransactionSync(() => {
    for (const folder of response.folders) {
      db.insert(folders)
        .values({ id: folder.id, name: folder.name, count: folder.count })
        .onConflictDoUpdate({
          target: folders.id,
          set: { name: folder.name, count: folder.count },
        })
        .run();
    }
  });
}
