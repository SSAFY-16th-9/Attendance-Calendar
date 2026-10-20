-- 하위 관리자 표시용 컬럼 추가. D1 Console에서 한 번만 실행합니다(drizzle/0005_add_sub_admin.sql과 같은 내용).
-- 이미 실행했다면 "duplicate column name: is_admin" 오류가 나며, 그때는 다시 실행할 필요가 없습니다.
ALTER TABLE members ADD COLUMN is_admin integer DEFAULT 0 NOT NULL;
