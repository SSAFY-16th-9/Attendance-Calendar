"use client";
import { useEffect, useRef, useState } from "react";
import { Clock3, Info, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { AttendanceEntry, shortDate, statusClass, statusPrefix } from "@/lib/attendance";
import { useAuth } from "./auth-provider";
import InlineFineAction from "./inline-fine-action";
const formatDate = (date: string) => new Date(`${date}T12:00:00+09:00`).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Seoul" });
// Permissions mirror the server: members edit and delete their own records, except that 무단 ones keep their date and only admins delete them.
export default function EntryDetailDialog({ name, entries, onClose, onEdit, onChanged, groupFor }: { name: string | null; entries: AttendanceEntry[]; onClose: () => void; onEdit: (entry: AttendanceEntry) => void; onChanged: (message?: string) => void; groupFor: (entry: AttendanceEntry) => AttendanceEntry[] }) {
  const { user } = useAuth(); const dialog = useRef<HTMLDialogElement>(null);
  const [confirming, setConfirming] = useState<string | null>(null); const [deleteGroup, setDeleteGroup] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const open = !!name && entries.length > 0;
  useEffect(() => { if (open) { if (!dialog.current?.open) { setConfirming(null); setError(""); dialog.current?.showModal(); } } else dialog.current?.close(); }, [open]);
  useEffect(() => { if (name && !entries.length) onClose(); }, [name, entries.length, onClose]);
  const canEdit = (entry: AttendanceEntry) => user?.role === "admin" || (user?.role === "member" && user.name === entry.name);
  const canDelete = (entry: AttendanceEntry) => user?.role === "admin" || (user?.role === "member" && user.name === entry.name && !entry.unnotified);
  async function remove(entry: AttendanceEntry) {
    if (busy) return; setBusy(true); setError("");
    const all = deleteGroup && groupFor(entry).length > 1;
    try { const r = await fetch(user?.role === "admin" ? "/api/admin/attendance" : "/api/attendance", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: entry.id, ...(all ? { scope: "group" } : {}) }) }); const d = await r.json() as { error?: string; count?: number }; if (!r.ok) throw new Error(d.error || "삭제하지 못했어요."); setConfirming(null); onChanged(all ? `${entry.name}님의 함께 등록한 출결 ${d.count || ""}건을 삭제했어요.` : `${entry.name}님의 ${entry.type} 출결을 삭제했어요.`); } catch (e) { setError(e instanceof Error ? e.message : "삭제하지 못했어요."); } finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="modal entry-detail-modal" aria-labelledby="entry-detail-title" onCancel={e => { if (busy) e.preventDefault(); else onClose(); }} onClick={e => { if (e.target === e.currentTarget && !busy) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}>
    <div className="modal-header"><div className="entry-detail-heading"><span className="person-avatar avatar-0">{name?.slice(1)}</span><div><h2 id="entry-detail-title">{name}</h2><span>{entries[0] && formatDate(entries[0].date)} · 출결 {entries.length}건</span></div></div><button className="icon-button" type="button" disabled={busy} onClick={onClose} aria-label="출결 상세 닫기"><X size={21} /></button></div>
    <div className="entry-detail-list">{entries.map(entry => <div className="entry-detail" key={entry.id}>
      <div className="entry-type-line"><span className={`type-badge ${statusClass(entry)}`}>{statusPrefix(entry)}{entry.type}</span><span>출결 사유</span></div>
      <label>상세 이유</label><p className={!entry.reason ? "no-reason" : ""}>{entry.reason || "작성된 상세 이유가 없어요."}</p>
      <div className="entry-footer"><span><Clock3 size={12} />{new Date(entry.createdAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" })} 등록</span>{(canEdit(entry) || canDelete(entry)) && <div className="entry-actions">{canEdit(entry) && <button className="secondary-button" type="button" disabled={busy} onClick={() => onEdit(entry)}><Pencil size={13} />수정</button>}{canDelete(entry) && <button className="secondary-button entry-delete" type="button" disabled={busy} onClick={() => { setError(""); setDeleteGroup(false); setConfirming(entry.id); }}><Trash2 size={13} />삭제</button>}</div>}</div>
      {confirming === entry.id && <div className="entry-delete-confirm" role="alert"><p>이 출결을 삭제할까요? 삭제 후에는 되돌릴 수 없어요.{entry.fineId ? " 부과된 벌금도 함께 삭제됩니다." : ""}</p>{groupFor(entry).length > 1 && <label className="group-delete-toggle"><input type="checkbox" checked={deleteGroup} onChange={e => setDeleteGroup(e.target.checked)} />함께 등록한 {groupFor(entry).length}일 모두 삭제<span>{groupFor(entry).map(item => shortDate(item.date)).join(", ")}</span></label>}<div><button className="secondary-button" type="button" disabled={busy} onClick={() => setConfirming(null)}>취소</button><button className="primary-button danger-button" type="button" disabled={busy} onClick={() => remove(entry)}>{busy ? <LoaderCircle size={14} className="spin" /> : <Trash2 size={14} />}{busy ? "삭제 중…" : "삭제하기"}</button></div></div>}
      {user?.role === "admin" && <InlineFineAction entry={entry} onChanged={() => onChanged()} />}
    </div>)}{error && <p className="form-error" role="alert"><Info size={15} />{error}</p>}</div>
  </dialog>;
}
