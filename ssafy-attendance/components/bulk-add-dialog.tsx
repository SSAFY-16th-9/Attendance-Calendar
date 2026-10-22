"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ClipboardList, Info, X } from "lucide-react";
import { parseRoster } from "@/lib/roster-paste";
type Row = { name: string; username: string; problem: string; result?: "added" | string };

// Paste → check (nothing saved yet) → add the rows that passed, one request each so every row reports its own result.
export default function BulkAddDialog({ open, className, onClose, onAdded }: { open: boolean; className: string; onClose: () => void; onAdded: (count: number, failed: number) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState(""); const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(0); const [error, setError] = useState("");
  useEffect(() => { if (open) { setText(""); setRows(null); setError(""); setProgress(0); ref.current?.showModal(); } else ref.current?.close(); }, [open]);
  const ready = rows?.filter(row => !row.problem && !row.result) ?? [];
  const finished = !!rows?.some(row => row.result);

  async function check() {
    const parsed = parseRoster(text);
    if (!parsed.length) { setError("한 줄에 한 명씩 이름과 아이디를 붙여넣어 주세요."); return; }
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/admin/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ check: parsed }) });
      const data = await r.json() as { rows?: Row[]; error?: string };
      if (!r.ok || !data.rows) throw new Error(data.error || "확인하지 못했어요.");
      setRows(data.rows);
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); } finally { setBusy(false); }
  }

  async function add() {
    if (!rows) return;
    setBusy(true); setError(""); setProgress(0);
    const next = [...rows]; let added = 0, failed = 0;
    for (const [index, row] of rows.entries()) {
      if (row.problem || row.result) continue;
      try {
        const r = await fetch("/api/admin/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: row.name, username: row.username }) });
        const data = await r.json() as { error?: string };
        next[index] = { ...row, result: r.ok ? "added" : data.error || "추가하지 못했어요." };
      } catch { next[index] = { ...row, result: "연결이 끊겨 추가하지 못했어요." }; }
      if (next[index].result === "added") added++; else failed++;
      setProgress(added + failed); setRows([...next]);
    }
    setBusy(false);
    if (added) onAdded(added, failed);
  }

  return <dialog ref={ref} className="modal bulk-modal" aria-labelledby="bulk-title" onCancel={e => { if (busy) e.preventDefault(); else onClose(); }}>
    <div className="modal-header"><div><span className="modal-symbol"><ClipboardList size={22} /></span><h2 id="bulk-title">{className ? `${className} ` : ""}명단 붙여넣기</h2></div><button className="icon-button" type="button" disabled={busy} onClick={onClose} aria-label="명단 붙여넣기 창 닫기"><X size={20} /></button></div>
    <p className="modal-description">엑셀·구글 시트에서 이름과 아이디 두 칸을 복사해 붙여넣으세요. 한 줄에 한 명이고 순서는 상관없어요. 처음 비밀번호는 각자의 아이디와 같아요.</p>
    <div className="form-body">
      {!rows ? <div className="field"><label htmlFor="bulk-text">이름 · 아이디</label><textarea id="bulk-text" className="bulk-text" value={text} disabled={busy} onChange={e => setText(e.target.value)} placeholder={"홍길동\tgildong01\n김철수\tchulsoo22"} /><span className="field-help">{parseRoster(text).length}명 인식 · 한 번에 60명까지</span></div>
        : <div className="admin-table-scroll bulk-preview"><table className="admin-table"><thead><tr><th>이름</th><th>아이디</th><th>확인</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index} className={row.problem || (row.result && row.result !== "added") ? "bulk-bad" : ""}>
          <td>{row.name || "—"}</td><td>{row.username ? `@${row.username}` : "—"}</td>
          <td>{row.result === "added" ? <span className="fine-status paid">추가됨</span> : row.result ? <span className="bulk-problem">{row.result}</span> : row.problem ? <span className="bulk-problem">{row.problem}</span> : <span className="fine-status unpaid">추가 가능</span>}</td>
        </tr>)}</tbody></table></div>}
      {rows && <p className="field-help">{finished ? `${rows.filter(row => row.result === "added").length}명 추가 완료` : `추가 가능 ${ready.length}명 · 확인 필요 ${rows.length - ready.length}명`}{busy && progress ? ` · ${progress}/${ready.length + progress}` : ""}. 빨간 줄은 추가되지 않아요.</p>}
      {error && <p className="form-error" role="alert"><Info size={15} />{error}</p>}
    </div>
    <div className="modal-footer"><span>관리자 전용</span><div>
      {rows && !busy && !finished && <button className="secondary-button" type="button" onClick={() => setRows(null)}>다시 붙여넣기</button>}
      {!rows ? <button className="primary-button" type="button" disabled={busy || !text.trim()} onClick={check}>{busy ? "확인 중…" : "확인하기"}</button>
        : finished || !ready.length ? <button className="primary-button" type="button" disabled={busy} onClick={onClose}><Check size={15} />닫기</button>
        : <button className="primary-button" type="button" disabled={busy} onClick={add}>{busy ? "추가 중…" : `${ready.length}명 추가하기`}</button>}
    </div></div>
  </dialog>;
}
