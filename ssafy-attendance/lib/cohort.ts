import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cohorts, DEFAULT_COHORT } from "@/db/schema";
import { getActor, type Actor } from "./site-auth";

// Classes are stored as "기수-반" (e.g. 16-9) and shown as "16기 9반".
export const isCohortId = (value: unknown): value is string => typeof value === "string" && /^\d{1,3}-\d{1,2}$/.test(value);
export const cohortId = (generation: number, classNo: number) => `${generation}-${classNo}`;
export const cohortLabel = (generation: number, classNo: number) => `${generation}기 ${classNo}반`;

const COOKIE = "ssafy_cohort";
export const pickedCohort = (request: Request) => (request.headers.get("cookie") || "").split(";").map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
export const cohortCookie = (request: Request, id: string) => `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;

// The class a request works in: members and sub-admins always their own; the core admin the class picked in the admin bar;
// visitors (and the core admin before picking) the class marked current.
export async function cohortFor(request: Request, actor: Actor | null): Promise<string> {
  if (actor && !actor.superAdmin) return actor.cohort;
  const db = getDb();
  const picked = actor?.superAdmin ? pickedCohort(request) : undefined;
  if (isCohortId(picked)) {
    const [row] = await db.select({ id: cohorts.id }).from(cohorts).where(eq(cohorts.id, picked)).limit(1);
    if (row) return row.id;
  }
  const [current] = await db.select({ id: cohorts.id }).from(cohorts).where(eq(cohorts.isCurrent, 1)).limit(1);
  return current?.id || DEFAULT_COHORT;
}

export const workingCohort = async (request: Request) => cohortFor(request, await getActor(request));
