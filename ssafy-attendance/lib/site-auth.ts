import { isSuperAdmin, privateJson, sameOrigin } from "./admin-auth";
import { getMember, MemberIdentity } from "./member-session";

export type Actor = (MemberIdentity & { superAdmin?: false }) | (Omit<MemberIdentity, "role"> & { role: "admin"; superAdmin: false }) | { id: null; username: "admin"; name: "관리자"; role: "admin"; mustChangePassword: false; superAdmin: true };
export async function getActor(request: Request): Promise<Actor | null> {
  if (await isSuperAdmin(request)) return { id: null, username: "admin", name: "관리자", role: "admin", mustChangePassword: false, superAdmin: true };
  const member = await getMember(request);
  // A sub-admin still on the first password stays a member until it is changed.
  if (member?.isAdmin && !member.mustChangePassword) return { ...member, role: "admin", superAdmin: false };
  return member;
}
export async function requireActor(request: Request) {
  if (!sameOrigin(request)) return { error: privateJson({ error: "이 사이트에서 다시 시도해 주세요." }, 403), actor: null };
  const actor = await getActor(request);
  if (!actor) return { error: privateJson({ error: "로그인이 필요해요." }, 401), actor: null };
  if (actor.mustChangePassword) return { error: privateJson({ error: "첫 로그인 비밀번호를 변경해 주세요.", passwordChangeRequired: true }, 403), actor: null };
  return { error: null, actor };
}
