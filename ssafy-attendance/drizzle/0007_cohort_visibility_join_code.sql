ALTER TABLE `cohorts` ADD `visibility` text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE `cohorts` ADD `join_code` text;--> statement-breakpoint
ALTER TABLE `cohorts` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `cohorts` DROP COLUMN `is_current`;--> statement-breakpoint
CREATE UNIQUE INDEX `cohorts_join_code_unique` ON `cohorts` (`join_code`);
