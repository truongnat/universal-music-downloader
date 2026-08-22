import { checkRateLimit, getClientIdentifier } from './rate-limit';

// Deterministic time control
let now = 1_000_000;
const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);

afterEach(() => {
  now = 1_000_000;
});

describe('checkRateLimit', () => {
  it('allows requests under the limit', () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit('key-a', { limit: 5, windowMs: 60_000 });
      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    }
    expect(checkRateLimit('key-a', { limit: 5, windowMs: 60_000 }).remaining).toBe(0);
  });

  it('blocks requests over the limit and reports retryAfter', () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit('key-b', { limit: 3, windowMs: 60_000 });
    }
    const blocked = checkRateLimit('key-b', { limit: 3, windowMs: 60_000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(blocked.retryAfter!).toBeLessThanOrEqual(60);
  });

  it('isolates buckets per identifier', () => {
    checkRateLimit('key-c1', { limit: 1, windowMs: 60_000 });
    expect(
      checkRateLimit('key-c1', { limit: 1, windowMs: 60_000 }).allowed
    ).toBe(false);
    expect(
      checkRateLimit('key-c2', { limit: 1, windowMs: 60_000 }).allowed
    ).toBe(true);
  });

  it('allows again after the window slides past old entries', () => {
    checkRateLimit('key-d', { limit: 2, windowMs: 10_000 });
    checkRateLimit('key-d', { limit: 2, windowMs: 10_000 });
    expect(
      checkRateLimit('key-d', { limit: 2, windowMs: 10_000 }).allowed
    ).toBe(false);

    now += 10_001; // slide window past both entries
    expect(
      checkRateLimit('key-d', { limit: 2, windowMs: 10_000 }).allowed
    ).toBe(true);
  });

  it('retryAfter counts down as the window slides', () => {
    checkRateLimit('key-e', { limit: 1, windowMs: 30_000 });
    const blockedAtT0 = checkRateLimit('key-e', { limit: 1, windowMs: 30_000 });
    expect(blockedAtT0.retryAfter).toBe(30);

    now += 15_000;
    const blockedHalfway = checkRateLimit('key-e', { limit: 1, windowMs: 30_000 });
    expect(blockedHalfway.retryAfter).toBeLessThanOrEqual(15);
  });

  it('never reports retryAfter below 1 second', () => {
    checkRateLimit('key-f', { limit: 1, windowMs: 100 });
    // Advance to 99ms after the first request → 1ms left in window
    now += 99;
    const blocked = checkRateLimit('key-f', { limit: 1, windowMs: 100 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThanOrEqual(1);
  });
});

describe('getClientIdentifier', () => {
  it('prefers x-forwarded-for first IP', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '203.0.113.7, 70.41.3.18' },
    });
    expect(getClientIdentifier(req)).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-real-ip': '198.51.100.9' },
    });
    expect(getClientIdentifier(req)).toBe('198.51.100.9');
  });

  it('falls back to anonymous when no proxy headers exist', () => {
    const req = new Request('https://example.com');
    expect(getClientIdentifier(req)).toBe('anonymous');
  });
});
