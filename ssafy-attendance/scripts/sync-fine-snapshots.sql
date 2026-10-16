-- Optional one-time cleanup: copy each fine's date, name and type from its attendance record.
-- Fines are kept in step automatically on edits from 2026-10-16; run this once in the D1 Console
-- to align fines edited before that. Safe to re-run; it changes nothing else.
UPDATE fines SET
  date = (SELECT date FROM attendance WHERE attendance.id = fines.attendance_id),
  name = (SELECT name FROM attendance WHERE attendance.id = fines.attendance_id),
  type = (SELECT type FROM attendance WHERE attendance.id = fines.attendance_id)
WHERE attendance_id IN (SELECT id FROM attendance);
