# 따로 배포하기

이 저장소를 클론해 **자기 Cloudflare 계정에 따로** 배포할 때 필요한 것만 정리했습니다.
비밀값은 저장소에 없으니 직접 만들어야 하고, 코드 안에 있는 우리 반용 설정 몇 가지는 바꿔야 합니다.

> 기존 운영 사이트의 비밀값·DB를 그대로 가져다 쓰지 마세요. 로그인 쿠키가 서로 통하거나 남의 데이터를 덮어쓸 수 있습니다.

---

## 한눈에 보기

| 단계 | 할 일 |
| --- | --- |
| 1 | Cloudflare에 D1 데이터베이스 만들기 |
| 2 | 코드의 Worker 이름·D1 이름·D1 ID 바꾸기 |
| 3 | 비밀값 4개 만들어 등록하기 |
| 4 | 새 D1에 `schema.sql` 실행하기 |
| 5 | GitHub 연결해 자동 배포 설정하기 |
| 6 | 핵심 관리자로 로그인 → 기수 추가 → 가입 코드 전달 |

필요한 것: Cloudflare 계정, GitHub 계정, Node.js 22.13 이상.

---

## 1. D1 데이터베이스 만들기

Cloudflare → **Storage & databases → D1 → Create** 에서 데이터베이스를 만듭니다(이름 예: `my-attendance-db`).
만든 뒤 화면에 보이는 **Database ID**를 복사해 둡니다.

## 2. 코드에서 바꿀 설정

`ssafy-attendance/vite.config.ts`

| 항목 | 지금 값 | 바꿀 값 |
| --- | --- | --- |
| `CLOUDFLARE_DATABASE_ID` | 원래 운영 DB의 ID | **1단계에서 복사한 내 Database ID** |
| `name` | `ssafy-attendance-calendar` | 내 Worker 이름 (예: `my-attendance`) |
| `database_name` | `ssafy-attendance-db` | 1단계에서 만든 D1 이름 |

`ssafy-attendance/.openai/hosting.json`의 `"d1": "DB"`(코드가 DB를 찾는 이름)는 **그대로** 둡니다.

> Worker 이름과 DB ID를 바꾸지 않으면 원래 사이트에 배포를 시도하거나 원래 DB를 가리키게 됩니다. 꼭 바꾸세요.

## 3. 비밀값 4개

| 이름 | 내용 |
| --- | --- |
| `ADMIN_USERNAME` | 핵심 관리자 로그인 아이디 (예: `admin`) |
| `ADMIN_PASSWORD_HASH` | 핵심 관리자 비밀번호의 해시 (PBKDF2-SHA256, 100,000회, 32바이트, 16진수) |
| `ADMIN_PASSWORD_SALT` | 위 해시에 쓴 솔트 |
| `ADMIN_SESSION_SECRET` | 로그인 쿠키 서명 키, **32자 이상** 무작위 값 (관리자·회원 로그인 모두 사용) |

`ssafy-attendance` 폴더에서 아래 명령을 실행하면 해시·솔트·세션 키가 한 번에 만들어집니다. `원하는비밀번호`를 바꿔 넣으세요.

```bash
node -e "const c=require('crypto');const salt=c.randomUUID();const pw=process.argv[1];console.log('ADMIN_PASSWORD_SALT='+salt);console.log('ADMIN_PASSWORD_HASH='+c.pbkdf2Sync(pw,salt,100000,32,'sha256').toString('hex'));console.log('ADMIN_SESSION_SECRET='+c.randomBytes(32).toString('hex'))" "원하는비밀번호"
```

등록하는 곳:

- **운영**: Cloudflare → Workers & Pages → 내 Worker → **Settings → Variables and Secrets** 에 4개를 **Secret**으로 추가
- **로컬 개발**: `ssafy-attendance/.dev.vars` 파일에 `이름=값` 형식으로 4줄 (Git에 올라가지 않는 파일)

> 결과값은 커밋하거나 메신저에 올리지 마세요. `ADMIN_SESSION_SECRET`이 32자보다 짧으면 회원 로그인도 막힙니다.

## 4. DB 구조 만들기

Cloudflare → D1 → 내 데이터베이스 → **Console**에서 `ssafy-attendance/scripts/schema.sql` 내용을 붙여넣어 실행합니다.

- 표 5개와 첫 기수 `16-9`(16기 9반, 공개)가 만들어집니다.
- 우리 반이 아니라면 실행 전에 `schema.sql`의 `INSERT INTO cohorts ...` 줄에서 `'16-9', '16기 9반'`을 내 기수(예: `'17-3', '17기 3반'`)로 바꿔도 되고, 그대로 실행한 뒤 관리자 화면에서 새 기수를 추가하고 16기 9반을 삭제해도 됩니다.
- Console에 붙여넣을 때 줄바꿈이 사라지면 `--` 주석 뒤가 모두 주석이 되어 실행되지 않습니다. 주석 줄(`--`로 시작)을 지우고 붙여넣으세요.
- 확인: `SELECT * FROM cohorts;`에 기수 한 줄이 보이면 됩니다.

## 5. 자동 배포 설정

Cloudflare → Workers & Pages → **Create → Import a repository**에서 내 GitHub 저장소를 연결합니다.

| 항목 | 값 |
| --- | --- |
| Root directory (Path) | `/ssafy-attendance` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy --config dist/server/wrangler.json` |

이후 `main`에 푸시하면 자동으로 배포되고, Deployments에서 **Ready**가 되면 반영된 것입니다.
3단계의 비밀값은 Worker가 처음 만들어진 뒤 Settings에서 등록하고 한 번 더 배포하면 적용됩니다.

## 6. 처음 사용하기

1. `https://<내 Worker 주소>/login`에서 `ADMIN_USERNAME`과 3단계 비밀번호로 로그인합니다.
2. **관리자 → 기수 관리**에서 기수를 추가합니다(비공개·가입 코드 있음으로 시작).
3. 가입 코드(예: `ABCD-EFGH`)를 반 친구들에게 전달하면, 각자 로그인 화면 → **가입 코드로 회원가입**에서 가입합니다.
4. 캘린더를 로그인 없이 보이게 하려면 기수 관리에서 **공개**로 바꿉니다.

---

## 우리 반 전용 설정 (필요하면 바꾸기)

| 내용 | 위치 |
| --- | --- |
| 벌금 금액 5,000원 | `ssafy-attendance/lib/fines.ts` → `FINE_AMOUNT` |
| 당일 오전 8시 이후 본인 등록 시 자동 무단 | `ssafy-attendance/lib/attendance.ts` → `LATE_CUTOFF_HOUR`(시각), `LATE_RULE_FROM`(적용 시작일) |
| 이름 별칭(이주연 → 이주언) | `ssafy-attendance/lib/attendance.ts` → `canonicalName`, `nameAliases` |
| 출결 사유 7종 | `ssafy-attendance/lib/attendance.ts` → `TYPES` |
| 사이트 제목 "출결 모아 \| SSAFY" | `ssafy-attendance/app/layout.tsx` |

## 로컬에서 실행해 보기

```bash
cd ssafy-attendance
npm run install:ci
npm run build
npm run dev
```

`http://127.0.0.1:5173`에서 열립니다. `.dev.vars`가 있어야 로그인이 됩니다(3단계).

## 비밀이 아닌 것 / 비밀인 것

- **저장소에 있는 것(공개돼도 됨)**: 코드, DB 구조(`schema.sql`), D1 ID(ID만으로는 접근할 수 없음)
- **저장소에 없는 것(비공개)**: 비밀값 4개, DB 안의 데이터(회원 비밀번호 해시·출결·벌금). 기존 데이터를 옮기려면 D1 백업(export) 파일이 필요하며, 이 파일도 비공개로 다뤄야 합니다.
