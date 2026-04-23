"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = auditLog;
exports.verifyChain = verifyChain;
// SEWA AI — src/utils/audit.ts
// Merkle-chained tamper-evident audit log + chain verification
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("../config/database");
async function auditLog(entry) {
    try {
        const last = await database_1.prisma.auditLog.findFirst({
            orderBy: { createdAt: 'desc' }, select: { sha256Hash: true }
        });
        const payload = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
        const payloadHash = crypto_1.default.createHash('sha256').update(payload).digest('hex');
        const chainHash = crypto_1.default.createHash('sha256')
            .update(payloadHash + (last?.sha256Hash || 'genesis')).digest('hex');
        await database_1.prisma.auditLog.create({
            data: {
                tenantId: entry.tenantId,
                userId: entry.userId || 'SYSTEM',
                action: entry.action,
                entity: entry.entity,
                entityId: entry.entityId,
                metadata: entry.metadata,
                ipAddress: entry.ipAddress,
                userAgent: entry.userAgent,
                sha256Hash: chainHash,
                previousHash: last?.sha256Hash || 'genesis',
            }
        });
    }
    catch (e) {
        console.error('[Audit] Failed to write audit log:', e.message);
    }
}
async function verifyChain(limit = 1000) {
    const logs = await database_1.prisma.auditLog.findMany({
        orderBy: { createdAt: 'asc' }, take: limit,
        select: { id: true, sha256Hash: true, previousHash: true }
    });
    for (let i = 1; i < logs.length; i++) {
        if (logs[i].previousHash !== logs[i - 1].sha256Hash) {
            return { valid: false, broken: i };
        }
    }
    return { valid: true };
}
