import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { fines } from "@/db/schema";

// Keep a fine's date, name and type in step with its attendance record after an edit.
// Runs in the same batch as the attendance update, so it copies whatever was saved.
export const syncFineWithAttendance = (db: ReturnType<typeof getDb>, attendanceId: string) =>
  db.update(fines).set({
    date: sql`(SELECT date FROM attendance WHERE id = ${attendanceId})`,
    name: sql`(SELECT name FROM attendance WHERE id = ${attendanceId})`,
    type: sql`(SELECT type FROM attendance WHERE id = ${attendanceId})`,
  }).where(sql`${eq(fines.attendanceId, attendanceId)} AND EXISTS (SELECT 1 FROM attendance WHERE id = ${attendanceId})`);
