"use client";
import { useEffect, useState } from "react";
import { Check, GraduationCap, Info, Plus } from "lucide-react";
type Cohort = { id: string; name: string; isCurrent: number; members: number };
// The class an admin page works in. The core admin can switch classes (and, with `manage`, add one or pick the public one);
// a sub-admin only ever sees their own class.
export default function CohortBar({ manage = false }: { manage?: boolean }) {
  const [data, setData] = useState<{ cohorts: Cohort[]; selected: string; superAdmin: boolean } | null>(null);
  const [adding, setAdding] = useState(false); const [generation, setGeneration] = useState(""); const [classNo, setClassNo] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { fetch("/api/admin/cohorts", { cache: "no-store" }).then(r => r.ok ? r.json() as Promise<NonNullable<typeof data>> : null).then(setData).catch(() => setData(null)); }, []);
  async function send(method: "POST" | "PATCH", body: object) {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/admin/cohorts", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await r.json() as { error?: string };
      if (!r.ok) throw new Error(result.error || "처리하지 못했어요.");
      location.reload();
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); setBusy(false); }
  }
  if (!data) return null;
  const selected = data.cohorts.find(cohort => cohort.id === data.selected);
  const current = data.cohorts.find(cohort => cohort.isCurrent);
  return <section className="cohort-bar" aria-label="관리 중인 기수">
    <div className="cohort-main"><GraduationCap size={18} /><span>관리 중인 기수</span>
      {data.superAdmin && data.cohorts.length > 1
        ? <select aria-label="관리할 기수" value={data.selected} disabled={busy} onChange={e => send("PATCH", { id: e.target.value, action: "select" })}>{data.cohorts.map(cohort => <option key={cohort.id} value={cohort.id}>{cohort.name} · {cohort.members}명{cohort.isCurrent ? " (캘린더 공개)" : ""}</option>)}</select>
        : <strong>{selected?.name ?? data.selected}</strong>}
      {manage && data.superAdmin && <div className="cohort-actions">
        {selected && !selected.isCurrent && <button className="secondary-button" disabled={busy} onClick={() => send("PATCH", { id: selected.id, action: "current" })}><Check size={14} />캘린더 공개 기수로</button>}
        <button className="secondary-button" disabled={busy} onClick={() => setAdding(!adding)}><Plus size={14} />새 기수</button>
      </div>}
    </div>
    <p className="cohort-help">{data.superAdmin ? `로그인 없이 보는 캘린더와 회원 화면에는 ${current?.name ?? "공개 기수"}이(가) 보여요. 회원은 언제나 자기 기수만 봐요.` : "하위 관리자는 자기 기수만 관리할 수 있어요."}</p>
    {adding && <form className="cohort-add" onSubmit={e => { e.preventDefault(); send("POST", { generation: Number(generation), classNo: Number(classNo) }); }}>
      <label><input type="number" inputMode="numeric" min={1} max={999} required aria-label="기수" placeholder="17" value={generation} onChange={e => setGeneration(e.target.value)} />기</label>
      <label><input type="number" inputMode="numeric" min={1} max={99} required aria-label="반" placeholder="9" value={classNo} onChange={e => setClassNo(e.target.value)} />반</label>
      <button className="primary-button" disabled={busy}>추가하고 관리하기</button>
    </form>}
    {error && <p className="form-error" role="alert"><Info size={15} />{error}</p>}
  </section>;
}
