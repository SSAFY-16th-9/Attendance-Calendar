CREATE TABLE `cohorts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_current` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `cohorts` (`id`, `name`, `is_current`, `created_at`) VALUES ('16-9', '16기 9반', 1, '2026-10-22T00:00:00.000Z');--> statement-breakpoint
ALTER TABLE `members` ADD `cohort` text DEFAULT '16-9' NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance` ADD `cohort` text DEFAULT '16-9' NOT NULL;--> statement-breakpoint
ALTER TABLE `fines` ADD `cohort` text DEFAULT '16-9' NOT NULL;--> statement-breakpoint
DROP INDEX `members_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `members_cohort_name_unique` ON `members` (`cohort`,`name`);--> statement-breakpoint
DROP INDEX `attendance_date_name_type_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_cohort_date_name_type_unique` ON `attendance` (`cohort`,`date`,`name`,`type`);
