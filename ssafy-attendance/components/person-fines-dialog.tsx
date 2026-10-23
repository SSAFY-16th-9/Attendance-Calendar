"use client";
import { useEffect, useRef, useState } from "react";
import { Info, LoaderCircle, X } from "lucide-react";
import { isCancelledFine } from "@/lib/attendance";
import { Fine, FineSummary, STATUS_LABELS, won } from "@/lib/fines";

type PersonFine = Fine & { reason: string };

// One person's 무단 and fine history across every month, opened from a 개인별 현황 card.
export default function PersonFinesDialog({ name, onClose }: { name: string | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<{ entries: PersonFine[]; summary: FineSummary } | null>(null); const [error, setError] = useState("");
  useEffect(() => {
    if (!name) { dialog.current?.close(); return; }
    setData(null); setError(""); dialog.current?.showModal();
    let current = true;
    fetch(`/api/fines?person=${encodeURIComponent(name)}`, { cache: "no-store" }).then(async r => {
      const result = await r.json() as { entries?: PersonFine[]; summary?: FineSummary; error?: string };
      if (!r.ok || !result.entries || !result.summary) throw new Error(result.error || "내역을 불러오지 못했어요.");
      if (current) setData({ entries: result.entries, summary: result.summary });
    }).catch(e => { if (current) setError(e instanceof Error ? e.message : "내역을 불러오지 못했어요."); });
    return () => { current = false; };
  }, [name]);
  return <dialog ref={dialog} className="modal person-fines-modal" aria-labelledby="person-fines-title" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal-header"><div className="entry-detail-heading"><span className="person-avatar avatar-0">{name?.slice(1)}</span><div><h2 id="person-fines-title">{name}</h2><span>무단·벌금 내역 · 전체 기간</span></div></div><button className="icon-button" type="button" onClick={onClose} aria-label="개인 내역 닫기"><X size={21} /></button></div>
    <div className="form-body">
      {error ? <p className="form-error" role="alert"><Info size={15} />{error}</p> : !data ? <p className="person-fines-loading"><LoaderCircle size={16} className="spin" />불러오는 중이에요</p> : <>
        <div className="person-fines-summary"><div><span>미납</span><b className={data.summary.outstanding ? "owed" : ""}>{won(data.summary.outstanding)}</b></div><div><span>납부</span><b>{won(data.summary.collected)}</b></div><div><span>부과 합계</span><b>{won(data.summary.assessed)}</b></div><div><span>취소·해제</span><b>{data.summary.waivedCount}건</b></div></div>
        {data.entries.length ? <ul className="person-fines-list">{data.entries.map(entry => <li key={entry.id} className={isCancelledFine(entry.status) ? "cancelled" : ""}>
          <div><strong>{entry.date}</strong><span>{entry.type}</span></div>
          {entry.reason && <p>{entry.reason}</p>}
          <footer><span className={isCancelledFine(entry.status) ? "fine-cancelled-amount" : ""}>{won(entry.amount)}</span><span className={`fine-status ${entry.status}`}>{STATUS_LABELS[entry.status]}</span>{entry.paidAt && <small>{new Date(entry.paidAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} 납부</small>}</footer>
        </li>)}</ul> : <p className="person-fines-empty">무단·벌금 내역이 없어요.</p>}
      </>}
    </div>
  </dialog>;
}
