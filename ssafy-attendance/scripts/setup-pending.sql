-- 미정(pending) 출결 표시용 컬럼 추가. D1 Console에서 한 번만 실행합니다.
-- 이미 실행했다면 "duplicate column name: pending" 오류가 나며, 그때는 다시 실행할 필요가 없습니다.
ALTER TABLE attendance ADD COLUMN pending integer DEFAULT 0 NOT NULL;
