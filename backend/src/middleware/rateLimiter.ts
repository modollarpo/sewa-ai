// SEWA AI — backend/src/middleware/rateLimiter.ts
//
// Redis-backed rate limiter — critical for multi-pod AKS deployments.
//
// WHY: express-rate-limit's default in-memory store resets on each pod restart
// and does NOT synchronise across pods. On a 3-replica AKS deployment each pod
// tracks its own counter, giving every IP effectively 3× the intended quota.
//
// SOLUTION: Use Redis INCR + EXPIRE for a single shared counter across all pods.
// Falls back to a permissive pass-through if Redis is unavailable (so a Redis
// outage never takes down the API — it just temporarily relaxes rate limits).

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

// ── Redis-backed window counter ────────────────────────────────────────────
async function redisIncr(key: string, windowSecs: number): Promise<number> {
  const count = await redisClient.incr(key);
  if (count === 1) {
    // First request in window — set expiry
    await redisClient.expire(key, windowSecs);
  }
  return count;
}

function makeRedisLimiter(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message: string;
  skip?: (req: Request) => boolean;
}) {
  const windowSecs = Math.ceil(options.windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction) => {
    if (options.skip?.(req)) return next();

    const ip = (req.ip || req.socket?.remoteAddress || 'unknown').replace(/[^a-zA-Z0-9:.]/g, '_');
    const redisKey = `rl:${options.keyPrefix}:${ip}`;

    try {
      const count = await redisIncr(redisKey, windowSecs);
      res.setHeader('X-RateLimit-Limit', options.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - count));

      if (count > options.max) {
        res.setHeader('Retry-After', windowSecs);
        return next(new AppError(options.message, 429));
      }
      return next();
    } catch (err: any) {
      // Redis unavailable — degrade gracefully (log warn, allow request)
      logger.warn(`[RateLimit] Redis unavailable, skipping rate check: ${err.message}`);
      return next();
    }
  };
}

// ── General API rate limiter: 500 req / 15 min per IP ─────────────────────
export const rateLimiter = makeRedisLimiter({
  windowMs: 15 * 60 * 1000,
  max: 500,
  keyPrefix: 'api',
  message: 'Too many requests, please try again later.',
  skip: (req) => req.path === '/health',
});

// ── Auth rate limiter: 20 req / 15 min per IP ─────────────────────────────
// Prevents brute-force login and password-reset abuse
export const authLimiter = makeRedisLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: 'auth',
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
});

// ── Scan upload rate limiter: 50 uploads / hour per IP ────────────────────
// Secondary defence against scan quota bypass via rapid uploads
export const uploadLimiter = makeRedisLimiter({
  windowMs: 60 * 60 * 1000,
  max: 50,
  keyPrefix: 'upload',
  message: 'Too many scan uploads. Please wait before uploading more.',
});
