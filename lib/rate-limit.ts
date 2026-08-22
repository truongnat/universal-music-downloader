// Simple in-memory sliding-window rate limiter.
// Suitable for single-instance deployments; resets on server restart.

interface RateLimitConfig {
  /** Max requests allowed within the window */
  limit: number;
  /** Window length in milliseconds */
  windowMs: number;
}

const buckets = new Map<string, number[]>();

// Periodically purge stale entries so the map doesn't grow unbounded.
const CLEANUP_INTERVAL_MS = 60_000;
const MAX_ENTRY_AGE_MS = 600_000; // 10 minutes
let lastCleanup = Date.now();

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, timestamps] of buckets) {
    const fresh = timestamps.filter((t) => now - t < MAX_ENTRY_AGE_MS);
    if (fresh.length === 0) {
      buckets.delete(key);
    } else {
      buckets.set(key, fresh);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the client may retry (only set when blocked) */
  retryAfter?: number;
  remaining: number;
}

/**
 * Standard 429 response for blocked requests.
 * Keeps every API route's rejection shape identical.
 */
export function rateLimitedResponse(rl: RateLimitResult): Response {
  return Response.json(
    { error: `Too many requests. Please retry in ${rl.retryAfter}s.` },
    { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
  );
}

/**
 * Check and record a request against the rate limit.
 * Returns whether the request is allowed; when blocked, includes retryAfter seconds.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  const timestamps = (buckets.get(identifier) ?? []).filter(
    (t) => now - t < config.windowMs
  );

  if (timestamps.length >= config.limit) {
    const oldest = timestamps[0];
    const retryAfterMs = config.windowMs - (now - oldest);
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      remaining: 0,
    };
  }

  timestamps.push(now);
  buckets.set(identifier, timestamps);

  return {
    allowed: true,
    remaining: config.limit - timestamps.length,
  };
}

/**
 * Extract a client identifier from a request.
 * Prefers proxy headers (x-forwarded-for), falls back to a generic bucket
 * since local dev requests have no IP distinction.
 */
export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "anonymous";
}
