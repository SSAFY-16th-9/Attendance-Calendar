"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, Eye, EyeOff, Info, Layers2, LoaderCircle, LockKeyhole, LogOut, Pencil, Search, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { AttendanceEntry, AttendanceType, koreaToday, MEMBERS, TYPES } from "@/lib/attendance";

type Report = { entries: AttendanceEntry[]; total: number; people: number; types: { type: string; count: number }[]; pageSize: number };
const emptyReport: Report = { entries: [], total: 0, people: 0, types: [], pageSize: 50 };
const badgeClass = (type: string) => `type-badge type-${TYPES.indexOf(type as AttendanceType)}`;

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [month, setMonth] = useState("");
  const [allMonths, setAllMonths] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<Report>(emptyReport);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState<{ entry: AttendanceEntry; mode: "edit" | "delete" } | null>(null);
  const sequence = useRef(0);

  useEffect(() => {
    setMonth(koreaToday().slice(0, 7));
    fetch("/api/admin/session", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw Error();
      const result = await response.json() as { authenticated: boolean };
      setAuthenticated(result.authenticated);
    }).catch(() => { setAuthenticated(false); setLoginError("연결을 확인한 뒤 다시 로그인해 주세요."); });
  }, []);

  const load = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (!allMonths && month) params.set("month", month);
    if (query.trim()) params.set("q", query.trim());
    if (type) params.set("type", type);
    try {
      const response = await fetch(`/api/admin/attendance?${params}`, { cache: "no-store" });
      const data = await response.json() as Report & { error?: string };
      if (current !== sequence.current) return;
      if (response.status === 401) { setAuthenticated(false); setReport(emptyReport); setLoginError("로그인이 만료되었어요. 다시 로그인해 주세요."); return; }
      if (!response.ok) throw new Error(data.error || "내역을 불러오지 못했어요.");
      if (page > 1 && !data.entries.length) { setPage(Math.max(1, Math.ceil(data.total / data.pageSize))); return; }
      setReport(data); setError("");
    } catch (e) { if (current === sequence.current) setError(e instanceof Error ? e.message : "연결을 확인해 주세요."); }
    finally { if (current === sequence.current) setLoading(false); }
  }, [allMonths, month, query, type, page]);

  useEffect(() => {
    if (!authenticated || !month) return;
    const timer = setTimeout(load, 200);
    return () => { clearTimeout(timer); ++sequence.current; };
  }, [authenticated, month, load]);

  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 3500); return () => clearTimeout(timer); }, [notice]);

  async function login(event: React.FormEvent) {
    event.preventDefault(); setLoggingIn(true); setLoginError("");
    try {
      const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "로그인하지 못했어요.");
      setPassword(""); setAuthenticated(true); setPage(1);
    } catch (e) { setLoginError(e instanceof Error ? e.message : "로그인하지 못했어요."); }
    finally { setLoggingIn(false); }
  }

  async function logout() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE" });
      if (!response.ok) throw Error();
      ++sequence.current; setAuthenticated(false); setReport(emptyReport); setAction(null); setPassword(""); setLoginError(""); setNotice("");
    } catch { setError("로그아웃하지 못했어요. 다시 시도해 주세요."); }
    finally { setLoading(false); }
  }

  const pages = Math.max(1, Math.ceil(report.total / report.pageSize));
  return <div className="admin-app">
    <header className="admin-topbar"><a href="/" className="brand"><span className="brand-symbol"><Layers2 size={24} /></span><span>출결 모아<span className="brand-caption">SSAFY 16기 9반</span></span></a><a href="/" className="back-calendar"><ArrowLeft size={16} />캘린더로 돌아가기</a></header>
    {authenticated === null ? <div className="admin-check"><LoaderCircle className="spin" size={26} /><p>로그인 상태를 확인하고 있어요.</p></div> : !authenticated ? <main className="admin-login"><div className="login-intro"><span className="login-eyebrow"><ShieldCheck size={15} />ADMIN WORKSPACE</span><h1>우리 반의 하루를<br /><span>더 세심하게.</span></h1><p>출결 내역을 한곳에서 확인하고<br />우리 반 캘린더를 관리하세요.</p><div className="login-class"><span>09</span><div><strong>SSAFY 16기 9반</strong><p>24명이 함께하는 출결 모아</p></div></div></div><section className="login-card"><span className="modal-symbol"><LockKeyhole size={22} /></span><h2>관리자 로그인</h2><p>관리자 계정으로 로그인해 주세요.</p><form onSubmit={login}><fieldset disabled={loggingIn}><div className="field"><label htmlFor="admin-username">아이디</label><input id="admin-username" autoComplete="username" required maxLength={100} placeholder="관리자 아이디" value={username} onChange={event => setUsername(event.target.value)} /></div><div className="field"><label htmlFor="admin-password">비밀번호</label><div className="password-input"><input id="admin-password" autoComplete="current-password" required maxLength={256} type={showPassword ? "text" : "password"} placeholder="비밀번호를 입력해 주세요" value={password} onChange={event => setPassword(event.target.value)} /><button type="button" aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div></fieldset>{loginError && <p className="form-error" role="alert"><Info size={16} />{loginError}</p>}<button className="primary-button login-button" disabled={loggingIn}>{loggingIn ? <LoaderCircle className="spin" size={17} /> : <LockKeyhole size={16} />}{loggingIn ? "로그인 중…" : "로그인"}</button></form><div className="login-footnote"><ShieldCheck size={14} />출결 관리 권한이 있는 관리자만 이용할 수 있어요.</div></section></main> : <main className="admin-main">
      <section className="page-heading"><div><div className="eyebrow"><ShieldCheck size={13} /> ADMIN WORKSPACE</div><h1>출결 관리<span className="heading-dot">.</span></h1><p>우리 반 출결을 확인하고, 필요한 내용을 수정하세요.</p></div><div className="admin-heading-actions"><a className="primary-button" href="/admin/fines">벌금 관리</a><button className="secondary-button logout-button" onClick={logout} disabled={loading}><LogOut size={16} />로그아웃</button></div></section>
      <section className="stats" aria-label="출결 현황"><div className="stat-card"><span className="stat-icon mint"><CalendarDays size={22} /></span><div><p>조회된 출결 내역</p><strong>{report.total}<small>건</small></strong></div><span className="stat-caption">{allMonths ? "전체 기간" : month}</span></div><div className="stat-card"><span className="stat-icon peach"><Users size={22} /></span><div><p>출결 등록 인원</p><strong>{report.people}<small>명</small></strong></div><span className="stat-caption">중복 제외</span></div><div className="stat-card"><span className="stat-icon lavender"><ShieldCheck size={22} /></span><div><p>함께하는 우리 반</p><strong>24<small>명</small></strong></div><span className="stat-caption">16기 · 9반</span></div></section>
      <div className="admin-breakdown" aria-label="사유별 출결 현황">{TYPES.map(item => <button aria-pressed={type === item} key={item} className={`admin-type-count type-${TYPES.indexOf(item)} ${type === item ? "active" : ""}`} onClick={() => { setType(type === item ? "" : item); setPage(1); }}><i /><span>{item}</span><b>{report.types.find(row => row.type === item)?.count || 0}</b></button>)}</div>
      <section className="admin-records" aria-label="출결 내역 관리"><div className="admin-table-heading"><div><h2>출결 내역</h2><p>등록된 내역은 수정하거나 삭제할 수 있어요.</p></div><button className="secondary-button" onClick={() => load()} disabled={loading}>{loading ? "불러오는 중…" : "새로고침"}</button></div><div className="admin-filters"><label className="admin-month"><span>조회 기간</span><input type="month" value={month} min="2000-01" max="2100-12" disabled={allMonths} aria-label="조회할 달" onChange={event => { if (event.target.value) { setMonth(event.target.value); setPage(1); } }} /></label><label className="all-period"><input type="checkbox" checked={allMonths} onChange={event => { setAllMonths(event.target.checked); setPage(1); }} />전체 기간</label><label className="calendar-search"><Search size={17} /><input aria-label="관리자 출결 이름 검색" placeholder="이름으로 검색" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} />{query && <button aria-label="이름 검색 초기화" onClick={() => { setQuery(""); setPage(1); }}><X size={15} /></button>}</label><label className="filter-select"><select aria-label="관리자 출결 사유 필터" value={type} onChange={event => { setType(event.target.value); setPage(1); }}><option value="">모든 사유</option>{TYPES.map(item => <option key={item}>{item}</option>)}</select></label></div>
        {error && <div className="error-banner" role="alert"><Info size={16} /><span>{error}</span><button onClick={load}>다시 불러오기</button></div>}
        <div className="admin-table-scroll" aria-busy={loading}><table className="admin-table"><thead><tr><th scope="col">날짜</th><th scope="col">이름</th><th scope="col">출결 사유</th><th scope="col">상세 이유</th><th scope="col">등록일</th><th scope="col">관리</th></tr></thead><tbody>{report.entries.map(entry => <tr key={entry.id}><td className="date-column">{entry.date}</td><td><strong>{entry.name}</strong></td><td><span className={badgeClass(entry.type)}>{entry.type}</span></td><td className="reason-column"><span title={entry.reason}>{entry.reason || "—"}</span></td><td className="created-column">{new Date(entry.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" })}</td><td><div className="record-actions"><button aria-label={`${entry.name} ${entry.date} ${entry.type} 수정`} onClick={() => setAction({ entry, mode: "edit" })}><Pencil size={15} /></button><button aria-label={`${entry.name} ${entry.date} ${entry.type} 삭제`} onClick={() => setAction({ entry, mode: "delete" })}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table>{!report.entries.length && <div className="admin-empty">{loading ? <LoaderCircle size={30} className="spin" /> : <CalendarDays size={34} strokeWidth={1.5} />}<strong>{loading ? "내역을 불러오고 있어요" : error ? "내역을 확인할 수 없어요" : "조회된 출결 내역이 없어요"}</strong><p>조회 기간이나 검색 조건을 확인해 주세요.</p></div>}</div>
        <div className="admin-pagination"><span>총 <b>{report.total}</b>건{report.total > 0 && ` · ${(page - 1) * 50 + 1}–${Math.min(page * 50, report.total)}건 표시`}</span><div><button aria-label="이전 페이지" disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}><ChevronLeft size={16} /></button><span>{page} / {pages}</span><button aria-label="다음 페이지" disabled={page >= pages || loading} onClick={() => setPage(value => value + 1)}><ChevronRight size={16} /></button></div></div>
      </section><p className="admin-note"><ShieldCheck size={14} />수정한 내용은 공유 캘린더에 반영됩니다. 삭제 전 내역을 한 번 더 확인해 주세요.</p>
    </main>}
    <EntryAction action={action} onClose={() => setAction(null)} onSaved={message => { setNotice(message); load(); }} onExpired={() => { setAction(null); setAuthenticated(false); setReport(emptyReport); setLoginError("로그인이 만료되었어요. 다시 로그인해 주세요."); }} />
    {notice && <div className="toast" role="status"><Check size={17} />{notice}<button aria-label="알림 닫기" onClick={() => setNotice("")}><X size={15} /></button></div>}
  </div>;
}

function EntryAction({ action, onClose, onSaved, onExpired }: { action: { entry: AttendanceEntry; mode: "edit" | "delete" } | null; onClose: () => void; onSaved: (message: string) => void; onExpired: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [date, setDate] = useState(""); const [name, setName] = useState(""); const [type, setType] = useState(""); const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  useEffect(() => { if (action) { const entry = action.entry; setDate(entry.date); setName(entry.name); setType(entry.type); setReason(entry.reason); setError(""); setSaving(false); ref.current?.showModal(); } else ref.current?.close(); }, [action]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!action || saving) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/admin/attendance", { method: action.mode === "edit" ? "PATCH" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: action.entry.id, date, name, type, reason }) });
      const result = await response.json() as { error?: string };
      if (response.status === 401) { onExpired(); return; }
      if (!response.ok) throw new Error(result.error || "처리하지 못했어요.");
      onSaved(action.mode === "edit" ? "출결 내역을 수정했어요." : "출결 내역을 삭제했어요."); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); }
    finally { setSaving(false); }
  }

  return <dialog ref={ref} className="modal admin-action-modal" aria-labelledby="admin-action-title" onCancel={event => { if (saving) event.preventDefault(); else onClose(); }}><form onSubmit={submit}><div className="modal-header"><div><span className="modal-symbol">{action?.mode === "delete" ? <Trash2 size={22} /> : <Pencil size={22} />}</span><h2 id="admin-action-title">{action?.mode === "delete" ? "출결 내역을 삭제할까요?" : "출결 내역 수정"}</h2></div><button type="button" className="icon-button" aria-label="관리 창 닫기" disabled={saving} onClick={onClose}><X size={21} /></button></div><p className="modal-description">{action?.mode === "delete" ? "삭제한 내역은 복구할 수 없어요. 내용을 확인해 주세요." : "수정한 내용은 우리 반 캘린더에 함께 반영돼요."}</p><div className="form-body">{action?.mode === "delete" ? <div className="delete-entry-summary"><strong>{action.entry.name}</strong><span>{action.entry.date} · {action.entry.type}</span><p>{action.entry.reason || "상세 이유 없음"}</p></div> : <fieldset disabled={saving}><div className="field"><label htmlFor="edit-date">날짜 <span className="required">*</span></label><input type="date" id="edit-date" min="2000-01-01" max="2100-12-31" required value={date} onChange={event => setDate(event.target.value)} /></div><div className="field"><label htmlFor="edit-name">이름 <span className="required">*</span></label><div className="reason-select"><select id="edit-name" required value={name} onChange={event => setName(event.target.value)}>{MEMBERS.map(member => <option key={member}>{member}</option>)}</select></div></div><div className="field"><label htmlFor="edit-type">출결 사유 <span className="required">*</span></label><div className="reason-select"><select id="edit-type" required value={type} onChange={event => setType(event.target.value)}>{TYPES.map(item => <option key={item}>{item}</option>)}</select></div></div><div className="field"><label htmlFor="edit-reason">상세 이유 <span className="optional">선택</span></label><textarea id="edit-reason" maxLength={500} rows={3} value={reason} onChange={event => setReason(event.target.value)} /><div className="textarea-bottom"><span>상세 이유는 비워두어도 괜찮아요.</span><span>{reason.length} / 500</span></div></div></fieldset>}{error && <p className="form-error" role="alert"><Info size={15} />{error}</p>}</div><div className="modal-footer"><span>관리자 전용</span><div><button className="secondary-button" type="button" disabled={saving} onClick={onClose}>취소</button><button className={`primary-button ${action?.mode === "delete" ? "admin-danger" : ""}`} disabled={saving}>{saving && <LoaderCircle size={16} className="spin" />}{saving ? "처리 중…" : action?.mode === "delete" ? "삭제하기" : "수정 저장"}</button></div></div></form></dialog>;
}
