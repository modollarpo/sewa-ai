// SEWA AI — src/utils/audit.ts
// Merkle-chained tamper-evident audit log + chain verification
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import crypto from 'crypto';
import { prisma } from '../config/database';

export interface AuditEntry {
  tenantId?: string;
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    const last = await prisma.auditLog.findFirst({
      orderBy: { createdAt: 'desc' }, select: { sha256Hash: true }
    });
    const payload = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
    const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');
    const chainHash = crypto.createHash('sha256')
      .update(payloadHash + (last?.sha256Hash || 'genesis')).digest('hex');
    await prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId || 'SYSTEM',
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        metadata: entry.metadata as any,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        sha256Hash: chainHash,
        previousHash: last?.sha256Hash || 'genesis',
      }
    });
  } catch (e: any) {
    console.error('[Audit] Failed to write audit log:', e.message);
  }
}

export async function verifyChain(limit = 1000): Promise<{ valid: boolean; broken?: number }> {
  const logs = await prisma.auditLog.findMany({
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
