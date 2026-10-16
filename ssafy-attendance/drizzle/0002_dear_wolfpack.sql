CREATE TABLE `fines` (
	`id` text PRIMARY KEY NOT NULL,
	`attendance_id` text NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'unpaid' NOT NULL,
	`paid_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fines_attendance_unique` ON `fines` (`attendance_id`);