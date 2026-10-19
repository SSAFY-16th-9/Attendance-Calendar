import test from 'node:test';
import assert from 'node:assert/strict';
import { MEMBERS, TYPES, validateEntry, dateKey, koreaToday, canonicalName, nameAliases } from '../lib/attendance.ts';

const valid = { date: '2026-10-16', name: '이주언', type: '공가' };

test('roster has the 25 distinct names supplied by the class', () => {
  assert.equal(MEMBERS.length, 25);
  assert.equal(new Set(MEMBERS).size, 25);
  assert.ok(MEMBERS.includes('황규진'));
  assert.ok(MEMBERS.includes('이미지'));
  assert.ok(MEMBERS.includes('조석래'));
  assert.ok(MEMBERS.includes('이주언'));
  assert.ok(!MEMBERS.includes('이주연'));
});

test('old attendance names display the corrected name without losing records', () => {
  assert.equal(canonicalName('이주연'), '이주언');
  assert.deepEqual(nameAliases('이주언'), ['이주언', '이주연']);
  assert.equal(canonicalName('황규진'), '황규진');
  assert.equal(typeof validateEntry({ ...valid, name: '이주연' }), 'string');
});

test('all seven requested reasons are accepted without optional details', () => {
  assert.deepEqual(TYPES, ['공가', '사유지각', '사유조퇴', '사유결석', '임의지각', '임의조퇴', '임의결석']);
  for (const type of TYPES) assert.deepEqual(validateEntry({ ...valid, type }), { ...valid, type, reason: '', pending: 0 });
});

test('name must be a roster selection and reason must be supported', () => {
  for (const input of [null, {}, { ...valid, name: '' }, { ...valid, name: '명단에없는이름' }, { ...valid, type: '' }, { ...valid, type: '휴가' }]) {
    assert.equal(typeof validateEntry(input), 'string');
  }
});

test('rejects impossible dates rather than normalizing them into a different day', () => {
  for (const date of ['2026-02-29', '2026-02-30', '2026-04-31', '2026-13-01', '2026-00-01', '2026-10-00', '2026-1-1', '1999-12-31', '2101-01-01', 'invalid']) {
    assert.equal(typeof validateEntry({ ...valid, date }), 'string', date);
  }
  assert.equal(validateEntry({ ...valid, date: '2028-02-29' }).date, '2028-02-29');
});

test('optional detail is trimmed, length bounded, and type checked', () => {
  assert.equal(validateEntry({ ...valid, reason: '  일정 공유  ' }).reason, '일정 공유');
  assert.equal(validateEntry({ ...valid, reason: '가'.repeat(500) }).reason.length, 500);
  assert.equal(typeof validateEntry({ ...valid, reason: '가'.repeat(501) }), 'string');
  assert.equal(typeof validateEntry({ ...valid, reason: ['설명'] }), 'string');
});

test('calendar keys are zero padded and today follows Korea time', () => {
  assert.equal(dateKey(2026, 0, 3), '2026-01-03');
  assert.equal(koreaToday(), new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()));
});

test('day lists put the viewer first, then group early leave, tardiness, absence and leave', async () => {
  const { sortForViewer } = await import('../lib/attendance.ts');
  const entries = [
    { name: '강유빈', type: '공가' }, { name: '고태호', type: '사유결석' }, { name: '김별찬', type: '임의지각' },
    { name: '이주연', type: '공가' }, { name: '박은빈', type: '사유조퇴' }, { name: '김세진', type: '사유지각' },
  ];
  assert.deepEqual(sortForViewer(entries, '이주언').map(e => e.name), ['이주연', '박은빈', '김세진', '김별찬', '고태호', '강유빈']);
  assert.deepEqual(sortForViewer(entries).map(e => e.type), ['사유조퇴', '사유지각', '임의지각', '사유결석', '공가', '공가']);
});

test('pending is an optional boolean and drives the label prefix', async () => {
  const { statusPrefix } = await import('../lib/attendance.ts');
  assert.equal(validateEntry({ ...valid, pending: true }).pending, 1);
  assert.equal(validateEntry({ ...valid, pending: false }).pending, 0);
  assert.equal(typeof validateEntry({ ...valid, pending: 'yes' }), 'string');
  assert.equal(statusPrefix({ pending: 1 }), '미정 · ');
  assert.equal(statusPrefix({ unnotified: true, pending: 1 }), '무단 · ');
  assert.equal(statusPrefix({}), '');
});
