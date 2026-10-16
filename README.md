# 출결 모아 · SSAFY 16기 9반

24명의 출결을 함께 확인하는 공유 캘린더입니다. 이 README는 **다른 개발 세션에서 작업을 이어가기 위한 기준 문서**입니다. 문서 기준일은 2026-10-16(한국 시간)입니다.

- 저장소: [SSAFY-16th-9/Attendance-Calendar](https://github.com/SSAFY-16th-9/Attendance-Calendar)
- 운영 캘린더: https://ssafy-16-class-9-attendance.true-isle-9929.chatgpt.site/
- 관리자: https://ssafy-16-class-9-attendance.true-isle-9929.chatgpt.site/admin

## 다음 세션에서 먼저 확인할 것

1. 이 문서를 읽고 최상위 폴더에서 `git status`와 `git remote -v`를 확인합니다.
2. 실제 앱은 `ssafy-attendance/`에 있습니다. 관련 소스와 테스트를 읽은 뒤 변경합니다.
3. 기존 로컬 DB에는 초기 마이그레이션을 재실행하지 않습니다.
4. 관리자 비밀 설정은 Git에 없습니다. 같은 PC에서는 앱의 `.dev.vars` 존재를 확인하고, 새 PC에서는 새 로컬 설정을 준비합니다. 비밀값을 로그에 출력하지 않습니다.
5. 변경 후 테스트·타입 검사·빌드를 실행합니다. **GitHub 푸시와 운영 사이트 배포는 별개**입니다.

## 구현된 기능과 확정 요구사항

- 월간 캘린더에 **이름과 출결 사유** 표시
- 날짜 선택 → 날짜별 명단을 상세 패널에 표시 → 이름 선택 시 아코디언 상세 정보
- 팝업으로 출결 등록: **날짜·이름·사유 필수, 상세 이유 선택**
- 이름을 직접 입력해 검색한 뒤 명단에서 선택, 방향키·Enter 지원
- 사유 7종: **공가, 사유지각, 사유조퇴, 사유결석, 임의지각, 임의조퇴, 임의결석**
- 상세 이유 최대 500자, 같은 날짜·이름·사유 중복 차단
- 이름 검색, 사유 필터, 월 이동, 오늘 이동
- 서버 저장 및 여러 브라우저 간 공유. 일반 캘린더는 15초마다, 창으로 돌아올 때 새로 조회
- 모바일 날짜 선택 시 캘린더 아래 상세 패널로 이동
- 관리자: 기간·이름·사유별 조회, 사유별 현황, 출결 수정·삭제
- **수정·삭제는 관리자 전용**이며 API에서도 권한 확인
- 기본 예시 출결 없음. 개발 검증용 내역은 삭제 완료

### 이름 정정

정확한 이름은 **이주언**입니다. 신규 등록 명단에 `이주연`을 다시 추가하지 않습니다. 예전에 `이주연`으로 저장된 내역은 `canonicalName()`으로 `이주언`으로 표시하고, `nameAliases()`로 예전 이름까지 중복 검사합니다. 기존 데이터를 삭제하거나 일괄 변경하지 않으며, 관리자가 수정하면 정정된 이름으로 저장됩니다.

## 구조와 기술 구성

```text
Attendance-Calendar/
├─ README.md                       # 세션 인계·실행·운영 가이드
├─ package.json                    # 최상위 편의 명령
└─ ssafy-attendance/                # 실제 앱
   ├─ app/page.tsx                 # 캘린더·날짜 상세·등록창·검색형 이름 선택
   ├─ app/globals.css              # 전체 화면·관리자·모바일 스타일
   ├─ app/layout.tsx               # 한국어·메타데이터
   ├─ app/admin/page.tsx           # 관리자 로그인·검색·수정·삭제
   ├─ app/api/attendance/route.ts   # 일반 출결 API
   ├─ app/api/admin/session/route.ts
   ├─ app/api/admin/attendance/route.ts
   ├─ lib/attendance.ts            # 24명 명단·7종 사유·검증·이름 정정
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

기본 주소는 http://127.0.0.1:5173 입니다. 현재 PC의 DB에는 두 SQL이 이미 적용되어 있습니다. 새 GitHub 복제본에는 로컬 DB가 포함되지 않습니다.

초기 설정 이후에는 최상위에서도 `npm run dev`, `npm test`, `npm run build`를 사용할 수 있습니다. 실행 프로필 관련 오류가 발생하면 앱 폴더에서 설치된 Sites 플러그인의 `scripts/configure-execution-profile.mjs`로 portable 프로필을 설정합니다. 플러그인 위치는 PC·설치 버전에 따라 확인합니다.

## 관리자 계정과 비밀 설정

아이디는 `admin`입니다. 운영 비밀번호는 사용자가 지정한 값으로 설정되어 있습니다. **비밀번호 원문, 실제 해시, 세션 비밀키는 README나 Git에 기록하지 않습니다.**

| 환경변수 | 용도 |
| --- | --- |
| `ADMIN_USERNAME` | 관리자 아이디 |
| `ADMIN_PASSWORD_HASH` | PBKDF2-SHA256, 100,000회, 32바이트, hex 해시 |
| `ADMIN_PASSWORD_SALT` | 비밀번호 해시 salt 문자열 |
| `ADMIN_SESSION_SECRET` | 세션 서명용 무작위 문자열, 최소 32자 |

같은 PC의 로컬 설정은 앱의 `.dev.vars`에 있습니다. 새 PC에서는 **새 로컬 테스트 비밀번호**로 별도 설정합니다. 로컬 설정을 바꿔도 운영 계정은 바뀌지 않습니다. 운영 설정은 Sites의 비밀 환경변수로 관리하며 변경 후 배포해야 적용됩니다.

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
| `POST /api/attendance` | 출결 등록 | 사이트 방문 허용 사용자 |
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

현재 자동 테스트는 10개입니다. 명단·이름 정정·7종 사유·필수 입력·날짜·500자 제한·한국 시간·비밀번호 해시·세션 서명/변조/만료를 검증합니다.

브라우저에서 확인한 흐름:

- 이름 검색·키보드 선택, 등록, 날짜 상세, 아코디언, 다른 브라우저 간 공유
- 상세 이유 없이 등록·수정, 중복·잘못된 입력 차단
- 정상·실패 로그인, 미로그인 관리 API 차단, 로그인 시도 제한, 로그아웃 후 권한 해제
- 관리자 수정 내용의 일반 캘린더 반영, 확인 후 삭제
- 모바일 가로 넘침 및 관리자 표 내부 스크롤

브라우저 검증은 로컬에서 수행했고 운영 배포 성공은 Sites 배포 결과로 확인했습니다. 빌드의 `Route ? Unknown`은 Vinext 정적 경로 분석 안내이며 빌드 실패가 아닙니다.

## GitHub 저장과 Sites 운영 배포

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

**이 푸시만으로 운영 사이트가 바뀌지 않습니다.** 문서만 수정할 때는 운영 사이트를 다시 배포할 필요가 없습니다.

### Sites 배포

설치된 Sites 스킬의 현재 지침과 도구 계약을 확인하고 진행합니다.

1. 앱의 `.openai/hosting.json`에 있는 기존 `project_id`를 재사용합니다. 같은 프로젝트에 새 사이트를 만들지 않습니다.
2. 기존 사이트 상태·접근 정책을 읽고 해당 사이트의 단기 소스 저장소 자격 증명을 발급받습니다. 값은 메모리·숨겨진 stdin으로만 전달합니다.
3. Sites 소스 체크아웃을 열어 최신 원격 이력을 확인한 뒤 변경을 반영합니다. 중첩 `.git`이 없는 새 GitHub 복제본에서는 별도 빈 배포 체크아웃에 Sites 소스를 복원한 뒤 앱 소스를 옮깁니다. 비밀값·DB·node_modules·Git 메타데이터는 복사하지 않습니다.
4. 검증·빌드 후 source helper로 소스 동기화와 아카이브 준비를 수행합니다. 커밋과 아카이브는 같은 소스를 가리켜야 합니다.
5. 기존 비공개 접근 정책을 유지해 `save_version_and_deploy_private`로 배포합니다. 대기 상태일 때만 상태를 조회하고 성공 결과를 기록합니다.

현재 사이트와 마지막 기능 배포 결과:

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

- 사이트는 **소유자만 허용하는 비공개 상태**입니다. 실제 반원 공유에는 방문 허용 대상 설정이 필요합니다. 관리자 로그인과 사이트 방문 권한은 별개입니다.
- 학생별 로그인·본인 내역 소유권은 없습니다. 허용된 방문자는 전체 출결을 조회·등록하고, 관리자는 모든 내역을 수정·삭제합니다.
- 명단과 사유의 기준은 `lib/attendance.ts`이며 변경 시 테스트를 함께 확인합니다.
- 일반 화면의 삭제 버튼은 관리자 페이지 이동 링크로 바뀌었으며 기존 삭제 API 우회도 차단합니다.
- 민트·오프화이트 디자인과 월간 캘린더·날짜 상세·팝업 등록 흐름을 유지합니다.
