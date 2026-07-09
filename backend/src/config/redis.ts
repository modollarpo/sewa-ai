import Redis from 'ioredis';
import { config } from './env';
import { logger } from '../utils/logger';

export const redisClient = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  // Aggressively reconnect with exponential backoff (max 30s)
  retryStrategy: (times: number) => Math.min(times * 200, 30_000),
  // Connect eagerly (not lazily) so status is 'ready' by the time health checks run
  lazyConnect: false,
  connectTimeout: 10_000,
  keepAlive: 10_000,
});

redisClient.on('error',        (err) => logger.error('Redis error:', err.message));
redisClient.on('connect',      () =>    logger.info('Redis TCP connected'));
redisClient.on('ready',        () =>    logger.info('Redis client ready'));
redisClient.on('close',        () =>    logger.warn('Redis connection closed'));
redisClient.on('reconnecting', (ms: number) => logger.warn(`Redis reconnecting in ${ms}ms`));
