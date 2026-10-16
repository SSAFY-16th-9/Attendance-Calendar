import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { privateJson, requireAdmin } from "@/lib/admin-auth";
import { passwordDigest } from "@/lib/admin-session";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  try {
    const entries = await getDb().select({ id: members.id, username: members.username, name: members.name, active: members.active, mustChangePassword: members.mustChangePassword, sessionVersion: members.sessionVersion, updatedAt: members.updatedAt }).from(members).orderBy(members.name);
    return privateJson({ entries });
  } catch (error) { console.error("Member read failed", error); return privateJson({ error: "회원 목록을 불러오지 못했어요. 회원 초기 설정을 확인해 주세요." }, 503); }
}
export async function PATCH(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  let input: { id?: unknown; action?: unknown; password?: unknown; revision?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "변경할 회원을 확인해 주세요." }, 400); }
  if (typeof input?.id !== "string" || !/^[0-9a-f-]{36}$/.test(input.id) || !["activate", "deactivate", "reset"].includes(input.action as string) || !Number.isSafeInteger(input.revision) || (input.revision as number) < 0) return privateJson({ error: "변경 내용을 확인해 주세요." }, 400);
  if (input.action === "reset" && (typeof input.password !== "string" || input.password.length < 8 || input.password.length > 128)) return privateJson({ error: "임시 비밀번호를 8~128자로 입력해 주세요." }, 400);
  try {
    const update: Partial<typeof members.$inferInsert> = { updatedAt: new Date().toISOString() };
    if (input.action === "reset") {
      const salt = crypto.randomUUID(); update.passwordSalt = salt; update.passwordHash = await passwordDigest(input.password as string, salt); update.mustChangePassword = 1;
    } else update.active = input.action === "activate" ? 1 : 0;
    const rows = await getDb().update(members).set({ ...update, sessionVersion: sql`${members.sessionVersion} + 1` }).where(and(eq(members.id, input.id), eq(members.sessionVersion, input.revision as number))).returning({ id: members.id });
    if (!rows.length) return privateJson({ error: "회원 상태가 바뀌었어요. 새로고침 후 다시 시도해 주세요." }, 409);
    return privateJson({ updated: true });
  } catch (error) { console.error("Member update failed", error); return privateJson({ error: "회원정보를 변경하지 못했어요." }, 503); }
}
