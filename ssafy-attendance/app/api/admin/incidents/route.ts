import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { attendance, fines, members } from "@/db/schema";
import { privateJson, requireAdmin } from "@/lib/admin-auth";
import { nameAliases, validateEntry } from "@/lib/attendance";
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
    const valid = validateEntry({ ...input, name: member.name });
    if (typeof valid === "string") return privateJson({ error: valid }, 400);
    const duplicate = await db.select({ id: attendance.id }).from(attendance).where(and(eq(attendance.date, valid.date), inArray(attendance.name, nameAliases(member.name)), eq(attendance.type, valid.type))).limit(1);
    if (duplicate.length) return privateJson({ error: "같은 출결이 이미 등록되어 있어요. 기존 출결의 상세에서 벌금을 부과해 주세요." }, 409);
    const now = new Date().toISOString(); const fineId = crypto.randomUUID();
    const entry = { ...valid, id: input.id, ownerId: member.id, adminRecord: 1, createdAt: now };
    await db.batch([
      db.insert(attendance).values(entry),
      db.insert(fines).values({ id: fineId, attendanceId: input.id, date: valid.date, name: member.name, type: valid.type, amount: FINE_AMOUNT, status: "unpaid", createdAt: now, updatedAt: now, revision: 0 }),
    ]);
    return privateJson({ created: true, entry: { ...entry, unnotified: true, fineId, fineStatus: "unpaid" } }, 201);
  } catch (error) {
    if (/unique constraint/i.test(String(error))) return privateJson({ error: "이미 등록되었거나 같은 출결이 있어요. 목록을 확인해 주세요." }, 409);
    console.error("Admin incident failed", error); return privateJson({ error: "무단 기록을 추가하지 못했어요. 출결과 벌금은 함께 저장되거나 함께 취소됩니다." }, 503);
  }
}
