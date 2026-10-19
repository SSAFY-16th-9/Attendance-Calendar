"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Info, LoaderCircle, Pencil, X } from "lucide-react";
import { AttendanceEntry, canonicalName, MAX_DATES, shortDate, TYPES } from "@/lib/attendance";
import { FINE_AMOUNT, won } from "@/lib/fines";
import { useAuth } from "./auth-provider";
export default function AttendanceEditor({ data, onClose, onSaved, findExisting, onEditExisting, groupFor }: { data: { date: string; entry?: AttendanceEntry } | null; onClose: () => void; onSaved: (entry: AttendanceEntry, count: number, edited: boolean) => void; findExisting: (date: string, name: string) => AttendanceEntry | undefined; onEditExisting: (entry: AttendanceEntry) => void; groupFor: (entry: AttendanceEntry) => AttendanceEntry[] }) {
  const { user } = useAuth(); const dialog = useRef<HTMLDialogElement>(null);
  const [date, setDate] = useState(""); const [dates, setDates] = useState<string[]>([]); const [groupAll, setGroupAll] = useState(true);
  const [type, setType] = useState(""); const [reason, setReason] = useState(""); const [memberId, setMemberId] = useState(""); const [unnotified, setUnnotified] = useState(false); const [pending, setPending] = useState(false);
  const [members, setMembers] = useState<{ id: string; name: string; active: number }[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { if (data) { setDate(data.date); setDates([data.date]); setGroupAll(true); setType(data.entry?.type || ""); setReason(data.entry?.reason || ""); setError(""); setBusy(false); setMemberId(""); setUnnotified(false); setPending(!!data.entry?.pending); if (!dialog.current?.open) dialog.current?.showModal(); } else dialog.current?.close(); }, [data]);
  useEffect(() => { if (data && user?.role === "admin") fetch("/api/admin/members", { cache: "no-store" }).then(async r => { const d = await r.json() as { entries: { id: string; name: string; active: number }[]; error?: string }; if (!r.ok) throw new Error(d.error); setMembers(d.entries); if (data.entry) { const owner = d.entries.find(member => member.name === canonicalName(data.entry!.name)); if (owner) setMemberId(owner.id); } }).catch(() => setError("회원 목록을 불러오지 못했어요.")); }, [data, user]);
  const editing = !!data?.entry;
  // Records registered together can be edited together; their dates stay as they are.
  const group = data?.entry ? groupFor(data.entry) : [];
  const editGroup = editing && group.length > 1 && groupAll;
  const canFine = user?.role === "admin" && !editing; const withFine = canFine && unnotified && !pending;
  // 미정 cannot apply to 무단 records or to a record being fined.
  const canPending = !(editGroup ? group.some(item => item.unnotified) : data?.entry?.unnotified) && !withFine;
  // One record per person per day: point to the existing record instead of adding another.
  const targetName = user?.role === "admin" ? members.find(member => member.id === memberId)?.name : user?.name;
  const conflicts = !data || !targetName || editGroup ? [] : (editing ? [date] : dates).map(day => findExisting(day, targetName)).filter((item): item is AttendanceEntry => !!item && item.id !== data.entry?.id);
  const dateLocked = user?.role === "member" && !!data?.entry?.unnotified;
  function addDate(value: string) {
    if (!value || dates.includes(value)) return;
    if (dates.length >= MAX_DATES) { setError(`날짜는 한 번에 ${MAX_DATES}개까지 선택할 수 있어요.`); return; }
    setError(""); setDates([...dates, value].sort());
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy || conflicts.length) return;
    if (!editing && !dates.length) { setError("날짜를 하나 이상 선택해 주세요."); return; }
    setBusy(true); setError("");
    const admin = user?.role === "admin" ? { memberId, name: members.find(member => member.id === memberId)?.name } : {};
    try {
      const r = withFine
        ? await fetch("/api/admin/incidents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: crypto.randomUUID(), dates, type, reason, memberId, unnotified: true }) })
        : await fetch(user?.role === "admin" ? "/api/admin/attendance" : "/api/attendance", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing ? { id: data?.entry?.id, date, type, reason, pending: canPending && pending, ...(editGroup ? { scope: "group" } : {}), ...admin } : { dates, type, reason, pending: canPending && pending, ...admin }) });
      const result = await r.json() as { entry: AttendanceEntry; entries?: AttendanceEntry[]; error?: string };
      if (!r.ok) throw new Error(result.error || "저장하지 못했어요.");
      onSaved(result.entry, result.entries?.length || 1, editing); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했어요."); } finally { setBusy(false); }
  }
  const dateField = editing
    ? <div className="field"><label htmlFor="attendance-date">날짜 <span className="required">*</span></label>
        {group.length > 1 && <label className="group-edit-toggle"><input type="checkbox" checked={groupAll} onChange={e => setGroupAll(e.target.checked)} />함께 등록한 {group.length}일 모두 수정<span>사유·상세 이유·미정이 함께 바뀌고 날짜는 그대로예요.</span></label>}
        {editGroup ? <div className="date-chips">{group.map(item => <span key={item.id} className="date-chip">{shortDate(item.date)}</span>)}</div>
          : <><input id="attendance-date" type="date" min="2000-01-01" max="2100-12-31" required disabled={dateLocked} value={date} onChange={e => setDate(e.target.value)} />{dateLocked && <span className="field-hint">무단 출결은 날짜를 바꿀 수 없어요. 사유와 상세 이유만 수정할 수 있어요.</span>}</>}
      </div>
    : <div className="field"><label htmlFor="attendance-date">날짜 <span className="required">*</span><span className="optional">여러 날 선택 가능</span></label>
        <input id="attendance-date" type="date" min="2000-01-01" max="2100-12-31" value="" onChange={e => addDate(e.target.value)} aria-describedby="attendance-dates" />
        <div className="date-chips" id="attendance-dates" aria-live="polite">{dates.map(day => <span key={day} className={`date-chip ${conflicts.some(item => item.date === day) ? "taken" : ""}`}>{shortDate(day)}<button type="button" aria-label={`${shortDate(day)} 빼기`} onClick={() => setDates(dates.filter(item => item !== day))}><X size={12} /></button></span>)}{!dates.length && <span className="field-hint">날짜를 선택하면 여기에 추가돼요.</span>}</div>
      </div>;
  return <dialog ref={dialog} className="modal" aria-labelledby="attendance-editor-title" onCancel={e => { if (busy) e.preventDefault(); else onClose(); }}><form onSubmit={save}><div className="modal-header"><div><h2 id="attendance-editor-title">{editing ? (user?.role === "admin" ? "출결 수정" : "내 출결 수정") : "출결 등록하기"}</h2></div><button className="icon-button" type="button" disabled={busy} onClick={onClose} aria-label="출결 창 닫기"><X size={21} /></button></div><p className="modal-description">{user?.role === "member" ? `${user.name}님의 출결로 저장됩니다. 이름은 변경할 수 없어요.` : editing ? "관리자는 회원·날짜·사유를 수정할 수 있어요." : "관리자는 회원을 선택해 출결을 등록하고, 사전 공유가 없었다면 벌금도 함께 부과할 수 있어요."}</p><div className="form-body"><fieldset disabled={busy}>{dateField}{user?.role === "admin" ? <div className="field"><label htmlFor="attendance-member">회원 <span className="required">*</span></label><div className="reason-select"><select id="attendance-member" required disabled={editGroup} value={memberId} onChange={e => setMemberId(e.target.value)}><option value="">회원 선택</option>{members.map(member => <option value={member.id} key={member.id}>{member.name}{!member.active ? " (이용 정지)" : ""}</option>)}</select></div></div> : <div className="field"><label>이름</label><div className="locked-member-name"><Check size={16} />{user?.name || "로그인 확인 중"}<span>로그인 계정</span></div></div>}<div className="field"><label htmlFor="attendance-type">출결 사유 <span className="required">*</span></label><div className="reason-select"><select id="attendance-type" required value={type} onChange={e => setType(e.target.value)}><option value="" disabled>사유를 선택해 주세요</option>{TYPES.map(item => <option key={item}>{item}</option>)}</select></div></div>{canPending && <div className={`pending-toggle ${pending ? "on" : ""}`}><div><strong id="pending-label">미정</strong><span>{pending ? "확정되면 수정 창에서 끌 수 있어요." : "아직 확정되지 않았다면 켜 주세요."}</span></div><button type="button" role="switch" aria-checked={pending} aria-labelledby="pending-label" className="switch" onClick={() => setPending(!pending)}><i /></button></div>}<div className="field"><label htmlFor="attendance-reason">상세 이유 <span className="optional">선택</span></label><textarea id="attendance-reason" rows={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="추가로 공유할 내용을 적어 주세요." /><div className="textarea-bottom"><span>비워두어도 괜찮아요.</span><span>{reason.length} / 500</span></div></div>{canFine && !pending && <label className="incident-confirm"><input type="checkbox" checked={unnotified} onChange={e => setUnnotified(e.target.checked)} />사전 공유 없는 무단 출결 · {dates.length > 1 ? `날짜마다 벌금 ${won(FINE_AMOUNT)}` : `벌금 ${won(FINE_AMOUNT)}`} 함께 부과</label>}</fieldset>
    {conflicts.length === 1 && (editing || dates.length === 1) ? <div className="daily-conflict" role="alert"><Info size={16} /><div><p>{conflicts[0].date} 에는 이미 {conflicts[0].name}님의 <b>{conflicts[0].type}</b> 출결이 있어요. 한 날짜에 1명당 1건만 등록할 수 있어요.</p><button type="button" className="secondary-button" onClick={() => onEditExisting(conflicts[0])}><Pencil size={13} />기존 출결 수정하기</button></div></div>
      : conflicts.length > 0 && <div className="daily-conflict" role="alert"><Info size={16} /><div><p>{conflicts.map(item => shortDate(item.date)).join(", ")}에는 이미 출결이 있어요. 한 날짜에 1명당 1건만 등록할 수 있어요.</p><button type="button" className="secondary-button" onClick={() => setDates(dates.filter(day => !conflicts.some(item => item.date === day)))}><X size={13} />겹치는 날짜 빼기</button></div></div>}
    {error && <p className="form-error" role="alert"><Info size={16} />{error}</p>}<div className="form-notice">{editing ? "수정한 내용은 우리 반 캘린더에 반영됩니다. 이미 부과된 벌금은 별도로 관리자에게 문의해 주세요." : withFine ? "무단 출결로 빨간색 표시되고 벌금이 미납으로 함께 등록됩니다. 출결과 벌금은 함께 저장되거나 함께 취소됩니다." : dates.length > 1 ? `선택한 ${dates.length}일에 같은 사유로 한 번에 등록돼요. 나중에 함께 수정할 수 있어요.` : "미리 알려주신 출결은 무단 벌금과 별도로 관리됩니다."}</div></div><div className="modal-footer"><span>{withFine ? `벌금 ${won(FINE_AMOUNT)}${dates.length > 1 ? ` × ${dates.length}` : ""} 함께 부과` : editGroup ? `${group.length}일 함께 수정` : !editing && dates.length > 1 ? `${dates.length}일 선택` : "상세 이유 선택"}</span><div><button className="secondary-button" type="button" disabled={busy} onClick={onClose}>취소</button><button className={`primary-button ${withFine ? "admin-danger" : ""}`} disabled={busy || conflicts.length > 0}>{busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}{busy ? "저장 중…" : withFine ? "저장 및 벌금 부과" : "저장하기"}</button></div></div></form></dialog>;
}
