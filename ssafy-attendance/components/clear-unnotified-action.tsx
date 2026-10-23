"use client";
import { useState } from "react";
import { Info, LoaderCircle, ShieldOff } from "lucide-react";
import { AttendanceEntry } from "@/lib/attendance";
import { FINE_AMOUNT, won } from "@/lib/fines";

// Admin-only 무단 해제: cancels the record's fine (it stays in the ledger as 부과 취소) and removes the 무단 mark.
export default function ClearUnnotifiedAction({ entry, onChanged }: { entry: AttendanceEntry; onChanged: (message: string) => void }) {
  const [confirming, setConfirming] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function clear() {
    if (busy) return; setBusy(true); setError("");
    try {
      const r = await fetch("/api/admin/attendance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: entry.id, action: "clearUnnotified" }) });
      const d = await r.json() as { error?: string };
      if (!r.ok) throw new Error(d.error || "무단을 해제하지 못했어요.");
      setConfirming(false); onChanged(`${entry.name}님의 ${entry.type} 무단을 해제했어요.`);
    } catch (e) { setError(e instanceof Error ? e.message : "무단을 해제하지 못했어요."); } finally { setBusy(false); }
  }
  if (!confirming) return <button className="clear-unnotified-button" type="button" onClick={() => { setError(""); setConfirming(true); }}><ShieldOff size={14} />무단 해제</button>;
  return <div className="entry-delete-confirm clear-unnotified-confirm" role="alert">
    <p>이 출결의 무단을 해제할까요?{entry.fineId && entry.fineStatus !== "waived" ? ` 벌금 ${won(FINE_AMOUNT)}은 ‘부과 취소’로 바뀌고 벌금 내역에는 기록이 남아요.` : ""} 벌금 관리에서 ‘부과 복원’하면 다시 무단이 돼요.</p>
    {error && <p className="form-error"><Info size={15} />{error}</p>}
    <div><button className="secondary-button" type="button" disabled={busy} onClick={() => setConfirming(false)}>취소</button><button className="primary-button" type="button" disabled={busy} onClick={clear}>{busy ? <LoaderCircle size={14} className="spin" /> : <ShieldOff size={14} />}{busy ? "해제 중…" : "무단 해제"}</button></div>
  </div>;
}
