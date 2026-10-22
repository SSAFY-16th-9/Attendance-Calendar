import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { parseRoster } from '../lib/roster-paste.ts';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const migrations = () => readdirSync(new URL('../drizzle/', import.meta.url)).filter(file => file.endsWith('.sql')).sort().map(file => read(`../drizzle/${file}`));
// Columns, defaults and indexes of every table, for comparing two databases.
const shape = db => db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({ name }) => ({
  name,
  columns: db.prepare(`PRAGMA table_info(${name})`).all().map(({ name, type, notnull, dflt_value, pk }) => ({ name, type, notnull, dflt_value, pk })).sort((a, b) => a.name.localeCompare(b.name)),
  indexes: db.prepare(`PRAGMA index_list(${name})`).all().filter(index => index.origin === 'c').map(index => ({ name: index.name, unique: index.unique, columns: db.prepare(`PRAGMA index_info(${index.name})`).all().map(column => column.name) })).sort((a, b) => a.name.localeCompare(b.name)),
}));
const member = (id, username, name, cohort = '16-9') => `INSERT INTO members (id, username, name, password_hash, password_salt, cohort, created_at, updated_at) VALUES ('${id}', '${username}', '${name}', 'h', 's', '${cohort}', 'now', 'now')`;

test('the cohort migration keeps existing rows in 16기 9반 and allows the same name in another class', () => {
  const db = new DatabaseSync(':memory:');
  const all = migrations(); const last = all.pop();
  for (const sql of all) db.exec(sql);
  db.exec("INSERT INTO members (id, username, name, password_hash, password_salt, created_at, updated_at) VALUES ('m1', 'gildong', '홍길동', 'h', 's', 'now', 'now')");
  db.exec("INSERT INTO attendance (id, date, name, type, created_at) VALUES ('a1', '2026-10-21', '홍길동', '지각', 'now')");
  db.exec(last);
  assert.equal(db.prepare('SELECT cohort FROM members').get().cohort, '16-9');
  assert.equal(db.prepare('SELECT cohort FROM attendance').get().cohort, '16-9');
  assert.deepEqual({ ...db.prepare('SELECT id, name, is_current FROM cohorts').get() }, { id: '16-9', name: '16기 9반', is_current: 1 });
  db.exec(member('m2', 'gildong17', '홍길동', '17-9'));
  db.exec("INSERT INTO attendance (id, date, name, type, cohort, created_at) VALUES ('a2', '2026-10-21', '홍길동', '지각', '17-9', 'now')");
  assert.throws(() => db.exec(member('m3', 'other', '홍길동')), /UNIQUE/);
  assert.throws(() => db.exec(member('m4', 'gildong', '김철수', '17-9')), /UNIQUE/);
  db.close();
});

test('scripts/schema.sql builds the same database as every migration and can run twice', () => {
  const fromMigrations = new DatabaseSync(':memory:'); for (const sql of migrations()) fromMigrations.exec(sql);
  const fromSchema = new DatabaseSync(':memory:'); fromSchema.exec(read('../scripts/schema.sql')); fromSchema.exec(read('../scripts/schema.sql'));
  assert.deepEqual(shape(fromSchema), shape(fromMigrations));
  assert.equal(fromSchema.prepare('SELECT count(*) AS n FROM cohorts').get().n, 1);
});

test('a pasted roster is read in either order, from sheet cells, commas or spaces', () => {
  assert.deepEqual(parseRoster('이름\t아이디\n홍길동\tgildong01\nchulsoo22, 김철수\n\n  이영희 young.h  '), [
    { name: '홍길동', username: 'gildong01' },
    { name: '김철수', username: 'chulsoo22' },
    { name: '이영희', username: 'young.h' },
  ]);
  assert.deepEqual(parseRoster('홍길동'), [{ name: '홍길동', username: '' }]);
});
