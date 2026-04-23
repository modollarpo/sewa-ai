"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// SEWA AI — backend/src/config/database.ts
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ?? new client_1.PrismaClient({
    log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
    ],
});
exports.prisma.$on('error', (e) => logger_1.logger.error('Prisma error:', e));
exports.prisma.$on('warn', (e) => logger_1.logger.warn('Prisma warn:', e));
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
