import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { attendance, fines } from "@/db/schema";
import { privateJson, requireAdmin } from "@/lib/admin-auth";
import { canonicalName } from "@/lib/attendance";
import { FINE_AMOUNT, FINE_TYPES, validateFineStatus } from "@/lib/fines";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const page = Number(new URL(request.url).searchParams.get("page") || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) return privateJson({ error: "페이지를 확인해 주세요." }, 400);
  try {
    const db = getDb();
    const where = and(inArray(attendance.type, [...FINE_TYPES]), isNull(fines.id));
    const [entries, totals] = await Promise.all([
      db.select({ id: attendance.id, date: attendance.date, name: attendance.name, type: attendance.type }).from(attendance).leftJoin(fines, eq(attendance.id, fines.attendanceId)).where(where).orderBy(sql`${attendance.date} desc`, attendance.name).limit(50).offset((page - 1) * 50),
      db.select({ total: sql<number>`count(*)` }).from(attendance).leftJoin(fines, eq(attendance.id, fines.attendanceId)).where(where),
    ]);
    return privateJson({ entries: entries.map(entry => ({ ...entry, name: canonicalName(entry.name) })), total: totals[0].total, page, pageSize: 50 });
  } catch (error) { console.error("Fine candidates failed", error); return privateJson({ error: "부과 대상을 불러오지 못했어요. 벌금 테이블 설정을 확인해 주세요." }, 503); }
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let input: { attendanceId?: unknown; unnotified?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "부과할 출결을 확인해 주세요." }, 400); }
  if (typeof input?.attendanceId !== "string" || !/^[0-9a-f-]{36}$/.test(input.attendanceId)) return privateJson({ error: "부과할 출결을 확인해 주세요." }, 400);
  if (input.unnotified !== true) return privateJson({ error: "사전 공유가 없었던 출결인지 확인해 주세요. 미리 알린 출결에는 부과하지 않습니다." }, 400);
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    // Conditional insert rechecks eligibility and snapshots the attendance in one statement.
    const inserted = await db.run(sql`INSERT INTO fines (id, attendance_id, date, name, type, amount, status, paid_at, created_at, updated_at, revision)
      SELECT ${id}, id, date, name, type, ${FINE_AMOUNT}, 'unpaid', NULL, ${now}, ${now}, 0 FROM attendance
      WHERE id = ${input.attendanceId} AND type IN (${FINE_TYPES[0]}, ${FINE_TYPES[1]})
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
    const rows = await getDb().update(fines).set({ status: valid.status, paidAt: valid.status === "paid" ? now : null, updatedAt: now, revision: sql`${fines.revision} + 1` }).where(and(eq(fines.id, valid.id), eq(fines.revision, valid.revision))).returning({ id: fines.id });
    if (!rows.length) return privateJson({ error: "다른 관리 작업으로 내역이 바뀌었어요. 새로고침 후 다시 확인해 주세요." }, 409);
    return privateJson({ updated: true });
  } catch (error) { console.error("Fine status update failed", error); return privateJson({ error: "납부 상태를 변경하지 못했어요." }, 503); }
}
