import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { consumeLoginAttempt, privateJson, sameOrigin } from "@/lib/admin-auth";
import { constantTimeEqual, passwordDigest } from "@/lib/admin-session";
import { getMember, memberCookie, memberToken } from "@/lib/member-session";

export const dynamic = "force-dynamic";
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "회원정보 화면에서 다시 시도해 주세요." }, 403);
  const actor = await getMember(request);
  if (!actor) return privateJson({ error: "회원 로그인이 필요해요." }, 401);
  let input: { currentPassword?: unknown; newPassword?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "비밀번호를 확인해 주세요." }, 400); }
  if (typeof input?.currentPassword !== "string" || input.currentPassword.length > 256 || typeof input.newPassword !== "string" || input.newPassword.length < 8 || input.newPassword.length > 128 || input.newPassword === actor.username || input.newPassword === input.currentPassword) return privateJson({ error: "새 비밀번호는 아이디·현재 비밀번호와 다르게 8~128자로 입력해 주세요." }, 400);
  try {
    const attempt = await consumeLoginAttempt(request, `password:${actor.id}`);
    if (!attempt.allowed) return privateJson({ error: "시도가 너무 많아요. 15분 후 다시 시도해 주세요." }, 429);
    const [member] = await getDb().select().from(members).where(eq(members.id, actor.id)).limit(1);
    if (!member || !constantTimeEqual(await passwordDigest(input.currentPassword, member.passwordSalt), member.passwordHash)) return privateJson({ error: "현재 비밀번호가 올바르지 않아요." }, 400);
    const salt = crypto.randomUUID();
    const rows = await getDb().update(members).set({ passwordHash: await passwordDigest(input.newPassword, salt), passwordSalt: salt, mustChangePassword: 0, sessionVersion: sql`${members.sessionVersion} + 1`, updatedAt: new Date().toISOString() }).where(and(eq(members.id, actor.id), eq(members.sessionVersion, actor.sessionVersion), eq(members.active, 1))).returning();
    if (!rows.length) return privateJson({ error: "계정 상태가 바뀌었어요. 다시 로그인해 주세요." }, 409);
    await attempt.reset();
    return privateJson({ updated: true }, 200, { "Set-Cookie": memberCookie(request, await memberToken(rows[0])) });
  } catch (error) { console.error("Password change failed", error); return privateJson({ error: "비밀번호를 변경하지 못했어요." }, 503); }
}
