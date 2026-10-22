import { and, inArray, isNull, or, eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { attendance, fines } from "@/db/schema";
import { nameAliases } from "./attendance";
import { FINE_AMOUNT } from "./fines";

// Shared attendance queries for the member, admin and incident APIs.
type Db = ReturnType<typeof getDb>;

// A member's records: rows they own, plus older rows of their class saved before owner_id existed (matched by name).
export const ownedBy = (memberId: string, name: string, cohort: string) => or(eq(attendance.ownerId, memberId), and(isNull(attendance.ownerId), eq(attendance.cohort, cohort), inArray(attendance.name, nameAliases(name))));

// Dates among `dates` where this person already has a record in their class (one record per person per day).
export async function takenDates(db: Db, dates: string[], name: string, cohort: string) {
  const rows = await db.select({ date: attendance.date }).from(attendance).where(and(eq(attendance.cohort, cohort), inArray(attendance.date, dates), inArray(attendance.name, nameAliases(name))));
  return [...new Set(rows.map(row => row.date))].sort();
}

// Automatic 무단 fine for a late self-registration: 5,000원 unpaid, skipped if the record already has one.
// A query builder (not raw SQL) so it can run in the same batch as the attendance write.
export const autoFine = (db: Db, record: { id: string; date: string; name: string; type: string; cohort: string }, now: string) =>
  db.insert(fines).values({ id: crypto.randomUUID(), attendanceId: record.id, date: record.date, name: record.name, type: record.type, cohort: record.cohort, amount: FINE_AMOUNT, status: "unpaid", createdAt: now, updatedAt: now, revision: 0 }).onConflictDoNothing({ target: fines.attendanceId });

// Drizzle wraps D1 errors, so look through the cause chain for the UNIQUE failure.
export const isUniqueConflict = (error: unknown): boolean => !!error && (/unique constraint/i.test(String(error)) || isUniqueConflict((error as { cause?: unknown }).cause));
