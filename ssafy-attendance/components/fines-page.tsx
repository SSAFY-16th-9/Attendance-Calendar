"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Banknote, Check, ChevronLeft, ChevronRight, CircleCheck, Info, Layers2, LoaderCircle, Search, ShieldCheck, Wallet, X } from "lucide-react";
import { emptySummary, Fine, FineReport, FineStatus, FINE_AMOUNT, STATUS_LABELS, won } from "@/lib/fines";
import { koreaToday, MEMBERS } from "@/lib/attendance";
import IncidentDialog from "./incident-dialog";

const blankReport: FineReport = { entries: [], summary: { ...emptySummary }, people: [], total: 0, page: 1, pageSize: 50 };
type Action = { entry: Fine; status: FineStatus };

export default function FinesPage({ management = false }: { management?: boolean }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [report, setReport] = useState<FineReport>(blankReport);
  const [month, setMonth] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const sequence = useRef(0);

  useEffect(() => {
    if (!management) { setAuthenticated(false); return; }
    fetch("/api/admin/session", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw Error();
      const data = await response.json() as { authenticated: boolean };
      setAuthenticated(data.authenticated);
    }).catch(() => { setAuthenticated(false); });
  }, [management]);

  const load = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (month) params.set("month", month);
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    try {
      const response = await fetch(`/api/fines?${params}`, { cache: "no-store" });
      const data = await response.json() as FineReport & { error?: string };
      if (current !== sequence.current) return;
      if (!response.ok) throw new Error(data.error || "벌금 현황을 불러오지 못했어요.");
      if (page > 1 && !data.entries.length) { setPage(Math.max(1, Math.ceil(data.total / data.pageSize))); return; }
      setReport(data); setError("");
    } catch (e) { if (current === sequence.current) setError(e instanceof Error ? e.message : "연결을 확인해 주세요."); }
    finally { if (current === sequence.current) setLoading(false); }
  }, [month, query, status, page]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    const poll = setInterval(() => { if (document.visibilityState === "visible") load(); }, 60000);
    const focus = () => load();
    window.addEventListener("focus", focus);
    return () => { clearTimeout(timer); clearInterval(poll); window.removeEventListener("focus", focus); ++sequence.current; };
  }, [load]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 4000); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => { if (action) { setActionError(""); dialog.current?.showModal(); } else dialog.current?.close(); }, [action]);

  async function confirm(event: React.FormEvent) {
    event.preventDefault(); if (!action || saving) return;
    setSaving(true); setActionError("");
    try {
      const response = await fetch("/api/admin/fines", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: action.entry.id, revision: action.entry.revision, status: action.status }) });
      const data = await response.json() as { error?: string };
      if (response.status === 401) { setAuthenticated(false); setAction(null); setNotice("관리자 로그인이 만료되었어요. 다시 로그인해 주세요."); return; }
      if (!response.ok) throw new Error(data.error || "처리하지 못했어요.");
      setAction(null); setNotice(`상태를 ‘${STATUS_LABELS[action.status]}’로 변경했어요.`);
      load();
    } catch (e) { setActionError(e instanceof Error ? e.message : "다시 시도해 주세요."); }
    finally { setSaving(false); }
  }

  const canManage = management && authenticated === true;
  const showData = !management || canManage;
  return <div className="admin-app fines-app">
    <header className="admin-topbar"><a href="/" className="brand"><span className="brand-symbol"><Layers2 size={24} /></span><span>출결 모아<span className="brand-caption">SSAFY 16기 9반</span></span></a><div className="fine-header-links"><a href="/" className="back-calendar"><ArrowLeft size={15} />캘린더</a><a href={management ? "/fines" : "/admin/fines"} className="back-calendar"><ShieldCheck size={15} />{management ? "공유 현황" : "관리자 관리"}</a></div></header>
    <main className="admin-main">
      <section className="page-heading"><div><div className="eyebrow">{management ? <ShieldCheck size={13} /> : <Wallet size={13} />}{management ? " ADMIN WORKSPACE" : " OUR CLASS, TOGETHER"}</div><h1>{management ? "벌금 관리" : "우리 반 벌금 현황"}<span className="heading-dot">.</span></h1><p>{management ? "벌금과 납부 상태를 관리하세요. 벌금 부과는 캘린더의 출결 상세나 출결 등록 창에서도 할 수 있어요." : "부과 내역과 납부 여부를 투명하게 함께 확인해요."}</p></div><div className="admin-heading-actions">{management && authenticated && <IncidentDialog onSaved={() => { load(); setNotice("무단 출결과 벌금 5,000원을 등록했어요."); }} />}<a className="secondary-button" href={management ? "/admin" : "/"}>{management ? "출결 관리" : "캘린더 보기"}</a></div></section>
      <div className="fine-policy"><Info size={19} /><div><strong>미리 알리지 않은 출결 · 건당 {won(FINE_AMOUNT)}</strong><p>같은 출결 종류라도 사전에 알린 경우에는 벌금이 없습니다. 관리자가 미공유 여부를 확인해 부과한 내역만 집계합니다.</p></div></div>
      {management && authenticated === null ? <div className="admin-check"><LoaderCircle size={25} className="spin" /><p>관리자 권한을 확인하고 있어요.</p></div> : management && !canManage ? <section className="fine-login-needed"><ShieldCheck size={34} /><h2>관리자 로그인 후 관리할 수 있어요</h2><p>로그인을 마친 뒤 ‘벌금 관리’ 버튼을 눌러 돌아와 주세요.</p><a href="/admin" className="primary-button">관리자 로그인</a><a href="/fines" className="text-button">벌금 현황 보기</a></section> : null}
      {showData && <>
        <section className="stats fine-stats" aria-label="벌금 요약"><div className="stat-card"><span className="stat-icon lavender"><Banknote size={22} /></span><div><p>총 부과액</p><strong>{error ? "—" : won(report.summary.assessed)}</strong></div><span className="stat-caption">취소 제외</span></div><div className="stat-card"><span className="stat-icon mint"><CircleCheck size={22} /></span><div><p>납부 완료</p><strong>{error ? "—" : won(report.summary.collected)}</strong></div><span className="stat-caption">{report.summary.paidCount}건</span></div><div className="stat-card"><span className="stat-icon peach"><Wallet size={22} /></span><div><p>미납액</p><strong>{error ? "—" : won(report.summary.outstanding)}</strong></div><span className="stat-caption">{report.summary.unpaidCount}건</span></div></section>
        <section className="fine-filter-card"><label className="admin-month"><span>조회 기간</span><input type="month" aria-label="벌금 조회할 달" value={month} min="2000-01" max="2100-12" onChange={event => { setMonth(event.target.value); setPage(1); }} /></label><button className={`secondary-button ${!month ? "fine-filter-active" : ""}`} onClick={() => { setMonth(""); setPage(1); }}>전체 기간</button><button className="secondary-button" onClick={() => { setMonth(koreaToday().slice(0, 7)); setPage(1); }}>이번 달</button><label className="calendar-search"><Search size={16} /><input placeholder="이름으로 검색" aria-label="벌금 이름 검색" value={query} maxLength={50} onChange={event => { setQuery(event.target.value); setPage(1); }} /></label><button className="secondary-button" onClick={() => load()} disabled={loading}>{loading ? "불러오는 중…" : "새로고침"}</button></section>
        <p className="fine-scope">{month ? `${month} 기준` : "전체 기간 기준"}{query.trim() ? ` · 이름 ‘${query.trim()}’ 검색` : ""} · 요약과 개인별 현황은 모든 납부 상태를 포함합니다.</p>
        {error && <div className="error-banner" role="alert"><Info size={17} /><span>{error}</span><button onClick={load}>다시 불러오기</button></div>}
        {!error && <>
          <section className="admin-records"><div className="admin-table-heading"><div><h2>개인별 현황</h2><p>미납액이 있는 사람부터 표시합니다. 부과 취소 금액은 합계에서 제외합니다.</p></div><span className="fine-small">{report.people.length}명</span></div><div className="fine-people-grid">{report.people.map(person => <article key={person.name} className={`fine-person ${person.outstanding ? "has-unpaid" : ""}`}><div><strong>{person.name}</strong><span className={`fine-status ${person.outstanding ? "unpaid" : "paid"}`}>{person.outstanding ? "미납 있음" : person.assessed ? "납부 완료" : "부과 없음"}</span></div><p>미납 <b>{won(person.outstanding)}</b></p><footer><span>부과 {won(person.assessed)}</span><span>납부 {won(person.collected)}</span></footer></article>)}</div></section>
          <section className="admin-records fine-ledger"><div className="admin-table-heading"><div><h2>벌금 내역</h2><p>사전 공유 없이 발생한 출결에 대해 관리자가 확인한 내역입니다.</p></div><select aria-label="벌금 납부 상태 필터" className="fine-status-select" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">전체 상태</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="admin-table-scroll" aria-busy={loading}><table className="admin-table fine-table"><thead><tr><th>날짜</th><th>이름</th><th>출결 / 부과 사유</th><th>금액</th><th>납부 상태</th><th>납부 확인일</th>{canManage && <th>관리</th>}</tr></thead><tbody>{report.entries.map(entry => <tr key={entry.id}><td className="date-column">{entry.date}</td><td><strong>{entry.name}</strong></td><td>{entry.type}<small className="fine-unnotified">사전 공유 없음</small></td><td className={entry.status === "waived" ? "fine-cancelled-amount" : ""}>{won(entry.amount)}</td><td><span className={`fine-status ${entry.status}`}>{STATUS_LABELS[entry.status]}</span></td><td className="created-column">{entry.paidAt ? new Date(entry.paidAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) : "—"}</td>{canManage && <td><div className="fine-row-actions">{entry.status !== "paid" && entry.status !== "waived" && <button onClick={() => setAction({ entry, status: "paid" })} aria-label={`${entry.name} ${entry.date} 납부 확인`}>납부 확인</button>}{entry.status === "paid" && <button onClick={() => setAction({ entry, status: "unpaid" })} aria-label={`${entry.name} ${entry.date} 미납으로 변경`}>미납 변경</button>}{entry.status === "waived" ? <button onClick={() => setAction({ entry, status: "unpaid" })} aria-label={`${entry.name} ${entry.date} 부과 복원`}>부과 복원</button> : <button className="fine-cancel-action" onClick={() => setAction({ entry, status: "waived" })} aria-label={`${entry.name} ${entry.date} 벌금 취소`}>부과 취소</button>}</div></td>}</tr>)}</tbody></table>{!report.entries.length && <div className="admin-empty"><Wallet size={32} /><strong>{loading ? "불러오는 중이에요" : "조회된 벌금 내역이 없어요"}</strong><p>관리자가 확인해 부과한 벌금만 표시됩니다.</p></div>}</div><Pagination total={report.total} page={page} size={50} loading={loading} setPage={setPage} /></section>
        </>}
        <p className="admin-note"><ShieldCheck size={14} />{management ? "출결을 수정해도 부과한 벌금은 유지되고, 출결을 삭제하면 해당 벌금도 함께 삭제됩니다. 잘못 부과했다면 여기서 ‘부과 취소’를 해 주세요." : "납부 여부는 관리자가 실제 납부를 확인한 뒤 반영합니다. 변경 사항은 새로고침하거나 최대 1분 후 확인할 수 있어요."}</p>
      </>}
    </main>
    <dialog ref={dialog} className="modal" aria-labelledby="fine-action-title" onCancel={event => { if (saving) event.preventDefault(); else setAction(null); }}><form onSubmit={confirm}><div className="modal-header"><div><span className="modal-symbol"><ShieldCheck size={22} /></span><h2 id="fine-action-title">{`‘${action ? STATUS_LABELS[action.status] : ""}’로 변경할까요?`}</h2></div><button type="button" className="icon-button" aria-label="벌금 확인 창 닫기" disabled={saving} onClick={() => setAction(null)}><X size={20} /></button></div><p className="modal-description">{action?.status === "paid" ? "실제 납부를 확인한 뒤 처리해 주세요. 확인일은 오늘로 기록됩니다." : action?.status === "waived" && action.entry.status === "paid" ? "이미 납부된 건입니다. 취소하면 납부·부과 합계에서도 제외됩니다. 실제 환불은 별도로 확인해 주세요." : "이 변경은 반 전체가 보는 벌금 현황에도 반영됩니다."}</p><div className="form-body"><div className="delete-entry-summary"><strong>{action?.entry.name}</strong><span>{action?.entry.date} · {action?.entry.type} · {won(FINE_AMOUNT)}</span><p>{action ? `${STATUS_LABELS[action.entry.status]} → ${STATUS_LABELS[action.status]}` : ""}</p></div>{actionError && <p className="form-error" role="alert"><Info size={16} />{actionError}</p>}</div><div className="modal-footer"><span>관리자 전용</span><div><button className="secondary-button" type="button" disabled={saving} onClick={() => setAction(null)}>취소</button><button className="primary-button" disabled={saving}>{saving ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}{saving ? "처리 중…" : "변경 확인"}</button></div></div></form></dialog>
    {notice && <div className="toast" role="status"><Check size={16} />{notice}<button aria-label="알림 닫기" onClick={() => setNotice("")}><X size={14} /></button></div>}
  </div>;
}

function Pagination({ total, page, size, loading, setPage }: { total: number; page: number; size: number; loading: boolean; setPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return <div className="admin-pagination"><span>총 <b>{total}</b>건</span><div><button aria-label="이전 내역 페이지" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button><span>{page} / {pages}</span><button aria-label="다음 내역 페이지" disabled={page >= pages || loading} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button></div></div>;
}
