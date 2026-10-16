import { and, eq, like, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { fines } from "@/db/schema";
import { canonicalName } from "@/lib/attendance";
import { Fine, FINE_STATUSES, summarizeFines, summarizePeople } from "@/lib/fines";
import { requireActor } from "@/lib/site-auth";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const auth = await requireActor(request); if (auth.error) return auth.error;
  const params = new URL(request.url).searchParams;
  const month = params.get("month") || "";
  const name = (params.get("q") || "").trim();
  const status = params.get("status") || "";
  const page = Number(params.get("page") || 1);
  const json = (data: unknown, code = 200) => Response.json(data, { status: code, headers: { "Cache-Control": "no-store" } });
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || name.length > 50 || status && !FINE_STATUSES.includes(status as typeof FINE_STATUSES[number]) || !Number.isSafeInteger(page) || page < 1 || page > 100000) return json({ error: "조회 조건을 확인해 주세요." }, 400);
  try {
    const canonical = sql<string>`CASE WHEN ${fines.name} = '이주연' THEN '이주언' ELSE ${fines.name} END`;
    const rows = await getDb().select().from(fines).where(and(month ? like(fines.date, `${month}-%`) : undefined, name ? sql`instr(${canonical}, ${name}) > 0` : undefined)).orderBy(sql`${fines.date} desc`, fines.name, fines.id);
    const all = rows.map(entry => ({ ...entry, name: canonicalName(entry.name) })) as Fine[];
    const filtered = all.filter(entry => !status || entry.status === status);
    const pageSize = 50;
    return json({ entries: filtered.slice((page - 1) * pageSize, page * pageSize), summary: summarizeFines(all), people: summarizePeople(all).filter(person => !name || person.name.includes(name)), total: filtered.length, page, pageSize });
  } catch (error) {
    console.error("Fine read failed", error);
    return json({ error: "벌금 현황을 불러오지 못했어요. 관리자에게 데이터베이스 설정 확인을 요청해 주세요." }, 503);
  }
}
