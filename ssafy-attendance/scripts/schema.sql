-- 출결 모아 운영 DB 최종 구조 (drizzle 0000 ~ 0006 적용 결과와 같음)
-- 새 D1에서 한 번 실행합니다. 첫 기수(16기 9반)가 함께 만들어지고, 회원은 관리자 화면의 '명단 붙여넣기'로 넣습니다.
-- IF NOT EXISTS라 이미 있는 표·인덱스는 건너뜁니다(기존 데이터는 바뀌지 않음).

CREATE TABLE IF NOT EXISTS `cohorts` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `is_current` integer DEFAULT 0 NOT NULL,
  `created_at` text NOT NULL
);
INSERT INTO `cohorts` (`id`, `name`, `is_current`, `created_at`) VALUES ('16-9', '16기 9반', 1, '2026-10-22T00:00:00.000Z') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS `attendance` (
  `id` text PRIMARY KEY NOT NULL,
  `date` text NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `reason` text DEFAULT '' NOT NULL,
  `created_at` text NOT NULL,
  `owner_id` text,
  `admin_record` integer DEFAULT 0 NOT NULL,
  `pending` integer DEFAULT 0 NOT NULL,
  `cohort` text DEFAULT '16-9' NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `attendance_cohort_date_name_type_unique` ON `attendance` (`cohort`, `date`, `name`, `type`);

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
  `revision` integer DEFAULT 0 NOT NULL,
  `cohort` text DEFAULT '16-9' NOT NULL
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
  `updated_at` text NOT NULL,
  `cohort` text DEFAULT '16-9' NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `members_username_unique` ON `members` (`username`);
CREATE UNIQUE INDEX IF NOT EXISTS `members_cohort_name_unique` ON `members` (`cohort`, `name`);

CREATE TABLE IF NOT EXISTS `admin_login_attempts` (
  `key` text PRIMARY KEY NOT NULL,
  `attempts` integer NOT NULL,
  `window_start` integer NOT NULL
);
