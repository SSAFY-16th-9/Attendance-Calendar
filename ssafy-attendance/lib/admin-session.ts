const encoder = new TextEncoder();
export const SESSION_SECONDS = 8 * 60 * 60;
export const PASSWORD_ITERATIONS = 100_000;

export function constantTimeEqual(left: string, right: string) {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let mismatch = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index++) mismatch |= (a[index] || 0) ^ (b[index] || 0);
  return mismatch === 0;
}

export async function passwordDigest(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: PASSWORD_ITERATIONS, hash: "SHA-256" }, key, 256);
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function signature(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const result = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(result), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function createSession(username: string, secret: string, now = Math.floor(Date.now() / 1000)) {
  const payload = btoa(JSON.stringify({ username, issued: now, expires: now + SESSION_SECONDS, nonce: crypto.randomUUID() })).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  return `${payload}.${await signature(payload, secret)}`;
}

export async function verifySession(token: string, username: string, secret: string, now = Math.floor(Date.now() / 1000)) {
  if (!token || token.length > 1024 || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[a-f0-9]{64}$/.test(parts[1])) return false;
  if (!constantTimeEqual(parts[1], await signature(parts[0], secret))) return false;
  try {
    const payload = JSON.parse(atob(parts[0].replaceAll("-", "+").replaceAll("_", "/"))) as { username?: unknown; expires?: unknown; issued?: unknown };
    return payload.username === username && typeof payload.expires === "number" && typeof payload.issued === "number" && payload.expires > now && payload.issued <= now && payload.expires - payload.issued === SESSION_SECONDS;
  } catch { return false; }
}
