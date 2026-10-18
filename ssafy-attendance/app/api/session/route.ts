import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { adminConfig, consumeLoginAttempt, privateJson, sameOrigin, sessionCookie } from "@/lib/admin-auth";
import { ADMIN_REMEMBER_SECONDS, constantTimeEqual, createSession, MEMBER_REMEMBER_SECONDS, passwordDigest, SESSION_SECONDS } from "@/lib/admin-session";
import { getActor } from "@/lib/site-auth";
import { memberCookie, memberSecret, memberToken } from "@/lib/member-session";

export const dynamic = "force-dynamic";
export async function GET(request: Request) { return privateJson({ user: await getActor(request) }); }
export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "이 사이트에서 로그인해 주세요." }, 403);
  if (memberSecret().length < 32) return privateJson({ error: "로그인 서버 설정을 확인해 주세요." }, 503);
  if (Number(request.headers.get("content-length") || 0) > 2048) return privateJson({ error: "입력 내용이 너무 길어요." }, 413);
  let input: { username?: unknown; password?: unknown; remember?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "아이디와 비밀번호를 입력해 주세요." }, 400); }
  if (typeof input?.username !== "string" || typeof input.password !== "string" || !input.username || !input.password || input.username.length > 100 || input.password.length > 256) return privateJson({ error: "아이디와 비밀번호를 입력해 주세요." }, 400);
  try {
    const attempt = await consumeLoginAttempt(request, "member");
    if (!attempt.allowed) return privateJson({ error: "로그인 시도가 너무 많아요. 15분 후 다시 시도해 주세요." }, 429, { "Retry-After": "900" });
    const remember = input.remember === true;
    const config = adminConfig();
    if (config && input.username === config.username) {
      if (!constantTimeEqual(await passwordDigest(input.password, config.salt), config.hash)) return privateJson({ error: "아이디 또는 비밀번호가 올바르지 않아요." }, 401);
      await attempt.reset();
      const response = privateJson({ user: { role: "admin" }, next: "/" });
      const seconds = remember ? ADMIN_REMEMBER_SECONDS : SESSION_SECONDS;
      response.headers.append("Set-Cookie", sessionCookie(request, await createSession(config.username, config.secret, undefined, seconds), seconds));
      response.headers.append("Set-Cookie", memberCookie(request, ""));
      return response;
    }
    const [member] = await getDb().select().from(members).where(eq(members.username, input.username)).limit(1);
    const valid = constantTimeEqual(await passwordDigest(input.password, member?.passwordSalt || "invalid-member-placeholder"), member?.passwordHash || "");
    if (!member || member.active !== 1 || !valid) return privateJson({ error: "아이디 또는 비밀번호가 올바르지 않아요." }, 401);
    await attempt.reset();
    const response = privateJson({ user: { role: "member" }, next: member.mustChangePassword ? "/account" : "/" });
    const seconds = remember ? MEMBER_REMEMBER_SECONDS : SESSION_SECONDS;
    response.headers.append("Set-Cookie", memberCookie(request, await memberToken(member, seconds), seconds));
    response.headers.append("Set-Cookie", sessionCookie(request, ""));
    return response;
  } catch (error) { console.error("Member login failed", error); return privateJson({ error: "로그인하지 못했어요. 회원 데이터베이스 설정과 연결을 확인해 주세요." }, 503); }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "이 사이트에서 다시 시도해 주세요." }, 403);
  const response = privateJson({ user: null });
  response.headers.append("Set-Cookie", memberCookie(request, ""));
  response.headers.append("Set-Cookie", sessionCookie(request, ""));
  return response;
}
