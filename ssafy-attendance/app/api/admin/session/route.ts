import { adminConfig, consumeLoginAttempt, isAdmin, privateJson, sameOrigin, sessionCookie } from "@/lib/admin-auth";
import { constantTimeEqual, createSession, passwordDigest } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return privateJson({ authenticated: await isAdmin(request) });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "이 페이지에서 다시 로그인해 주세요." }, 403);
  const config = adminConfig();
  if (!config) return privateJson({ error: "관리자 계정 설정을 확인해 주세요." }, 503);
  if (Number(request.headers.get("content-length") || 0) > 2048) return privateJson({ error: "입력 내용이 너무 길어요." }, 413);
  let input: { username?: unknown; password?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "아이디와 비밀번호를 입력해 주세요." }, 400); }
  if (typeof input?.username !== "string" || typeof input?.password !== "string" || input.username.length > 100 || input.password.length > 256 || !input.password) return privateJson({ error: "아이디와 비밀번호를 입력해 주세요." }, 400);
  try {
    const attempt = await consumeLoginAttempt(request);
    if (!attempt.allowed) return privateJson({ error: "로그인 시도가 너무 많아요. 15분 후 다시 시도해 주세요." }, 429, { "Retry-After": "900" });
    const digest = await passwordDigest(input.password, config.salt);
    const correctPassword = constantTimeEqual(digest, config.hash);
    const correctUsername = constantTimeEqual(input.username, config.username);
    if (!correctPassword || !correctUsername) return privateJson({ error: "아이디 또는 비밀번호가 올바르지 않아요." }, 401);
    await attempt.reset();
    return privateJson({ authenticated: true }, 200, { "Set-Cookie": sessionCookie(request, await createSession(config.username, config.secret)) });
  } catch (error) {
    console.error("Admin login unavailable", error);
    return privateJson({ error: "로그인하지 못했어요. 잠시 후 다시 시도해 주세요." }, 503);
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "이 페이지에서 다시 시도해 주세요." }, 403);
  return privateJson({ authenticated: false }, 200, { "Set-Cookie": sessionCookie(request, "") });
}
