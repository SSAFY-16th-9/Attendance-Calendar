import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cohorts, members } from "@/db/schema";
import { cohortFor } from "@/lib/cohort";
import { getActor } from "@/lib/site-auth";

export const dynamic = "force-dynamic";
// Names and the class label; the calendar is public, so the roster is too.
export async function GET(request: Request) {
  try {
    const db = getDb(); const cohort = await cohortFor(request, await getActor(request));
    const [rows, [info]] = await Promise.all([
      db.select({ name: members.name }).from(members).where(eq(members.cohort, cohort)),
      db.select({ id: cohorts.id, name: cohorts.name }).from(cohorts).where(eq(cohorts.id, cohort)).limit(1),
    ]);
    return Response.json({ names: rows.map(row => row.name).sort((a, b) => a.localeCompare(b, "ko")), cohort: info || { id: cohort, name: cohort } }, { headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
  } catch (error) { console.error("Roster read failed", error); return Response.json({ error: "명단을 불러오지 못했어요." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
