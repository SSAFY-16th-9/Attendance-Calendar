import { and, eq, inArray, like, isNull, ne, or } from "drizzle-orm";
import { getDb } from "@/db";
import { attendance, fines } from "@/db/schema";
import { canonicalName, nameAliases, validateEntry } from "@/lib/attendance";
import { DELETE as adminDelete } from "@/app/api/admin/attendance/route";
import { requireActor } from "@/lib/site-auth";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function GET(request: Request) {
  const auth = await requireActor(request); if (auth.error) return auth.error;
  const month = new URL(request.url).searchParams.get("month");
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return json({ error: "조회할 달을 확인해 주세요." }, 400);
  try {
    const entries = await getDb().select({ attendance, fineId: fines.id, fineStatus: fines.status }).from(attendance).leftJoin(fines, eq(attendance.id, fines.attendanceId)).where(like(attendance.date, `${month}-%`)).orderBy(attendance.date, attendance.name, attendance.type);
    return json({ entries: entries.map(row => ({ ...row.attendance, name: canonicalName(row.attendance.name), fineId: row.fineId, fineStatus: row.fineStatus, unnotified: row.attendance.adminRecord === 1 || !!row.fineId && row.fineStatus !== "waived" })) });
  } catch (error) {
    console.error("Attendance read failed", error);
    return json({ error: "출결 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, 503);
  }
}

export async function POST(request: Request) {
  const auth = await requireActor(request); if (auth.error) return auth.error;
  if (auth.actor.role === "admin") return json({ error: "관리자는 관리자 화면에서 출결을 등록해 주세요." }, 403);
  if (!isSameOrigin(request)) return json({ error: "이 페이지에서 다시 등록해 주세요." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 10000) return json({ error: "입력 내용이 너무 길어요." }, 413);
  let input: unknown;
  try { input = await request.json(); } catch { return json({ error: "입력 내용을 확인해 주세요." }, 400); }
  if (!input || typeof input !== "object") return json({ error: "등록할 내용을 확인해 주세요." }, 400);
  if ((input as Record<string, unknown>).name && (input as Record<string, unknown>).name !== auth.actor.name) return json({ error: "본인의 출결만 등록할 수 있어요." }, 403);
  const valid = validateEntry({ ...input, name: auth.actor.name });
  if (typeof valid === "string") return json({ error: valid }, 400);
  try {
    const entry = { ...valid, id: crypto.randomUUID(), createdAt: new Date().toISOString(), ownerId: auth.actor.id, adminRecord: 0 };
    const duplicate = await getDb().select({ id: attendance.id }).from(attendance).where(and(eq(attendance.date, valid.date), inArray(attendance.name, nameAliases(valid.name)), eq(attendance.type, valid.type))).limit(1);
    if (duplicate.length) return json({ error: "같은 날짜에 동일한 이름과 사유가 이미 등록되어 있어요." }, 409);
    const saved = await getDb().insert(attendance).values(entry).onConflictDoNothing().returning();
    if (!saved.length) return json({ error: "같은 날짜에 동일한 이름과 사유가 이미 등록되어 있어요." }, 409);
    return json({ entry: saved[0] }, 201);
  } catch (error) {
    console.error("Attendance write failed", error);
    return json({ error: "저장하지 못했어요. 입력 내용은 유지되니 다시 시도해 주세요." }, 503);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireActor(request); if (auth.error) return auth.error;
  if (auth.actor.role !== "member") return json({ error: "관리자 화면에서 수정해 주세요." }, 403);
  let input: Record<string, unknown> | null;
  try { input = await request.json() as typeof input; } catch { return json({ error: "수정할 내용을 확인해 주세요." }, 400); }
  if (!input || typeof input !== "object" || typeof input.id !== "string" || !/^[0-9a-f-]{36}$/.test(input.id)) return json({ error: "수정할 내역을 확인해 주세요." }, 400);
  if (input.name && input.name !== auth.actor.name) return json({ error: "본인의 출결만 수정할 수 있어요." }, 403);
  const valid = validateEntry({ ...input, name: auth.actor.name });
  if (typeof valid === "string") return json({ error: valid }, 400);
  const ownership = and(eq(attendance.id, input.id), eq(attendance.adminRecord, 0), or(eq(attendance.ownerId, auth.actor.id), and(isNull(attendance.ownerId), inArray(attendance.name, nameAliases(auth.actor.name)))));
  try {
    const db = getDb();
    const [existing] = await db.select({ id: attendance.id }).from(attendance).where(ownership).limit(1);
    if (!existing) return json({ error: "본인이 등록한 일반 출결만 수정할 수 있어요. 관리자 무단 기록은 수정할 수 없습니다." }, 403);
    const duplicate = await db.select({ id: attendance.id }).from(attendance).where(and(eq(attendance.date, valid.date), inArray(attendance.name, nameAliases(valid.name)), eq(attendance.type, valid.type), ne(attendance.id, input.id))).limit(1);
    if (duplicate.length) return json({ error: "같은 날짜와 사유의 출결이 이미 있어요." }, 409);
    const updated = await db.update(attendance).set({ ...valid, ownerId: auth.actor.id }).where(ownership).returning();
    if (!updated.length) return json({ error: "출결 상태가 바뀌었어요. 새로고침해 주세요." }, 409);
    return json({ entry: updated[0] });
  } catch (error) {
    if (/unique constraint/i.test(String(error))) return json({ error: "같은 날짜와 사유의 출결이 이미 있어요." }, 409);
    console.error("Member attendance edit failed", error); return json({ error: "수정하지 못했어요." }, 503);
  }
}

export async function DELETE(request: Request) {
  return adminDelete(request);
}
