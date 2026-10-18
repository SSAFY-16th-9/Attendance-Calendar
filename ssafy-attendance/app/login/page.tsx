"use client";
import { useState } from "react";
import { Eye, EyeOff, Info, Layers2, LoaderCircle, LockKeyhole } from "lucide-react";
export default function Login() {
  const [username, setUsername] = useState(""); const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false); const [remember, setRemember] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try {
      const response = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: username.trim(), password, remember }) });
      const data = await response.json() as { next?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "로그인하지 못했어요.");
      const next = new URLSearchParams(location.search).get("next") || "/";
      location.assign(data.next === "/account" ? "/account" : next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/");
    } catch (e) { setError(e instanceof Error ? e.message : "연결을 확인해 주세요."); setBusy(false); }
  }
  return <div className="admin-app"><header className="admin-topbar"><span className="brand"><span className="brand-symbol"><Layers2 size={24} /></span><span>출결 모아<span className="brand-caption">SSAFY 16기 9반</span></span></span></header><main className="admin-login"><div className="login-intro"><span className="login-eyebrow">OUR CLASS, OUR DAYS</span><h1>우리 반의 하루를<br /><span>함께 나눠요.</span></h1><p>캘린더는 로그인 없이도 볼 수 있어요.<br />로그인하면 본인의 출결을 등록·수정하고 상세 이유와 벌금 현황을 볼 수 있습니다.</p><a className="text-button login-calendar-link" href="/">로그인 없이 캘린더 보기</a></div><section className="login-card"><span className="modal-symbol"><LockKeyhole size={22} /></span><h2>우리 반 로그인</h2><form onSubmit={submit}><fieldset disabled={busy}><div className="field"><label htmlFor="member-username">아이디</label><input id="member-username" autoComplete="username" required maxLength={100} value={username} onChange={e => setUsername(e.target.value)} placeholder="아이디" /></div><div className="field"><label htmlFor="member-password">비밀번호</label><div className="password-input"><input id="member-password" autoComplete="current-password" required maxLength={256} type={visible ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} /><button type="button" aria-label={visible ? "비밀번호 숨기기" : "비밀번호 표시"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div><label className="remember-login"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />자동 로그인<span>이 기기에서 30일간 로그인을 유지해요. 공용 PC에서는 해제해 주세요.</span></label></fieldset>{error && <p className="form-error" role="alert"><Info size={15} />{error}</p>}<button className="primary-button login-button" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <LockKeyhole size={16} />}{busy ? "로그인 중…" : "로그인"}</button></form><div className="login-footnote">첫 로그인 후에는 비밀번호 변경이 필요합니다. 비밀번호를 잊은 경우 관리자에게 초기화를 요청해 주세요.</div></section></main></div>;
}
