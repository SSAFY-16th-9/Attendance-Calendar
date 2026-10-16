import { and, count, desc, eq, inArray, like, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { attendance, fines, members } from "@/db/schema";
import { privateJson, requireAdmin } from "@/lib/admin-auth";
import { syncFineWithAttendance } from "@/lib/fine-sync";
import { DAILY_LIMIT_MESSAGE, canonicalName, nameAliases, TYPES, validateEntry } from "@/lib/attendance";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  let input: Record<string, unknown> | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "등록 내용을 확인해 주세요." }, 400); }
  if (!input || typeof input.memberId !== "string") return privateJson({ error: "회원을 선택해 주세요." }, 400);
  try {
    const db = getDb();
    const [member] = await db.select({ id: members.id, name: members.name }).from(members).where(eq(members.id, input.memberId)).limit(1);
    if (!member) return privateJson({ error: "회원을 선택해 주세요." }, 400);
    const valid = validateEntry({ ...input, name: member.name });
    if (typeof valid === "string") return privateJson({ error: valid }, 400);
    const entry = { ...valid, id: crypto.randomUUID(), createdAt: new Date().toISOString(), ownerId: member.id, adminRecord: 0 };
    const duplicate = await db.select({ id: attendance.id }).from(attendance).where(and(eq(attendance.date, valid.date), inArray(attendance.name, nameAliases(valid.name)))).limit(1);
    if (duplicate.length) return privateJson({ error: DAILY_LIMIT_MESSAGE }, 409);
    const rows = await db.insert(attendance).values(entry).onConflictDoNothing().returning();
    if (!rows.length) return privateJson({ error: "같은 출결이 이미 등록되어 있어요." }, 409);
    return privateJson({ entry: rows[0] }, 201);
  } catch (error) { console.error("Admin attendance create failed", error); return privateJson({ error: "등록하지 못했어요." }, 503); }
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
  const where = and(month ? like(attendance.date, `${month}-%`) : undefined, type ? eq(attendance.type, type) : undefined, query ? sql`instr(${canonical}, ${query}) > 0` : undefined);
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
    const db = getDb();
    const duplicate = await db.select({ id: attendance.id }).from(attendance).where(and(eq(attendance.date, valid.date), inArray(attendance.name, nameAliases(valid.name)), ne(attendance.id, input.id))).limit(1);
    if (duplicate.length) return privateJson({ error: DAILY_LIMIT_MESSAGE }, 409);
    const [owner] = await db.select({ id: members.id }).from(members).where(eq(members.name, valid.name)).limit(1);
    if (!owner) return privateJson({ error: "등록된 회원을 선택해 주세요." }, 400);
    const [entries] = await db.batch([db.update(attendance).set({ ...valid, ownerId: owner.id }).where(eq(attendance.id, input.id)).returning(), syncFineWithAttendance(db, input.id)]);
    if (!entries.length) return privateJson({ error: "이미 삭제된 내역이에요. 목록을 새로고침해 주세요." }, 404);
    return privateJson({ entry: entries[0] });
  } catch (error) {
    if (/unique constraint/i.test(String(error))) return privateJson({ error: "중복되는 출결 내역이 있어요." }, 409);
    console.error("Admin update failed", error); return privateJson({ error: "수정하지 못했어요. 다시 시도해 주세요." }, 503);
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let input: { id?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "삭제할 내역을 확인해 주세요." }, 400); }
  if (typeof input?.id !== "string" || !/^[0-9a-f-]{36}$/.test(input.id)) return privateJson({ error: "삭제할 내역을 확인해 주세요." }, 400);
  try {
    // Fines belong to their attendance record, so both are removed together.
    const db = getDb();
    const [, removed] = await db.batch([
      db.delete(fines).where(eq(fines.attendanceId, input.id)),
      db.delete(attendance).where(eq(attendance.id, input.id)).returning(),
    ]);
    if (!removed.length) return privateJson({ error: "이미 삭제된 내역이에요." }, 404);
    return privateJson({ deleted: true });
  } catch (error) { console.error("Admin delete failed", error); return privateJson({ error: "삭제하지 못했어요. 다시 시도해 주세요." }, 503); }
}
