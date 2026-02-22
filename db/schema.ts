import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const folders = sqliteTable("folders", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  count: integer("count").notNull().default(0),
});

export const releases = sqliteTable("releases", {
  instanceId: integer("instance_id").primaryKey(),
  releaseId: integer("release_id").notNull(),
  folderId: integer("folder_id").notNull(),
  title: text("title").notNull(),
  year: integer("year"),
  artists: text("artists", { mode: "json" }).$type<
    { name: string; id: number }[]
  >(),
  labels: text("labels", { mode: "json" }).$type<
    { name: string; catno: string }[]
  >(),
  formats: text("formats", { mode: "json" }).$type<
    { name: string; qty: string; descriptions?: string[] }[]
  >(),
  genres: text("genres", { mode: "json" }).$type<string[]>(),
  styles: text("styles", { mode: "json" }).$type<string[]>(),
  thumbUrl: text("thumb_url"),
  coverUrl: text("cover_url"),
  dateAdded: text("date_added"),
  tracklist: text("tracklist", { mode: "json" }).$type<
    { position: string; title: string; duration: string }[]
  >(),
  images: text("images", { mode: "json" }).$type<
    { type: string; uri: string; width: number; height: number }[]
  >(),
  communityRating: real("community_rating"),
  communityHave: integer("community_have"),
  communityWant: integer("community_want"),
  videos: text("videos", { mode: "json" }).$type<
    { uri: string; title: string; duration: number }[]
  >(),
  detailSyncedAt: text("detail_synced_at"),
  basicSyncedAt: text("basic_synced_at"),
});