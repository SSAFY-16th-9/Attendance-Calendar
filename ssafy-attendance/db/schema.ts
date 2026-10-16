import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const attendance = sqliteTable("attendance", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  reason: text("reason").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("attendance_date_name_type_unique").on(table.date, table.name, table.type)]);

export const adminLoginAttempts = sqliteTable("admin_login_attempts", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull(),
  windowStart: integer("window_start").notNull(),
});

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
}, table => [uniqueIndex("fines_attendance_unique").on(table.attendanceId)]);
