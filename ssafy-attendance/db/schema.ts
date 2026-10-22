import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Rows saved before cohorts existed belong to the first class.
export const DEFAULT_COHORT = "16-9";

// A class (기수·반). Members, attendance and fines each carry one; is_current marks the class the public calendar shows.
export const cohorts = sqliteTable("cohorts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  isCurrent: integer("is_current").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const attendance = sqliteTable("attendance", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  reason: text("reason").notNull().default(""),
  createdAt: text("created_at").notNull(),
  ownerId: text("owner_id"),
  adminRecord: integer("admin_record").notNull().default(0),
  pending: integer("pending").notNull().default(0),
  cohort: text("cohort").notNull().default(DEFAULT_COHORT),
}, (table) => [uniqueIndex("attendance_cohort_date_name_type_unique").on(table.cohort, table.date, table.name, table.type)]);

export const adminLoginAttempts = sqliteTable("admin_login_attempts", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull(),
  windowStart: integer("window_start").notNull(),
});

// Usernames are unique across every class (they log in with them); names only within a class.
export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  active: integer("active").notNull().default(1),
  mustChangePassword: integer("must_change_password").notNull().default(1),
  sessionVersion: integer("session_version").notNull().default(0),
  // Sub-admin: a member the core admin account granted admin rights to.
  isAdmin: integer("is_admin").notNull().default(0),
  cohort: text("cohort").notNull().default(DEFAULT_COHORT),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, table => [uniqueIndex("members_cohort_name_unique").on(table.cohort, table.name)]);

// Snapshot records preserve the ledger when an attendance entry is edited or deleted.
export const fines = sqliteTable("fines", {
  id: text("id").primaryKey(),
  attendanceId: text("attendance_id").notNull(),
  date: text("date").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("unpaid"),
  paidAt: text("paid_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  revision: integer("revision").notNull().default(0),
  cohort: text("cohort").notNull().default(DEFAULT_COHORT),
}, table => [uniqueIndex("fines_attendance_unique").on(table.attendanceId)]);
