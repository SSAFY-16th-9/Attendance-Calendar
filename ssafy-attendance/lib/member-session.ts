import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { createSession, verifySession, SESSION_SECONDS } from "./admin-session";

export type MemberIdentity = { id: string; username: string; name: string; role: "member"; mustChangePassword: boolean; sessionVersion: number };
export function memberSecret() { return (env as unknown as Record<string, string | undefined>).ADMIN_SESSION_SECRET || ""; }
const name = (request: Request) => new URL(request.url).protocol === "https:" ? "__Host-ssafy_member" : "ssafy_member_local";
export function memberCookie(request: Request, token: string) { return `${name(request)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token ? SESSION_SECONDS : 0}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`; }
export async function memberToken(member: { id: string; sessionVersion: number }) { return createSession(`member:${member.id}:${member.sessionVersion}`, memberSecret()); }
export async function getMember(request: Request): Promise<MemberIdentity | null> {
  const secret = memberSecret();
  if (secret.length < 32) return null;
  const token = (request.headers.get("cookie") || "").split(";").map(value => value.trim()).find(value => value.startsWith(`${name(request)}=`))?.slice(name(request).length + 1);
  if (!token || token.length > 1024) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[0].replaceAll("-", "+").replaceAll("_", "/"))) as { username?: unknown };
    if (typeof payload.username !== "string" || !/^member:[0-9a-f-]{36}:\d+$/.test(payload.username)) return null;
    if (!await verifySession(token, payload.username, secret)) return null;
    const [, id, version] = payload.username.split(":");
    const [member] = await getDb().select().from(members).where(eq(members.id, id)).limit(1);
    if (!member || member.active !== 1 || member.sessionVersion !== Number(version)) return null;
    return { id: member.id, username: member.username, name: member.name, role: "member", mustChangePassword: member.mustChangePassword === 1, sessionVersion: member.sessionVersion };
  } catch { return null; }
}
