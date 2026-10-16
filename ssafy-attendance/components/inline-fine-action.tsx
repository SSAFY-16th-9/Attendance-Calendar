"use client";
import { useRef, useState } from "react";
import { Check, Info, X } from "lucide-react";
import { AttendanceEntry } from "@/lib/attendance";
import { FINE_AMOUNT, won } from "@/lib/fines";
export default function InlineFineAction({ entry, onChanged }: { entry: AttendanceEntry; onChanged: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function assess(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try { const r = await fetch("/api/admin/fines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attendanceId: entry.id, unnotified: true }) }); const d = await r.json() as { error?: string }; if (!r.ok) throw new Error(d.error || "부과하지 못했어요."); dialog.current?.close(); onChanged(); } catch (e) { setError(e instanceof Error ? e.message : "부과하지 못했어요."); } finally { setBusy(false); }
  }
  if (entry.fineId) return <a className="inline-fine-existing" href="/admin/fines">{entry.fineStatus === "waived" ? "부과 취소됨 · 벌금 관리" : "벌금 부과됨 · 납부 관리"}</a>;
  return <><button className="inline-fine-button" onClick={() => { setError(""); dialog.current?.showModal(); }}>벌금 부과 · {won(FINE_AMOUNT)}</button><dialog ref={dialog} className="modal" aria-labelledby={`fine-title-${entry.id}`} onCancel={e => { if (busy) e.preventDefault(); }}><form onSubmit={assess}><div className="modal-header"><div><h2 id={`fine-title-${entry.id}`}>사전 공유 없는 출결인가요?</h2></div><button className="icon-button" type="button" disabled={busy} onClick={() => dialog.current?.close()} aria-label="벌금 확인 창 닫기"><X size={21} /></button></div><p className="modal-description">미리 알린 출결에는 부과하지 않습니다. 미공유가 확인된 경우에만 진행해 주세요.</p><div className="form-body"><div className="delete-entry-summary"><strong>{entry.name}</strong><span>{entry.date} · {entry.type}</span><p>무단 확인 · {won(FINE_AMOUNT)} · 미납으로 부과</p></div>{error && <p className="form-error" role="alert"><Info size={15} />{error}</p>}</div><div className="modal-footer"><span>관리자 전용</span><div><button className="secondary-button" type="button" disabled={busy} onClick={() => dialog.current?.close()}>취소</button><button className="primary-button admin-danger" disabled={busy}><Check size={15} />{busy ? "처리 중…" : "무단 확인 후 부과"}</button></div></div></form></dialog></>;
}
