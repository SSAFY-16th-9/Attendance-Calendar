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
