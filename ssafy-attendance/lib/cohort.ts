import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { cohorts } from "@/db/schema";
import { getActor, type Actor } from "./site-auth";
export { formatJoinCode, newJoinCode, normalizeJoinCode } from "./join-code";

// Classes are stored as "기수-반" (e.g. 16-9) and shown as "16기 9반".
export const isCohortId = (value: unknown): value is string => typeof value === "string" && /^\d{1,3}-\d{1,2}$/.test(value);
export const cohortId = (generation: number, classNo: number) => `${generation}-${classNo}`;
export const cohortLabel = (generation: number, classNo: number) => `${generation}기 ${classNo}반`;
export const VISIBILITIES = ["public", "private"] as const;

const COOKIE = "ssafy_cohort";
export const pickedCohort = (request: Request) => (request.headers.get("cookie") || "").split(";").map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
export const cohortCookie = (request: Request, id: string) => `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;

// Classes a viewer can switch between, newest first: every live class for the core admin, public ones for visitors.
// Members and sub-admins always stay in their own class, so they get none.
export async function viewableCohorts(actor: Actor | null) {
  if (actor && !actor.superAdmin) return [];
  return getDb().select({ id: cohorts.id, name: cohorts.name }).from(cohorts)
    .where(and(isNull(cohorts.deletedAt), actor ? undefined : eq(cohorts.visibility, "public")))
    .orderBy(sql`CAST(${cohorts.id} AS INTEGER) DESC`, cohorts.id);
}

// The class a request works in: members and sub-admins their own; the core admin and visitors the class they picked,
// or else the newest one they may see. Empty when a visitor has no public class to see.
export async function cohortFor(request: Request, actor: Actor | null): Promise<string> {
  if (actor && !actor.superAdmin) return actor.cohort;
  const options = await viewableCohorts(actor); const picked = pickedCohort(request);
  return options.find(option => option.id === picked)?.id ?? options[0]?.id ?? "";
}

export const workingCohort = async (request: Request) => cohortFor(request, await getActor(request));
