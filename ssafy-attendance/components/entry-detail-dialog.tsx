"use client";
import { useEffect, useRef, useState } from "react";
import { Clock3, Info, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { AttendanceEntry, AttendanceType, TYPES } from "@/lib/attendance";
import { useAuth } from "./auth-provider";
import InlineFineAction from "./inline-fine-action";
const typeClass = (type: string) => `type-${TYPES.indexOf(type as AttendanceType)}`;
const formatDate = (date: string) => new Date(`${date}T12:00:00+09:00`).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Seoul" });
// Permissions mirror the server: members edit their own non-admin records, only admins delete.
export default function EntryDetailDialog({ name, entries, onClose, onEdit, onChanged }: { name: string | null; entries: AttendanceEntry[]; onClose: () => void; onEdit: (entry: AttendanceEntry) => void; onChanged: (message?: string) => void }) {
  const { user } = useAuth(); const dialog = useRef<HTMLDialogElement>(null);
  const [confirming, setConfirming] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const open = !!name && entries.length > 0;
  useEffect(() => { if (open) { if (!dialog.current?.open) { setConfirming(null); setError(""); dialog.current?.showModal(); } } else dialog.current?.close(); }, [open]);
  useEffect(() => { if (name && !entries.length) onClose(); }, [name, entries.length, onClose]);
  const canEdit = (entry: AttendanceEntry) => user?.role === "admin" || (user?.role === "member" && user.name === entry.name && !entry.adminRecord);
  const canDelete = user?.role === "admin";
  async function remove(entry: AttendanceEntry) {
    if (busy) return; setBusy(true); setError("");
    try { const r = await fetch("/api/admin/attendance", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: entry.id }) }); const d = await r.json() as { error?: string }; if (!r.ok) throw new Error(d.error || "삭제하지 못했어요."); setConfirming(null); onChanged(`${entry.name}님의 ${entry.type} 출결을 삭제했어요.`); } catch (e) { setError(e instanceof Error ? e.message : "삭제하지 못했어요."); } finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="modal entry-detail-modal" aria-labelledby="entry-detail-title" onCancel={e => { if (busy) e.preventDefault(); else onClose(); }} onClick={e => { if (e.target === e.currentTarget && !busy) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}>
    <div className="modal-header"><div className="entry-detail-heading"><span className="person-avatar avatar-0">{name?.slice(1)}</span><div><h2 id="entry-detail-title">{name}</h2><span>{entries[0] && formatDate(entries[0].date)} · 출결 {entries.length}건</span></div></div><button className="icon-button" type="button" disabled={busy} onClick={onClose} aria-label="출결 상세 닫기"><X size={21} /></button></div>
    <div className="entry-detail-list">{entries.map(entry => <div className="entry-detail" key={entry.id}>
      <div className="entry-type-line"><span className={`type-badge ${entry.unnotified ? "unnotified" : typeClass(entry.type)}`}>{entry.unnotified ? "무단 · " : ""}{entry.type}</span><span>출결 사유</span></div>
      <label>상세 이유</label><p className={!entry.reason ? "no-reason" : ""}>{entry.reason || "작성된 상세 이유가 없어요."}</p>
      <div className="entry-footer"><span><Clock3 size={12} />{new Date(entry.createdAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" })} 등록</span>{(canEdit(entry) || canDelete) && <div className="entry-actions">{canEdit(entry) && <button className="secondary-button" type="button" disabled={busy} onClick={() => onEdit(entry)}><Pencil size={13} />수정</button>}{canDelete && <button className="secondary-button entry-delete" type="button" disabled={busy} onClick={() => { setError(""); setConfirming(entry.id); }}><Trash2 size={13} />삭제</button>}</div>}</div>
      {confirming === entry.id && <div className="entry-delete-confirm" role="alert"><p>이 출결을 삭제할까요? 삭제 후에는 되돌릴 수 없어요.{entry.fineId ? " 부과된 벌금도 함께 삭제됩니다." : ""}</p><div><button className="secondary-button" type="button" disabled={busy} onClick={() => setConfirming(null)}>취소</button><button className="primary-button danger-button" type="button" disabled={busy} onClick={() => remove(entry)}>{busy ? <LoaderCircle size={14} className="spin" /> : <Trash2 size={14} />}{busy ? "삭제 중…" : "삭제하기"}</button></div></div>}
      {user?.role === "admin" && <InlineFineAction entry={entry} onChanged={() => onChanged()} />}
    </div>)}{error && <p className="form-error" role="alert"><Info size={15} />{error}</p>}</div>
  </dialog>;
}
