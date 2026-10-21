import { and, inArray, isNull, or, eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { attendance } from "@/db/schema";
import { nameAliases } from "./attendance";

// Shared attendance queries for the member, admin and incident APIs.
type Db = ReturnType<typeof getDb>;

// A member's records: rows they own, plus older rows saved before owner_id existed (matched by name).
export const ownedBy = (memberId: string, name: string) => or(eq(attendance.ownerId, memberId), and(isNull(attendance.ownerId), inArray(attendance.name, nameAliases(name))));

// Dates among `dates` where this person already has a record (one record per person per day).
export async function takenDates(db: Db, dates: string[], name: string) {
  const rows = await db.select({ date: attendance.date }).from(attendance).where(and(inArray(attendance.date, dates), inArray(attendance.name, nameAliases(name))));
  return [...new Set(rows.map(row => row.date))].sort();
}

// Drizzle wraps D1 errors, so look through the cause chain for the UNIQUE failure.
export const isUniqueConflict = (error: unknown): boolean => !!error && (/unique constraint/i.test(String(error)) || isUniqueConflict((error as { cause?: unknown }).cause));
