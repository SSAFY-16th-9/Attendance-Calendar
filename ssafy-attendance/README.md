# 출결 모아 · 앱 소스

SSAFY 16기 9반 출결 캘린더의 실제 앱 폴더입니다.
기능·권한·운영 방법은 최상위 [README](../README.md), 변경 이력은 [CHANGELOG](../CHANGELOG.md)를 봅니다.

## 명령

```powershell
npm run install:ci   # 설치
npm run dev          # 개발 서버 http://127.0.0.1:5173
npm test             # 자동 테스트
npx tsc --noEmit     # 타입 검사
npm run build        # 빌드
```

## 어디를 고치나요

| 내용 | 파일 |
| --- | --- |
| 출결 규칙(사유, 하루 1건, 무단·미정, 8시 자동 무단, 정렬) | `lib/attendance.ts` |
| 공통 DB 조회(본인 기록, 겹치는 날짜, 자동 벌금) | `lib/records.ts` |
| 기수(어느 기수를 보고 관리하는지) | `lib/cohort.ts`, `components/cohort-bar.tsx` |
| 명단 붙여넣기 | `components/bulk-add-dialog.tsx`, `lib/roster-paste.ts` |
| 권한(핵심·하위 관리자, 회원 세션) | `lib/admin-auth.ts`, `lib/member-session.ts`, `lib/site-auth.ts` |
| 벌금 계산·동기화 | `lib/fines.ts`, `lib/fine-sync.ts` |
| 캘린더 화면 | `app/page.tsx` |
| 등록·수정 창, 상세 팝업 | `components/attendance-editor.tsx`, `components/entry-detail-dialog.tsx` |
| 관리자 화면 | `app/admin/` |
| API | `app/api/` |
| DB 구조 | `db/schema.ts`, `drizzle/` |
| 스타일 | `app/globals.css` |

## 주의

- 비밀값은 Git 제외 파일 `.dev.vars`에만 둡니다. 원문·해시·세션 키를 커밋하지 않습니다.
- 이 폴더 안의 `.git`은 Sites 동기화용 별도 저장소입니다. **git 명령은 상위 `Attendance-Calendar/` 폴더에서** 실행합니다.
