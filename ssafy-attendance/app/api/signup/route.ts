import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { cohorts, members } from "@/db/schema";
import { consumeLoginAttempt, privateJson, sameOrigin, sessionCookie } from "@/lib/admin-auth";
import { normalizeJoinCode } from "@/lib/cohort";
import { hashedPassword, memberProblem, NAME_RULE, USERNAME_RULE } from "@/lib/member-rules";
import { memberCookie, memberToken } from "@/lib/member-session";
import { isUniqueConflict } from "@/lib/records";

export const dynamic = "force-dynamic";
const CODE_ERROR = "가입 코드가 맞지 않거나 더 이상 쓸 수 없어요. 관리자에게 확인해 주세요.";

// Self sign-up with a class's join code. { code } alone only checks the code and names the class;
// with name, username and password it creates the account in that class and logs it in.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "이 사이트에서 가입해 주세요." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 2048) return privateJson({ error: "입력 내용이 너무 길어요." }, 413);
  let input: { code?: unknown; name?: unknown; username?: unknown; password?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "가입 정보를 확인해 주세요." }, 400); }
  const code = normalizeJoinCode(input?.code);
  if (code.length !== 8) return privateJson({ error: "가입 코드 8자리를 입력해 주세요." }, 400);
  try {
    // Codes share the login attempt limit so they cannot be guessed by brute force.
    const attempt = await consumeLoginAttempt(request, "signup");
    if (!attempt.allowed) return privateJson({ error: "시도가 너무 많아요. 15분 후 다시 시도해 주세요." }, 429, { "Retry-After": "900" });
    const db = getDb();
    const [cohort] = await db.select({ id: cohorts.id, name: cohorts.name }).from(cohorts).where(and(eq(cohorts.joinCode, code), isNull(cohorts.deletedAt))).limit(1);
    if (!cohort) return privateJson({ error: CODE_ERROR }, 404);
    if (input?.name === undefined) return privateJson({ cohort });

    const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
    const row = { name: text(input.name), username: text(input.username) }; const password = typeof input.password === "string" ? input.password : "";
    if (password.length < 8 || password.length > 128 || password === row.username) return privateJson({ error: "비밀번호는 아이디와 다르게 8~128자로 입력해 주세요." }, 400);
    const problem = await memberProblem(db, cohort.id, row);
    if (problem) return privateJson({ error: problem }, problem === NAME_RULE || problem === USERNAME_RULE ? 400 : 409);
    const now = new Date().toISOString();
    // They chose their own password, so there is no first-login change.
    const [member] = await db.insert(members).values({ id: crypto.randomUUID(), ...row, cohort: cohort.id, ...await hashedPassword(password), active: 1, mustChangePassword: 0, sessionVersion: 0, createdAt: now, updatedAt: now }).returning();
    await attempt.reset();
    const response = privateJson({ created: true, cohort }, 201);
    response.headers.append("Set-Cookie", memberCookie(request, await memberToken(member)));
    response.headers.append("Set-Cookie", sessionCookie(request, ""));
    return response;
  } catch (error) {
    if (isUniqueConflict(error)) return privateJson({ error: "같은 이름이나 아이디가 이미 있어요." }, 409);
    console.error("Sign-up failed", error); return privateJson({ error: "가입하지 못했어요. 잠시 후 다시 시도해 주세요." }, 503);
  }
}
