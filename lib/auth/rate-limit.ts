import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

/**
 * Simple fixed-window rate limiter keyed by login identifier (email/phone).
 * Returns false once MAX_ATTEMPTS is exceeded within WINDOW_SECONDS.
 * Swap for a sliding-window / token-bucket implementation if stricter
 * behavior is needed later — call sites don't need to change.
 */
export async function checkLoginRateLimit(identifier: string): Promise<boolean> {
  const key = `ratelimit:login:${identifier}`;
  const attempts = await redis.incr(key);
  if (attempts === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }
  return attempts <= MAX_ATTEMPTS;
}
