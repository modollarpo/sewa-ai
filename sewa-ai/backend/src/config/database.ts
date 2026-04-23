// SEWA AI — backend/src/config/database.ts
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error', (e) => logger.error('Prisma error:', e));
prisma.$on('warn',  (e) => logger.warn('Prisma warn:', e));

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
