"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, CalendarPlus, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Flower2, Info, Layers2, LoaderCircle, Plus, Search, Sparkles, ShieldCheck, Users, X } from "lucide-react";
import { AttendanceEntry, AttendanceType, dateKey, koreaToday, MEMBERS, TYPES } from "@/lib/attendance";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const typeClass = (type: string) => `type-${TYPES.indexOf(type as AttendanceType)}`;
const formatDate = (date: string) => new Date(`${date}T12:00:00+09:00`).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Seoul" });

export default function Home() {
  const [today, setToday] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [month, setMonth] = useState({ year: 2026, month: 9 });
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sideOpen, setSideOpen] = useState(true);
  const [toast, setToast] = useState("");


  const [infoDialog, setInfoDialog] = useState<"members" | "guide" | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const infoRef = useRef<HTMLDialogElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const monthKey = dateKey(month.year, month.month, 1).slice(0, 7);
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
      const response = await fetch(`/api/attendance?month=${monthKey}`, { cache: "no-store" });
      const data = await response.json() as { entries: AttendanceEntry[]; error?: string };
      if (!response.ok) throw new Error(data.error || "출결 정보를 불러오지 못했어요.");
      if (sequence === fetchSequence.current) { setEntries(data.entries); setError(""); }
    } catch (e) {
      if (sequence === fetchSequence.current) setError(e instanceof Error ? e.message : "연결을 확인해 주세요.");
    } finally { if (sequence === fetchSequence.current) setLoading(false); }
  }, [monthKey]);

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
    setSelectedDate(date); setSideOpen(true); setExpanded(null);
    if (!date.startsWith(monthKey)) setMonth({ year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) - 1 });
    requestAnimationFrame(() => { if (window.innerWidth <= 1050) detailRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }); });
  }
  function moveMonth(offset: number) {
    const next = new Date(month.year, month.month + offset, 1);
    if (next.getFullYear() < 2000 || next.getFullYear() > 2100) return;
    setMonth({ year: next.getFullYear(), month: next.getMonth() });
    setSelectedDate(dateKey(next.getFullYear(), next.getMonth(), 1)); setExpanded(null);
  }

  const visibleEntries = entries.filter(entry => (filter === "all" || entry.type === filter) && entry.name.includes(search.trim()));
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

  const [registration, setRegistration] = useState<{ date: string } | null>(null);
  const register = (date = selectedDate || today) => setRegistration({ date });

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="출결 모아 홈"><span className="brand-symbol"><Layers2 size={24} strokeWidth={2} /></span><span>출결 모아<span className="brand-caption">우리 반의 하루를 함께</span></span></a>
      <div className="class-card"><span className="class-icon">09<span>CLASS</span></span><div><strong>SSAFY 16기 9반</strong><p>24명이 함께하는 공간</p></div><span className="class-online" title="우리 반 공간" /></div>
      <div className="nav-heading">우리 반 공간</div>
      <nav aria-label="주 메뉴"><button className="nav-item active" onClick={() => { setSideOpen(true); setFilter("all"); setSearch(""); }}><CalendarDays size={19} /><span>출결 캘린더</span><span className="nav-dot" /></button><button className="nav-item" onClick={() => { setMemberSearch(""); setInfoDialog("members"); }}><Users size={19} /><span>우리 반 명단</span><span className="nav-count">24</span></button></nav>
      <div className="sidebar-note"><span className="note-flower"><Flower2 size={29} strokeWidth={1.5} /></span><strong>작은 공유가 만드는<br />편안한 하루.</strong><p>미리 알려주면, 서로의 하루를<br />조금 더 잘 이해할 수 있어요.</p><span className="note-line" /></div>
      <div className="sidebar-bottom"><a className="nav-item admin-nav" href="/admin"><ShieldCheck size={18} /><span>관리자 페이지</span><ChevronRight size={15} /></a><button className="nav-item" onClick={() => setInfoDialog("guide")}><CircleHelp size={18} /><span>이용 가이드</span><ArrowRight size={15} /></button><div className="sidebar-footer"><span className="footer-dot" /> SSAFY 16TH <span>CLASS 09</span></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb"><span>우리 반 공간</span><ChevronRight size={14} /><strong>출결 캘린더</strong></div><div className="topbar-right"><span className={`sync-state ${error ? "offline" : ""}`}><i />{error ? "연결 확인 필요" : loading ? "불러오는 중" : "함께 공유 중"}</span><span className="topbar-divider" /><span className="class-avatar">9</span></div></header>
      <main className="main-content">
        <section className="page-heading"><div><div className="eyebrow"><span /> OUR CLASS, OUR DAYS</div><h1>우리 반 출결 캘린더<span className="heading-dot">.</span></h1><p>함께 확인하고, 미리 공유하는 우리 반의 하루</p></div><button className="primary-button" onClick={() => register()}><Plus size={18} />출결 등록</button></section>
        <section className="stats" aria-label="이번 달 출결 요약"><div className="stat-card"><span className="stat-icon mint"><CalendarDays size={21} /></span><div><p>이번 달 출결 내역</p><strong>{loading ? "—" : entries.length}<small>건</small></strong></div><span className="stat-caption">{month.month + 1}월 기준</span></div><div className="stat-card"><span className="stat-icon peach"><Users size={21} /></span><div><p>이번 달 등록 인원</p><strong>{loading ? "—" : new Set(entries.map(entry => entry.name)).size}<small>명</small></strong></div><span className="stat-caption">중복 제외</span></div><div className="stat-card"><span className="stat-icon lavender"><Sparkles size={21} /></span><div><p>함께하는 우리 반</p><strong>24<small>명</small></strong></div><span className="stat-caption class-label">16기 · 9반</span></div></section>
        {error && <div className="error-banner" role="alert"><Info size={18} /><span>{error}</span><button onClick={() => refresh()}>다시 불러오기</button></div>}
        <div className={`calendar-layout ${sideOpen ? "" : "panel-closed"}`}>
          <section className="calendar-card" aria-label="월간 출결 캘린더">
            <div className="calendar-toolbar"><div className="month-heading"><h2>{month.year}년 <b>{month.month + 1}월</b></h2><span>{MONTHS[month.month]}</span></div><div className="month-controls"><button className="today-button" onClick={() => { if (today) selectDate(today); }}>오늘</button><div className="month-arrows"><button aria-label="이전 달" onClick={() => moveMonth(-1)}><ChevronLeft size={18} /></button><button aria-label="다음 달" onClick={() => moveMonth(1)}><ChevronRight size={18} /></button></div>{!sideOpen && <button className="icon-button" aria-label="날짜 상세 열기" onClick={() => setSideOpen(true)}><ArrowLeft size={17} /></button>}</div></div>
            <div className="calendar-filters"><label className="calendar-search"><Search size={16} /><input aria-label="캘린더 이름 검색" placeholder="이름으로 찾아보기" value={search} onChange={event => setSearch(event.target.value)} />{search && <button aria-label="검색 초기화" onClick={() => setSearch("")}><X size={14} /></button>}</label><label className="filter-select"><select aria-label="출결 사유 필터" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">모든 사유</option>{TYPES.map(type => <option key={type}>{type}</option>)}</select><ChevronDown size={14} /></label></div>
            <div role="grid" aria-label={`${month.year}년 ${month.month + 1}월`} className="calendar-grid" aria-busy={loading}><div role="row" className="weekdays">{WEEKDAYS.map((day, i) => <div role="columnheader" key={day} className={i === 0 ? "sunday" : i === 6 ? "saturday" : ""}>{day}</div>)}</div>{Array.from({ length: cellCount / 7 }, (_, row) => <div className="calendar-week" role="row" key={row}>{days.slice(row * 7, row * 7 + 7).map(day => {
              const items = visibleEntries.filter(entry => entry.date === day.key);
              return <div role="gridcell" aria-selected={selectedDate === day.key} key={day.key} className={`calendar-cell ${day.current ? "" : "outside"} ${selectedDate === day.key ? "selected" : ""}`}><button className={`day-button ${day.weekday === 0 ? "sunday" : day.weekday === 6 ? "saturday" : ""}`} onClick={() => selectDate(day.key)} aria-label={`${formatDate(day.key)}, 출결 ${items.length}건${today === day.key ? ", 오늘" : ""}`} aria-current={today === day.key ? "date" : undefined}><span className="day-top"><span className={`day-number ${today === day.key ? "is-today" : ""}`}>{day.number}</span>{today === day.key && <span className="today-text">오늘</span>}</span><span className="day-events">{items.slice(0, 3).map(entry => <span className={`calendar-event ${typeClass(entry.type)}`} key={entry.id}><span className="event-name">{entry.name}</span><span className="event-type">{entry.type}</span></span>)}{items.length > 3 && <span className="more-events">+{items.length - 3}건 더보기</span>}</span></button></div>;
            })}</div>)}</div>
            <div className="calendar-legend">{TYPES.map(type => <button key={type} className={`legend-item ${typeClass(type)} ${filter === type ? "is-active" : ""}`} onClick={() => setFilter(filter === type ? "all" : type)} aria-pressed={filter === type}><i />{type}</button>)}</div>
            <div className="calendar-hint"><Info size={14} /><span>날짜를 선택하면 상세 출결을 확인할 수 있어요.</span><span className="calendar-view-label">월간 보기</span></div>
          </section>
          {sideOpen && <aside ref={detailRef} className="detail-panel" aria-label="선택한 날짜의 출결"><div className="detail-header"><span className="detail-eyebrow">DAILY ATTENDANCE</span><button className="icon-button" aria-label="날짜 상세 닫기" onClick={() => setSideOpen(false)}><X size={17} /></button></div><div className="detail-date"><h2>{selectedDate ? `${Number(selectedDate.slice(5, 7))}월 ${Number(selectedDate.slice(8, 10))}일` : "날짜 선택"}</h2>{selectedDate === today && <span className="today-tag">오늘</span>}</div><p className="detail-weekday">{selectedDate && `${selectedDate.slice(0, 4)}년 ${WEEKDAYS[new Date(`${selectedDate}T12:00:00+09:00`).getDay()]}요일`}</p><div className="detail-summary"><span>이날의 출결 <b>{names.length}</b><small>명</small></span><span>{dayEntries.length}건{filtered ? " · 필터 적용" : ""}</span></div>
            <div className="people-list">{loading ? <div className="panel-empty"><LoaderCircle size={26} className="spin" /><p>출결을 불러오고 있어요.</p></div> : error ? <div className="panel-empty"><Info size={28} /><strong>잠시 연결이 끊겼어요</strong><p>다시 불러오기를 눌러 주세요.</p><button className="text-button" onClick={() => refresh()}>다시 불러오기</button></div> : names.length ? names.map((name, index) => {
              const items = dayEntries.filter(entry => entry.name === name); const open = expanded === name;
              return <div className={`person-card ${open ? "expanded" : ""}`} key={name}><button className="person-toggle" aria-expanded={open} aria-controls={`person-${name}`} onClick={() => { setExpanded(open ? null : name); }}><span className={`person-avatar avatar-${index % 4}`}>{name.slice(1)}</span><strong>{name}</strong><span className={`type-badge ${typeClass(items[0].type)}`}>{items[0].type}{items.length > 1 && ` +${items.length - 1}`}</span><ChevronDown size={15} className="accordion-chevron" /></button>{open && <div className="person-details" id={`person-${name}`}>{items.map(entry => <div className="entry-detail" key={entry.id}><div className="entry-type-line"><span className={`type-badge ${typeClass(entry.type)}`}>{entry.type}</span><span>출결 사유</span></div><label>상세 이유</label><p className={!entry.reason ? "no-reason" : ""}>{entry.reason || "작성된 상세 이유가 없어요."}</p><div className="entry-footer"><span><Clock3 size={12} />{new Date(entry.createdAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" })} 등록</span><a className="admin-edit-link" href="/admin">관리자에서 관리</a></div></div>)}</div>}</div>;
            }) : <div className="panel-empty"><div className="empty-calendar"><CalendarDays size={35} strokeWidth={1.35} /><span><Check size={12} strokeWidth={3} /></span></div><strong>{filtered ? "검색된 출결이 없어요" : "아직 등록된 출결이 없어요"}</strong><p>{filtered ? <>이름이나 사유 필터를 바꾸어<br />다시 확인해 보세요.</> : <>예정된 지각, 조퇴, 결석이 있다면<br />우리 반에 미리 알려주세요.</>}</p>{filtered && <button className="text-button" onClick={() => { setFilter("all"); setSearch(""); }}>필터 초기화</button>}</div>}</div>
            <button className="day-register" onClick={() => register()}><Plus size={16} />이 날짜에 출결 등록</button><div className="detail-tip"><span><Info size={15} /></span><p>이름을 누르면 상세 이유를 볼 수 있어요.<br /><b>상세 이유 작성은 선택 사항이에요.</b></p></div>
          </aside>}
        </div>
        <footer className="main-footer"><span><Layers2 size={14} />출결 모아 <i />서로를 위한 작은 공유</span><span>Made for SSAFY 16기 9반 <span className="footer-heart">♡</span></span></footer>
      </main>
    </div>
    <RegistrationDialog data={registration} onClose={() => setRegistration(null)} onSaved={entry => { selectDate(entry.date); setFilter("all"); setSearch(""); setExpanded(entry.name); if (entry.date.startsWith(monthKey)) { setEntries(items => [...items, entry].sort((a, b) => a.name.localeCompare(b.name, "ko"))); refresh(true); } setToast(`${entry.name}님의 출결을 등록했어요.`); }} />
    <dialog ref={infoRef} className="modal info-modal" onCancel={() => setInfoDialog(null)} onClick={event => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) setInfoDialog(null); } }}><div className="modal-header"><div><span className="eyebrow">OUR CLASS</span><h2>{infoDialog === "members" ? "함께하는 우리 반" : "출결 모아 이용 가이드"}</h2></div><button className="icon-button" onClick={() => setInfoDialog(null)} aria-label="닫기"><X size={21} /></button></div>{infoDialog === "members" ? <><p className="modal-description">SSAFY 16기 9반 · 총 24명</p><label className="member-search"><Search size={17} /><input aria-label="반 명단 이름 검색" placeholder="이름을 검색해 보세요" value={memberSearch} onChange={event => setMemberSearch(event.target.value)} /></label><div className="member-grid">{MEMBERS.filter(name => name.includes(memberSearch.trim())).map((name, index) => <div key={name}><span className={`person-avatar avatar-${index % 4}`}>{name.slice(1)}</span><strong>{name}</strong></div>)}</div>{!MEMBERS.some(name => name.includes(memberSearch.trim())) && <p className="no-results">검색 결과가 없어요.</p>}</> : <div className="guide-content"><div><span>01</span><section><h3>출결을 미리 공유해요</h3><p>출결 등록 버튼을 누르고 날짜, 이름, 사유를 선택해 주세요. 이름은 입력 후 검색 목록에서 선택할 수 있어요.</p></section></div><div><span>02</span><section><h3>꼭 필요한 정보만 간단하게</h3><p>이름과 출결 사유는 필수예요. 상세 이유는 필요할 때만 작성해 주세요.</p></section></div><div><span>03</span><section><h3>날짜를 누르면 한눈에</h3><p>캘린더에는 이름과 사유가 표시돼요. 날짜를 선택하면 오른쪽에 명단이 나오고, 이름을 누르면 상세 이유가 펼쳐져요.</p></section></div><div><span>04</span><section><h3>함께 보는 같은 캘린더</h3><p>등록한 내용은 서버에 저장되며 접속한 사람들과 공유돼요. 화면은 15초마다 새로 확인해요. 잘못 등록한 내역은 관리자 페이지에서 수정하거나 삭제할 수 있어요.</p></section></div></div>}<div className="info-modal-footer"><button className="primary-button" onClick={() => setInfoDialog(null)}>확인했어요<Check size={16} /></button></div></dialog>
    {toast && <div className="toast" role="status"><Check size={17} /><span>{toast}</span><button onClick={() => setToast("")} aria-label="알림 닫기"><X size={15} /></button></div>}
  </div>;
}

function RegistrationDialog({ data, onClose, onSaved }: { data: { date: string } | null; onClose: () => void; onSaved: (entry: AttendanceEntry) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const nameContainerRef = useRef<HTMLDivElement>(null);
  const [date, setDate] = useState(""); const [nameQuery, setNameQuery] = useState(""); const [name, setName] = useState("");
  const [type, setType] = useState<AttendanceType | "">(""); const [reason, setReason] = useState("");
  const [nameOpen, setNameOpen] = useState(false); const [activeOption, setActiveOption] = useState(0);
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const options = MEMBERS.filter(member => member.includes(nameQuery.trim()));
  useEffect(() => { if (data) { setDate(data.date); setNameQuery(""); setName(""); setType(""); setReason(""); setError(""); setNameOpen(false); setSaving(false); dialogRef.current?.showModal(); } else dialogRef.current?.close(); }, [data]);
  useEffect(() => { const outside = (event: PointerEvent) => { if (nameContainerRef.current && !nameContainerRef.current.contains(event.target as Node)) setNameOpen(false); }; document.addEventListener("pointerdown", outside); return () => document.removeEventListener("pointerdown", outside); }, []);
  function choose(member: string) { setName(member); setNameQuery(member); setNameOpen(false); searchRef.current?.focus(); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (saving) return;
    if (!name) { setError("이름을 검색한 뒤 반 명단에서 선택해 주세요."); searchRef.current?.focus(); setNameOpen(true); return; }
    if (!type) { setError("출결 사유를 선택해 주세요."); return; }
    setSaving(true); setError("");
    try { const response = await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, name, type, reason }) }); const result = await response.json() as { entry: AttendanceEntry; error?: string }; if (!response.ok) throw new Error(result.error || "저장하지 못했어요."); onSaved(result.entry); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했어요. 다시 시도해 주세요."); } finally { setSaving(false); }
  }
  return <dialog ref={dialogRef} className="modal registration-modal" aria-labelledby="registration-title" onCancel={event => { if (saving) event.preventDefault(); else onClose(); }} onClick={event => { if (!saving && event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose(); } }}><form onSubmit={submit}>
    <div className="modal-header"><div><span className="modal-symbol"><CalendarPlus size={22} /></span><h2 id="registration-title">출결 등록하기</h2></div><button type="button" className="icon-button" disabled={saving} aria-label="등록창 닫기" onClick={onClose}><X size={21} /></button></div><p className="modal-description">예정된 출결을 우리 반에 미리 알려주세요.</p>
    <div className="form-body"><fieldset disabled={saving}>
      <div className="field"><label htmlFor="attendance-date">날짜 <span className="required">*</span></label><input id="attendance-date" type="date" min="2000-01-01" max="2100-12-31" value={date} onChange={event => setDate(event.target.value)} required /></div>
      <div className="field" ref={nameContainerRef}><label htmlFor="attendance-name">이름 <span className="required">*</span></label><div className={`name-input ${name ? "has-selection" : ""}`}><Search size={17} /><input ref={searchRef} id="attendance-name" role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={nameOpen} aria-controls="name-options" aria-activedescendant={nameOpen && options[activeOption] ? `name-option-${activeOption}` : undefined} aria-required="true" placeholder="이름을 입력하고 선택해 주세요" value={nameQuery} onFocus={() => { if (!name) setNameOpen(true); }} onChange={event => { setNameQuery(event.target.value); setName(""); setNameOpen(true); setActiveOption(0); }} onKeyDown={event => { if (event.key === "Escape" && nameOpen) { event.preventDefault(); event.stopPropagation(); setNameOpen(false); } else if (event.key === "ArrowDown") { event.preventDefault(); setNameOpen(true); setActiveOption(i => nameOpen ? Math.min(i + 1, options.length - 1) : 0); } else if (event.key === "ArrowUp") { event.preventDefault(); setActiveOption(i => Math.max(0, i - 1)); } else if (event.key === "Enter" && nameOpen) { event.preventDefault(); if (options[activeOption]) choose(options[activeOption]); } else if (event.key === "Tab") setNameOpen(false); }} />{name ? <Check size={17} className="selected-check" /> : <button type="button" aria-label="이름 목록 열기" onClick={() => { setNameOpen(!nameOpen); searchRef.current?.focus(); }}><ChevronDown size={17} /></button>}</div>{nameOpen && <div id="name-options" role="listbox" aria-label="우리 반 이름 목록" className="name-options">{options.length ? options.map((member, i) => <div role="option" aria-selected={name === member} className={activeOption === i ? "highlighted" : ""} id={`name-option-${i}`} key={member} onPointerDown={event => event.preventDefault()} onClick={() => choose(member)} onMouseEnter={() => setActiveOption(i)}><span className="option-avatar">{member.slice(1)}</span><strong>{member}</strong><small>16기 9반</small>{name === member && <Check size={15} />}</div>) : <div className="no-results">일치하는 이름이 없어요.</div>}</div>}<span className="field-help">우리 반 명단 24명 중 선택할 수 있어요.</span></div>
      <div className="field"><label htmlFor="attendance-type">출결 사유 <span className="required">*</span></label><div className="reason-select"><select id="attendance-type" value={type} required onChange={event => setType(event.target.value as AttendanceType)}><option value="" disabled>사유를 선택해 주세요</option>{TYPES.map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={17} /></div></div>
      <div className="field"><label htmlFor="attendance-reason">상세 이유 <span className="optional">선택</span></label><textarea id="attendance-reason" value={reason} maxLength={500} rows={3} placeholder="추가로 공유할 내용이 있다면 자유롭게 작성해 주세요." onChange={event => setReason(event.target.value)} /><div className="textarea-bottom"><span>상세 이유는 비워두어도 괜찮아요.</span><span>{reason.length} / 500</span></div></div>
    </fieldset>{error && <p className="form-error" role="alert"><Info size={15} />{error}</p>}<div className="form-notice"><Users size={16} /><span>등록한 출결은 우리 반 캘린더에 함께 공유돼요.</span></div></div>
    <div className="modal-footer"><span><span className="required">*</span> 필수 입력 항목</span><div><button className="secondary-button" type="button" onClick={onClose} disabled={saving}>취소</button><button className="primary-button" type="submit" disabled={saving}>{saving ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}{saving ? "등록 중…" : "등록하기"}</button></div></div>
  </form></dialog>;
}
