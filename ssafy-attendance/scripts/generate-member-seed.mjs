import { randomBytes, randomUUID, pbkdf2Sync } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { CLASS_ROSTER } from '../lib/class-roster.ts';
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const now = new Date().toISOString();
const statements = CLASS_ROSTER.map(member => {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(member.username, salt, 100000, 32, 'sha256').toString('hex');
  return `INSERT INTO members (id, username, name, password_hash, password_salt, active, must_change_password, session_version, created_at, updated_at) VALUES (${[randomUUID(), member.username, member.name, hash, salt].map(quote).join(', ')}, 1, 1, 0, ${quote(now)}, ${quote(now)}) ON CONFLICT DO NOTHING;`;
});
writeFileSync('scripts/seed-members.sql', '-- One-time class bootstrap. Existing accounts/passwords are never overwritten.\n' + statements.join('\n') + '\n', { flag: 'wx' });
console.log(`Prepared ${CLASS_ROSTER.length} initial member accounts (hashes only).`);
