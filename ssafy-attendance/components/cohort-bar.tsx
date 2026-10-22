"use client";
import { useEffect, useState } from "react";
import { GraduationCap, Info } from "lucide-react";
export type AdminCohort = { id: string; name: string; visibility: "public" | "private"; joinCode: string | null; deletedAt: string | null; members: number };
export type AdminCohorts = { cohorts: AdminCohort[]; selected: string; superAdmin: boolean };
export const loadAdminCohorts = () => fetch("/api/admin/cohorts", { cache: "no-store" }).then(r => r.ok ? r.json() as Promise<AdminCohorts> : null);

// The class an admin page works in. The core admin can switch between live classes; a sub-admin only sees their own.
export default function CohortBar() {
  const [data, setData] = useState<AdminCohorts | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { loadAdminCohorts().then(setData).catch(() => setData(null)); }, []);
  async function select(id: string) {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/admin/cohorts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "select" }) });
      if (!r.ok) throw new Error((await r.json() as { error?: string }).error || "기수를 바꾸지 못했어요.");
      location.reload();
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); setBusy(false); }
  }
  if (!data) return null;
  const live = data.cohorts.filter(cohort => !cohort.deletedAt);
  const selected = live.find(cohort => cohort.id === data.selected);
  return <section className="cohort-bar" aria-label="관리 중인 기수">
    <div className="cohort-main"><GraduationCap size={18} /><span>관리 중인 기수</span>
      {data.superAdmin && live.length > 1
        ? <select aria-label="관리할 기수" value={data.selected} disabled={busy} onChange={e => select(e.target.value)}>{live.map(cohort => <option key={cohort.id} value={cohort.id}>{cohort.name} · {cohort.members}명 · {cohort.visibility === "public" ? "공개" : "비공개"}</option>)}</select>
        : <strong>{selected?.name ?? "없음"}</strong>}
      {selected && <span className={`visibility-badge ${selected.visibility}`}>{selected.visibility === "public" ? "공개" : "비공개"}</span>}
    </div>
    {error && <p className="form-error" role="alert"><Info size={15} />{error}</p>}
  </section>;
}
