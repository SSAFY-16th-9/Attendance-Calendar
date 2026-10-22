import { and, eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { attendance, fines, members } from "@/db/schema";
import { adminConfig, isSuperAdmin, privateJson, requireAdmin } from "@/lib/admin-auth";
import { passwordDigest } from "@/lib/admin-session";
import { isMemberName, isMemberUsername, nameAliases } from "@/lib/attendance";
import { isUniqueConflict, ownedBy } from "@/lib/records";
import { workingCohort } from "@/lib/cohort";

export const dynamic = "force-dynamic";
const NAME_RULE = "이름은 한글·영문 1~20자로 입력해 주세요.";
const USERNAME_RULE = "아이디는 영문·숫자·._- 3~40자로 입력해 주세요.";
const CORE_ONLY = "관리자 계정은 핵심 관리자(admin)만 변경할 수 있어요.";
const reserved = (username: string) => username === adminConfig()?.username;
// New members (and members still on their first password) use their username as the initial password.
const initialPassword = async (username: string) => { const salt = crypto.randomUUID(); return { passwordSalt: salt, passwordHash: await passwordDigest(username, salt) }; };
// Two lookups per check, each bound to under D1's 100-parameter limit.
const BULK_LIMIT = 60;
type Row = { name: string; username: string };

// Why each pasted row cannot be added (empty when it can): format, an existing account, or a repeat within the paste.
// Usernames are unique across every class; names only within the class being managed.
async function rowProblems(db: ReturnType<typeof getDb>, cohort: string, rows: Row[]) {
  const usernames = rows.map(row => row.username).filter(Boolean); const names = rows.map(row => row.name).filter(Boolean);
  const [users, people] = await Promise.all([
    usernames.length ? db.select({ value: members.username }).from(members).where(inArray(members.username, usernames)) : [],
    names.length ? db.select({ value: members.name }).from(members).where(and(eq(members.cohort, cohort), inArray(members.name, names))) : [],
  ]);
  const takenUsers = new Set(users.map(row => row.value)); const takenNames = new Set(people.map(row => row.value));
  const repeats = (key: keyof Row, value: string) => rows.filter(row => row[key] === value).length > 1;
  return rows.map(row => !isMemberName(row.name) ? NAME_RULE
    : !isMemberUsername(row.username) || reserved(row.username) ? USERNAME_RULE
    : takenUsers.has(row.username) ? "이미 사용 중인 아이디예요."
    : takenNames.has(row.name) ? "이 기수에 같은 이름이 이미 있어요."
    : repeats("username", row.username) ? "붙여넣은 목록에 같은 아이디가 또 있어요."
    : repeats("name", row.name) ? "붙여넣은 목록에 같은 이름이 또 있어요." : "");
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  try {
    const entries = await getDb().select({ id: members.id, username: members.username, name: members.name, active: members.active, mustChangePassword: members.mustChangePassword, sessionVersion: members.sessionVersion, isAdmin: members.isAdmin, updatedAt: members.updatedAt }).from(members).where(eq(members.cohort, await workingCohort(request))).orderBy(members.name);
    return privateJson({ entries, superAdmin: await isSuperAdmin(request) });
  } catch (error) { console.error("Member read failed", error); return privateJson({ error: "회원 목록을 불러오지 못했어요. 회원 초기 설정을 확인해 주세요." }, 503); }
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  let input: { name?: unknown; username?: unknown; check?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "추가할 회원을 확인해 주세요." }, 400); }
  const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
  try {
    const db = getDb(); const cohort = await workingCohort(request);
    // A pasted roster is checked first (no accounts made); each row is then added with its own request.
    if (Array.isArray(input?.check)) {
      if (!input.check.length || input.check.length > BULK_LIMIT) return privateJson({ error: `한 번에 1~${BULK_LIMIT}명까지 붙여넣을 수 있어요.` }, 400);
      const rows = input.check.map(row => ({ name: text((row as Row)?.name), username: text((row as Row)?.username) }));
      const problems = await rowProblems(db, cohort, rows);
      return privateJson({ rows: rows.map((row, index) => ({ ...row, problem: problems[index] })) });
    }
    const row = { name: text(input?.name), username: text(input?.username) };
    const [problem] = await rowProblems(db, cohort, [row]);
    if (problem) return privateJson({ error: problem }, problem === NAME_RULE || problem === USERNAME_RULE ? 400 : 409);
    const { name, username } = row; const now = new Date().toISOString();
    await db.insert(members).values({ id: crypto.randomUUID(), username, name, cohort, ...await initialPassword(username), active: 1, mustChangePassword: 1, sessionVersion: 0, createdAt: now, updatedAt: now });
    return privateJson({ created: true }, 201);
  } catch (error) {
    if (isUniqueConflict(error)) return privateJson({ error: "같은 이름이나 아이디가 이미 있어요." }, 409);
    console.error("Member create failed", error); return privateJson({ error: "회원을 추가하지 못했어요." }, 503);
  }
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  let input: { id?: unknown; action?: unknown; password?: unknown; revision?: unknown; name?: unknown; username?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "변경할 회원을 확인해 주세요." }, 400); }
  if (typeof input?.id !== "string" || !/^[0-9a-f-]{36}$/.test(input.id) || !["activate", "deactivate", "reset", "rename", "username", "grantAdmin", "revokeAdmin"].includes(input.action as string) || !Number.isSafeInteger(input.revision) || (input.revision as number) < 0) return privateJson({ error: "변경 내용을 확인해 주세요." }, 400);
  if (input.action === "reset" && (typeof input.password !== "string" || input.password.length < 8 || input.password.length > 128)) return privateJson({ error: "임시 비밀번호를 8~128자로 입력해 주세요." }, 400);
  const id = input.id; const revision = input.revision as number; const now = new Date().toISOString();
  try {
    const db = getDb();
    const [member] = await db.select().from(members).where(and(eq(members.id, id), eq(members.cohort, await workingCohort(request)), eq(members.sessionVersion, revision))).limit(1);
    if (!member) return privateJson({ error: "회원 상태가 바뀌었어요. 새로고침 후 다시 시도해 주세요." }, 409);
    const superAdmin = await isSuperAdmin(request);

    // Only the core admin grants or removes admin rights; the session bump makes the change apply at once.
    if (input.action === "grantAdmin" || input.action === "revokeAdmin") {
      if (!superAdmin) return privateJson({ error: "관리자 권한은 핵심 관리자(admin)만 주거나 뺄 수 있어요." }, 403);
      await db.update(members).set({ isAdmin: input.action === "grantAdmin" ? 1 : 0, sessionVersion: sql`${members.sessionVersion} + 1`, updatedAt: now }).where(eq(members.id, id));
      return privateJson({ updated: true });
    }
    // Sub-admins cannot take over another admin's account (password, username, suspension).
    if (member.isAdmin === 1 && !superAdmin && input.action !== "rename") return privateJson({ error: CORE_ONLY }, 403);

    if (input.action === "rename") {
      const name = typeof input.name === "string" ? input.name.trim() : "";
      if (!isMemberName(name)) return privateJson({ error: NAME_RULE }, 400);
      if (name === member.name) return privateJson({ updated: true });
      // The new name follows the member onto their attendance and fines so the calendar and ledger stay in step.
      const records = db.select({ id: attendance.id }).from(attendance).where(ownedBy(id, member.name, member.cohort));
      await db.batch([
        db.update(members).set({ name, updatedAt: now }).where(eq(members.id, id)),
        db.update(fines).set({ name }).where(or(inArray(fines.attendanceId, records), and(eq(fines.cohort, member.cohort), inArray(fines.name, nameAliases(member.name))))),
        db.update(attendance).set({ name }).where(ownedBy(id, member.name, member.cohort)),
      ]);
      return privateJson({ updated: true });
    }

    if (input.action === "username") {
      const username = typeof input.username === "string" ? input.username.trim() : "";
      if (!isMemberUsername(username) || reserved(username)) return privateJson({ error: USERNAME_RULE }, 400);
      if (username === member.username) return privateJson({ updated: true });
      // Someone still on the initial password gets it moved to the new username; a chosen password stays.
      const update = member.mustChangePassword === 1 ? { ...await initialPassword(username), sessionVersion: sql`${members.sessionVersion} + 1` } : {};
      await db.update(members).set({ username, ...update, updatedAt: now }).where(eq(members.id, id));
      return privateJson({ updated: true, passwordReset: member.mustChangePassword === 1 });
    }

    const update: Partial<typeof members.$inferInsert> = { updatedAt: now };
    if (input.action === "reset") {
      const salt = crypto.randomUUID(); update.passwordSalt = salt; update.passwordHash = await passwordDigest(input.password as string, salt); update.mustChangePassword = 1;
    } else update.active = input.action === "activate" ? 1 : 0;
    const rows = await db.update(members).set({ ...update, sessionVersion: sql`${members.sessionVersion} + 1` }).where(and(eq(members.id, id), eq(members.sessionVersion, revision))).returning({ id: members.id });
    if (!rows.length) return privateJson({ error: "회원 상태가 바뀌었어요. 새로고침 후 다시 시도해 주세요." }, 409);
    return privateJson({ updated: true });
  } catch (error) {
    if (isUniqueConflict(error)) return privateJson({ error: "같은 이름이나 아이디가 이미 있어요." }, 409);
    console.error("Member update failed", error); return privateJson({ error: "회원정보를 변경하지 못했어요." }, 503);
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  let input: { id?: unknown; revision?: unknown; withRecords?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "삭제할 회원을 확인해 주세요." }, 400); }
  if (typeof input?.id !== "string" || !/^[0-9a-f-]{36}$/.test(input.id) || !Number.isSafeInteger(input.revision)) return privateJson({ error: "삭제할 회원을 확인해 주세요." }, 400);
  const id = input.id;
  try {
    const db = getDb();
    const [member] = await db.select({ name: members.name, isAdmin: members.isAdmin, cohort: members.cohort }).from(members).where(and(eq(members.id, id), eq(members.cohort, await workingCohort(request)), eq(members.sessionVersion, input.revision as number))).limit(1);
    if (!member) return privateJson({ error: "회원 상태가 바뀌었어요. 새로고침 후 다시 시도해 주세요." }, 409);
    if (member.isAdmin === 1 && !await isSuperAdmin(request)) return privateJson({ error: CORE_ONLY }, 403);
    const owned = ownedBy(id, member.name, member.cohort);
    const records = db.select({ id: attendance.id }).from(attendance).where(owned);
    const fineMatch = or(inArray(fines.attendanceId, records), and(eq(fines.cohort, member.cohort), inArray(fines.name, nameAliases(member.name))));
    const [[{ attendanceCount }], [{ fineCount }]] = await Promise.all([
      db.select({ attendanceCount: sql<number>`count(*)` }).from(attendance).where(owned),
      db.select({ fineCount: sql<number>`count(*)` }).from(fines).where(fineMatch),
    ]);
    // Deleting someone with history needs an explicit second confirmation; suspending keeps everything instead.
    if ((attendanceCount || fineCount) && input.withRecords !== true) return privateJson({ error: "출결·벌금 기록이 있어요.", needsConfirm: true, attendanceCount, fineCount }, 409);
    await db.batch([
      db.delete(fines).where(fineMatch),
      db.delete(attendance).where(owned),
      db.delete(members).where(eq(members.id, id)),
    ]);
    return privateJson({ deleted: true, attendanceCount, fineCount });
  } catch (error) { console.error("Member delete failed", error); return privateJson({ error: "회원을 삭제하지 못했어요." }, 503); }
}
