import { eq } from "drizzle-orm";
import { db, expo } from "../client";
import { folders } from "../schema";

export function getAllFolders() {
  return db.select().from(folders).all();
}

export function getFolderById(folderId: number) {
  return db.select().from(folders).where(eq(folders.id, folderId)).get() ?? null;
}

export function getFolderThumbnails(): Record<number, string[]> {
  const rows = expo.getAllSync<{ folder_id: number; thumb_url: string }>(
    `SELECT folder_id, thumb_url FROM (
      SELECT folder_id, thumb_url,
        ROW_NUMBER() OVER (PARTITION BY folder_id ORDER BY instance_id) as rn
      FROM releases
      WHERE thumb_url IS NOT NULL
    ) WHERE rn <= 4`
  );

  const result: Record<number, string[]> = {};
  for (const row of rows) {
    if (!result[row.folder_id]) result[row.folder_id] = [];
    result[row.folder_id].push(row.thumb_url);
  }
  return result;
}
