# 출결 모아 · SSAFY 16기 9반

우리 반 지각·조퇴·결석을 미리 공유하고 함께 확인하는 출결 캘린더입니다.

| 구분 | 주소 |
| --- | --- |
| 운영 캘린더 | https://ssafy-attendance-calendar.ckdals5619.workers.dev/ |
| 관리자 | https://ssafy-attendance-calendar.ckdals5619.workers.dev/admin |
| 저장소 | [SSAFY-16th-9/Attendance-Calendar](https://github.com/SSAFY-16th-9/Attendance-Calendar) |

> 변경 이력은 **[CHANGELOG.md](CHANGELOG.md)** 에 기록합니다.

---

## 작업을 이어갈 때

1. 최상위 폴더에서 `git pull`로 최신 상태를 맞춥니다. (다른 반원이 직접 커밋하기도 합니다.)
2. 실제 앱은 `ssafy-attendance/` 폴더입니다.
3. 변경 후 `npm test`, `npx tsc --noEmit`, `npm run build`를 통과시킵니다.
4. **DB 구조가 바뀌면 운영 D1에 SQL을 먼저 실행한 뒤 푸시**합니다. `main`에 푸시하면 자동 배포됩니다.
5. 변경 내용은 CHANGELOG에 **요청 내용 → 수정 사항 → 수정 결과**로 추가합니다.

---

## 기능

| 영역 | 내용 |
| --- | --- |
| 캘린더 `/` | 로그인 없이 조회. **월간/주간** 전환. 날짜 → 명단, 이름 → 상세 팝업. 정렬은 본인 → 조퇴 → 지각 → 결석 → 공가 |
| 등록·수정·삭제 | 사유 7종, 상세 이유 선택(500자). **여러 날짜 한 번에 등록·함께 수정·함께 삭제**, **미정** 토글. **하루 1인 1건** |
| 표시 | 무단은 빨간 **"무단 · 사유"**, 미정은 점선 **"미정 · 사유"** |
| 벌금 | 미리 알리지 않은 출결에 **5,000원**. 관리자가 확인해 부과하거나, **10/22부터는 회원이 당일 오전 8시 이후 본인 등록 시 자동 무단·자동 부과**(관리자 대신 등록은 제외). 출결 수정 시 벌금 내용도 맞춰지고, 출결 삭제 시 벌금도 삭제. 미정에는 부과 불가 |
| 회원 | 처음 비밀번호 = 아이디, 첫 로그인 때 변경. 자동 로그인(회원 30일·관리자 7일, 끄면 8시간) |
| 명단 `/admin/members` | 명단 기준은 DB `members` 표. 추가·이름 변경·아이디 변경·비밀번호 초기화·정지·삭제, 관리자 권한 주기/빼기 |

## 권한

| 할 수 있는 일 | 비로그인 | 회원 | 하위 관리자 | 핵심 관리자 (`admin`) |
| --- | :-: | :-: | :-: | :-: |
| 캘린더·상세 이유 보기 | ✅ | ✅ | ✅ | ✅ |
| 벌금 현황 보기 | | ✅ | ✅ | ✅ |
| 본인 출결 등록·수정·삭제 | | ✅ | ✅ | ✅ |
| 다른 사람 출결·벌금 관리 | | | ✅ | ✅ |
| 명단·계정 관리 | | | ✅¹ | ✅ |
| 관리자 권한 주기·빼기 | | | | ✅ |

¹ 다른 관리자 계정의 아이디·비밀번호·정지·삭제는 핵심 관리자만 가능합니다.
무단 출결은 본인도 사유·상세 이유만 바꿀 수 있고 날짜 변경·삭제는 관리자만 가능합니다.

---

## 운영 DB (Cloudflare D1)

Cloudflare → Storage & databases → D1 → `ssafy-attendance-db` → **Console**

**실행 확인이 필요한 SQL** (`ssafy-attendance/scripts/`)

| 파일 | 내용 |
| --- | --- |
| `setup-sub-admin.sql` | 회원 `is_admin`(하위 관리자) 칸 |
| `fix-member-joyjhm.sql` | 전현민 아이디 오타 수정 ([SQL 보기](CHANGELOG.md#2026-10-19--전현민-아이디-오타-수정)) |

```sql
-- setup-sub-admin.sql
ALTER TABLE members ADD COLUMN is_admin integer DEFAULT 0 NOT NULL;
```

- 실행을 확인하면 위 표에서 지웁니다. `duplicate column name` 오류는 이미 적용된 것입니다.
- 새 DB는 `drizzle/0000` ~ `0005`를 순서대로 적용하고, 계정은 `scripts/seed-members.sql`로 넣습니다.

---

## 로컬 실행

Node.js 22.13 이상.

```powershell
cd ssafy-attendance
npm run install:ci
npm run build
npm run dev        # http://127.0.0.1:5173
```

- 관리자 비밀 설정은 앱 폴더의 `.dev.vars`(Git 제외)에 둡니다: `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`(PBKDF2-SHA256 100,000회), `ADMIN_PASSWORD_SALT`, `ADMIN_SESSION_SECRET`(32자 이상). **비밀값은 Git·문서에 적지 않습니다.**
- 운영 비밀값은 Cloudflare Worker → Settings → Variables and Secrets에 있습니다.

## 배포

| 항목 | 값 |
| --- | --- |
| 자동 배포 | GitHub `main` 푸시 → Cloudflare Workers Builds |
| Project / Path | `ssafy-attendance-calendar` / `/ssafy-attendance` |
| Build / Deploy | `npm run build` / `npx wrangler deploy --config dist/server/wrangler.json` |
| D1 | `ssafy-attendance-db` (바인딩 `DB`, 설정은 `vite.config.ts`) |

Workers & Pages → Deployments에서 **Ready**가 되면 반영된 것입니다.
`ssafy-attendance/.git`은 Sites 동기화용 별도 저장소이므로 git 명령은 **최상위 폴더**에서 실행합니다.

## 폴더 구조

```text
ssafy-attendance/
├─ app/                 # 화면(/, /admin/*, /fines, /login, /account)과 API(app/api/*)
├─ components/          # 등록·수정 창, 상세 팝업, 벌금 화면
├─ lib/                 # 출결 규칙(attendance.ts), 공통 DB 조회(records.ts), 권한, 벌금
├─ db/schema.ts         # DB 구조
├─ drizzle/             # 마이그레이션
├─ scripts/             # 운영 D1 Console용 SQL, 계정 시드
└─ tests/               # 자동 테스트
```
