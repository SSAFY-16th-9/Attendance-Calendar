-- 출결 모아 운영 DB 최종 구조 (drizzle 0000 ~ 0005 적용 결과와 같음)
-- 새 D1에서 한 번 실행한 뒤, 계정은 scripts/seed-members.sql로 넣습니다.
-- IF NOT EXISTS라 이미 있는 표·인덱스는 건너뜁니다(기존 데이터는 바뀌지 않음).

CREATE TABLE IF NOT EXISTS `attendance` (
  `id` text PRIMARY KEY NOT NULL,
  `date` text NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `reason` text DEFAULT '' NOT NULL,
  `created_at` text NOT NULL,
  `owner_id` text,
  `admin_record` integer DEFAULT 0 NOT NULL,
  `pending` integer DEFAULT 0 NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `attendance_date_name_type_unique` ON `attendance` (`date`, `name`, `type`);

CREATE TABLE IF NOT EXISTS `fines` (
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
CREATE UNIQUE INDEX IF NOT EXISTS `fines_attendance_unique` ON `fines` (`attendance_id`);

CREATE TABLE IF NOT EXISTS `members` (
  `id` text PRIMARY KEY NOT NULL,
  `username` text NOT NULL,
  `name` text NOT NULL,
  `password_hash` text NOT NULL,
  `password_salt` text NOT NULL,
  `active` integer DEFAULT 1 NOT NULL,
  `must_change_password` integer DEFAULT 1 NOT NULL,
  `session_version` integer DEFAULT 0 NOT NULL,
  `is_admin` integer DEFAULT 0 NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `members_username_unique` ON `members` (`username`);
CREATE UNIQUE INDEX IF NOT EXISTS `members_name_unique` ON `members` (`name`);

CREATE TABLE IF NOT EXISTS `admin_login_attempts` (
  `key` text PRIMARY KEY NOT NULL,
  `attempts` integer NOT NULL,
  `window_start` integer NOT NULL
);
