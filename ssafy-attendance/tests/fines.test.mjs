import test from 'node:test';
import assert from 'node:assert/strict';
import { FINE_AMOUNT, isFineType, summarizeFines, summarizePeople, validateFineStatus } from '../lib/fines.ts';

test('admins can assess any attendance type, and only known types', () => {
  assert.equal(FINE_AMOUNT, 5000);
  for (const type of ['공가', '사유지각', '사유조퇴', '사유결석', '임의지각', '임의조퇴', '임의결석']) assert.equal(isFineType(type), true);
  for (const type of ['무단', '', '지각']) assert.equal(isFineType(type), false);
});

test('cancelled fines are excluded from assessed, collected, and outstanding money', () => {
  assert.deepEqual(summarizeFines([
    { amount: 5000, status: 'unpaid' }, { amount: 5000, status: 'unpaid' },
    { amount: 5000, status: 'paid' }, { amount: 5000, status: 'waived' },
  ]), { assessed: 15000, collected: 5000, outstanding: 10000, unpaidCount: 2, paidCount: 1, waivedCount: 1 });
  assert.equal(summarizeFines([{ amount: 5000, status: 'waived' }]).assessed, 0);
});

test('payment and reversal preserve the money invariant', () => {
  for (const status of ['unpaid', 'paid', 'waived']) {
    const result = summarizeFines([{ amount: 5000, status }]);
    assert.equal(result.assessed, result.collected + result.outstanding);
  }
});

test('personal balances combine the corrected name and include all 24 classmates', () => {
  const people = summarizePeople([
    { name: '이주연', amount: 5000, status: 'paid' },
    { name: '이주언', amount: 5000, status: 'unpaid' },
    { name: '황규진', amount: 5000, status: 'waived' },
  ]);
  assert.equal(people.length, 24);
  assert.equal(people[0].name, '이주언');
  assert.equal(people[0].assessed, 10000);
  assert.equal(people[0].collected, 5000);
  assert.equal(people[0].outstanding, 5000);
  assert.equal(people.find(person => person.name === '황규진').assessed, 0);
});

test('status changes require a known state and a nonnegative revision for conflict protection', () => {
  const valid = { id: '00000000-0000-4000-8000-000000000001', status: 'paid', revision: 0 };
  assert.deepEqual(validateFineStatus(valid), valid);
  for (const input of [null, {}, { ...valid, id: '' }, { ...valid, status: 'unknown' }, { ...valid, revision: -1 }, { ...valid, revision: '0' }, { ...valid, revision: 0.5 }]) assert.equal(typeof validateFineStatus(input), 'string');
});

test('무단 해제 (cleared) is a cancelled fine: excluded from money owed and labelled apart from 부과 취소', async () => {
  const { STATUS_LABELS } = await import('../lib/fines.ts');
  assert.deepEqual(summarizeFines([{ amount: 5000, status: 'cleared' }, { amount: 5000, status: 'waived' }, { amount: 5000, status: 'unpaid' }]), { assessed: 5000, collected: 0, outstanding: 5000, unpaidCount: 1, paidCount: 0, waivedCount: 2 });
  assert.match(STATUS_LABELS.cleared, /무단 해제/);
  assert.notEqual(STATUS_LABELS.cleared, STATUS_LABELS.waived);
  assert.deepEqual(validateFineStatus({ id: '00000000-0000-4000-8000-000000000000', status: 'cleared', revision: 0 }).status, 'cleared');
});
