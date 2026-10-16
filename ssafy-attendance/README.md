# 출결 모아 앱 소스

SSAFY 16기 9반의 출결 공유 캘린더와 관리자 페이지입니다.

**다음 세션에서는 최상위 [README](../README.md)를 먼저 읽어 주세요.** 실행 환경, 구조, 요구사항, 관리자 설정, 마이그레이션, 검증 결과, GitHub 푸시와 Sites 배포 절차를 정리해 두었습니다.

Sites 전용 소스 저장소처럼 상위 README가 없는 경우 [GitHub README](https://github.com/SSAFY-16th-9/Attendance-Calendar#readme)를 참고합니다.

## 앱 폴더 명령

```powershell
npm run install:ci
npm test
npx tsc --noEmit
npm run build
npm run dev
```

새 로컬 DB에는 `drizzle/0000_true_rhodey.sql`, `drizzle/0001_redundant_ultragirl.sql`을 순서대로 한 번씩 적용합니다. 이미 적용한 마이그레이션은 재실행하지 않습니다.

- 명단·사유·검증: `lib/attendance.ts`
- 캘린더·등록창: `app/page.tsx`
- 관리자: `app/admin/page.tsx`
- 스타일: `app/globals.css`
- API: `app/api/`
- DB: `db/schema.ts`, `drizzle/`
- 배포: `.openai/hosting.json`

정정된 이름은 **이주언**입니다. 관리자 아이디는 `admin`이며 비밀번호 원문·실제 해시·세션 비밀키는 Git에 기록하지 않습니다. 로컬 설정은 Git에서 제외한 `.dev.vars`, 운영 설정은 Sites 비밀 환경변수에 있습니다.

GitHub 작업은 상위 `Attendance-Calendar/` 저장소에서 실행합니다. 현재 PC의 이 폴더 안 `.git`은 Sites 소스 동기화용이며 GitHub에 올릴 하위 모듈이 아닙니다.
