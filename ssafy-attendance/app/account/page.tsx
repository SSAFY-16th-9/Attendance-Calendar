"use client";
import { useState } from "react";
import { ArrowLeft, Check, Info, Layers2, LoaderCircle, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
export default function Account() {
  const { user, loading } = useAuth();
  const [currentPassword, setCurrent] = useState(""); const [newPassword, setNew] = useState(""); const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function change(event: React.FormEvent) {
    event.preventDefault(); if (newPassword !== confirmation) { setError("새 비밀번호와 확인이 일치하지 않아요."); return; } setBusy(true); setError("");
    try {
      const response = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
      const data = await response.json() as { error?: string }; if (!response.ok) throw new Error(data.error || "변경하지 못했어요.");
      location.assign("/");
    } catch (e) { setError(e instanceof Error ? e.message : "변경하지 못했어요."); setBusy(false); }
  }
  async function logout() { const r = await fetch("/api/session", { method: "DELETE" }); if (r.ok) location.assign("/login"); else setError("로그아웃하지 못했어요. 다시 시도해 주세요."); }
  return <div className="admin-app"><header className="admin-topbar"><a href="/" className="brand"><span className="brand-symbol"><Layers2 size={24} /></span><span>출결 모아<span className="brand-caption">SSAFY 16기 9반</span></span></a><button className="secondary-button logout-button" onClick={logout}><LogOut size={15} />로그아웃</button></header><main className="account-main"><section className="login-card"><span className="modal-symbol"><UserRound size={22} /></span><h2>회원정보</h2>{loading ? <p>회원정보를 확인하고 있어요.</p> : user?.role === "member" ? <><p>{user.name} · @{user.username}</p>{user.mustChangePassword && <div className="account-required"><Info size={16} /><span>처음 로그인했거나 비밀번호가 초기화되었어요. 본인만 아는 비밀번호로 변경한 뒤 이용해 주세요.</span></div>}<form onSubmit={change}><fieldset disabled={busy}><div className="field"><label htmlFor="current-password">현재 비밀번호</label><input id="current-password" type="password" autoComplete="current-password" required maxLength={256} value={currentPassword} onChange={e => setCurrent(e.target.value)} /></div><div className="field"><label htmlFor="new-password">새 비밀번호</label><input id="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={newPassword} onChange={e => setNew(e.target.value)} /><span className="field-help">아이디·현재 비밀번호와 다르게 8~128자로 입력해 주세요.</span></div><div className="field"><label htmlFor="confirm-password">새 비밀번호 확인</label><input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></div></fieldset>{error && <p className="form-error" role="alert"><Info size={15} />{error}</p>}<button className="primary-button login-button" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}비밀번호 변경</button></form></> : <><p>관리자 계정 설정은 서버 비밀 설정에서 관리합니다.</p><a className="primary-button login-button" href="/admin">관리자 페이지</a></>}{!user?.mustChangePassword && <a className="text-button account-back" href="/"><ArrowLeft size={14} />캘린더로 돌아가기</a>}</section></main></div>;
}
