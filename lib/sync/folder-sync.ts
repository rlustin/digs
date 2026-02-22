import { db, expo } from "@/db/client";
import { folders } from "@/db/schema";
import { fetchFolders } from "@/lib/discogs/endpoints";
import { useSyncStore } from "@/stores/sync-store";

/**
 * Fetch all folders from Discogs and upsert into SQLite.
 */
export async function syncFolders(username: string, signal?: AbortSignal) {
  const store = useSyncStore.getState();
  store.setPhase("folders");

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
