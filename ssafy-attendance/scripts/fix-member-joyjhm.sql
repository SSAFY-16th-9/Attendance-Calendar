-- 전현민 아이디 오타 수정: joyihm → joyjhm. D1 Console에서 한 번 실행합니다(다시 실행해도 안전).
-- 1) 아이디를 바꿉니다.
UPDATE members SET username = 'joyjhm', updated_at = '2026-10-19T02:09:13.158Z' WHERE id = '86e67b9f-47e9-4400-b7e0-42a36d6df16f' AND username = 'joyihm';
-- 2) 아직 첫 비밀번호를 바꾸지 않은 경우에만 처음 비밀번호를 새 아이디(joyjhm)로 맞추고 기존 로그인을 끊습니다.
UPDATE members SET password_hash = '353bcf2bec20fb597973927629c37456e1714c939ba85efffbd8bf4b8391cc37', password_salt = '9bcda10a94517e5478424f64057a0747', session_version = session_version + 1, updated_at = '2026-10-19T02:09:13.158Z'
  WHERE id = '86e67b9f-47e9-4400-b7e0-42a36d6df16f' AND username = 'joyjhm' AND must_change_password = 1 AND password_salt <> '9bcda10a94517e5478424f64057a0747';
