import { db } from "../client";
import { folders } from "../schema";

export function getAllFolders() {
  return db.select().from(folders).all();
}
