# 출결 모아 · SSAFY 16기 9반

우리 반 지각·조퇴·결석을 미리 공유하고 함께 확인하는 출결 캘린더입니다.

| 구분 | 주소 |
| --- | --- |
| 운영 캘린더 | https://ssafy-attendance-calendar.ckdals5619.workers.dev/ |
| 관리자 | https://ssafy-attendance-calendar.ckdals5619.workers.dev/admin |
| 저장소 | [SSAFY-16th-9/Attendance-Calendar](https://github.com/SSAFY-16th-9/Attendance-Calendar) |

> **변경 이력은 [CHANGELOG.md](CHANGELOG.md)에 기록합니다.** 이 README는 현재 기능과 운영 방법만 담는 기준 문서입니다.

---

## 1. 작업을 이어갈 때 먼저 확인할 것

1. 최상위 폴더에서 `git status`, `git pull`로 최신 상태를 맞춥니다. (다른 반원이 직접 커밋하기도 합니다.)
2. 실제 앱은 `ssafy-attendance/` 폴더입니다.
3. 변경 후 `npm test`, `npx tsc --noEmit`, `npm run build`를 실행합니다.
4. **DB 구조가 바뀌면 운영 D1에 SQL을 먼저 실행한 뒤 푸시**합니다. 푸시하면 Cloudflare가 자동 배포합니다.
5. 변경 내용은 [CHANGELOG.md](CHANGELOG.md)에 **요청 내용 → 수정 사항 → 수정 결과** 형식으로 추가합니다.
6. 비밀값(관리자 비밀번호·세션 키)은 Git에 없습니다. 로그에 출력하지 않습니다.

---

## 2. 기능 한눈에 보기

### 캘린더 (`/`)
- 월간 캘린더에 이름과 사유를 표시합니다. 하루 4건 이상이면 2건 + "+N건 더보기".
- 날짜를 누르면 오른쪽 명단, 이름을 누르면 **상세 팝업**.
- 명단 정렬: **로그인한 본인 → 조퇴 → 지각 → 결석 → 공가** (같은 묶음은 사유 → 임의, 이름순).
- 표시 접두어: 무단은 빨간색 **"무단 · 사유"**, 미정은 점선 **"미정 · 사유"**.
- 이름 검색, 사유 필터, 월 이동. 15초마다·창으로 돌아올 때 새로 조회합니다.

### 출결 등록·수정
- 사유 7종: **공가, 사유지각, 사유조퇴, 사유결석, 임의지각, 임의조퇴, 임의결석**. 상세 이유는 선택(최대 500자).
- **여러 날짜를 한 번에** 선택해 같은 사유로 등록(최대 31일). 함께 등록한 일정은 **함께 수정**할 수 있습니다.
- **미정** 토글: 아직 확정되지 않은 출결 표시.
- **한 날짜에 한 사람당 1건만** 등록됩니다. 이미 있으면 덮어쓰지 않고 기존 출결 수정으로 안내합니다.

### 벌금
- **미리 알린 출결은 벌금 없음.** 알리지 않은 경우에만 관리자가 확인해 건당 **5,000원** 부과(7종 모두 대상, 자동 부과 없음).
- 부과 위치: 상세 팝업의 "벌금 부과", 관리자 등록 창의 "무단 출결 · 벌금 함께 부과", `/admin/fines`의 무단 직접 추가.
- 출결을 수정하면 벌금의 날짜·이름·사유도 맞춰지고, **출결을 삭제하면 벌금도 삭제**됩니다.
- 미정 출결에는 부과할 수 없습니다.
- `/fines`: 총 부과·납부·미납, 명단 인원별 잔액, 부과 내역. `/admin/fines`: 납부 확인·미납 변경·부과 취소·복원.

### 회원과 명단 (`/admin/members`)
- 반 명단의 기준은 **DB `members` 표**입니다. (`lib/class-roster.ts`, `MEMBERS`는 처음 계정 생성과 테스트용)
- 인원 추가(처음 비밀번호 = 아이디), 이름 변경(출결·벌금 이름도 함께), 아이디 변경, 비밀번호 초기화, 이용 정지·재개, 삭제(기록이 있으면 한 번 더 확인).
- 첫 로그인 때 `/account`에서 비밀번호를 바꿔야 합니다. 로그인 화면의 **자동 로그인**으로 로그인 유지(회원 30일, 관리자 7일, 끄면 8시간).

---

## 3. 권한

| 할 수 있는 일 | 비로그인 | 회원 | 하위 관리자 | 핵심 관리자 (`admin`) |
| --- | :-: | :-: | :-: | :-: |
| 캘린더·상세 이유 보기 | ✅ | ✅ | ✅ | ✅ |
| 벌금 현황 보기 | | ✅ | ✅ | ✅ |
| 본인 출결 등록·수정 | | ✅ | ✅ | ✅ |
| 다른 사람 출결 등록·수정·삭제 | | | ✅ | ✅ |
| 벌금 부과·납부 관리 | | | ✅ | ✅ |
| 명단 추가·이름·아이디·정지·삭제 | | | ✅¹ | ✅ |
| 관리자 권한 주기·빼기 | | | | ✅ |

¹ 하위 관리자는 **다른 관리자 계정**의 아이디 변경·비밀번호 초기화·정지·삭제를 할 수 없습니다.

- **무단 출결**: 본인도 사유·상세 이유만 바꿀 수 있고, 날짜 변경·삭제·무단 해제는 불가.
- 하위 관리자 = `members.is_admin = 1`인 회원. 자기 아이디로 로그인하며, 첫 비밀번호를 바꾼 뒤부터 관리자 기능을 씁니다.

---

## 4. 운영 DB(Cloudflare D1) SQL 적용 현황

Cloudflare → Storage & databases → D1 → `ssafy-attendance-db` → **Console**에서 실행합니다.

| 순서 | 파일 (`ssafy-attendance/scripts/`) | 내용 | 운영 적용 |
| --- | --- | --- | --- |
| 1 | `setup-fines.sql` | 벌금 표 | 완료 |
| 2 | `setup-member-access.sql` | 회원 표, 출결 소유자 칸, 초기 계정 | 완료 |
| 3 | `setup-pending.sql` | 출결 `pending`(미정) 칸 | 완료 (10-19) |
| 4 | `setup-sub-admin.sql` | 회원 `is_admin`(하위 관리자) 칸 | 확인 필요 |
| - | `fix-member-joyjhm.sql` | 전현민 아이디 오타 수정 | 확인 필요 |
| - | `sync-fine-snapshots.sql` | 예전 벌금 사유 맞추기 (선택) | 선택 |

- 각 SQL의 내용과 확인 방법은 [CHANGELOG.md](CHANGELOG.md)의 해당 항목에 있습니다.
- `duplicate column name` 오류는 이미 적용된 것입니다. 테이블을 지우거나 초기 SQL을 다시 실행하지 않습니다.
- 마이그레이션 도구로 새 DB를 만들 때는 `drizzle/0000` ~ `0005`를 순서대로 적용하고 계정은 `scripts/seed-members.sql`로 넣습니다.

---

## 5. 로컬 실행

Node.js **22.13 이상** 필요 (현재 PC는 24.18).

```powershell
git clone https://github.com/SSAFY-16th-9/Attendance-Calendar.git
cd Attendance-Calendar/ssafy-attendance
npm run install:ci
npm run build
npm run dev
```

- 기본 주소: http://127.0.0.1:5173
- 새 로컬 DB에는 `drizzle/` SQL을 순서대로 적용합니다.
  ```powershell
  node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_true_rhodey.sql
  ```
- 빌드 결과로 미리보기: `.claude/launch.json`의 `preview` 설정(포트 8788, 로컬 DB `.wrangler/preview`). 관리자 설정을 읽도록 `.dev.vars`를 `dist/server/`에 복사해 둡니다(Git 제외, 빌드 시 지워짐).
- 최상위 폴더에서도 `npm run dev`, `npm test`, `npm run build`를 쓸 수 있습니다.

---

## 6. 관리자 계정과 비밀 설정

핵심 관리자 아이디는 `admin`입니다. **비밀번호 원문·해시·세션 키는 Git이나 문서에 적지 않습니다.**

| 환경변수 | 용도 |
| --- | --- |
| `ADMIN_USERNAME` | 핵심 관리자 아이디 |
| `ADMIN_PASSWORD_HASH` | PBKDF2-SHA256, 100,000회, 32바이트 hex |
| `ADMIN_PASSWORD_SALT` | 해시 salt |
| `ADMIN_SESSION_SECRET` | 세션 서명 키(32자 이상), 회원 세션에도 사용 |

- 운영: Cloudflare Worker → Settings → Variables and Secrets (Secret으로 등록).
- 로컬: 앱 폴더의 `.dev.vars`. 새 PC에서는 새 테스트 비밀번호로 만듭니다.

<details>
<summary>새 로컬 .dev.vars 만들기 (node REPL에서 실행)</summary>

```js
const crypto = await import('node:crypto');
const fs = await import('node:fs');
const readline = await import('node:readline/promises');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question('새 로컬 테스트 비밀번호: ');
rl.close();
const salt = crypto.randomBytes(16).toString('hex');
const values = {
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD_HASH: crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex'),
  ADMIN_PASSWORD_SALT: salt,
  ADMIN_SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
};
fs.writeFileSync('.dev.vars', Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { flag: 'wx' });
```
</details>

보안: HttpOnly 서명 쿠키, HTTPS에서 Secure·SameSite=Strict. 로그인 시도는 주소별 15분에 10회 제한. 회원 세션은 매 요청마다 DB의 활성 상태와 `session_version`을 확인합니다(비밀번호 변경·초기화·정지·권한 변경 시 즉시 로그아웃).

---

## 7. API

| API | 동작 | 권한 |
| --- | --- | --- |
| `GET /api/attendance?month=YYYY-MM` | 월간 조회 (비로그인은 벌금·등록자 제외) | 누구나 |
| `GET /api/roster` | 반 명단 이름 | 누구나 |
| `POST /api/attendance` | 본인 출결 등록 (`dates` 여러 날짜) | 회원 |
| `PATCH /api/attendance` | 본인 출결 수정 (`scope: "group"` 함께 수정) | 회원 |
| `GET/POST/DELETE /api/session` | 로그인 상태·로그인(`remember`)·로그아웃 | 누구나 |
| `PATCH /api/account` | 본인 비밀번호 변경 | 회원 |
| `GET/POST/PATCH/DELETE /api/admin/attendance` | 출결 조회·등록·수정·삭제 | 관리자 |
| `POST /api/admin/incidents` | 무단 출결 + 벌금 함께 등록 | 관리자 |
| `GET /api/fines` | 벌금 현황 | 로그인 |
| `POST/PATCH /api/admin/fines` | 벌금 부과·납부 상태 변경 | 관리자 |
| `GET/POST/PATCH/DELETE /api/admin/members` | 명단·계정 관리, 권한 주기/빼기 | 관리자 (권한은 핵심 관리자) |
| `GET/POST/DELETE /api/admin/session` | 핵심 관리자 로그인 | 누구나 |

---

## 8. 데이터와 핵심 규칙

| 표 | 주요 칸 |
| --- | --- |
| `attendance` | 날짜, 이름, 사유, 상세 이유, 등록 시각, `owner_id`, `admin_record`(관리자 무단 등록), `pending`(미정) |
| `fines` | 출결 id, 날짜·이름·사유 사본, 금액, 납부 상태, `revision` |
| `members` | 아이디, 이름, 비밀번호 해시, 활성, 첫 비밀번호 변경 필요, `session_version`, `is_admin` |
| `admin_login_attempts` | 로그인 시도 제한 |

- **하루 1인 1건**은 DB 제약이 아니라 서버 검사입니다. 규칙 이전에 같은 날 여러 건이 저장된 기록은 남아 있을 수 있습니다.
- **함께 등록한 일정**은 같은 회원 + 같은 `created_at`으로 묶습니다.
- **이주언 이름 정정**: 예전 `이주연` 기록은 `canonicalName()`으로 이주언으로 표시하고, `nameAliases()`로 중복 검사합니다. 이주연은 새 이름으로 쓸 수 없습니다.
- 스키마를 바꿀 때는 기존 마이그레이션을 고치지 말고 새 파일을 추가합니다(`npx drizzle-kit generate`).

---

## 9. 검증

앱 폴더에서:

```powershell
npm test          # 자동 테스트 (현재 22개)
npx tsc --noEmit  # 타입 검사
npm run build     # 빌드
```

- 빌드의 `Route ? Unknown` 안내는 Vinext 정적 분석 메시지이며 실패가 아닙니다.
- `tests/integration/member-access.mjs`는 일회용 QA DB 전용 통합 검사입니다(일반 테스트에 포함 안 됨, 운영 서버 대상 금지).

---

## 10. 배포

### Cloudflare Workers (운영)

| 항목 | 값 |
| --- | --- |
| 연결 저장소·브랜치 | `SSAFY-16th-9/Attendance-Calendar`, `main` |
| Project name | `ssafy-attendance-calendar` |
| Path | `/ssafy-attendance` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy --config dist/server/wrangler.json` |
| D1 | `ssafy-attendance-db` (ID `af02ad36-6512-4dc0-ae8a-18ed5976bc66`, 바인딩 `DB`) |

- `main`에 푸시하면 자동 빌드·배포됩니다. Workers & Pages → Deployments에서 **Ready**면 반영 완료입니다.
- D1 연결 설정은 `ssafy-attendance/vite.config.ts`에 있고 빌드 시 `dist/server/wrangler.json`이 만들어집니다(직접 수정 금지).

### GitHub 푸시

최상위 폴더에서 실행합니다. 원격에 새 커밋이 있으면 먼저 받아 합칩니다(강제 푸시 금지).

```powershell
git pull --rebase
git add README.md CHANGELOG.md package.json .gitignore ssafy-attendance
git commit -m "변경 내용"
git push origin main
```

`ssafy-attendance/.git`은 Sites 소스 동기화용 로컬 저장소입니다. GitHub 저장소(최상위)와 혼동하지 않습니다.

<details>
<summary>비공개 Sites 미리보기 (참고용)</summary>

- URL: https://ssafy-class9-attendance-preview.ckdals5619.chatgpt.site/ (소유자만 접근)
- project_id: `appgprj_6ad1e1fa9bb88191b73cbf44fcccb971` (`.openai/hosting.json`)
- 운영 DB와 분리되어 있으며 Sites 스킬의 소스 동기화 절차로 배포합니다. 새 사이트를 다시 만들지 않습니다.
- 이전 계정 프로젝트 `appgprj_6ad18f0b80f881919ae77217e7954e47`은 현재 연결에서 접근 불가입니다.
</details>

---

## 11. 폴더 구조

```text
Attendance-Calendar/
├─ README.md / CHANGELOG.md
└─ ssafy-attendance/                     # 실제 앱
   ├─ app/page.tsx                       # 캘린더·날짜 상세
   ├─ app/admin/(page|members|fines)     # 관리자 화면
   ├─ app/api/                           # attendance, roster, session, account, fines, admin/*
   ├─ components/                        # 등록·수정 창, 상세 팝업, 벌금 화면 등
   ├─ lib/attendance.ts                  # 사유·검증·정렬·여러 날짜·이름 정정
   ├─ lib/admin-auth.ts, member-session.ts, site-auth.ts   # 권한 판정
   ├─ lib/fines.ts, fine-sync.ts         # 벌금 계산·동기화
   ├─ db/schema.ts, drizzle/             # 스키마·마이그레이션
   ├─ scripts/*.sql                      # 운영 D1 Console용 SQL
   └─ tests/                             # 자동 테스트
```

기술: React 19, TypeScript, Vinext/Vite, Cloudflare Workers/D1, Drizzle, lucide-react.

---

## 12. Windows에서 겪은 문제

- npm shim 오류: 실제 Node 설치 폴더의 `npm-cli.js`로 실행.
- 미리보기 서버가 켜져 있으면 `dist` 폴더가 잠겨 빌드가 실패합니다. 서버를 끄고 빌드합니다.
- Git Bash에서 `curl -d`로 한글 JSON을 보내면 깨집니다. 한글 요청 테스트는 브라우저나 Node 스크립트로 합니다.
- GNU tar가 `C:/...`를 원격 주소로 오인하면 `TAR_OPTIONS=--force-local`.
