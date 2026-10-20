import test from 'node:test';
import assert from 'node:assert/strict';
import { MEMBERS, TYPES, validateEntry, dateKey, koreaToday, canonicalName, nameAliases } from '../lib/attendance.ts';

const valid = { date: '2026-10-16', name: '이주언', type: '공가' };

test('initial roster has the 24 distinct names supplied by the class', () => {
  assert.equal(MEMBERS.length, 24);
  assert.equal(new Set(MEMBERS).size, 24);
  assert.ok(MEMBERS.includes('황규진'));
  assert.ok(MEMBERS.includes('이민지'));
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

// Roster membership is checked against the members table by the API; here only the name's shape.
test('name must be a well-formed roster name and reason must be supported', () => {
  for (const input of [null, {}, { ...valid, name: '' }, { ...valid, name: '김1' }, { ...valid, name: ' 김민수' }, { ...valid, name: '가'.repeat(21) }, { ...valid, type: '' }, { ...valid, type: '휴가' }]) {
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

test('several dates register together and stay within the limit', async () => {
  const { requestedDates, validateEntries, takenDatesMessage, MAX_DATES, DAILY_LIMIT_MESSAGE } = await import('../lib/attendance.ts');
  assert.deepEqual(requestedDates({ date: '2026-10-16' }), ['2026-10-16']);
  assert.deepEqual(requestedDates({ dates: ['2026-10-23', '2026-10-21', '2026-10-23'] }), ['2026-10-21', '2026-10-23']);
  assert.equal(typeof requestedDates({ dates: [] }), 'string');
  assert.equal(typeof requestedDates({ dates: Array.from({ length: MAX_DATES + 1 }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`) }), 'string');
  const entries = validateEntries({ dates: ['2026-10-21', '2026-10-22'], type: '사유결석', reason: '병원' }, '이주언');
  assert.deepEqual(entries.map(e => e.date), ['2026-10-21', '2026-10-22']);
  assert.ok(entries.every(e => e.type === '사유결석' && e.reason === '병원' && e.name === '이주언'));
  assert.equal(typeof validateEntries({ dates: ['2026-10-21', '2026-02-30'], type: '공가' }, '이주언'), 'string');
  assert.equal(takenDatesMessage(['2026-10-21']), DAILY_LIMIT_MESSAGE);
  assert.match(takenDatesMessage(['2026-10-21', '2026-10-22']), /^10\/21, 10\/22에는/);
});

test('roster names and usernames follow the admin form rules', async () => {
  const { isMemberName, isMemberUsername } = await import('../lib/attendance.ts');
  for (const name of ['김민수', '이주언', 'Alex Kim', '가']) assert.equal(isMemberName(name), true, name);
  for (const name of ['', '이주연', '김 ', '김1', 'a'.repeat(21)]) assert.equal(isMemberName(name), false, name);
  for (const username of ['joyjhm', 'coasterrrrr', 'a.b_c-1']) assert.equal(isMemberUsername(username), true, username);
  for (const username of ['ab', 'with space', '한글', 'x'.repeat(41)]) assert.equal(isMemberUsername(username), false, username);
});
