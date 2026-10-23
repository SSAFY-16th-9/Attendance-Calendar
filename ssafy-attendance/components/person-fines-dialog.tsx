"use client";
import { useEffect, useRef, useState } from "react";
import { Info, LoaderCircle, X } from "lucide-react";
import { isCancelledFine } from "@/lib/attendance";
import { Fine, FineStatus, FineSummary, STATUS_LABELS, won } from "@/lib/fines";
import FineRowActions from "./fine-row-actions";

type PersonFine = Fine & { reason: string };

// One person's 무단 and fine history across every month, opened from a 개인별 현황 card.
// Rows read like the ledger; admins get the same status buttons, and `version` refetches after a change.
export default function PersonFinesDialog({ name, version, onClose, onAction }: { name: string | null; version: number; onClose: () => void; onAction?: (entry: Fine, status: FineStatus) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<{ entries: PersonFine[]; summary: FineSummary } | null>(null); const [error, setError] = useState("");
  useEffect(() => { if (name) { setData(null); setError(""); if (!dialog.current?.open) dialog.current?.showModal(); } else dialog.current?.close(); }, [name]);
  useEffect(() => {
    if (!name) return;
    let current = true;
    fetch(`/api/fines?person=${encodeURIComponent(name)}`, { cache: "no-store" }).then(async r => {
      const result = await r.json() as { entries?: PersonFine[]; summary?: FineSummary; error?: string };
      if (!r.ok || !result.entries || !result.summary) throw new Error(result.error || "내역을 불러오지 못했어요.");
      if (current) setData({ entries: result.entries, summary: result.summary });
    }).catch(e => { if (current) setError(e instanceof Error ? e.message : "내역을 불러오지 못했어요."); });
    return () => { current = false; };
  }, [name, version]);
  return <dialog ref={dialog} className="modal person-fines-modal" aria-labelledby="person-fines-title" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal-header"><div className="entry-detail-heading"><span className="person-avatar avatar-0">{name?.slice(1)}</span><div><h2 id="person-fines-title">{name}</h2><span>무단·벌금 내역 · 전체 기간</span></div></div><button className="icon-button" type="button" onClick={onClose} aria-label="개인 내역 닫기"><X size={21} /></button></div>
    <div className="form-body">
      {error ? <p className="form-error" role="alert"><Info size={15} />{error}</p> : !data ? <p className="person-fines-loading"><LoaderCircle size={16} className="spin" />불러오는 중이에요</p> : <>
        <div className="person-fines-summary"><div><span>미납</span><b className={data.summary.outstanding ? "owed" : ""}>{won(data.summary.outstanding)}</b></div><div><span>납부</span><b>{won(data.summary.collected)}</b></div><div><span>부과 합계</span><b>{won(data.summary.assessed)}</b></div><div><span>취소·해제</span><b>{data.summary.waivedCount}건</b></div></div>
        {data.entries.length ? <ul className="person-fines-list">{data.entries.map(entry => <li key={entry.id} className={`${isCancelledFine(entry.status) ? "cancelled" : ""} ${onAction ? "managed" : ""}`}>
          <span className="person-fine-date">{entry.date}</span>
          <div className="person-fine-type">{entry.type}<small className="fine-unnotified">사전 공유 없음</small>{entry.reason && <p>{entry.reason}</p>}</div>
          <span className={`person-fine-amount ${isCancelledFine(entry.status) ? "fine-cancelled-amount" : ""}`}>{won(entry.amount)}</span>
          <div className="person-fine-status"><span className={`fine-status ${entry.status}`}>{STATUS_LABELS[entry.status]}</span>{entry.paidAt && <small>{new Date(entry.paidAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} 납부</small>}</div>
          {onAction && <FineRowActions entry={entry} onAction={onAction} />}
        </li>)}</ul> : <p className="person-fines-empty">무단·벌금 내역이 없어요.</p>}
      </>}
    </div>
  </dialog>;
}
