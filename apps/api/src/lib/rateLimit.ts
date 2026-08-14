// Minimal in-memory login rate limiter (per IP).
// Brute-forcing a 4-6 digit PIN is cheap, so failed attempts are limited and
// the IP is locked out for a cooldown window. Restarting the API resets state.

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

interface Entry {
  count: number;
  windowStart: number;
  lockedUntil: number;
}

const store = new Map<string, Entry>();

export function resetRateLimitStore() {
  store.clear();
}

export function isLoginAllowed(ip: string, now: number = Date.now()): boolean {
  const entry = store.get(ip);
  if (!entry) return true;
  if (entry.lockedUntil > now) return false;
  if (now - entry.windowStart > WINDOW_MS) {
    store.delete(ip);
    return true;
  }
  return entry.count < MAX_ATTEMPTS;
}

export function retryAfterSeconds(ip: string, now: number = Date.now()): number {
  const entry = store.get(ip);
  if (!entry || entry.lockedUntil <= now) return 0;
  return Math.ceil((entry.lockedUntil - now) / 1000);
}

export function recordLoginFailure(ip: string, now: number = Date.now()) {
  let entry = store.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    entry = { count: 0, windowStart: now, lockedUntil: 0 };
    store.set(ip, entry);
  }
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
}

export function recordLoginSuccess(ip: string) {
  store.delete(ip);
}
