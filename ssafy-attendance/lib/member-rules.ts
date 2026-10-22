import { and, eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { members } from "@/db/schema";
import { adminConfig } from "./admin-auth";
import { passwordDigest } from "./admin-session";
import { isMemberName, isMemberUsername } from "./attendance";

// Account rules shared by the admin roster and self sign-up.
export const NAME_RULE = "이름은 한글·영문 1~20자로 입력해 주세요.";
export const USERNAME_RULE = "아이디는 영문·숫자·._- 3~40자로 입력해 주세요.";
export const reserved = (username: string) => username === adminConfig()?.username;
export const hashedPassword = async (password: string) => { const salt = crypto.randomUUID(); return { passwordSalt: salt, passwordHash: await passwordDigest(password, salt) }; };

// Why this person cannot join the class (empty when they can). Usernames are unique across every class; names only within one.
export async function memberProblem(db: ReturnType<typeof getDb>, cohort: string, { name, username }: { name: string; username: string }) {
  if (!isMemberName(name)) return NAME_RULE;
  if (!isMemberUsername(username) || reserved(username)) return USERNAME_RULE;
  const [[user], [person]] = await Promise.all([
    db.select({ id: members.id }).from(members).where(eq(members.username, username)).limit(1),
    db.select({ id: members.id }).from(members).where(and(eq(members.cohort, cohort), eq(members.name, name))).limit(1),
  ]);
  return user ? "이미 사용 중인 아이디예요." : person ? "이 기수에 같은 이름이 이미 있어요." : "";
}
