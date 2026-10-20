import { env } from "cloudflare:workers";
import { eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { adminLoginAttempts } from "@/db/schema";
import { verifySession, SESSION_SECONDS } from "./admin-session";
import { getMember } from "./member-session";

export function adminConfig() {
  const secrets = env as unknown as Record<string, string | undefined>;
  const { ADMIN_USERNAME, ADMIN_PASSWORD_HASH, ADMIN_PASSWORD_SALT, ADMIN_SESSION_SECRET } = secrets;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH || !ADMIN_PASSWORD_SALT || !ADMIN_SESSION_SECRET || ADMIN_SESSION_SECRET.length < 32) return null;
  return { username: ADMIN_USERNAME, hash: ADMIN_PASSWORD_HASH, salt: ADMIN_PASSWORD_SALT, secret: ADMIN_SESSION_SECRET };
}

export const privateJson = (data: unknown, status = 200, extraHeaders: Record<string, string> = {}) => Response.json(data, { status, headers: { "Cache-Control": "no-store, private", "Vary": "Cookie", ...extraHeaders } });
export const sameOrigin = (request: Request) => !request.headers.get("origin") || request.headers.get("origin") === new URL(request.url).origin;
const cookieName = (request: Request) => new URL(request.url).protocol === "https:" ? "__Host-ssafy_admin" : "ssafy_admin_local";

export function sessionCookie(request: Request, token: string, seconds = SESSION_SECONDS) {
  return `${cookieName(request)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token ? seconds : 0}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}

// The core admin is the account configured in ADMIN_USERNAME; only it grants or removes admin rights.
export async function isSuperAdmin(request: Request) {
  const config = adminConfig();
  if (!config) return false;
  const token = (request.headers.get("cookie") || "").split(";").map(part => part.trim()).find(part => part.startsWith(`${cookieName(request)}=`))?.slice(cookieName(request).length + 1) || "";
  return verifySession(token, config.username, config.secret);
}

// Admin pages and APIs accept the core admin or an active sub-admin who has set their own password.
export async function isAdmin(request: Request) {
  if (await isSuperAdmin(request)) return true;
  const member = await getMember(request);
  return !!member && member.isAdmin && !member.mustChangePassword;
}

export async function requireAdmin(request: Request) {
  if (!sameOrigin(request) || !await isAdmin(request)) {
    // Finish rejected request bodies before returning so local Worker streams
    // cannot outlive their request and disrupt the next administrator request.
    if (request.body && !request.bodyUsed) await request.text().catch(() => {});
    return !sameOrigin(request) ? privateJson({ error: "관리자 페이지에서 다시 시도해 주세요." }, 403) : privateJson({ error: "관리자 로그인이 필요해요." }, 401);
  }
  return null;
}

export async function consumeLoginAttempt(request: Request, scope = "admin") {
  const now = Math.floor(Date.now() / 1000);
  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${scope}:${request.headers.get("cf-connecting-ip") || "local"}`));
  const key = Array.from(new Uint8Array(keyBytes), byte => byte.toString(16).padStart(2, "0")).join("");
  const db = getDb();
  await db.delete(adminLoginAttempts).where(lt(adminLoginAttempts.windowStart, now - 900));
  const result = await db.insert(adminLoginAttempts).values({ key, attempts: 1, windowStart: now }).onConflictDoUpdate({ target: adminLoginAttempts.key, set: { attempts: sql`${adminLoginAttempts.attempts} + 1` } }).returning();
  return { allowed: result[0].attempts <= 10, reset: () => db.delete(adminLoginAttempts).where(eq(adminLoginAttempts.key, key)) };
}
