"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Flower2, Info, Layers2, LoaderCircle, Plus, Search, Sparkles, ShieldCheck, Wallet, Users, X } from "lucide-react";
import { AttendanceEntry, canonicalName, dateKey, koreaToday, sortForViewer, statusClass, statusPrefix, typeClass, TYPES } from "@/lib/attendance";
import { useAuth } from "@/components/auth-provider";
import AttendanceEditor from "@/components/attendance-editor";
import EntryDetailDialog from "@/components/entry-detail-dialog";
import { useClassInfo, useRoster } from "@/components/use-roster";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const formatDate = (date: string) => new Date(`${date}T12:00:00+09:00`).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Seoul" });

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const roster = useRoster(); const cls = useClassInfo(); const classSize = roster ? roster.length : "–"; const rosterNames = roster || [];
  async function logout() { const r = await fetch("/api/session", { method: "DELETE" }); if (r.ok) location.assign("/login"); else setToast("로그아웃하지 못했어요."); }
  const [today, setToday] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [month, setMonth] = useState({ year: 2026, month: 9 });
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detailName, setDetailName] = useState<string | null>(null);
  const [sideOpen, setSideOpen] = useState(true);
  const [toast, setToast] = useState("");
  const [view, setView] = useState<"month" | "week">("month");
  useEffect(() => { try { if (localStorage.getItem("calendar-view") === "week") setView("week"); } catch {} }, []);
  const changeView = (next: "month" | "week") => { setView(next); try { localStorage.setItem("calendar-view", next); } catch {} };


  const [infoDialog, setInfoDialog] = useState<"members" | "guide" | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const infoRef = useRef<HTMLDialogElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const monthKey = dateKey(month.year, month.month, 1).slice(0, 7);
  // Week view: Sunday–Saturday around the selected date. A week can span two months, so load both.
  const weekDays = (() => {
    const base = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date(month.year, month.month, 1);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - base.getDay() + i); return { key: dateKey(d.getFullYear(), d.getMonth(), d.getDate()), number: d.getDate(), month: d.getMonth() + 1, weekday: i }; });
  })();
  const fetchMonths = view === "week" ? [...new Set([monthKey, ...weekDays.map(day => day.key.slice(0, 7))])].join(",") : monthKey;
  const fetchSequence = useRef(0);

  useEffect(() => {
    const current = koreaToday();
    setToday(current); setSelectedDate(current);
    setMonth({ year: Number(current.slice(0, 4)), month: Number(current.slice(5, 7)) - 1 });
    const timer = setInterval(() => setToday(koreaToday()), 60000);
    return () => clearInterval(timer);
  }, []);

  const refresh = useCallback(async (quiet = false) => {
    const sequence = ++fetchSequence.current;
    if (!quiet) setLoading(true);
    try {
      const results = await Promise.all(fetchMonths.split(",").map(async key => {
        const response = await fetch(`/api/attendance?month=${key}`, { cache: "no-store" });
        const data = await response.json() as { entries: AttendanceEntry[]; error?: string };
        if (!response.ok) throw new Error(data.error || "출결 정보를 불러오지 못했어요.");
        return data.entries;
      }));
      if (sequence === fetchSequence.current) { setEntries(results.flat()); setError(""); }
    } catch (e) {
      if (sequence === fetchSequence.current) setError(e instanceof Error ? e.message : "연결을 확인해 주세요.");
    } finally { if (sequence === fetchSequence.current) setLoading(false); }
  }, [fetchMonths]);

  useEffect(() => {
    setEntries([]); refresh();
    const timer = setInterval(() => { if (document.visibilityState === "visible") refresh(true); }, 15000);
    const onFocus = () => refresh(true);
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(timer); window.removeEventListener("focus", onFocus); ++fetchSequence.current; };
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => { if (infoDialog) infoRef.current?.showModal(); else infoRef.current?.close(); }, [infoDialog]);

  function selectDate(date: string) {
    setSelectedDate(date); setSideOpen(true); setDetailName(null);
    if (!date.startsWith(monthKey)) setMonth({ year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) - 1 });
    requestAnimationFrame(() => { if (window.innerWidth <= 1050) detailRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }); });
  }
  function moveMonth(offset: number) {
    const next = new Date(month.year, month.month + offset, 1);
    if (next.getFullYear() < 2000 || next.getFullYear() > 2100) return;
    setMonth({ year: next.getFullYear(), month: next.getMonth() });
    setSelectedDate(dateKey(next.getFullYear(), next.getMonth(), 1)); setDetailName(null);
  }

  function moveWeek(offset: number) {
    const start = weekDays[0].key; const d = new Date(`${start}T12:00:00`); d.setDate(d.getDate() + offset * 7);
    selectDate(dateKey(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  const openPerson = (date: string, name: string) => { selectDate(date); setDetailName(name); };

  const visibleEntries = sortForViewer(entries.filter(entry => (filter === "all" || entry.type === filter) && entry.name.includes(search.trim())), user?.role === "member" ? user.name : null);
  const dayEntries = visibleEntries.filter(entry => entry.date === selectedDate);
  const names = [...new Set(dayEntries.map(entry => entry.name))];
  const firstWeekday = new Date(month.year, month.month, 1).getDay();
  const dayCount = new Date(month.year, month.month + 1, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + dayCount) / 7) * 7;
  const days = Array.from({ length: cellCount }, (_, i) => {
    const date = new Date(month.year, month.month, i - firstWeekday + 1);
    return { key: dateKey(date.getFullYear(), date.getMonth(), date.getDate()), number: date.getDate(), current: date.getMonth() === month.month, weekday: i % 7 };
  });
  const filtered = filter !== "all" || !!search.trim();
  const monthEntries = entries.filter(entry => entry.date.startsWith(monthKey));

  const [registration, setRegistration] = useState<{ date: string; entry?: AttendanceEntry } | null>(null);
  const findExisting = useCallback((date: string, name: string) => entries.find(entry => entry.date === date && canonicalName(entry.name) === canonicalName(name)), [entries]);
  // Records saved together share created_at and member (see requestedDates in lib/attendance).
  const groupFor = useCallback((entry: AttendanceEntry) => entries.filter(item => item.createdAt === entry.createdAt && canonicalName(item.name) === canonicalName(entry.name)).sort((a, b) => a.date.localeCompare(b.date)), [entries]);
  // Members who already have a record that day go straight to editing it.
  const register = (date = selectedDate || today) => { if (!user) { location.assign("/login?next=%2F"); return; } const mine = user?.role === "member" ? findExisting(date, user.name) : undefined; setRegistration(mine ? { date, entry: mine } : { date }); };
  const closeDetail = useCallback(() => setDetailName(null), []);

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="출결 모아 홈"><span className="brand-symbol"><Layers2 size={24} strokeWidth={2} /></span><span>출결 모아<span className="brand-caption">우리 반의 하루를 함께</span></span></a>
      <div className="class-card"><span className="class-icon">{cls.classNo}<span>CLASS</span></span><div><strong>SSAFY {cls.name}</strong><p>{classSize}명이 함께하는 공간</p></div><span className="class-online" title="우리 반 공간" /></div>
      <div className="nav-heading">우리 반 공간</div>
      <nav aria-label="주 메뉴"><button className="nav-item active" onClick={() => { setSideOpen(true); setFilter("all"); setSearch(""); }}><CalendarDays size={19} /><span>출결 캘린더</span><span className="nav-dot" /></button><button className="nav-item" onClick={() => { setMemberSearch(""); setInfoDialog("members"); }}><Users size={19} /><span>우리 반 명단</span><span className="nav-count">{classSize}</span></button><a className="nav-item fines-nav" href="/fines"><Wallet size={19} /><span>벌금 현황</span></a></nav>
      <div className="sidebar-note"><span className="note-flower"><Flower2 size={29} strokeWidth={1.5} /></span><strong>작은 공유가 만드는<br />편안한 하루.</strong><p>미리 알려주면, 서로의 하루를 조금 더 잘 이해할 수 있어요.</p><span className="note-line" /></div>
      <div className="sidebar-bottom">{user?.role === "admin" && <a className="nav-item admin-nav" href="/admin"><ShieldCheck size={18} /><span>관리자 페이지</span><ChevronRight size={15} /></a>}<button className="nav-item" onClick={() => setInfoDialog("guide")}><CircleHelp size={18} /><span>이용 가이드</span><ArrowRight size={15} /></button><div className="sidebar-footer"><span className="footer-dot" /> SSAFY 16TH <span>CLASS 09</span></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb"><span>우리 반 공간</span><ChevronRight size={14} /><strong>출결 캘린더</strong></div><div className="topbar-right"><span className={`sync-state ${error ? "offline" : ""}`}><i />{error ? "연결 확인 필요" : loading ? "불러오는 중" : "함께 공유 중"}</span><span className="topbar-divider" />{user ? <><a className="account-link" href={user.id ? "/account" : "/admin/members"}>{user.name}</a><button className="session-logout" onClick={logout}>로그아웃</button></> : !authLoading && <a className="account-link" href="/login?next=%2F">로그인</a>}</div></header>
      <main className="main-content">
        <section className="page-heading"><div><div className="eyebrow"><span /> OUR CLASS, OUR DAYS</div><h1>우리 반 출결 캘린더<span className="heading-dot">.</span></h1><p>함께 확인하고, 미리 공유하는 우리 반의 하루</p></div></section>
        <section className="stats" aria-label="이번 달 출결 요약"><div className="stat-card"><span className="stat-icon mint"><CalendarDays size={21} /></span><div><p>이번 달 출결 내역</p><strong>{loading ? "—" : monthEntries.length}<small>건</small></strong></div><span className="stat-caption">{month.month + 1}월 기준</span></div><div className="stat-card"><span className="stat-icon peach"><Users size={21} /></span><div><p>이번 달 등록 인원</p><strong>{loading ? "—" : new Set(monthEntries.map(entry => entry.name)).size}<small>명</small></strong></div><span className="stat-caption">중복 제외</span></div><div className="stat-card"><span className="stat-icon lavender"><Sparkles size={21} /></span><div><p>함께하는 우리 반</p><strong>{classSize}<small>명</small></strong></div><span className="stat-caption class-label">{cls.short}</span></div></section>
        {error && <div className="error-banner" role="alert"><Info size={18} /><span>{error}</span><button onClick={() => refresh()}>다시 불러오기</button></div>}
        <div className={`calendar-layout ${sideOpen ? "" : "panel-closed"}`}>
          <section className="calendar-card" aria-label="월간 출결 캘린더">
            <div className="calendar-toolbar"><div className="month-heading">{view === "week" ? <><h2>{month.year}년 <b>{weekDays[0].month}.{weekDays[0].number} – {weekDays[6].month}.{weekDays[6].number}</b></h2><span>WEEKLY</span></> : <><h2>{month.year}년 <b>{month.month + 1}월</b></h2><span>{MONTHS[month.month]}</span></>}</div><div className="month-controls"><div className="view-switch" role="group" aria-label="보기 방식">{(["month", "week"] as const).map(item => <button key={item} type="button" aria-pressed={view === item} className={view === item ? "active" : ""} onClick={() => changeView(item)}>{item === "month" ? "월간" : "주간"}</button>)}</div><button className="today-button" onClick={() => { if (today) selectDate(today); }}>오늘</button><div className="month-arrows"><button aria-label={view === "week" ? "이전 주" : "이전 달"} onClick={() => view === "week" ? moveWeek(-1) : moveMonth(-1)}><ChevronLeft size={18} /></button><button aria-label={view === "week" ? "다음 주" : "다음 달"} onClick={() => view === "week" ? moveWeek(1) : moveMonth(1)}><ChevronRight size={18} /></button></div>{!sideOpen && <button className="icon-button" aria-label="날짜 상세 열기" onClick={() => setSideOpen(true)}><ArrowLeft size={17} /></button>}</div></div>
            <div className="calendar-filters"><label className="calendar-search"><Search size={16} /><input aria-label="캘린더 이름 검색" placeholder="이름으로 찾아보기" value={search} onChange={event => setSearch(event.target.value)} />{search && <button aria-label="검색 초기화" onClick={() => setSearch("")}><X size={14} /></button>}</label><label className="filter-select"><select aria-label="출결 사유 필터" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">모든 사유</option>{TYPES.map(type => <option key={type}>{type}</option>)}</select><ChevronDown size={14} /></label></div>
            {view === "week" ? <div className="week-grid" aria-busy={loading} aria-label="주간 출결">{weekDays.map(day => {
              const items = visibleEntries.filter(entry => entry.date === day.key);
              return <section key={day.key} className={`week-day ${selectedDate === day.key ? "selected" : ""}`} aria-label={`${formatDate(day.key)}, 출결 ${items.length}건`}><button type="button" className={`week-day-head ${day.weekday === 0 ? "sunday" : day.weekday === 6 ? "saturday" : ""}`} onClick={() => selectDate(day.key)} aria-current={today === day.key ? "date" : undefined}><span>{WEEKDAYS[day.weekday]}</span><b className={today === day.key ? "is-today" : ""}>{day.number}</b>{items.length > 0 && <em>{items.length}건</em>}</button><div className="week-day-events">{items.length ? items.map(entry => <button type="button" key={entry.id} className={`week-event ${statusClass(entry)}`} onClick={() => openPerson(day.key, entry.name)}><strong>{entry.name}</strong><span>{statusPrefix(entry)}{entry.type}</span></button>) : <span className="week-empty">출결 없음</span>}</div></section>;
            })}</div> : <div role="grid" aria-label={`${month.year}년 ${month.month + 1}월`} className="calendar-grid" aria-busy={loading}><div role="row" className="weekdays">{WEEKDAYS.map((day, i) => <div role="columnheader" key={day} className={i === 0 ? "sunday" : i === 6 ? "saturday" : ""}>{day}</div>)}</div>{Array.from({ length: cellCount / 7 }, (_, row) => <div className="calendar-week" role="row" key={row}>{days.slice(row * 7, row * 7 + 7).map(day => {
              const items = visibleEntries.filter(entry => entry.date === day.key);
              return <div role="gridcell" aria-selected={selectedDate === day.key} key={day.key} className={`calendar-cell ${day.current ? "" : "outside"} ${selectedDate === day.key ? "selected" : ""}`}><button className={`day-button ${day.weekday === 0 ? "sunday" : day.weekday === 6 ? "saturday" : ""}`} onClick={() => selectDate(day.key)} aria-label={`${formatDate(day.key)}, 출결 ${items.length}건${today === day.key ? ", 오늘" : ""}`} aria-current={today === day.key ? "date" : undefined}><span className="day-top"><span className={`day-number ${today === day.key ? "is-today" : ""}`}>{day.number}</span>{today === day.key && <span className="today-text">오늘</span>}</span><span className="day-events">{items.slice(0, items.length > 3 ? 2 : 3).map(entry => <span className={`calendar-event ${statusClass(entry)}`} key={entry.id}><span className="event-name">{entry.name}</span><span className="event-type">{statusPrefix(entry)}{entry.type}</span></span>)}{items.length > 3 && <span className="more-events">+{items.length - 2}건 더보기</span>}</span></button></div>;
            })}</div>)}</div>}
            <div className="calendar-legend">{TYPES.map(type => <button key={type} className={`legend-item ${typeClass(type)} ${filter === type ? "is-active" : ""}`} onClick={() => setFilter(filter === type ? "all" : type)} aria-pressed={filter === type}><i />{type}</button>)}</div>
            <div className="calendar-hint"><Info size={14} /><span>날짜를 선택하면 상세 출결을 확인할 수 있어요.</span><span className="calendar-view-label">{view === "week" ? "주간 보기" : "월간 보기"}</span></div>
          </section>
          {sideOpen && <aside ref={detailRef} className="detail-panel" aria-label="선택한 날짜의 출결"><div className="detail-header"><span className="detail-eyebrow">DAILY ATTENDANCE</span><button className="icon-button" aria-label="날짜 상세 닫기" onClick={() => setSideOpen(false)}><X size={17} /></button></div><div className="detail-date"><h2>{selectedDate ? `${Number(selectedDate.slice(5, 7))}월 ${Number(selectedDate.slice(8, 10))}일` : "날짜 선택"}</h2>{selectedDate === today && <span className="today-tag">오늘</span>}</div><p className="detail-weekday">{selectedDate && `${selectedDate.slice(0, 4)}년 ${WEEKDAYS[new Date(`${selectedDate}T12:00:00+09:00`).getDay()]}요일`}</p><div className="detail-summary"><span>이날의 출결 <b>{names.length}</b><small>명</small></span><span>{dayEntries.length}건{filtered ? " · 필터 적용" : ""}</span></div>
            <div className="people-list">{loading ? <div className="panel-empty"><LoaderCircle size={26} className="spin" /><p>출결을 불러오고 있어요.</p></div> : error ? <div className="panel-empty"><Info size={28} /><strong>잠시 연결이 끊겼어요</strong><p>다시 불러오기를 눌러 주세요.</p><button className="text-button" onClick={() => refresh()}>다시 불러오기</button></div> : names.length ? names.map((name, index) => {
              const items = dayEntries.filter(entry => entry.name === name);
              return <div className="person-card" key={name}><button className="person-toggle" aria-haspopup="dialog" onClick={() => setDetailName(name)}><span className={`person-avatar avatar-${index % 4}`}>{name.slice(1)}</span><strong>{name}</strong><span className={`type-badge ${statusClass(items[0])}`}>{statusPrefix(items[0])}{items[0].type}{items.length > 1 && ` +${items.length - 1}`}</span><ChevronRight size={15} className="person-chevron" /></button></div>;
            }) : <div className="panel-empty"><div className="empty-calendar"><CalendarDays size={35} strokeWidth={1.35} /><span><Check size={12} strokeWidth={3} /></span></div><strong>{filtered ? "검색된 출결이 없어요" : "아직 등록된 출결이 없어요"}</strong><p>{filtered ? <>이름이나 사유 필터를 바꾸어<br />다시 확인해 보세요.</> : <>예정된 지각, 조퇴, 결석이 있다면<br />우리 반에 미리 알려주세요.</>}</p>{filtered && <button className="text-button" onClick={() => { setFilter("all"); setSearch(""); }}>필터 초기화</button>}</div>}</div>
            <button className="day-register" onClick={() => register()}><Plus size={16} />{user || authLoading ? "이 날짜에 출결 등록" : "로그인하고 출결 등록"}</button><div className="detail-tip"><span><Info size={15} /></span><p>이름을 누르면 상세 이유를 볼 수 있어요.<br /><b>상세 이유 작성은 선택 사항이에요.</b></p></div>
          </aside>}
        </div>
        <footer className="main-footer"><span><Layers2 size={14} />출결 모아 <i />서로를 위한 작은 공유</span><span>Made for SSAFY {cls.name} <span className="footer-heart">♡</span></span></footer>
      </main>
    </div>
    <EntryDetailDialog groupFor={groupFor} name={detailName} entries={detailName ? dayEntries.filter(entry => entry.name === detailName) : []} onClose={closeDetail} onEdit={entry => { setDetailName(null); setRegistration({ date: entry.date, entry }); }} onChanged={message => { refresh(true); if (message) setToast(message); }} />
    <AttendanceEditor data={registration} findExisting={findExisting} onEditExisting={entry => setRegistration({ date: entry.date, entry })} onClose={() => setRegistration(null)} groupFor={groupFor} onSaved={(entry, count, edited) => { selectDate(entry.date); setFilter("all"); setSearch(""); if (entry.date.startsWith(monthKey)) setEntries(items => [...items.filter(item => item.id !== entry.id), entry].sort((a, b) => a.name.localeCompare(b.name, "ko"))); refresh(true); setToast(`${entry.name}님의 ${entry.fineId || entry.unnotified ? "무단 출결과 벌금" : "출결"}${count > 1 ? ` ${count}건` : ""}을 ${edited ? "수정" : "등록"}했어요.`); }} />
    <dialog ref={infoRef} className="modal info-modal" onCancel={() => setInfoDialog(null)} onClick={event => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) setInfoDialog(null); } }}><div className="modal-header"><div><span className="eyebrow">OUR CLASS</span><h2>{infoDialog === "members" ? "함께하는 우리 반" : "출결 모아 이용 가이드"}</h2></div><button className="icon-button" onClick={() => setInfoDialog(null)} aria-label="닫기"><X size={21} /></button></div>{infoDialog === "members" ? <><p className="modal-description">SSAFY {cls.name} · 총 {classSize}명</p><label className="member-search"><Search size={17} /><input aria-label="반 명단 이름 검색" placeholder="이름을 검색해 보세요" value={memberSearch} onChange={event => setMemberSearch(event.target.value)} /></label><div className="member-grid">{rosterNames.filter(name => name.includes(memberSearch.trim())).map((name, index) => <div key={name}><span className={`person-avatar avatar-${index % 4}`}>{name.slice(1)}</span><strong>{name}</strong></div>)}</div>{!rosterNames.some(name => name.includes(memberSearch.trim())) && <p className="no-results">검색 결과가 없어요.</p>}</> : <div className="guide-content"><div><span>01</span><section><h3>출결을 미리 공유해요</h3><p>날짜를 선택한 뒤 ‘이 날짜에 출결 등록’ 버튼에서 사유를 선택해 주세요. 이름은 로그인한 회원으로 자동 저장됩니다. 당일 오전 8시 이후에 올리면 무단으로 처리되고 벌금 5,000원이 부과되니 미리 올려 주세요.</p></section></div><div><span>02</span><section><h3>꼭 필요한 정보만 간단하게</h3><p>이름과 출결 사유는 필수예요. 상세 이유는 필요할 때만 작성해 주세요.</p></section></div><div><span>03</span><section><h3>날짜를 누르면 한눈에</h3><p>캘린더에는 이름과 사유가 표시돼요. 날짜를 선택하면 오른쪽에 명단이 나오고, 이름을 누르면 상세 이유가 팝업으로 열려요.</p></section></div><div><span>04</span><section><h3>함께 보는 같은 캘린더</h3><p>등록한 내용은 서버에 저장되며 접속한 사람들과 공유돼요. 화면은 15초마다 새로 확인해요. 본인 출결은 상세 팝업에서 수정할 수 있어요. 본인 출결은 삭제도 할 수 있어요. 무단 출결은 사유와 상세 이유만 바꿀 수 있고, 삭제는 관리자에게 요청해 주세요.</p></section></div></div>}<div className="info-modal-footer"><button className="primary-button" onClick={() => setInfoDialog(null)}>확인했어요<Check size={16} /></button></div></dialog>
    {toast && <div className="toast" role="status"><Check size={17} /><span>{toast}</span><button onClick={() => setToast("")} aria-label="알림 닫기"><X size={15} /></button></div>}
  </div>;
}
