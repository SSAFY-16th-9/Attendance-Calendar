import { and, eq, inArray, like } from "drizzle-orm";
import { getDb } from "@/db";
import { attendance } from "@/db/schema";
import { canonicalName, nameAliases, validateEntry } from "@/lib/attendance";
import { DELETE as adminDelete } from "@/app/api/admin/attendance/route";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month");
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return json({ error: "조회할 달을 확인해 주세요." }, 400);
  try {
    const entries = await getDb().select().from(attendance).where(like(attendance.date, `${month}-%`)).orderBy(attendance.date, attendance.name, attendance.type);
    return json({ entries: entries.map(entry => ({ ...entry, name: canonicalName(entry.name) })) });
  } catch (error) {
    console.error("Attendance read failed", error);
    return json({ error: "출결 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, 503);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "이 페이지에서 다시 등록해 주세요." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 10000) return json({ error: "입력 내용이 너무 길어요." }, 413);
  let input: unknown;
  try { input = await request.json(); } catch { return json({ error: "입력 내용을 확인해 주세요." }, 400); }
  const valid = validateEntry(input);
  if (typeof valid === "string") return json({ error: valid }, 400);
  try {
    const entry = { ...valid, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
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

export async function DELETE(request: Request) {
  return adminDelete(request);
}
