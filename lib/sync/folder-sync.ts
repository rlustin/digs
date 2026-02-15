import { eq } from "drizzle-orm";
import { db, expo } from "@/db/client";
import { folders } from "@/db/schema";
import { fetchFolders } from "@/lib/discogs/endpoints";
import { useSyncStore } from "@/stores/sync-store";

/**
 * Fetch all folders from Discogs and upsert into SQLite.
 */
export async function syncFolders(username: string) {
  const store = useSyncStore.getState();
  store.setPhase("folders");

  const response = await fetchFolders(username);

  expo.withTransactionSync(() => {
    for (const folder of response.folders) {
      const existing = db
        .select()
        .from(folders)
        .where(eq(folders.id, folder.id))
        .get();

      if (existing) {
        db.update(folders)
          .set({ name: folder.name, count: folder.count })
          .where(eq(folders.id, folder.id))
          .run();
      } else {
        db.insert(folders)
          .values({ id: folder.id, name: folder.name, count: folder.count })
          .run();
      }
    }
  });
}
