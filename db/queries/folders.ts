import { eq } from "drizzle-orm";
import { db } from "../client";
import { folders } from "../schema";

export function getAllFolders() {
  return db.select().from(folders).all();
}

export function getFolderById(folderId: number) {
  return db.select().from(folders).where(eq(folders.id, folderId)).get() ?? null;
}
