import { count, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { cohorts, members } from "@/db/schema";
import { isSuperAdmin, privateJson, requireAdmin } from "@/lib/admin-auth";
import { cohortCookie, cohortId, cohortLabel, isCohortId, workingCohort } from "@/lib/cohort";
import { isUniqueConflict } from "@/lib/records";

export const dynamic = "force-dynamic";
const CORE_ONLY = "기수 추가·전환은 핵심 관리자(admin)만 할 수 있어요.";

// Classes for the admin bar: the core admin sees every class, a sub-admin only their own.
export async function GET(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  try {
    const db = getDb(); const [selected, superAdmin] = await Promise.all([workingCohort(request), isSuperAdmin(request)]);
    const rows = await db.select({ id: cohorts.id, name: cohorts.name, isCurrent: cohorts.isCurrent, members: count(members.id) }).from(cohorts).leftJoin(members, eq(members.cohort, cohorts.id)).where(superAdmin ? undefined : eq(cohorts.id, selected)).groupBy(cohorts.id).orderBy(sql`CAST(${cohorts.id} AS INTEGER) DESC`, cohorts.id);
    return privateJson({ cohorts: rows, selected, superAdmin });
  } catch (error) { console.error("Cohort read failed", error); return privateJson({ error: "기수 목록을 불러오지 못했어요." }, 503); }
}

// Add a class (기수·반) and start managing it.
export async function POST(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  if (!await isSuperAdmin(request)) return privateJson({ error: CORE_ONLY }, 403);
  let input: { generation?: unknown; classNo?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "기수와 반을 확인해 주세요." }, 400); }
  const generation = Number(input?.generation); const classNo = Number(input?.classNo);
  if (!Number.isInteger(generation) || generation < 1 || generation > 999 || !Number.isInteger(classNo) || classNo < 1 || classNo > 99) return privateJson({ error: "기수(1~999)와 반(1~99)을 숫자로 입력해 주세요." }, 400);
  const id = cohortId(generation, classNo);
  try {
    await getDb().insert(cohorts).values({ id, name: cohortLabel(generation, classNo), isCurrent: 0, createdAt: new Date().toISOString() });
    return privateJson({ created: true, id }, 201, { "Set-Cookie": cohortCookie(request, id) });
  } catch (error) {
    if (isUniqueConflict(error)) return privateJson({ error: `${cohortLabel(generation, classNo)}은(는) 이미 있어요.` }, 409);
    console.error("Cohort create failed", error); return privateJson({ error: "기수를 추가하지 못했어요." }, 503);
  }
}

// select: manage another class. current: make it the class the public calendar shows.
export async function PATCH(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  if (!await isSuperAdmin(request)) return privateJson({ error: CORE_ONLY }, 403);
  let input: { id?: unknown; action?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "기수를 확인해 주세요." }, 400); }
  if (!isCohortId(input?.id) || !["select", "current"].includes(input.action as string)) return privateJson({ error: "기수를 확인해 주세요." }, 400);
  const id = input.id;
  try {
    const db = getDb();
    const [row] = await db.select({ id: cohorts.id }).from(cohorts).where(eq(cohorts.id, id)).limit(1);
    if (!row) return privateJson({ error: "없는 기수예요. 새로고침해 주세요." }, 404);
    if (input.action === "current") await db.batch([db.update(cohorts).set({ isCurrent: 0 }), db.update(cohorts).set({ isCurrent: 1 }).where(eq(cohorts.id, id))]);
    return privateJson({ updated: true }, 200, input.action === "select" ? { "Set-Cookie": cohortCookie(request, id) } : {});
  } catch (error) { console.error("Cohort update failed", error); return privateJson({ error: "기수를 바꾸지 못했어요." }, 503); }
}
