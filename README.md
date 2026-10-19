# 출결 모아 · SSAFY 16기 9반

25명의 출결을 함께 확인하는 공유 캘린더입니다. 이 README는 **다른 개발 세션에서 작업을 이어가기 위한 기준 문서**입니다. 문서 기준일은 2026-10-16(한국 시간)입니다.

- 저장소: [SSAFY-16th-9/Attendance-Calendar](https://github.com/SSAFY-16th-9/Attendance-Calendar)
- 운영 캘린더: https://ssafy-attendance-calendar.ckdals5619.workers.dev/
- 관리자: https://ssafy-attendance-calendar.ckdals5619.workers.dev/admin

## 다음 세션에서 먼저 확인할 것

1. 이 문서를 읽고 최상위 폴더에서 `git status`와 `git remote -v`를 확인합니다.
2. 실제 앱은 `ssafy-attendance/`에 있습니다. 관련 소스와 테스트를 읽은 뒤 변경합니다.
3. 기존 로컬 DB에는 초기 마이그레이션을 재실행하지 않습니다.
4. 관리자 비밀 설정은 Git에 없습니다. 같은 PC에서는 앱의 `.dev.vars` 존재를 확인하고, 새 PC에서는 새 로컬 설정을 준비합니다. 비밀값을 로그에 출력하지 않습니다.
5. 변경 후 테스트·타입 검사·빌드를 실행합니다. **GitHub 푸시와 운영 사이트 배포는 별개**입니다.

## 구현된 기능과 확정 요구사항

### 회원 로그인·본인 출결·관리자 무단 등록 (2026-10-16 추가)

- **캘린더(`/`)와 `GET /api/attendance`는 로그인 없이 조회할 수 있습니다**(2026-10-19 변경, `build/sites-worker.ts`의 `publicRead`). 비로그인 응답에는 이름·날짜·사유 종류·상세 이유·미정·무단 표시를 담고, 벌금·소유자 정보는 뺍니다(2026-10-19 상세 이유 공개로 변경). 출결 등록·수정, `/fines`, `/account`, `/admin/*`와 그 API는 계속 로그인이 필요합니다.
- **자동 로그인**: `/login`의 ‘자동 로그인’(기본 체크) 시 회원 30일·관리자 7일 쿠키를 발급합니다(`MEMBER_REMEMBER_SECONDS`, `ADMIN_REMEMBER_SECONDS`). 해제하면 기존과 같이 8시간입니다. 관리자 세션은 개별 무효화가 안 되어 더 짧게 둡니다. 회원 세션은 비밀번호 변경·초기화·정지 시 session_version으로 바로 무효화됩니다.
- 첨부 명단의 25명 계정을 `lib/class-roster.ts`에 매핑했습니다. 김승환 포함, 이주언 표기 유지, 조석래 아이디는 사용자가 확인한 `coasterrrrr`입니다.
- 초기 아이디와 초기 비밀번호는 각자의 @ 뒤 문자열입니다. 로그인 화면에는 초기 비밀번호 안내를 표시하지 않고 입력 안내는 ‘아이디’만 표시합니다. 첫 로그인은 `/account`에서 비밀번호를 바꿔야 캘린더를 이용할 수 있습니다.
- 일반 회원은 이름 선택 없이 본인 이름으로만 등록·수정합니다. 서버에서 이름·소유권을 확인합니다. 기존 owner_id 없는 출결은 정정 전 이름도 확인해 본인에게 연결합니다. 관리자가 등록한 기록도 본인 것이면 수정할 수 있습니다. 단 **무단 출결은 사유·상세 이유만 수정 가능**하고 날짜 변경·삭제·무단 해제는 할 수 없습니다(서버 PATCH에서 날짜 고정, 삭제는 관리자 전용, 무단 표시와 벌금 유지).
- `/account`: 현재 비밀번호 확인 후 새 비밀번호 8~128자로 변경합니다. 아이디·현재 비밀번호와 같을 수 없습니다. 변경하면 이전 로그인 세션을 무효화합니다.
- `/admin/members`: 회원 검색, 비밀번호 초기화, 이용 정지·재개. 임시 비밀번호 설정 후 본인 변경을 강제합니다. 모든 변경은 기존 세션을 무효화하고 동시 수정 충돌을 차단합니다. 계정 정지해도 출결·벌금은 보존합니다. 관리자 원래 계정은 기존 서버 비밀 설정을 그대로 사용합니다.
- `/admin/fines`의 ‘무단 출결 직접 추가’: 관리자가 회원·날짜·임의지각/임의결석·선택 이유를 입력하고 사전 공유 없음을 확인하면 출결과 5,000원 미납 벌금을 한 번에 저장합니다. 어느 한쪽 실패 시 함께 취소합니다. 같은 기록 중복 등록은 차단합니다.
- 캘린더 날짜 상세에서 이름을 누르면 **상세 팝업**이 열립니다(아코디언 대신). 팝업에는 권한 있는 사람에게만 버튼이 보입니다: 수정은 관리자 또는 본인 출결의 회원(무단은 날짜 고정), 삭제는 관리자만. 관리자에게는 ‘벌금 부과 · 5,000원’ 버튼도 보이며, 이미 부과한 건은 납부 관리 링크를 표시합니다.
- 관리자의 ‘출결 등록하기’ 창에 ‘사전 공유 없는 무단 출결 · 벌금 5,000원 함께 부과’ 체크가 있습니다. 체크하면 `/api/admin/incidents`로 출결과 벌금을 함께 저장합니다.
- **무단으로 확인된 기록은 캘린더·상세 배지에 빨간색과 ‘무단’ 문구로 표시**합니다. 사전 공유한 같은 출결 종류와 구별됩니다. 납부해도 무단 표시는 유지합니다. 기존 일반 출결의 부과를 취소하면 일반 표시로 돌아가며, 관리자가 직접 등록한 무단 기록은 무단 표시를 유지합니다.
- 인증: 8시간(자동 로그인 시 회원 30일·관리자 7일) HttpOnly 서명 쿠키, HTTPS에서는 Secure·SameSite=Strict. 회원 세션마다 DB 활성 상태·session_version을 검증합니다. 계정 정보 API에는 비밀번호 해시·salt를 반환하지 않습니다. 보호 페이지·API는 private/no-store입니다.

### 미정 출결 (2026-10-19 추가)

- 출결 등록·수정 창의 **미정 토글**로 아직 확정되지 않은 출결을 표시합니다. 캘린더·명단·팝업에 무단처럼 **"미정 · 사유"** 접두어와 점선 테두리로 보입니다(`statusPrefix`).
- 미정도 하루 1건 규칙에 포함됩니다. 미정 출결에는 벌금을 부과할 수 없고(서버에서 차단), 무단 출결은 미정으로 바꿀 수 없습니다. 관리자 무단 직접 추가는 항상 미정 아님으로 저장합니다.
- `/admin` 표처럼 `pending`을 보내지 않는 수정은 기존 미정 값을 유지합니다.
- **운영 D1에 컬럼 추가가 필요합니다**: D1 Console에서 `ssafy-attendance/scripts/setup-pending.sql`을 한 번 실행합니다(`drizzle/0004_add_pending.sql`과 같은 내용). **코드를 배포하기 전에 먼저 실행해야** 출결 조회가 깨지지 않습니다. `duplicate column name: pending`이면 이미 적용된 것입니다.

#### 이번 배포에 필요한 D1 Console 작업

**코드 푸시와 운영 DB 변경은 별도입니다. 회원 테이블과 출결 컬럼을 추가해야 회원 로그인이 작동합니다.**

1. Cloudflare → Storage & databases → D1 → `ssafy-attendance-db` → Console.
2. 벌금 테이블을 아직 만들지 않았다면 먼저 `ssafy-attendance/scripts/setup-fines.sql` 실행. 이 파일은 재실행해도 기록을 보존합니다.
3. `ssafy-attendance/scripts/setup-member-access.sql` 전체 내용을 붙여넣고 **한 번만 Execute**합니다. 회원 테이블·인덱스, attendance의 owner_id/admin_record, 초기 계정 25개, 기존 출결 소유자 연결을 포함합니다. 출결·벌금 내역은 삭제하지 않습니다.
4. 이 파일의 ALTER TABLE은 재실행하지 않습니다. `duplicate column name`이면 일부 적용된 상태일 수 있으므로 구조를 먼저 확인합니다. 계정 추가 부분만 필요하면 `scripts/seed-members.sql`을 사용합니다. ON CONFLICT DO NOTHING이므로 기존 계정·변경한 비밀번호를 덮어쓰지 않습니다.
5. Workers & Pages → `ssafy-attendance-calendar` → Deployments에서 main 빌드 성공 확인. `/login`에서 회원 첫 로그인·비밀번호 변경, 관리자 `/admin/members`와 `/admin/fines`를 확인합니다. 관리자 비밀 설정 네 개는 유지합니다.

`drizzle/0003_normal_sleeper.sql`은 스키마 변경만 포함하며 계정 데이터는 별도 seed입니다. 자동 마이그레이션을 관리하는 환경에서는 0003 적용 뒤 seed만 실행합니다. Console setup을 적용한 DB에 같은 마이그레이션을 다시 적용하지 않습니다. 런타임 요청에서 스키마를 생성하지 않습니다.

검증: 자동 테스트 17개, 타입 검사, 빌드. `.wrangler/member-qa`의 분리된 로컬 DB에서 실제 HTTP 통합 검사 41개로 비로그인 조회 차단, 첫 로그인 변경 강제, 타인 출결 변경·위조 차단, 기존 세션 무효화, 관리자 무단 기록 보호, 중복 부과 차단, 정지·재개·초기화와 충돌 검사를 확인했습니다. 운영 D1에는 이 세션에서 SQL을 실행하지 않았습니다.

통합 검증 코드는 `tests/integration/member-access.mjs`입니다. 일반 테스트 명령에는 포함되지 않습니다. 새 **일회용 QA DB**에 0000·0001·0002·setup-member-access를 순서대로 적용하고, built preview를 `.wrangler/member-qa`로 시작한 다음 `QA_BASE_URL=http://127.0.0.1:8788`을 지정해 실행합니다. 이 검사는 테스트 계정 비밀번호·상태와 2099년 기록을 변경하므로 일상 로컬 DB나 운영 서버를 대상으로 하지 않습니다. 다시 실행할 때는 새 QA DB를 사용합니다.

### 벌금 기능 (2026-10-16 추가)

**벌금은 사전에 알렸는지에 따라 달라집니다.** 미리 알렸으면 벌금이 없고, 알리지 않은 경우에만 관리자가 확인해 건당 5,000원을 부과합니다. 2026-10-16부터 **7종 출결 모두** 부과 대상입니다(관리자 판단). 자동 부과하지 않습니다.

- 회원 현황: `/fines` — 총 부과액·납부액·미납액, 25명 개인별 잔액, 부과 내역과 납부 상태
- 관리자: `/admin/fines` — 납부 상태 관리와 무단 출결 직접 추가. 기존 ‘사전 공유 여부 확인’ 목록과 `GET /api/admin/fines`는 삭제했습니다. 부과는 캘린더 상세 팝업이나 출결 등록 창에서 합니다.
- 같은 출결에 중복 부과할 수 없습니다. 납부 완료·미납 변경·부과 취소·부과 복원을 관리자만 처리합니다.
- 부과 취소는 합계에서 제외하며 기록은 남깁니다. 납부 변경 시 서버에서 확인 시각을 기록합니다. 동시 수정 충돌은 revision으로 차단합니다.
- 출결을 수정하면 벌금의 날짜·이름·사유도 같은 batch에서 출결과 맞춰집니다(`lib/fine-sync.ts`). 금액·납부 상태·납부 기록은 유지합니다. 이 변경 전에 수정된 벌금은 `ssafy-attendance/scripts/sync-fine-snapshots.sql`을 D1 Console에서 한 번 실행하면 맞춰집니다(재실행 안전, 선택). **출결을 삭제하면 해당 벌금도 함께 삭제됩니다**(2026-10-16 변경, `DELETE /api/admin/attendance`에서 한 batch로 처리). 출결 정정 시 벌금 취소 여부는 관리자가 별도 확인합니다.
- 벌금 페이지는 1분마다, 창으로 돌아올 때 새로 조회합니다. 기간·이름 필터는 요약과 개인별 현황에도 적용되고, 상태 필터는 내역 목록에만 적용됩니다.
- API: `GET /api/fines` 회원 조회, `POST/PATCH /api/admin/fines` 관리자 전용. POST는 `unnotified: true` 확인 필수이며 금액은 서버에서 5,000원으로 고정합니다. 출결 상세 이유는 벌금 API에 포함하지 않습니다.
- 구현: `components/fines-page.tsx`, `lib/fines.ts`, `app/api/fines/route.ts`, `app/api/admin/fines/route.ts`, `db/schema.ts`의 `fines` 테이블

#### Cloudflare 웹페이지에서 벌금 테이블 추가

개인 Cloudflare 운영 주소는 https://ssafy-attendance-calendar.ckdals5619.workers.dev 입니다. 새 기능 배포와 **운영 D1 벌금 테이블 생성은 별도**입니다.

1. Cloudflare → Storage & databases → D1 → `ssafy-attendance-db` → Console.
2. `ssafy-attendance/scripts/setup-fines.sql` 내용을 붙여넣고 Execute. 기존 출결을 건드리지 않고 `fines` 테이블과 인덱스만 추가하며, 재실행해도 기록을 보존합니다.
3. GitHub main 푸시 후 Workers Builds 배포 결과를 확인합니다. 자동 배포가 꺼져 있다면 기존 설정으로 새 빌드를 시작합니다. 관리자 비밀 설정 네 개는 그대로 유지합니다.
4. 운영 `/fines`, `/admin/fines`에서 조회 및 관리자 동작을 확인합니다. 테이블이 없으면 안내 오류가 표시됩니다.

마이그레이션 도구로 관리하는 새 DB에는 `drizzle/0002_dear_wolfpack.sql`을 순서대로 적용합니다. Console setup SQL과 같은 스키마입니다. Console로 이미 테이블을 만들었다면 CREATE TABLE 마이그레이션을 중복 실행하지 않습니다.

기능 검증: 자동 테스트 15개, 타입 검사, 빌드 통과. 분리된 로컬 QA DB로 미로그인 변경 차단, 자동 부과 없음, 미공유 확인 필수, 임의조퇴 제외, 중복 부과 차단, 납부/미납/취소/복원 합계, 동시 수정 충돌, 출결 수정·삭제 후 원장 보존, 별도 브라우저 공개 납부 상태와 모바일 화면을 확인했습니다. 개인 Cloudflare 운영 DB 변경은 아직 수행하지 않았습니다.

- 월간 캘린더에 **이름과 출결 사유** 표시
- 날짜 선택 → 날짜별 명단을 상세 패널에 표시 → 이름 선택 시 상세 팝업
- 팝업으로 출결 등록: **날짜·사유 필수, 상세 이유 선택, 회원 이름은 로그인 계정으로 고정**
- 일반 회원은 이름 선택 없이 본인 계정으로만 등록·수정, 관리자는 회원을 선택해 등록
- 사유 7종: **공가, 사유지각, 사유조퇴, 사유결석, 임의지각, 임의조퇴, 임의결석**
- 상세 이유 최대 500자
- **한 날짜에 1명당 출결 1건만** 등록합니다(종류 무관). 회원·관리자·무단 직접 등록·수정 모두 서버에서 확인하며(`DAILY_LIMIT_MESSAGE`), 덮어쓰지 않고 기존 출결 수정으로 안내합니다. 회원이 이미 본인 출결이 있는 날짜에 등록을 누르면 바로 수정 창이 열리고, 등록 창에서 기존 출결이 있는 날짜·회원을 고르면 저장이 막히고 ‘기존 출결 수정하기’가 표시됩니다. DB 고유 인덱스가 아니라 앱 검사이며, 이 규칙 전에 같은 날 여러 건이 저장된 데이터는 그대로 남아 상세 팝업에 함께 표시됩니다.
- 날짜별 명단 정렬: 로그인한 회원 본인 출결이 맨 위, 나머지는 조퇴 → 지각 → 결석 → 공가 순(같은 묶음은 사유 → 임의, 이름순). `sortForViewer`(`lib/attendance.ts`)
- 이름 검색, 사유 필터, 월 이동, 오늘 이동
- 서버 저장 및 여러 브라우저 간 공유. 일반 캘린더는 15초마다, 창으로 돌아올 때 새로 조회
- 모바일 날짜 선택 시 캘린더 아래 상세 패널로 이동
- 관리자: 기간·이름·사유별 조회, 사유별 현황, 출결 수정·삭제
- **회원은 본인 출결만 수정(무단은 사유·상세 이유만), 관리자는 전체 수정·삭제**하며 API에서도 권한 확인
- 기본 예시 출결 없음. 개발 검증용 내역은 삭제 완료

### 이름 정정

정확한 이름은 **이주언**입니다. 신규 등록 명단에 `이주연`을 다시 추가하지 않습니다. 예전에 `이주연`으로 저장된 내역은 `canonicalName()`으로 `이주언`으로 표시하고, `nameAliases()`로 예전 이름까지 중복 검사합니다. 기존 데이터를 삭제하거나 일괄 변경하지 않으며, 관리자가 수정하면 정정된 이름으로 저장됩니다.

## 구조와 기술 구성

```text
Attendance-Calendar/
├─ README.md                       # 세션 인계·실행·운영 가이드
├─ package.json                    # 최상위 편의 명령
└─ ssafy-attendance/                # 실제 앱
   ├─ app/page.tsx                 # 캘린더·날짜 상세·본인 출결 등록·수정
   ├─ app/globals.css              # 전체 화면·관리자·모바일 스타일
   ├─ app/layout.tsx               # 한국어·메타데이터
   ├─ app/admin/page.tsx           # 관리자 로그인·검색·수정·삭제
   ├─ app/api/attendance/route.ts   # 일반 출결 API
   ├─ app/api/admin/session/route.ts
   ├─ app/api/admin/attendance/route.ts
   ├─ lib/attendance.ts            # 25명 명단·7종 사유·검증·이름 정정
   ├─ lib/admin-auth.ts            # 서버 설정·쿠키·권한·로그인 시도 제한
   ├─ lib/admin-session.ts         # 비밀번호 해시·세션 서명과 검증
   ├─ db/schema.ts                # attendance·admin_login_attempts
   ├─ drizzle/                    # SQL·스냅샷·journal
   ├─ tests/                      # 입력·명단·관리자 세션 테스트
   ├─ .openai/hosting.json         # 기존 Sites ID·D1 바인딩
   ├─ .env.example                # 환경변수 이름만 기록
   ├─ .dev.vars                   # 로컬 비밀 설정, Git 제외
   ├─ .wrangler/state/            # 로컬 DB, Git 제외
   ├─ .sites-runtime/             # 실행 프로필, Git 제외
   └─ outputs/                    # 배포 압축 파일 등, Git 제외
```

React 19, TypeScript, Vinext/Vite, Cloudflare Workers/D1, Drizzle, lucide-react를 사용합니다. 버전은 앱의 `package.json`과 `package-lock.json`을 기준으로 합니다. 일반 Next.js 명령으로 바꾸기 전에 Vinext·Sites 연동을 확인합니다.

## 로컬 실행

Node.js **22.13 이상**과 npm이 필요합니다. 기존 환경은 Node.js 24.18입니다.

```powershell
git clone https://github.com/SSAFY-16th-9/Attendance-Calendar.git
cd Attendance-Calendar/ssafy-attendance
npm run install:ci
npm run build
```

새 로컬 DB에 다음 SQL을 **순서대로 한 번씩** 적용합니다.

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_true_rhodey.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_redundant_ultragirl.sql
npm run dev
```

기본 주소는 http://127.0.0.1:5173 입니다. 현재 PC의 일상 로컬 DB에는 이전 SQL이 일부 적용되어 있을 수 있습니다. 먼저 테이블·컬럼을 확인하고 빠진 신규 SQL만 적용합니다. 새 GitHub 복제본에는 로컬 DB가 포함되지 않습니다.

초기 설정 이후에는 최상위에서도 `npm run dev`, `npm test`, `npm run build`를 사용할 수 있습니다. 실행 프로필 관련 오류가 발생하면 앱 폴더에서 설치된 Sites 플러그인의 `scripts/configure-execution-profile.mjs`로 portable 프로필을 설정합니다. 플러그인 위치는 PC·설치 버전에 따라 확인합니다.

## 관리자 계정과 비밀 설정

아이디는 `admin`입니다. 운영 비밀번호는 사용자가 지정한 값으로 설정되어 있습니다. **비밀번호 원문, 실제 해시, 세션 비밀키는 README나 Git에 기록하지 않습니다.**

| 환경변수 | 용도 |
| --- | --- |
| `ADMIN_USERNAME` | 관리자 아이디 |
| `ADMIN_PASSWORD_HASH` | PBKDF2-SHA256, 100,000회, 32바이트, hex 해시 |
| `ADMIN_PASSWORD_SALT` | 비밀번호 해시 salt 문자열 |
| `ADMIN_SESSION_SECRET` | 세션 서명용 무작위 문자열, 최소 32자 |

같은 PC의 로컬 설정은 앱의 `.dev.vars`에 있습니다. 새 PC에서는 **새 로컬 테스트 비밀번호**로 별도 설정합니다. 로컬 설정을 바꿔도 운영 계정은 바뀌지 않습니다. 현재 운영 설정은 개인 Cloudflare Worker의 Variables and Secrets에서 관리합니다. 변경 후 새 배포에 반영합니다.

새 로컬 설정 예시: 앱 폴더에서 `node`로 REPL을 열어 실행합니다. 원문은 파일에 저장하지 않으며 기존 파일을 덮어쓰지 않습니다. 비밀번호 입력은 화면에 표시될 수 있으므로 화면 공유 중에는 실행하지 않습니다.

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

세션은 8시간 유효한 서명된 HttpOnly 쿠키이며 운영에서는 Secure·SameSite=Strict를 적용합니다. 로그인 시도는 주소별 15분 동안 10회로 제한합니다.

## API·데이터·마이그레이션

| API | 동작 | 권한 |
| --- | --- | --- |
| `GET /api/attendance?month=YYYY-MM` | 월간 조회 | 사이트 방문 허용 사용자 |
| `POST/PATCH /api/attendance` | 본인 일반 출결 등록·수정 | 로그인 회원 |
| `DELETE /api/attendance` | 기존 삭제 경로, 관리자 삭제로 위임 | 관리자 |
| `GET /api/admin/session` | 로그인 상태 | 사이트 방문 허용 사용자 |
| `POST /api/admin/session` | 로그인 | 계정 검증·시도 제한 |
| `DELETE /api/admin/session` | 로그아웃 | 같은 출처 요청 |
| `GET /api/admin/attendance` | 검색·통계·페이지 조회 | 관리자 |
| `PATCH /api/admin/attendance` | 수정 | 관리자 |
| `DELETE /api/admin/attendance` | 삭제 | 관리자 |

관리자 조회 매개변수는 `month`, `q`(이름), `type`, `page`입니다. `month` 생략 시 전체 기간이며 페이지당 50건을 반환합니다.

`attendance`는 id·날짜·이름·사유·상세 이유·등록 시각을 저장합니다. 날짜·이름·사유에 중복 방지 인덱스가 있습니다. `admin_login_attempts`는 로그인 시도 제한용입니다.

운영 데이터는 D1에 있으며 Git에 없습니다. 로컬 `.wrangler/state/`와 운영 DB는 분리됩니다. 적용한 SQL·스냅샷·journal 항목을 수정하지 말고, 스키마 변경 시 새 마이그레이션을 추가합니다. 데이터 정리는 스키마 마이그레이션과 구분합니다.

## 검증 방법과 현재 결과

앱 폴더에서 실행합니다.

```powershell
npm test
npx tsc --noEmit
npm run build
```

현재 자동 테스트는 17개입니다. 회원 명단·초기 해시·기존 출결 보존·계정 초기화 SQL 재실행 시 비밀번호 보존도 검증합니다. 명단·이름 정정·7종 사유·필수 입력·날짜·500자 제한·한국 시간·비밀번호 해시·세션 서명/변조/만료를 검증합니다.

브라우저에서 확인한 흐름:

- 이름 검색, 등록, 날짜 상세, 아코디언, 다른 브라우저 간 공유
- 상세 이유 없이 등록·수정, 중복·잘못된 입력 차단
- 정상·실패 로그인, 미로그인 관리 API 차단, 로그인 시도 제한, 로그아웃 후 권한 해제
- 관리자 수정 내용의 일반 캘린더 반영, 확인 후 삭제
- 모바일 가로 넘침 및 관리자 표 내부 스크롤

브라우저 검증은 로컬에서 수행했고 운영 배포 성공은 Sites 배포 결과로 확인했습니다. 빌드의 `Route ? Unknown`은 Vinext 정적 경로 분석 안내이며 빌드 실패가 아닙니다.

## GitHub 저장과 Sites 운영 배포

### 개인 Cloudflare 계정에서 웹페이지로 배포

2026-10-16 개인 Cloudflare D1 연결을 설정했습니다. 사용자가 개인 Cloudflare Worker에서 앱을 운영 중입니다. 이번 회원 기능의 운영 SQL 적용 여부는 별도로 확인해야 합니다.

- D1 ID: `af02ad36-6512-4dc0-ae8a-18ed5976bc66`
- D1 바인딩: `DB`, 설정상 DB 이름: `ssafy-attendance-db`
- 연결 설정은 `ssafy-attendance/vite.config.ts`에 있으며 빌드 시 `dist/server/wrangler.json`에 반영됩니다. 생성 파일은 직접 수정하지 않습니다.
- Cloudflare Workers GitHub 연결: 저장소 `SSAFY-16th-9/Attendance-Calendar`, 브랜치 `main`
- Project name: `ssafy-attendance-calendar`
- Advanced settings → Path: `/ssafy-attendance`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy --config dist/server/wrangler.json`
- 초기 설정에서는 Preview builds를 끕니다. 공개 방문을 원하면 Cloudflare Access를 끕니다.
- 새 D1은 0000·0001·0002·setup-member-access·setup-pending(또는 0004)을 순서대로 적용합니다. 기존 운영 D1은 위의 이번 배포 Console 안내대로 빠진 신규 구조만 추가합니다. 테이블을 삭제하거나 초기 SQL을 무조건 재실행하지 않습니다.
- 관리자 설정 4개는 배포된 Worker의 Settings → Variables and Secrets에 Secret으로 등록합니다. 빌드용 환경변수와 구분하며 비밀번호 원문 대신 해시를 사용합니다.
- 기존 Sites DB·비밀 설정은 개인 Cloudflare 계정으로 자동 이전되지 않습니다.
- 배포 후 발급된 `workers.dev` 주소에서 등록·조회·관리자 로그인까지 검증해야 이전 완료입니다. 기존 Sites 방문 제한 대신 이번 앱 자체 회원 로그인을 사용합니다.

아래 Sites 배포 절차는 기존 호스팅 유지·복구용입니다. 개인 Cloudflare 웹 배포는 위 설정을 사용합니다.

**GitHub 기준 저장소는 이 문서가 있는 최상위 폴더입니다.** 앱 전체 파일이 일반 소스로 커밋되어야 하며 `ssafy-attendance`가 `160000` 모드의 gitlink로 올라가면 안 됩니다.

현재 PC에는 Sites 소스 동기화용 `ssafy-attendance/.git`도 있습니다. 이 로컬 메타데이터는 GitHub에 포함하지 않습니다. 새 GitHub 복제본에는 중첩 `.git`이 없습니다. 명령 실행 위치를 확인해 GitHub 저장소와 Sites 소스 저장소를 혼동하지 않습니다.

### GitHub 푸시

최상위에서 실행합니다. 원격 기록이 추가되었다면 먼저 가져와 병합하며 강제 푸시로 덮어쓰지 않습니다.

```powershell
git status
git add README.md package.json .gitignore ssafy-attendance
git diff --cached --stat
git commit -m "Describe the change"
git push origin main
```

**Cloudflare Workers Builds의 GitHub 자동 배포가 켜져 있으면 main 푸시 후 빌드·배포됩니다. DB 스키마 SQL은 별도로 적용해야 합니다.** 문서만 수정할 때는 운영 사이트를 다시 배포할 필요가 없습니다.

### 현재 계정의 비공개 Sites 미리보기 (2026-10-16)

- URL: https://ssafy-class9-attendance-preview.ckdals5619.chatgpt.site/
- 새 Sites project_id: `appgprj_6ad1e1fa9bb88191b73cbf44fcccb971`. 앱 `.openai/hosting.json`은 이 프로젝트를 가리킵니다.
- 기존 true-isle 계정의 프로젝트는 현재 연결에서 NOT_FOUND여서, 사용자가 현재 계정에 새 비공개 사이트 생성을 승인했습니다. 기존 사이트·개인 Cloudflare 운영 앱·운영 DB는 변경하지 않았습니다.
- owner-only custom 접근 유지, 최신 소스 배포 성공. 환경 설정 4개는 Sites 비밀 환경변수로 보관합니다. 비밀값은 Git에 없습니다.
- 배포 ID: `appgdep_6ad1e40b2ac88191949228cdec8bb3bf`, Sites 소스 커밋: `44e25bff9974458685d138d6a223e78119ac1d13`, 환경 revision 1.
- Sites가 스키마 마이그레이션 0000~0003을 적용했습니다. 회원 25개는 관리자 전용 `/api/admin/bootstrap`으로 초기화했으며, 재실행해도 기존 계정·비밀번호를 덮어쓰지 않습니다. 이 초기화 경로는 미리보기 소스 저장소에만 있습니다. D1 매개변수 제한을 피하도록 회원별 INSERT를 batch로 처리합니다. 조회용 Sites 도구로 테이블 생성 및 실제 관리자 로그인·캘린더 로딩을 확인했습니다.
- 미리보기와 운영 DB는 분리되어 있습니다. 운영 출결·벌금을 미리보기로 복사하지 않았습니다. 미리보기에서 비밀번호를 바꿔도 운영 비밀번호는 바뀌지 않습니다.
- 현재 PC의 별도 Sites 체크아웃: `outputs/attendance-sites-preview` (GitHub 제외, Sites 소스에는 저장됨). 원본 앱에서 복사했고 미리보기용 Vite 설정은 개인 Cloudflare D1 ID 대신 local-db를 사용합니다. 다음 수정은 Sites source helper로 이 프로젝트의 최신 소스를 연 후 반영합니다. 체크아웃이 없어졌다면 빈 폴더에서 같은 project_id의 소스를 복원합니다. 새 사이트를 다시 생성하지 않습니다.
- 현재 저장소의 `ssafy-attendance/`는 개인 Cloudflare 배포용입니다. 이 폴더의 실제 D1 ID와 Workers Builds 설정은 유지합니다. Sites 미리보기 변경 사항을 동기화할 때 운영 설정과 미리보기 설정을 혼동하지 않습니다.

### Sites 배포

설치된 Sites 스킬의 현재 지침과 도구 계약을 확인하고 진행합니다.

1. 앱의 `.openai/hosting.json`에 있는 기존 `project_id`를 재사용합니다. 같은 프로젝트에 새 사이트를 만들지 않습니다.
2. 기존 사이트 상태·접근 정책을 읽고 해당 사이트의 단기 소스 저장소 자격 증명을 발급받습니다. 값은 메모리·숨겨진 stdin으로만 전달합니다.
3. Sites 소스 체크아웃을 열어 최신 원격 이력을 확인한 뒤 변경을 반영합니다. 중첩 `.git`이 없는 새 GitHub 복제본에서는 별도 빈 배포 체크아웃에 Sites 소스를 복원한 뒤 앱 소스를 옮깁니다. 비밀값·DB·node_modules·Git 메타데이터는 복사하지 않습니다.
4. 검증·빌드 후 source helper로 소스 동기화와 아카이브 준비를 수행합니다. 커밋과 아카이브는 같은 소스를 가리켜야 합니다.
5. 기존 비공개 접근 정책을 유지해 `save_version_and_deploy_private`로 배포합니다. 대기 상태일 때만 상태를 조회하고 성공 결과를 기록합니다.

이전 계정의 Sites 배포 이력 (현재 연결에서는 접근 불가):

```text
project_id: appgprj_6ad18f0b80f881919ae77217e7954e47
D1 binding: DB
Sites source commit: 1e36e3b28760c7accbaf828ff7e5ee04e107e95f
Deployment: appgdep_6ad199d662a88191b9303b6726fbce50
Status: succeeded
Environment revision: 1
```

위 커밋은 Sites 소스 저장소의 커밋이며 GitHub 최상위 커밋과 다릅니다. 이후 배포 시 최신 검증 결과로 갱신합니다.

### 이 PC에서 확인한 Windows 실행 문제

- npm shim이 `node_modules/npm/bin/npm-cli.js`를 잘못 찾는 경우 실제 Node 설치 폴더의 `npm-cli.js`로 같은 명령을 실행해 해결했습니다. 설치 경로는 PC마다 확인합니다.
- Sites 패키징에는 Windows 기본 Bash 대신 Git Bash를 사용했습니다. 해당 실행에 한해 Git의 `bin` 폴더를 PATH 앞에 둡니다.
- GNU tar가 `C:/...`를 원격 주소로 오인하면 해당 실행에 `TAR_OPTIONS=--force-local`을 설정합니다. 전역 설정·플러그인 파일은 수정하지 않습니다.
- 환경에 따라 로컬 Wrangler 서버·마이그레이션 실행에 추가 권한이 필요할 수 있습니다.

## 현재 제한과 이어갈 때 유의점

- 기존 Sites 주소는 **소유자만 허용하는 비공개 상태**입니다. 개인 Cloudflare 주소는 이 제한과 별개입니다. 실제 반원 공유에는 방문 허용 대상 설정이 필요합니다. 관리자 로그인과 사이트 방문 권한은 별개입니다.
- 학생별 로그인과 본인 소유권을 적용했습니다. 모든 회원이 전체 출결을 조회하지만 일반 회원의 등록·수정은 본인 일반 출결만 가능합니다. 관리자는 전체 내역을 관리합니다.
- 명단과 사유의 기준은 `lib/attendance.ts`이며 변경 시 테스트를 함께 확인합니다.
- 일반 화면의 삭제 버튼은 관리자 페이지 이동 링크로 바뀌었으며 기존 삭제 API 우회도 차단합니다.
- 민트·오프화이트 디자인과 월간 캘린더·날짜 상세·팝업 등록 흐름을 유지합니다.
