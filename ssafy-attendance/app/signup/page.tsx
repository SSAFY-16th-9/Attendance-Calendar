"use client";
import { useState } from "react";
import { ArrowLeft, Check, Info, KeyRound, Layers2, LoaderCircle, UserPlus } from "lucide-react";

// Sign up with the join code an admin handed out: first the code (which names the class), then the account.
export default function Signup() {
  const [code, setCode] = useState(""); const [cohort, setCohort] = useState<{ id: string; name: string } | null>(null);
  const [name, setName] = useState(""); const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function send(body: object) {
    const response = await fetch("/api/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json() as { cohort?: { id: string; name: string }; error?: string };
    if (!response.ok) throw new Error(data.error || "다시 시도해 주세요.");
    return data;
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setError("");
    if (cohort && password !== confirmation) { setError("비밀번호 확인이 일치하지 않아요."); return; }
    setBusy(true);
    try {
      if (!cohort) setCohort((await send({ code })).cohort ?? null);
      else { await send({ code, name: name.trim(), username: username.trim(), password }); location.assign("/"); }
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); } finally { setBusy(false); }
  }
  return <div className="admin-app"><header className="admin-topbar"><a href="/" className="brand"><span className="brand-symbol"><Layers2 size={24} /></span><span>출결 모아<span className="brand-caption">회원가입</span></span></a></header><main className="admin-login">
    <div className="login-intro"><span className="login-eyebrow">JOIN YOUR CLASS</span><h1>가입 코드로<br /><span>우리 반에 들어와요.</span></h1><p>관리자에게 받은 가입 코드를 입력하면<br />그 기수로 바로 가입돼요.</p><a className="text-button login-calendar-link" href="/login">이미 계정이 있다면 로그인</a></div>
    <section className="login-card"><span className="modal-symbol">{cohort ? <UserPlus size={22} /> : <KeyRound size={22} />}</span><h2>{cohort ? `${cohort.name} 가입` : "가입 코드 입력"}</h2>
      {cohort && <p className="signup-cohort"><Check size={15} />코드 확인 완료 · <b>{cohort.name}</b>으로 가입해요.</p>}
      <form onSubmit={submit}><fieldset disabled={busy}>
        <div className="field"><label htmlFor="join-code">가입 코드</label><input id="join-code" required autoComplete="off" autoCapitalize="characters" maxLength={20} placeholder="ABCD-EFGH" value={code} readOnly={!!cohort} onChange={e => setCode(e.target.value)} className="join-code-input" />{cohort && <button type="button" className="text-button signup-change-code" onClick={() => { setCohort(null); setError(""); }}>다른 코드 입력</button>}</div>
        {cohort && <>
          <div className="field"><label htmlFor="signup-name">이름</label><input id="signup-name" required maxLength={20} autoComplete="name" placeholder="홍길동" value={name} onChange={e => setName(e.target.value)} /><span className="field-help">캘린더에 보이는 이름이에요. 한글·영문 1~20자</span></div>
          <div className="field"><label htmlFor="signup-username">아이디</label><input id="signup-username" required maxLength={40} autoComplete="username" placeholder="gildong" value={username} onChange={e => setUsername(e.target.value)} /><span className="field-help">영문·숫자·._- 3~40자</span></div>
          <div className="field"><label htmlFor="signup-password">비밀번호</label><input id="signup-password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /><span className="field-help">아이디와 다르게 8~128자</span></div>
          <div className="field"><label htmlFor="signup-confirm">비밀번호 확인</label><input id="signup-confirm" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></div>
        </>}
      </fieldset>{error && <p className="form-error" role="alert"><Info size={15} />{error}</p>}
      <button className="primary-button login-button" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : cohort ? <UserPlus size={16} /> : <KeyRound size={16} />}{busy ? "확인 중…" : cohort ? "가입하기" : "코드 확인"}</button></form>
      <a className="text-button account-back" href="/"><ArrowLeft size={14} />캘린더로 돌아가기</a>
    </section></main></div>;
}
