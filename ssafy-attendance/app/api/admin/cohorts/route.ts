import { and, count, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { cohorts, members } from "@/db/schema";
import { isSuperAdmin, privateJson, requireAdmin } from "@/lib/admin-auth";
import { cohortCookie, cohortId, cohortLabel, formatJoinCode, isCohortId, newJoinCode, VISIBILITIES, workingCohort } from "@/lib/cohort";
import { isUniqueConflict } from "@/lib/records";

export const dynamic = "force-dynamic";
const CORE_ONLY = "기수 추가·공개 설정·삭제는 핵심 관리자(admin)만 할 수 있어요.";
const ACTIONS = ["select", "visibility", "newCode", "codeOff", "delete", "restore"] as const;

// Classes for the admin pages: the core admin sees every class (deleted ones too), a sub-admin only their own.
export async function GET(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  try {
    const db = getDb(); const [selected, superAdmin] = await Promise.all([workingCohort(request), isSuperAdmin(request)]);
    const rows = await db.select({ id: cohorts.id, name: cohorts.name, visibility: cohorts.visibility, joinCode: cohorts.joinCode, deletedAt: cohorts.deletedAt, members: count(members.id) })
      .from(cohorts).leftJoin(members, eq(members.cohort, cohorts.id)).where(superAdmin ? undefined : eq(cohorts.id, selected))
      .groupBy(cohorts.id).orderBy(sql`CAST(${cohorts.id} AS INTEGER) DESC`, cohorts.id);
    return privateJson({ cohorts: rows.map(row => ({ ...row, joinCode: row.joinCode && formatJoinCode(row.joinCode) })), selected, superAdmin });
  } catch (error) { console.error("Cohort read failed", error); return privateJson({ error: "기수 목록을 불러오지 못했어요." }, 503); }
}

// Add a class (기수·반): private, with a join code ready, and start managing it.
export async function POST(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  if (!await isSuperAdmin(request)) return privateJson({ error: CORE_ONLY }, 403);
  let input: { generation?: unknown; classNo?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "기수와 반을 확인해 주세요." }, 400); }
  const generation = Number(input?.generation); const classNo = Number(input?.classNo);
  if (!Number.isInteger(generation) || generation < 1 || generation > 999 || !Number.isInteger(classNo) || classNo < 1 || classNo > 99) return privateJson({ error: "기수(1~999)와 반(1~99)을 숫자로 입력해 주세요." }, 400);
  const id = cohortId(generation, classNo);
  try {
    await getDb().insert(cohorts).values({ id, name: cohortLabel(generation, classNo), visibility: "private", joinCode: newJoinCode(), createdAt: new Date().toISOString() });
    return privateJson({ created: true, id }, 201, { "Set-Cookie": cohortCookie(request, id) });
  } catch (error) {
    if (isUniqueConflict(error)) return privateJson({ error: `${cohortLabel(generation, classNo)}은(는) 이미 있어요. 삭제된 기수라면 목록에서 복구해 주세요.` }, 409);
    console.error("Cohort create failed", error); return privateJson({ error: "기수를 추가하지 못했어요." }, 503);
  }
}

// select: manage another class. visibility: public/private. newCode/codeOff: issue or stop the join code.
// delete/restore: soft delete keeps every record; members of a deleted class cannot log in or sign up.
export async function PATCH(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  let input: { id?: unknown; action?: unknown; visibility?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "기수를 확인해 주세요." }, 400); }
  if (!isCohortId(input?.id) || !ACTIONS.includes(input.action as typeof ACTIONS[number])) return privateJson({ error: "기수를 확인해 주세요." }, 400);
  const id = input.id; const action = input.action as typeof ACTIONS[number];
  try {
    const db = getDb(); const superAdmin = await isSuperAdmin(request);
    // Sub-admins may only issue or stop the join code of their own class.
    if (!superAdmin && (!["newCode", "codeOff"].includes(action) || id !== await workingCohort(request))) return privateJson({ error: CORE_ONLY }, 403);
    const [row] = await db.select({ deletedAt: cohorts.deletedAt }).from(cohorts).where(eq(cohorts.id, id)).limit(1);
    if (!row) return privateJson({ error: "없는 기수예요. 새로고침해 주세요." }, 404);
    if (row.deletedAt && action !== "restore") return privateJson({ error: "삭제된 기수예요. 먼저 복구해 주세요." }, 409);
    const live = and(eq(cohorts.id, id), isNull(cohorts.deletedAt));
    if (action === "select") return privateJson({ updated: true }, 200, { "Set-Cookie": cohortCookie(request, id) });
    if (action === "visibility") {
      if (!VISIBILITIES.includes(input.visibility as typeof VISIBILITIES[number])) return privateJson({ error: "공개 여부를 확인해 주세요." }, 400);
      await db.update(cohorts).set({ visibility: input.visibility as string }).where(live);
    }
    if (action === "newCode") {
      // A clash with another class's code is astronomically unlikely; one retry covers it.
      try { await db.update(cohorts).set({ joinCode: newJoinCode() }).where(live); }
      catch (error) { if (!isUniqueConflict(error)) throw error; await db.update(cohorts).set({ joinCode: newJoinCode() }).where(live); }
    }
    if (action === "codeOff") await db.update(cohorts).set({ joinCode: null }).where(live);
    if (action === "delete") await db.update(cohorts).set({ deletedAt: new Date().toISOString(), joinCode: null }).where(live);
    if (action === "restore") await db.update(cohorts).set({ deletedAt: null }).where(eq(cohorts.id, id));
    return privateJson({ updated: true });
  } catch (error) { console.error("Cohort update failed", error); return privateJson({ error: "기수를 바꾸지 못했어요." }, 503); }
}
