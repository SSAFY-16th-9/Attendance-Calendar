"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Info, Layers2, Plus, Search, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import CohortBar from "@/components/cohort-bar";
import AdminNav from "@/components/admin-nav";
import { useClassInfo } from "@/components/use-roster";
type Member = { id: string; name: string; username: string; active: number; mustChangePassword: number; sessionVersion: number; isAdmin: number; updatedAt: string };
type ActionType = "add" | "rename" | "username" | "reset" | "activate" | "deactivate" | "grantAdmin" | "revokeAdmin" | "delete";
const TITLES: Record<ActionType, string> = { add: "인원 추가", rename: "이름 변경", username: "아이디 변경", reset: "비밀번호 초기화", activate: "이용 재개", deactivate: "이용 정지", grantAdmin: "관리자 권한 주기", revokeAdmin: "관리자 권한 빼기", delete: "명단에서 삭제" };
const DESCRIPTIONS: Record<ActionType, string> = {
  add: "처음 비밀번호는 아이디와 같아요. 첫 로그인 때 새 비밀번호로 바꿔야 해요.",
  rename: "이 회원의 기존 출결과 벌금 기록 이름도 함께 바뀌어요.",
  username: "아직 처음 비밀번호를 쓰고 있다면 처음 비밀번호도 새 아이디로 바뀌어요. 이미 바꾼 비밀번호는 그대로예요.",
  reset: "처리하면 이 회원의 기존 로그인은 해제됩니다. 출결과 벌금 기록은 보존됩니다.",
  activate: "처리하면 이 회원의 기존 로그인은 해제됩니다. 출결과 벌금 기록은 보존됩니다.",
  deactivate: "로그인할 수 없게 되지만 출결과 벌금 기록은 보존됩니다.",
  grantAdmin: "출결·벌금·회원 관리를 모두 할 수 있게 돼요. 관리자 권한을 주고 빼는 일은 핵심 관리자만 할 수 있어요.",
  revokeAdmin: "관리자 기능을 더 이상 쓸 수 없고 일반 회원으로 돌아가요. 기존 로그인은 해제됩니다.",
  delete: "명단과 로그인 계정이 삭제돼요. 기록을 남기려면 대신 ‘이용 정지’를 사용하세요.",
};
export default function Members() {
  const { user, loading } = useAuth(); const cls = useClassInfo();
  const [entries, setEntries] = useState<Member[]>([]); const [superAdmin, setSuperAdmin] = useState(false); const [error, setError] = useState(""); const [query, setQuery] = useState("");
  const [action, setAction] = useState<{ member?: Member; type: ActionType } | null>(null);
  const [password, setPassword] = useState(""); const [name, setName] = useState(""); const [username, setUsername] = useState("");
  const [recordCounts, setRecordCounts] = useState<{ attendanceCount: number; fineCount: number } | null>(null);
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const load = useCallback(async () => { try { const r = await fetch("/api/admin/members", { cache: "no-store" }); const data = await r.json() as { entries: Member[]; superAdmin?: boolean; error?: string }; if (!r.ok) throw new Error(data.error); setEntries(data.entries); setSuperAdmin(!!data.superAdmin); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "조회하지 못했어요."); } }, []);
  useEffect(() => { if (user?.role === "admin") load(); }, [user, load]);
  useEffect(() => { if (action) { setPassword(""); setName(action.member?.name || ""); setUsername(action.member?.username || ""); setRecordCounts(null); setError(""); dialog.current?.showModal(); } else dialog.current?.close(); }, [action]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!action || busy) return; setBusy(true); setError("");
    const { member, type } = action;
    try {
      const r = type === "add" ? await fetch("/api/admin/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, username }) })
        : type === "delete" ? await fetch("/api/admin/members", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: member!.id, revision: member!.sessionVersion, withRecords: !!recordCounts }) })
        : await fetch("/api/admin/members", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: member!.id, revision: member!.sessionVersion, action: type, password: type === "reset" ? password : undefined, name: type === "rename" ? name : undefined, username: type === "username" ? username : undefined }) });
      const result = await r.json() as { error?: string; needsConfirm?: boolean; attendanceCount?: number; fineCount?: number; passwordReset?: boolean };
      // Deleting someone with history asks once more, showing what will be removed.
      if (result.needsConfirm) { setRecordCounts({ attendanceCount: result.attendanceCount || 0, fineCount: result.fineCount || 0 }); return; }
      if (!r.ok) throw new Error(result.error);
      setAction(null);
      setNotice(type === "add" ? `${name}님을 명단에 추가했어요. 처음 비밀번호는 아이디(${username})와 같아요.` : type === "delete" ? `${member!.name}님을 명단에서 삭제했어요.` : type === "rename" ? `이름을 ${name}(으)로 바꿨어요.` : type === "username" ? `아이디를 ${username}(으)로 바꿨어요.${result.passwordReset ? " 처음 비밀번호도 새 아이디로 바뀌었어요." : ""}` : `${member!.name}님의 ${TITLES[type]}을 처리했어요.`);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : "변경하지 못했어요."); } finally { setBusy(false); }
  }
  const lockedAdmin = (member: Member) => member.isAdmin === 1 && !superAdmin;
  const visible = entries.filter(m => m.name.includes(query.trim()) || m.username.includes(query.trim()));
  const danger = action?.type === "delete" || action?.type === "deactivate";
  return <div className="admin-app"><header className="admin-topbar"><a className="brand" href="/"><span className="brand-symbol"><Layers2 size={24} /></span><span>출결 모아<span className="brand-caption">SSAFY {cls.name}</span></span></a><AdminNav current="/admin/members" /></header><main className="admin-main">
    <section className="page-heading"><div><div className="eyebrow"><ShieldCheck size={14} /> ADMIN WORKSPACE</div><h1>회원 관리<span className="heading-dot">.</span></h1><p>회원은 ‘기수 관리’에서 만든 가입 코드로 직접 가입해요. 여기서는 명단과 계정, 관리자 권한을 관리하세요.</p></div><div className="admin-heading-actions">{user?.role === "admin" && <button className="primary-button" onClick={() => setAction({ type: "add" })}><Plus size={16} />인원 추가</button>}</div></section>
    {loading ? <p>관리자 권한을 확인하고 있어요.</p> : user?.role !== "admin" ? <div className="fine-login-needed"><h2>관리자만 이용할 수 있어요.</h2><a className="primary-button" href="/login">관리자 로그인</a></div> : <><CohortBar /><section className="admin-records"><div className="admin-table-heading"><div><h2>{cls.name || "우리 반"} 명단 · {entries.length}명</h2><p>{superAdmin ? "핵심 관리자로 로그인했어요. 회원에게 관리자 권한을 주거나 뺄 수 있어요." : "하위 관리자로 로그인했어요. 다른 관리자 계정과 관리자 권한은 핵심 관리자만 바꿀 수 있어요."}</p></div><button className="secondary-button" onClick={load}>새로고침</button></div>
      <div className="admin-filters"><label className="calendar-search"><Search size={16} /><input aria-label="회원 검색" placeholder="이름 또는 아이디" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
      {error && !action && <p className="error-banner" role="alert">{error}</p>}{notice && <p className="member-notice" role="status"><Check size={16} />{notice}</p>}
      <div className="admin-table-scroll"><table className="admin-table member-table"><thead><tr><th>이름</th><th>아이디</th><th>권한</th><th>이용 상태</th><th>비밀번호</th><th>관리</th></tr></thead><tbody>{visible.map(member => <tr key={member.id}>
        <td><strong>{member.name}</strong></td><td>@{member.username}</td>
        <td><span className={`role-badge ${member.isAdmin ? "admin" : ""}`}>{member.isAdmin ? "관리자" : "회원"}</span></td>
        <td><span className={`fine-status ${member.active ? "paid" : "waived"}`}>{member.active ? "이용 중" : "이용 정지"}</span></td>
        <td>{member.mustChangePassword ? "변경 필요" : "변경 완료"}</td>
        <td><div className="member-actions">
          <button onClick={() => setAction({ member, type: "rename" })} aria-label={`${member.name} 이름 변경`}>이름 변경</button>
          {lockedAdmin(member) ? <span className="member-locked">관리자 계정은 핵심 관리자만 변경할 수 있어요</span> : <>
            <button onClick={() => setAction({ member, type: "username" })} aria-label={`${member.name} 아이디 변경`}>아이디 변경</button>
            <button onClick={() => setAction({ member, type: "reset" })} aria-label={`${member.name} 비밀번호 초기화`}>비밀번호 초기화</button>
            <button onClick={() => setAction({ member, type: member.active ? "deactivate" : "activate" })} aria-label={`${member.name} ${member.active ? "이용 정지" : "이용 재개"}`}>{member.active ? "이용 정지" : "이용 재개"}</button>
            {superAdmin && <button className="member-admin-action" onClick={() => setAction({ member, type: member.isAdmin ? "revokeAdmin" : "grantAdmin" })} aria-label={`${member.name} ${member.isAdmin ? "관리자 권한 빼기" : "관리자 권한 주기"}`}>{member.isAdmin ? "관리자 권한 빼기" : "관리자 권한 주기"}</button>}
            <button className="member-delete" onClick={() => setAction({ member, type: "delete" })} aria-label={`${member.name} 삭제`}>삭제</button>
          </>}
        </div></td></tr>)}</tbody></table>{!visible.length && <div className="admin-empty"><strong>검색된 회원이 없어요</strong></div>}</div>
    </section></>}
  </main>
  <dialog ref={dialog} className="modal" aria-labelledby="member-action-title" onCancel={e => { if (busy) e.preventDefault(); else setAction(null); }}><form onSubmit={save}>
    <div className="modal-header"><div><h2 id="member-action-title">{action?.member ? `${action.member.name} · ` : ""}{action ? TITLES[action.type] : ""}</h2></div><button className="icon-button" type="button" disabled={busy} onClick={() => setAction(null)} aria-label="회원 관리 창 닫기"><X size={20} /></button></div>
    <p className="modal-description">{action ? DESCRIPTIONS[action.type] : ""}</p>
    <div className="form-body"><fieldset disabled={busy}>
      {(action?.type === "add" || action?.type === "rename") && <div className="field"><label htmlFor="member-name">이름</label><input id="member-name" required maxLength={20} value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" /><span className="field-help">한글·영문 1~20자</span></div>}
      {(action?.type === "add" || action?.type === "username") && <div className="field"><label htmlFor="member-username">아이디</label><input id="member-username" required maxLength={40} autoComplete="off" value={username} onChange={e => setUsername(e.target.value)} placeholder="gildong" /><span className="field-help">영문·숫자·._- 3~40자{action.type === "add" ? " · 처음 비밀번호도 이 값이에요" : ""}</span></div>}
      {action?.type === "reset" && <div className="field"><label htmlFor="temporary-password">새 임시 비밀번호</label><input id="temporary-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /><span className="field-help">회원에게 직접 전달해 주세요. 다음 로그인에서 다시 변경해야 합니다.</span></div>}
      {recordCounts && <div className="daily-conflict" role="alert"><Info size={16} /><div><p>{action?.member?.name}님의 출결 <b>{recordCounts.attendanceCount}건</b>과 벌금 <b>{recordCounts.fineCount}건</b>이 함께 삭제되고 되돌릴 수 없어요. 계속할까요?</p></div></div>}
    </fieldset>{error && <p className="form-error" role="alert"><Info size={15} />{error}</p>}</div>
    <div className="modal-footer"><span>관리자 전용</span><div><button className="secondary-button" type="button" disabled={busy} onClick={() => setAction(null)}>취소</button><button className={`primary-button ${danger ? "admin-danger" : ""}`} disabled={busy}>{busy ? "처리 중…" : action?.type === "add" ? "추가하기" : action?.type === "delete" ? (recordCounts ? "기록까지 삭제" : "삭제하기") : "변경 확인"}</button></div></div>
  </form></dialog></div>;
}
