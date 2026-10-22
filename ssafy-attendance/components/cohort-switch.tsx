"use client";
import { useEffect, useState } from "react";
// Lets visitors (public classes) and the core admin (every live class) choose which class the calendar shows.
// Hidden when there is nothing to choose, which is always the case for members.
export default function CohortSwitch({ className = "" }: { className?: string }) {
  const [data, setData] = useState<{ cohorts: { id: string; name: string }[]; selected: string } | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/cohorts", { cache: "no-store" }).then(r => r.ok ? r.json() as Promise<NonNullable<typeof data>> : null).then(setData).catch(() => setData(null)); }, []);
  async function select(id: string) {
    setBusy(true);
    const r = await fetch("/api/cohorts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => null);
    if (r?.ok) location.reload(); else setBusy(false);
  }
  if (!data || data.cohorts.length < 2) return null;
  return <label className={`cohort-switch ${className}`}><span>기수 보기</span><select aria-label="볼 기수" value={data.selected} disabled={busy} onChange={e => select(e.target.value)}>{data.cohorts.map(cohort => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</select></label>;
}
