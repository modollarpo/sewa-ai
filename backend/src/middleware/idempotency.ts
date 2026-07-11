import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours
const IDEMPOTENCY_HEADER = 'x-idempotency-key';

/**
 * Idempotency middleware for edge sync and payment webhooks.
 * Prevents duplicate processing when edge nodes retry due to network issues.
 *
 * Usage:
 *   router.post('/edge-sync/sync', authenticate, idempotent, handler);
 *
 * How it works:
 *   1. Client sends X-Idempotency-Key header (e.g. UUID v4).
 *   2. Middleware checks Redis for a cached response under that key.
 *   3. If found → return cached response immediately (no reprocessing).
 *   4. If not found → intercept res.json(), store the response, then release.
 *   5. Next 24h: any request with the same key gets the cached response.
 */
export async function idempotent(req: Request, res: Response, next: NextFunction): Promise<void> {
  const key = req.headers[IDEMPOTENCY_HEADER] as string | undefined;

  // If no idempotency key provided, skip middleware (allow passthrough)
  if (!key || key.trim() === '') {
    next();
    return;
  }

  const redisKey = `idempotency:${req.method}:${req.path}:${key}`;

  try {
    // Check if we already processed this request
    const cached = await redisClient.get(redisKey);
    if (cached) {
      logger.info(`[Idempotency] Cache HIT: ${redisKey}`);
      const parsed = JSON.parse(cached) as { status: number; body: unknown };
      res.status(parsed.status).json(parsed.body);
      return;
    }

    // Intercept res.json() to capture the response
    const originalJson = res.json.bind(res);
    let captured = false;

    res.json = ((body: unknown) => {
      if (!captured) {
        captured = true;
        // Store response in Redis (fire-and-forget)
        redisClient.setex(redisKey, IDEMPOTENCY_TTL_SECONDS, JSON.stringify({
          status: res.statusCode,
          body,
        })).catch(err => logger.warn(`[Idempotency] Redis SET failed: ${err.message}`));
      }
      return originalJson(body);
    }) as typeof res.json;

    next();
  } catch (err) {
    // Redis failure → passthrough (don't block the request)
    logger.warn(`[Idempotency] Redis error, passing through: ${(err as Error).message}`);
    next();
  }
}
