import { and, count, desc, eq, inArray, like, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { attendance, fines, members } from "@/db/schema";
import { privateJson, requireAdmin } from "@/lib/admin-auth";
import { syncFineWithAttendance } from "@/lib/fine-sync";
import { isUniqueConflict, takenDates } from "@/lib/records";
import { workingCohort } from "@/lib/cohort";
import { DAILY_LIMIT_MESSAGE, isUnnotified, takenDatesMessage, validateEntries, canonicalName, nameAliases, TYPES, validateEntry } from "@/lib/attendance";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  let input: Record<string, unknown> | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "등록 내용을 확인해 주세요." }, 400); }
  if (!input || typeof input.memberId !== "string") return privateJson({ error: "회원을 선택해 주세요." }, 400);
  try {
    const db = getDb(); const cohort = await workingCohort(request);
    const [member] = await db.select({ id: members.id, name: members.name }).from(members).where(and(eq(members.id, input.memberId), eq(members.cohort, cohort))).limit(1);
    if (!member) return privateJson({ error: "회원을 선택해 주세요." }, 400);
    const valid = validateEntries(input, member.name);
    if (typeof valid === "string") return privateJson({ error: valid }, 400);
    const taken = await takenDates(db, valid.map(entry => entry.date), member.name, cohort);
    if (taken.length) return privateJson({ error: takenDatesMessage(taken) }, 409);
    const now = new Date().toISOString();
    const rows = await db.insert(attendance).values(valid.map(entry => ({ ...entry, id: crypto.randomUUID(), createdAt: now, ownerId: member.id, cohort, adminRecord: 0 }))).returning();
    return privateJson({ entry: rows[0], entries: rows }, 201);
  } catch (error) {
    if (isUniqueConflict(error)) return privateJson({ error: "같은 출결이 이미 등록되어 있어요." }, 409);
    console.error("Admin attendance create failed", error); return privateJson({ error: "등록하지 못했어요." }, 503); }
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const month = params.get("month");
  const type = params.get("type");
  const query = (params.get("q") || "").trim();
  const page = Number(params.get("page") || "1");
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || type && !TYPES.includes(type as typeof TYPES[number]) || query.length > 50 || !Number.isInteger(page) || page < 1 || page > 100000) return privateJson({ error: "검색 조건을 확인해 주세요." }, 400);
  const canonical = sql<string>`CASE WHEN ${attendance.name} = '이주연' THEN '이주언' ELSE ${attendance.name} END`;
  const where = and(eq(attendance.cohort, await workingCohort(request)), month ? like(attendance.date, `${month}-%`) : undefined, type ? eq(attendance.type, type) : undefined, query ? sql`instr(${canonical}, ${query}) > 0` : undefined);
  try {
    const db = getDb();
    const [entries, totals, types] = await Promise.all([
      db.select().from(attendance).where(where).orderBy(desc(attendance.date), attendance.name, attendance.type).limit(50).offset((page - 1) * 50),
      db.select({ total: count(), people: sql<number>`count(distinct ${canonical})` }).from(attendance).where(where),
      db.select({ type: attendance.type, count: count() }).from(attendance).where(where).groupBy(attendance.type),
    ]);
    return privateJson({ entries: entries.map(entry => ({ ...entry, name: canonicalName(entry.name) })), total: totals[0].total, people: totals[0].people, types, page, pageSize: 50 });
  } catch (error) { console.error("Admin read failed", error); return privateJson({ error: "출결 내역을 불러오지 못했어요." }, 503); }
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (Number(request.headers.get("content-length") || 0) > 10000) return privateJson({ error: "입력 내용이 너무 길어요." }, 413);
  let input: Record<string, unknown>;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "수정할 내용을 확인해 주세요." }, 400); }
  const valid = validateEntry(input);
  if (typeof valid === "string") return privateJson({ error: valid }, 400);
  if (typeof input.id !== "string" || !/^[0-9a-f-]{36}$/.test(input.id)) return privateJson({ error: "수정할 내역을 확인해 주세요." }, 400);
  try {
    const db = getDb(); const cohort = await workingCohort(request);
    // Admins only touch records of the class they are working in.
    const target = and(eq(attendance.id, input.id), eq(attendance.cohort, cohort));
    if (input.scope === "group") {
      // Records registered together get the same type, reason and 미정; each keeps its own date and member.
      const [base] = await db.select({ name: attendance.name, createdAt: attendance.createdAt }).from(attendance).where(target).limit(1);
      if (!base) return privateJson({ error: "이미 삭제된 내역이에요. 목록을 새로고침해 주세요." }, 404);
      const group = await db.select({ id: attendance.id, adminRecord: attendance.adminRecord, fineStatus: fines.status }).from(attendance).leftJoin(fines, eq(attendance.id, fines.attendanceId)).where(and(eq(attendance.cohort, cohort), eq(attendance.createdAt, base.createdAt), inArray(attendance.name, nameAliases(base.name))));
      if (valid.pending && group.some(isUnnotified)) return privateJson({ error: "무단 출결이 포함되어 있어 미정으로 바꿀 수 없어요." }, 409);
      const ids = group.map(row => row.id);
      const [updated] = await db.batch([db.update(attendance).set({ type: valid.type, reason: valid.reason, ...(input.pending === undefined ? {} : { pending: valid.pending }) }).where(inArray(attendance.id, ids)).returning(), ...ids.map(id => syncFineWithAttendance(db, id))]);
      return privateJson({ entry: updated.find(row => row.id === input.id) || updated[0], entries: updated });
    }
    const duplicate = await db.select({ id: attendance.id }).from(attendance).where(and(eq(attendance.cohort, cohort), eq(attendance.date, valid.date), inArray(attendance.name, nameAliases(valid.name)), ne(attendance.id, input.id))).limit(1);
    if (duplicate.length) return privateJson({ error: DAILY_LIMIT_MESSAGE }, 409);
    const [owner] = await db.select({ id: members.id }).from(members).where(and(eq(members.cohort, cohort), eq(members.name, valid.name))).limit(1);
    if (!owner) return privateJson({ error: "등록된 회원을 선택해 주세요." }, 400);
    // 무단 records cannot be marked 미정; callers that omit pending (the /admin table) keep the current value.
    if (valid.pending) {
      const [current] = await db.select({ adminRecord: attendance.adminRecord, fineStatus: fines.status }).from(attendance).leftJoin(fines, eq(attendance.id, fines.attendanceId)).where(target).limit(1);
      if (current && isUnnotified(current)) return privateJson({ error: "무단 출결은 미정으로 바꿀 수 없어요." }, 409);
    }
    const { pending, ...fields } = valid;
    const [entries] = await db.batch([db.update(attendance).set({ ...fields, ...(input.pending === undefined ? {} : { pending }), ownerId: owner.id }).where(target).returning(), syncFineWithAttendance(db, input.id)]);
    if (!entries.length) return privateJson({ error: "이미 삭제된 내역이에요. 목록을 새로고침해 주세요." }, 404);
    return privateJson({ entry: entries[0] });
  } catch (error) {
    if (isUniqueConflict(error)) return privateJson({ error: "중복되는 출결 내역이 있어요." }, 409);
    console.error("Admin update failed", error); return privateJson({ error: "수정하지 못했어요. 다시 시도해 주세요." }, 503);
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let input: { id?: unknown; scope?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "삭제할 내역을 확인해 주세요." }, 400); }
  if (typeof input?.id !== "string" || !/^[0-9a-f-]{36}$/.test(input.id)) return privateJson({ error: "삭제할 내역을 확인해 주세요." }, 400);
  try {
    const db = getDb(); const cohort = await workingCohort(request);
    let ids = [input.id];
    if (input.scope === "group") {
      const [base] = await db.select({ name: attendance.name, createdAt: attendance.createdAt }).from(attendance).where(and(eq(attendance.id, input.id), eq(attendance.cohort, cohort))).limit(1);
      if (!base) return privateJson({ error: "이미 삭제된 내역이에요." }, 404);
      ids = (await db.select({ id: attendance.id }).from(attendance).where(and(eq(attendance.cohort, cohort), eq(attendance.createdAt, base.createdAt), inArray(attendance.name, nameAliases(base.name))))).map(row => row.id);
    }
    ids = (await db.select({ id: attendance.id }).from(attendance).where(and(inArray(attendance.id, ids), eq(attendance.cohort, cohort)))).map(row => row.id);
    if (!ids.length) return privateJson({ error: "이미 삭제된 내역이에요." }, 404);
    // Fines belong to their attendance record, so both are removed together.
    const [, removed] = await db.batch([
      db.delete(fines).where(inArray(fines.attendanceId, ids)),
      db.delete(attendance).where(inArray(attendance.id, ids)).returning(),
    ]);
    if (!removed.length) return privateJson({ error: "이미 삭제된 내역이에요." }, 404);
    return privateJson({ deleted: true, count: removed.length });
  } catch (error) { console.error("Admin delete failed", error); return privateJson({ error: "삭제하지 못했어요. 다시 시도해 주세요." }, 503); }
}
