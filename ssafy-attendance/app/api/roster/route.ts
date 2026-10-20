import { getDb } from "@/db";
import { members } from "@/db/schema";

export const dynamic = "force-dynamic";
// Names only; the calendar is public, so the roster is too.
export async function GET() {
  try {
    const rows = await getDb().select({ name: members.name }).from(members);
    return Response.json({ names: rows.map(row => row.name).sort((a, b) => a.localeCompare(b, "ko")) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { console.error("Roster read failed", error); return Response.json({ error: "명단을 불러오지 못했어요." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
