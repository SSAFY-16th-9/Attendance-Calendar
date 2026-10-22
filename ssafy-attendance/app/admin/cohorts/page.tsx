"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Eye, EyeOff, Info, KeyRound, Layers2, Plus, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { AdminCohort, AdminCohorts, loadAdminCohorts } from "@/components/cohort-bar";

type Action = "select" | "visibility" | "newCode" | "codeOff" | "delete" | "restore";
const NOTICES: Record<Action, string> = { select: "", visibility: "공개 설정을 바꿨어요.", newCode: "새 가입 코드를 만들었어요. 이전 코드는 더 이상 쓸 수 없어요.", codeOff: "가입 코드를 껐어요. 이제 이 기수로 가입할 수 없어요.", delete: "기수를 삭제했어요. 기록은 남아 있고 언제든 복구할 수 있어요.", restore: "기수를 복구했어요." };

// Classes and their join codes. The core admin adds classes, sets public/private and deletes or restores them;
// a sub-admin can issue or stop the join code of their own class.
export default function CohortsPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<AdminCohorts | null>(null); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [generation, setGeneration] = useState(""); const [classNo, setClassNo] = useState(""); const [busy, setBusy] = useState(false);
  const load = useCallback(() => loadAdminCohorts().then(result => { setData(result); if (!result) setError("기수 목록을 불러오지 못했어요."); }), []);
  useEffect(() => { if (user?.role === "admin") load(); }, [user, load]);

  async function send(method: "POST" | "PATCH", body: object, done: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const r = await fetch("/api/admin/cohorts", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await r.json() as { error?: string };
      if (!r.ok) throw new Error(result.error || "처리하지 못했어요.");
      setNotice(done); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); } finally { setBusy(false); }
  }
  const act = (cohort: AdminCohort, action: Action, extra: object = {}) => {
    if (action === "delete" && !confirm(`${cohort.name}을(를) 삭제할까요?\n출결·벌금·회원 기록은 남지만, 이 기수 회원은 로그인할 수 없고 캘린더에서도 사라져요. 나중에 복구할 수 있어요.`)) return;
    if (action === "newCode" && cohort.joinCode && !confirm("새 코드를 만들면 지금 코드는 더 이상 쓸 수 없어요. 계속할까요?")) return;
    send("PATCH", { id: cohort.id, action, ...extra }, NOTICES[action]);
  };
  async function copy(code: string) { try { await navigator.clipboard.writeText(code); setNotice(`가입 코드 ${code}를 복사했어요.`); } catch { setNotice(`가입 코드: ${code}`); } }

  const live = data?.cohorts.filter(cohort => !cohort.deletedAt) ?? []; const deleted = data?.cohorts.filter(cohort => cohort.deletedAt) ?? [];
  return <div className="admin-app"><header className="admin-topbar"><a className="brand" href="/"><span className="brand-symbol"><Layers2 size={24} /></span><span>출결 모아<span className="brand-caption">기수 관리</span></span></a><a className="back-calendar" href="/admin/members">회원 관리</a></header><main className="admin-main">
    <section className="page-heading"><div><div className="eyebrow"><ShieldCheck size={14} /> ADMIN WORKSPACE</div><h1>기수·가입 코드<span className="heading-dot">.</span></h1><p>기수마다 가입 코드를 만들어 전달하면, 회원이 회원가입 화면에서 코드를 입력해 그 기수로 직접 가입해요.</p></div></section>
    {loading ? <p>관리자 권한을 확인하고 있어요.</p> : user?.role !== "admin" ? <div className="fine-login-needed"><h2>관리자만 이용할 수 있어요.</h2><a className="primary-button" href="/login">관리자 로그인</a></div> : <>
      {data?.superAdmin && <form className="cohort-bar cohort-add" onSubmit={e => { e.preventDefault(); send("POST", { generation: Number(generation), classNo: Number(classNo) }, "기수를 추가했어요. 비공개로 시작하고 가입 코드도 만들어졌어요."); setGeneration(""); setClassNo(""); }}>
        <strong>새 기수</strong>
        <label><input type="number" inputMode="numeric" min={1} max={999} required aria-label="기수" placeholder="17" value={generation} onChange={e => setGeneration(e.target.value)} />기</label>
        <label><input type="number" inputMode="numeric" min={1} max={99} required aria-label="반" placeholder="9" value={classNo} onChange={e => setClassNo(e.target.value)} />반</label>
        <button className="primary-button" disabled={busy}><Plus size={15} />기수 추가</button>
      </form>}
      {error && <p className="error-banner" role="alert"><Info size={16} />{error}</p>}{notice && <p className="member-notice cohort-notice" role="status"><Check size={16} />{notice}</p>}
      <section className="admin-records"><div className="admin-table-heading"><div><h2>기수 · {live.length}개</h2><p>{data?.superAdmin ? "공개 기수는 로그인 없이 캘린더를 볼 수 있고, 비공개 기수는 그 기수 회원과 관리자만 볼 수 있어요." : "하위 관리자는 자기 기수의 가입 코드만 만들거나 끌 수 있어요."}</p></div></div>
        <div className="admin-table-scroll"><table className="admin-table cohort-table"><thead><tr><th>기수</th><th>회원</th><th>공개</th><th>가입 코드</th><th>관리</th></tr></thead><tbody>{live.map(cohort => <tr key={cohort.id}>
          <td><strong>{cohort.name}</strong>{cohort.id === data?.selected && <span className="cohort-current">관리 중</span>}</td>
          <td>{cohort.members}명</td>
          <td>{data?.superAdmin
            ? <button className={`visibility-toggle ${cohort.visibility}`} disabled={busy} role="switch" aria-checked={cohort.visibility === "public"} onClick={() => act(cohort, "visibility", { visibility: cohort.visibility === "public" ? "private" : "public" })}>{cohort.visibility === "public" ? <Eye size={14} /> : <EyeOff size={14} />}{cohort.visibility === "public" ? "공개" : "비공개"}</button>
            : <span className={`visibility-badge ${cohort.visibility}`}>{cohort.visibility === "public" ? "공개" : "비공개"}</span>}</td>
          <td>{cohort.joinCode ? <button className="join-code" onClick={() => copy(cohort.joinCode!)} aria-label={`${cohort.name} 가입 코드 복사`}><KeyRound size={14} /><code>{cohort.joinCode}</code><Copy size={13} /></button> : <span className="join-code-off">꺼짐 · 가입 불가</span>}</td>
          <td><div className="member-actions">
            <button disabled={busy} onClick={() => act(cohort, "newCode")}>{cohort.joinCode ? "코드 새로 만들기" : "코드 만들기"}</button>
            {cohort.joinCode && <button disabled={busy} onClick={() => act(cohort, "codeOff")}>코드 끄기</button>}
            {data?.superAdmin && cohort.id !== data.selected && <button disabled={busy} onClick={() => send("PATCH", { id: cohort.id, action: "select" }, `${cohort.name}을(를) 관리하도록 바꿨어요.`)}>이 기수 관리</button>}
            {data?.superAdmin && <button className="member-delete" disabled={busy} onClick={() => act(cohort, "delete")}><Trash2 size={12} />삭제</button>}
          </div></td>
        </tr>)}</tbody></table>{!live.length && <div className="admin-empty"><strong>기수가 없어요</strong></div>}</div>
      </section>
      {data?.superAdmin && deleted.length > 0 && <section className="admin-records cohort-deleted"><div className="admin-table-heading"><div><h2>삭제된 기수 · {deleted.length}개</h2><p>기록은 그대로 남아 있어요. 복구하면 회원이 다시 로그인할 수 있어요(가입 코드는 새로 만들어야 해요).</p></div></div>
        <div className="admin-table-scroll"><table className="admin-table cohort-table"><thead><tr><th>기수</th><th>회원</th><th>삭제일</th><th>관리</th></tr></thead><tbody>{deleted.map(cohort => <tr key={cohort.id}>
          <td><strong>{cohort.name}</strong></td><td>{cohort.members}명</td><td>{cohort.deletedAt!.slice(0, 10)}</td>
          <td><div className="member-actions"><button disabled={busy} onClick={() => act(cohort, "restore")}><RotateCcw size={12} />복구</button></div></td>
        </tr>)}</tbody></table></div>
      </section>}
    </>}
  </main></div>;
}
