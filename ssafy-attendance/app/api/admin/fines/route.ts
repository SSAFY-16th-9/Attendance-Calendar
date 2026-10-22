import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { attendance, fines } from "@/db/schema";
import { PENDING_FINE_MESSAGE } from "@/lib/attendance";
import { privateJson, requireAdmin } from "@/lib/admin-auth";
import { FINE_AMOUNT, validateFineStatus } from "@/lib/fines";
import { workingCohort } from "@/lib/cohort";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let input: { attendanceId?: unknown; unnotified?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "부과할 출결을 확인해 주세요." }, 400); }
  if (typeof input?.attendanceId !== "string" || !/^[0-9a-f-]{36}$/.test(input.attendanceId)) return privateJson({ error: "부과할 출결을 확인해 주세요." }, 400);
  if (input.unnotified !== true) return privateJson({ error: "사전 공유가 없었던 출결인지 확인해 주세요. 미리 알린 출결에는 부과하지 않습니다." }, 400);
  try {
    const db = getDb(); const cohort = await workingCohort(request);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    // Conditional insert rechecks eligibility and snapshots the attendance in one statement.
    const [target] = await db.select({ pending: attendance.pending }).from(attendance).where(and(eq(attendance.id, input.attendanceId), eq(attendance.cohort, cohort))).limit(1);
    if (target?.pending) return privateJson({ error: PENDING_FINE_MESSAGE }, 409);
    const inserted = await db.run(sql`INSERT INTO fines (id, attendance_id, date, name, type, cohort, amount, status, paid_at, created_at, updated_at, revision)
      SELECT ${id}, id, date, name, type, cohort, ${FINE_AMOUNT}, 'unpaid', NULL, ${now}, ${now}, 0 FROM attendance
      WHERE id = ${input.attendanceId} AND cohort = ${cohort} AND pending = 0
      ON CONFLICT(attendance_id) DO NOTHING`);
    if (!inserted.meta.changes) return privateJson({ error: "이미 부과했거나 출결이 변경·삭제되었어요. 목록을 새로고침해 주세요." }, 409);
    return privateJson({ created: true }, 201);
  } catch (error) { console.error("Fine assessment failed", error); return privateJson({ error: "벌금을 부과하지 못했어요. 다시 시도해 주세요." }, 503); }
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let input: unknown;
  try { input = await request.json(); } catch { return privateJson({ error: "변경할 내용을 확인해 주세요." }, 400); }
  const valid = validateFineStatus(input);
  if (typeof valid === "string") return privateJson({ error: valid }, 400);
  try {
    const now = new Date().toISOString();
    const rows = await getDb().update(fines).set({ status: valid.status, paidAt: valid.status === "paid" ? now : null, updatedAt: now, revision: sql`${fines.revision} + 1` }).where(and(eq(fines.id, valid.id), eq(fines.cohort, await workingCohort(request)), eq(fines.revision, valid.revision))).returning({ id: fines.id });
    if (!rows.length) return privateJson({ error: "다른 관리 작업으로 내역이 바뀌었어요. 새로고침 후 다시 확인해 주세요." }, 409);
    return privateJson({ updated: true });
  } catch (error) { console.error("Fine status update failed", error); return privateJson({ error: "납부 상태를 변경하지 못했어요." }, 503); }
}
