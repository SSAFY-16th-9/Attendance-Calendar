import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { attendance, fines, members } from "@/db/schema";
import { privateJson, requireAdmin } from "@/lib/admin-auth";
import { DAILY_LIMIT_MESSAGE, takenDatesMessage, validateEntries, nameAliases, validateEntry } from "@/lib/attendance";
import { FINE_AMOUNT, isFineType } from "@/lib/fines";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  let input: Record<string, unknown> | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "무단 기록을 확인해 주세요." }, 400); }
  if (!input || typeof input.memberId !== "string" || typeof input.id !== "string" || !/^[0-9a-f-]{36}$/.test(input.id) || input.unnotified !== true || typeof input.type !== "string" || !isFineType(input.type)) return privateJson({ error: "회원과 출결 사유를 선택하고 사전 공유 없음을 확인해 주세요." }, 400);
  try {
    const db = getDb();
    const [member] = await db.select({ id: members.id, name: members.name }).from(members).where(eq(members.id, input.memberId)).limit(1);
    if (!member) return privateJson({ error: "등록된 회원을 선택해 주세요." }, 400);
    const valid = validateEntries(input, member.name);
    if (typeof valid === "string") return privateJson({ error: valid }, 400);
    const taken = await db.select({ date: attendance.date }).from(attendance).where(and(inArray(attendance.date, valid.map(entry => entry.date)), inArray(attendance.name, nameAliases(member.name))));
    if (taken.length) return privateJson({ error: takenDatesMessage([...new Set(taken.map(row => row.date))].sort()) }, 409);
    const now = new Date().toISOString(); const firstId = input.id as string;
    // Each date gets its own 무단 record and fine; the first keeps the client id so a retry stays a duplicate.
    const records = valid.map((entry, index) => ({ ...entry, pending: 0, id: index === 0 ? firstId : crypto.randomUUID(), ownerId: member.id, adminRecord: 1, createdAt: now }));
    const fineRows = records.map(record => ({ id: crypto.randomUUID(), attendanceId: record.id, date: record.date, name: member.name, type: record.type, amount: FINE_AMOUNT, status: "unpaid" as const, createdAt: now, updatedAt: now, revision: 0 }));
    await db.batch([db.insert(attendance).values(records), db.insert(fines).values(fineRows)]);
    const entries = records.map((record, index) => ({ ...record, unnotified: true, fineId: fineRows[index].id, fineStatus: "unpaid" }));
    return privateJson({ created: true, entry: entries[0], entries }, 201);
  } catch (error) {
    if (/unique constraint/i.test(String(error))) return privateJson({ error: "이미 등록되었거나 같은 출결이 있어요. 목록을 확인해 주세요." }, 409);
    console.error("Admin incident failed", error); return privateJson({ error: "무단 기록을 추가하지 못했어요. 출결과 벌금은 함께 저장되거나 함께 취소됩니다." }, 503);
  }
}
