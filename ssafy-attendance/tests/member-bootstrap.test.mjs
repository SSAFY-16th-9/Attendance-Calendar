import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { pbkdf2Sync } from 'node:crypto';
import { CLASS_ROSTER } from '../lib/class-roster.ts';
import { MEMBERS } from '../lib/attendance.ts';

test('member handles map uniquely to the complete class roster', () => {
  assert.equal(CLASS_ROSTER.length, 24);
  assert.equal(new Set(CLASS_ROSTER.map(m => m.username)).size, 24);
  assert.deepEqual(CLASS_ROSTER.map(m => m.name).sort(), [...MEMBERS].sort());
  assert.equal(CLASS_ROSTER.find(m => m.name === '조석래').username, 'coasterrrrr');
});

test('member migration preserves attendance and bootstrap never overwrites changed passwords', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE attendance (id TEXT PRIMARY KEY, name TEXT); INSERT INTO attendance VALUES (\'legacy\', \'이주연\')');
  db.exec(readFileSync(new URL('../drizzle/0003_normal_sleeper.sql', import.meta.url), 'utf8'));
  const seed = readFileSync(new URL('../scripts/seed-members.sql', import.meta.url), 'utf8');
  db.exec(seed);
  const rows = db.prepare('SELECT * FROM members').all();
  assert.equal(rows.length, 24);
  for (const member of rows) {
    assert.equal(member.must_change_password, 1);
    assert.equal(member.active, 1);
    assert.equal(member.password_hash, pbkdf2Sync(member.username, member.password_salt, 100000, 32, 'sha256').toString('hex'));
    assert.notEqual(member.password_hash, member.username);
  }
  assert.equal(new Set(rows.map(m => m.password_salt)).size, 24);
  db.prepare('UPDATE members SET password_hash = ?, must_change_password = 0 WHERE username = ?').run('changed-hash', 'coasterrrrr');
  db.exec(seed);
  assert.equal(db.prepare('SELECT password_hash FROM members WHERE username = ?').get('coasterrrrr').password_hash, 'changed-hash');
  assert.deepEqual({ ...db.prepare('SELECT * FROM attendance').get() }, { id: 'legacy', name: '이주연', owner_id: null, admin_record: 0 });
  db.close();
});
