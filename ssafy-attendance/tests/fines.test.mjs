import test from 'node:test';
import assert from 'node:assert/strict';
import { FINE_AMOUNT, isFineType, summarizeFines, summarizePeople, validateFineStatus } from '../lib/fines.ts';

test('only unnotified instances of arbitrary tardiness or absence can be assessed by an admin', () => {
  assert.equal(FINE_AMOUNT, 5000);
  assert.equal(isFineType('임의지각'), true);
  assert.equal(isFineType('임의결석'), true);
  for (const type of ['임의조퇴', '공가', '사유지각', '사유조퇴', '사유결석', '무단']) assert.equal(isFineType(type), false);
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

test('personal balances combine the corrected name and include all 25 classmates', () => {
  const people = summarizePeople([
    { name: '이주연', amount: 5000, status: 'paid' },
    { name: '이주언', amount: 5000, status: 'unpaid' },
    { name: '황규진', amount: 5000, status: 'waived' },
  ]);
  assert.equal(people.length, 25);
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
