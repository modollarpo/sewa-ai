import Redis from 'ioredis';
import { config } from './env';
import { logger } from '../utils/logger';

export const redisClient = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
redisClient.on('error', (err) => logger.error('Redis error:', err));
redisClient.on('connect', () => logger.info('Redis connected'));
