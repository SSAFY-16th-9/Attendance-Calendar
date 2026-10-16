-- Cloudflare D1 Console: adds the ledger without changing existing attendance.
-- Safe to run again; existing fines and payment states are preserved.
CREATE TABLE IF NOT EXISTS fines (
  id TEXT PRIMARY KEY NOT NULL,
  attendance_id TEXT NOT NULL,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'unpaid' NOT NULL,
  paid_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revision INTEGER DEFAULT 0 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS fines_attendance_unique
ON fines (attendance_id);
