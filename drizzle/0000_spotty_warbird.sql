CREATE TABLE `folders` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `releases` (
	`instance_id` integer PRIMARY KEY NOT NULL,
	`release_id` integer NOT NULL,
	`folder_id` integer NOT NULL,
	`title` text NOT NULL,
	`year` integer,
	`artists` text,
	`labels` text,
	`formats` text,
	`genres` text,
	`styles` text,
	`thumb_url` text,
	`cover_url` text,
	`date_added` text,
	`tracklist` text,
	`images` text,
	`community_rating` real,
	`community_have` integer,
	`community_want` integer,
	`videos` text,
	`detail_synced_at` text,
	`basic_synced_at` text
);
--> statement-breakpoint
CREATE TABLE `sync_status` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sync_type` text NOT NULL,
	`last_synced_at` text,
	`status` text DEFAULT 'idle' NOT NULL
);
