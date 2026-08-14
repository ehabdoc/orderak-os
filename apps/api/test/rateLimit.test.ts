import { describe, expect, it, beforeEach } from 'vitest';
import {
  isLoginAllowed,
  recordLoginFailure,
  recordLoginSuccess,
  resetRateLimitStore,
  retryAfterSeconds,
} from '../src/lib/rateLimit.js';

describe('login rate limiter', () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it('allows attempts up to the threshold, then locks out', () => {
    const now = 1_000_000;
    for (let i = 1; i <= 5; i++) {
      expect(isLoginAllowed('1.2.3.4', now)).toBe(true);
      recordLoginFailure('1.2.3.4', now);
    }
    // 6th attempt blocked
    expect(isLoginAllowed('1.2.3.4', now)).toBe(false);
    expect(retryAfterSeconds('1.2.3.4', now)).toBeGreaterThan(0);
  });

  it('keeps IPs independent', () => {
    const now = 1_000_000;
    for (let i = 0; i < 10; i++) recordLoginFailure('a', now);
    expect(isLoginAllowed('a', now)).toBe(false);
    expect(isLoginAllowed('b', now)).toBe(true);
  });

  it('resets after the lockout window', () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) recordLoginFailure('1.2.3.4', now);
    expect(isLoginAllowed('1.2.3.4', now)).toBe(false);
    // after 16 minutes the window has passed
    expect(isLoginAllowed('1.2.3.4', now + 16 * 60 * 1000)).toBe(true);
  });

  it('clears the record on successful login', () => {
    const now = 1_000_000;
    recordLoginFailure('1.2.3.4', now);
    recordLoginFailure('1.2.3.4', now);
    recordLoginSuccess('1.2.3.4');
    expect(isLoginAllowed('1.2.3.4', now)).toBe(true);
  });
});
