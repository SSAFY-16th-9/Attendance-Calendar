import test from 'node:test';
import assert from 'node:assert/strict';
import { constantTimeEqual, createSession, passwordDigest, SESSION_SECONDS, verifySession } from '../lib/admin-session.ts';

const secret = 'unit-test-only-session-secret-which-is-long-enough';

test('admin password verification is salted and deterministic', async () => {
  const digest = await passwordDigest('test-password', 'test-salt');
  assert.equal(digest.length, 64);
  assert.equal(digest, await passwordDigest('test-password', 'test-salt'));
  assert.notEqual(digest, await passwordDigest('wrong-password', 'test-salt'));
  assert.notEqual(digest, await passwordDigest('test-password', 'different-salt'));
  assert.equal(constantTimeEqual(digest, digest), true);
  assert.equal(constantTimeEqual(digest, digest.slice(1)), false);
});

test('admin sessions require the correct account, signing secret and expiry', async () => {
  const token = await createSession('test-admin', secret, 1000);
  assert.equal(await verifySession(token, 'test-admin', secret, 1001), true);
  assert.equal(await verifySession(token, 'other-admin', secret, 1001), false);
  assert.equal(await verifySession(token, 'test-admin', 'wrong-secret', 1001), false);
  assert.equal(await verifySession(token, 'test-admin', secret, 1000 + SESSION_SECONDS), false);
  assert.equal(await verifySession(token, 'test-admin', secret, 999), false);
});

test('tampered or malformed session tokens never grant access', async () => {
  const token = await createSession('test-admin', secret, 1000);
  const [payload, signature] = token.split('.');
  for (const invalid of ['', 'admin', `${payload}.invalid`, `${payload}.${signature}.extra`, `${payload.slice(0, -1)}A.${signature}`, 'x'.repeat(2000)]) {
    assert.equal(await verifySession(invalid, 'test-admin', secret, 1001), false);
  }
  assert.notEqual(await createSession('test-admin', secret, 1000), token);
});

test('auto-login sessions last their chosen length and still expire', async () => {
  const { MEMBER_REMEMBER_SECONDS, ADMIN_REMEMBER_SECONDS } = await import('../lib/admin-session.ts');
  const secret = 'x'.repeat(40);
  for (const seconds of [MEMBER_REMEMBER_SECONDS, ADMIN_REMEMBER_SECONDS]) {
    const token = await createSession('member:remember', secret, 1000, seconds);
    assert.equal(await verifySession(token, 'member:remember', secret, 1000 + seconds - 1), true);
    assert.equal(await verifySession(token, 'member:remember', secret, 1000 + seconds), false);
  }
  assert.equal(await verifySession(await createSession('member:remember', secret, 1000, 12345), 'member:remember', secret, 1001), false);
});
