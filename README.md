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
| 명단 `/admin/members` | 명단 기준은 DB `members` 표. **명단 붙여넣기**(엑셀·시트에서 이름·아이디 복사 → 확인 → 한 번에 추가), 추가·이름 변경·아이디 변경·비밀번호 초기화·정지·삭제, 관리자 권한 주기/빼기 |
| 기수 | 회원·출결·벌금이 기수(예: `16-9` = 16기 9반)별로 나뉨. 회원은 자기 기수만, 비로그인은 **캘린더 공개 기수**를 봄. 핵심 관리자는 관리자 화면 위 **관리 중인 기수**에서 기수를 바꾸고, 회원 관리에서 새 기수 추가·공개 기수 지정. 아이디는 전체에서, 이름은 기수 안에서만 겹치면 안 됨 |

## 권한

| 할 수 있는 일 | 비로그인 | 회원 | 하위 관리자 | 핵심 관리자 (`admin`) |
| --- | :-: | :-: | :-: | :-: |
| 캘린더·상세 이유 보기 | ✅ | ✅ | ✅ | ✅ |
| 벌금 현황 보기 | | ✅ | ✅ | ✅ |
| 본인 출결 등록·수정·삭제 | | ✅ | ✅ | ✅ |
| 다른 사람 출결·벌금 관리 | | | ✅ | ✅ |
| 명단·계정 관리 (자기 기수) | | | ✅¹ | ✅ |
| 기수 추가·전환, 공개 기수 지정 | | | | ✅ |
| 관리자 권한 주기·빼기 | | | | ✅ |

¹ 하위 관리자는 자기 기수만 관리합니다. 다른 관리자 계정의 아이디·비밀번호·정지·삭제는 핵심 관리자만 가능합니다.
무단 출결은 본인도 사유·상세 이유만 바꿀 수 있고 날짜 변경·삭제는 관리자만 가능합니다.

---

## 운영 DB (Cloudflare D1)

Cloudflare → Storage & databases → D1 → `ssafy-attendance-db` → **Console**

운영 DB는 아래 **최종 구조**로 맞춥니다. 새 DB를 만들 때는 이 SQL(`ssafy-attendance/scripts/schema.sql`)을 실행하면 첫 기수(16기 9반)까지 만들어지고, 회원은 관리자 화면 **명단 붙여넣기**로 넣습니다. `IF NOT EXISTS`라 다시 실행해도 기존 데이터는 바뀌지 않습니다.

<details>
<summary>최종 SQL 보기 (표 5개, 인덱스 4개)</summary>

```sql
CREATE TABLE IF NOT EXISTS `cohorts` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `is_current` integer DEFAULT 0 NOT NULL,
  `created_at` text NOT NULL
);
INSERT INTO `cohorts` (`id`, `name`, `is_current`, `created_at`) VALUES ('16-9', '16기 9반', 1, '2026-10-22T00:00:00.000Z') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS `attendance` (
  `id` text PRIMARY KEY NOT NULL,
  `date` text NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `reason` text DEFAULT '' NOT NULL,
  `created_at` text NOT NULL,
  `owner_id` text,
  `admin_record` integer DEFAULT 0 NOT NULL,
  `pending` integer DEFAULT 0 NOT NULL,
  `cohort` text DEFAULT '16-9' NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `attendance_cohort_date_name_type_unique` ON `attendance` (`cohort`, `date`, `name`, `type`);

CREATE TABLE IF NOT EXISTS `fines` (
  `id` text PRIMARY KEY NOT NULL,
  `attendance_id` text NOT NULL,
  `date` text NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `amount` integer NOT NULL,
  `status` text DEFAULT 'unpaid' NOT NULL,
  `paid_at` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  `revision` integer DEFAULT 0 NOT NULL,
  `cohort` text DEFAULT '16-9' NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `fines_attendance_unique` ON `fines` (`attendance_id`);

CREATE TABLE IF NOT EXISTS `members` (
  `id` text PRIMARY KEY NOT NULL,
  `username` text NOT NULL,
  `name` text NOT NULL,
  `password_hash` text NOT NULL,
  `password_salt` text NOT NULL,
  `active` integer DEFAULT 1 NOT NULL,
  `must_change_password` integer DEFAULT 1 NOT NULL,
  `session_version` integer DEFAULT 0 NOT NULL,
  `is_admin` integer DEFAULT 0 NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  `cohort` text DEFAULT '16-9' NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `members_username_unique` ON `members` (`username`);
CREATE UNIQUE INDEX IF NOT EXISTS `members_cohort_name_unique` ON `members` (`cohort`, `name`);

CREATE TABLE IF NOT EXISTS `admin_login_attempts` (
  `key` text PRIMARY KEY NOT NULL,
  `attempts` integer NOT NULL,
  `window_start` integer NOT NULL
);
```
</details>

<details>
<summary>기존 운영 DB에 기수 기능 추가 (한 번만, 10/22)</summary>

기존 회원·출결·벌금은 모두 16기 9반(`16-9`)으로 들어갑니다. **이 SQL을 실행한 뒤 푸시**합니다.

```sql
CREATE TABLE `cohorts` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `is_current` integer DEFAULT 0 NOT NULL,
  `created_at` text NOT NULL
);

INSERT INTO `cohorts` (`id`, `name`, `is_current`, `created_at`) VALUES ('16-9', '16기 9반', 1, '2026-10-22T00:00:00.000Z');
ALTER TABLE `members` ADD `cohort` text DEFAULT '16-9' NOT NULL;
ALTER TABLE `attendance` ADD `cohort` text DEFAULT '16-9' NOT NULL;
ALTER TABLE `fines` ADD `cohort` text DEFAULT '16-9' NOT NULL;
DROP INDEX `members_name_unique`;
CREATE UNIQUE INDEX `members_cohort_name_unique` ON `members` (`cohort`,`name`);
DROP INDEX `attendance_date_name_type_unique`;
CREATE UNIQUE INDEX `attendance_cohort_date_name_type_unique` ON `attendance` (`cohort`,`date`,`name`,`type`);
```
</details>

구조 확인: `SELECT * FROM cohorts;`에 16기 9반이 있고, `PRAGMA table_info(members);`에 `is_admin`·`cohort`가 보이면 최신입니다.

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
├─ scripts/             # 최종 DB 구조 SQL, 16기 9반 계정 시드
└─ tests/               # 자동 테스트
```
