import { and, eq, inArray, like, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { attendance, fines } from "@/db/schema";
import { canonicalName, DAILY_LIMIT_MESSAGE, isUnnotified, nameAliases, takenDatesMessage, validateEntries, validateEntry } from "@/lib/attendance";
import { privateJson as json, sameOrigin } from "@/lib/admin-auth";
import { isUniqueConflict, ownedBy, takenDates } from "@/lib/records";
import { DELETE as adminDelete } from "@/app/api/admin/attendance/route";
import { getActor, requireActor } from "@/lib/site-auth";
import { syncFineWithAttendance } from "@/lib/fine-sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = await getActor(request);
  if (actor?.mustChangePassword) return json({ error: "첫 로그인 비밀번호를 변경해 주세요.", passwordChangeRequired: true }, 403);
  const month = new URL(request.url).searchParams.get("month");
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return json({ error: "조회할 달을 확인해 주세요." }, 400);
  try {
    const entries = await getDb().select({ attendance, fineId: fines.id, fineStatus: fines.status }).from(attendance).leftJoin(fines, eq(attendance.id, fines.attendanceId)).where(like(attendance.date, `${month}-%`)).orderBy(attendance.date, attendance.name, attendance.type);
    const shaped = entries.map(row => ({ ...row.attendance, name: canonicalName(row.attendance.name), fineId: row.fineId, fineStatus: row.fineStatus, unnotified: isUnnotified({ adminRecord: row.attendance.adminRecord, fineStatus: row.fineStatus }) }));
    // Logged-out viewers see the calendar with reasons; fine and owner details need a login.
    return json({ entries: actor ? shaped : shaped.map(({ id, date, name, type, reason, createdAt, pending, unnotified }) => ({ id, date, name, type, reason, createdAt, pending, unnotified })) });
  } catch (error) {
    console.error("Attendance read failed", error);
    return json({ error: "출결 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, 503);
  }
}

export async function POST(request: Request) {
  const auth = await requireActor(request); if (auth.error) return auth.error;
  if (auth.actor.role === "admin") return json({ error: "관리자는 관리자 화면에서 출결을 등록해 주세요." }, 403);
  if (!sameOrigin(request)) return json({ error: "이 페이지에서 다시 등록해 주세요." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 10000) return json({ error: "입력 내용이 너무 길어요." }, 413);
  let input: unknown;
  try { input = await request.json(); } catch { return json({ error: "입력 내용을 확인해 주세요." }, 400); }
  if (!input || typeof input !== "object") return json({ error: "등록할 내용을 확인해 주세요." }, 400);
  if ((input as Record<string, unknown>).name && (input as Record<string, unknown>).name !== auth.actor.name) return json({ error: "본인의 출결만 등록할 수 있어요." }, 403);
  const valid = validateEntries(input as Record<string, unknown>, auth.actor.name);
  if (typeof valid === "string") return json({ error: valid }, 400);
  try {
    const db = getDb(); const now = new Date().toISOString();
    const taken = await takenDates(db, valid.map(entry => entry.date), auth.actor.name);
    if (taken.length) return json({ error: takenDatesMessage(taken) }, 409);
    // One multi-row insert: every date is saved, or none is.
    const saved = await db.insert(attendance).values(valid.map(entry => ({ ...entry, id: crypto.randomUUID(), createdAt: now, ownerId: auth.actor.id, adminRecord: 0 }))).returning();
    return json({ entry: saved[0], entries: saved }, 201);
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
  const owned = ownedBy(auth.actor.id, auth.actor.name);
  const ownership = and(eq(attendance.id, input.id), owned);
  try {
    const db = getDb();
    const [existing] = await db.select({ id: attendance.id, date: attendance.date, createdAt: attendance.createdAt, adminRecord: attendance.adminRecord, fineStatus: fines.status }).from(attendance).leftJoin(fines, eq(attendance.id, fines.attendanceId)).where(ownership).limit(1);
    if (!existing) return json({ error: "본인의 출결만 수정할 수 있어요." }, 403);
    // Members may change the type and reason of a 무단 record, but not its date; the 무단 mark and fine stay.
    const unnotified = isUnnotified(existing);
    const { pending, ...fields } = valid;
    if (input.scope === "group") {
      // Records registered together get the same type, reason and 미정; each keeps its own date.
      const group = await db.select({ id: attendance.id, adminRecord: attendance.adminRecord, fineStatus: fines.status }).from(attendance).leftJoin(fines, eq(attendance.id, fines.attendanceId)).where(and(eq(attendance.createdAt, existing.createdAt), owned));
      if (valid.pending && group.some(isUnnotified)) return json({ error: "무단 출결이 포함되어 있어 미정으로 바꿀 수 없어요." }, 403);
      const ids = group.map(row => row.id);
      const [updated] = await db.batch([db.update(attendance).set({ type: valid.type, reason: valid.reason, ...(input.pending === undefined ? {} : { pending }), ownerId: auth.actor.id }).where(and(inArray(attendance.id, ids), owned)).returning(), ...ids.map(id => syncFineWithAttendance(db, id))]);
      if (!updated.length) return json({ error: "출결 상태가 바뀌었어요. 새로고침해 주세요." }, 409);
      return json({ entry: updated.find(row => row.id === input!.id) || updated[0], entries: updated });
    }
    if (unnotified && valid.pending) return json({ error: "무단 출결은 미정으로 바꿀 수 없어요." }, 403);
    if (unnotified && valid.date !== existing.date) return json({ error: "무단 출결은 날짜를 바꿀 수 없어요. 사유와 상세 이유만 수정할 수 있어요." }, 403);
    const duplicate = await db.select({ id: attendance.id }).from(attendance).where(and(eq(attendance.date, valid.date), inArray(attendance.name, nameAliases(valid.name)), ne(attendance.id, input.id))).limit(1);
    if (duplicate.length) return json({ error: DAILY_LIMIT_MESSAGE }, 409);
    const [updated] = await db.batch([db.update(attendance).set({ ...fields, ...(input.pending === undefined ? {} : { pending }), ownerId: auth.actor.id }).where(and(ownership, eq(attendance.date, existing.date))).returning(), syncFineWithAttendance(db, input.id)]);
    if (!updated.length) return json({ error: "출결 상태가 바뀌었어요. 새로고침해 주세요." }, 409);
    return json({ entry: updated[0] });
  } catch (error) {
    if (isUniqueConflict(error)) return json({ error: "같은 날짜와 사유의 출결이 이미 있어요." }, 409);
    console.error("Member attendance edit failed", error); return json({ error: "수정하지 못했어요." }, 503);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireActor(request); if (auth.error) return auth.error;
  if (auth.actor.role === "admin") return adminDelete(request);
  let input: { id?: unknown; scope?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return json({ error: "삭제할 내역을 확인해 주세요." }, 400); }
  if (typeof input?.id !== "string" || !/^[0-9a-f-]{36}$/.test(input.id)) return json({ error: "삭제할 내역을 확인해 주세요." }, 400);
  const owned = ownedBy(auth.actor.id, auth.actor.name);
  try {
    const db = getDb();
    const [existing] = await db.select({ createdAt: attendance.createdAt }).from(attendance).where(and(eq(attendance.id, input.id), owned)).limit(1);
    if (!existing) return json({ error: "본인의 출결만 삭제할 수 있어요." }, 403);
    const rows = await db.select({ id: attendance.id, adminRecord: attendance.adminRecord, fineStatus: fines.status }).from(attendance).leftJoin(fines, eq(attendance.id, fines.attendanceId)).where(input.scope === "group" ? and(eq(attendance.createdAt, existing.createdAt), owned) : eq(attendance.id, input.id));
    // 무단 records are the evidence for a fine; only admins remove them.
    if (rows.some(isUnnotified)) return json({ error: "무단 출결은 삭제할 수 없어요. 관리자에게 요청해 주세요." }, 403);
    const ids = rows.map(row => row.id);
    const [, removed] = await db.batch([db.delete(fines).where(inArray(fines.attendanceId, ids)), db.delete(attendance).where(and(inArray(attendance.id, ids), owned)).returning()]);
    if (!removed.length) return json({ error: "이미 삭제된 내역이에요." }, 404);
    return json({ deleted: true, count: removed.length });
  } catch (error) { console.error("Member attendance delete failed", error); return json({ error: "삭제하지 못했어요. 다시 시도해 주세요." }, 503); }
}
