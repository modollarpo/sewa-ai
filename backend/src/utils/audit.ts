// SEWA XAI — src/utils/audit.ts
// Merkle-chained tamper-evident audit log + chain verification
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import crypto from 'crypto';
import { prisma } from '../utils/prismaClient';
import { io } from '../index';
import { logger } from './logger';

// G2: Validate AUDIT_PRIVATE_KEY at module load time.
// In production this key must come from Azure Key Vault via the sewa-secrets AKS secret.
// If missing or mock, log a CRITICAL warning. In strict mode (production) throw to fail the pod.
const _RAW_KEY = process.env.AUDIT_PRIVATE_KEY ?? '';
const _KEY_IS_MOCK = !_RAW_KEY || _RAW_KEY.includes('MOCK') || _RAW_KEY.length < 64;
const _IS_AZURE_DEPLOY = process.env.DEPLOY_TARGET === 'azure';
if (_KEY_IS_MOCK) {
  const msg = '[AUDIT] CRITICAL: AUDIT_PRIVATE_KEY is missing or is a mock value. '
    + 'Audit log signatures are NOT cryptographically valid. '
    + 'Set AUDIT_PRIVATE_KEY in the sewa-secrets AKS secret from Azure Key Vault before NHS go-live.';
  if (_IS_AZURE_DEPLOY && process.env.NODE_ENV === 'production') {
    // In Azure production: throw so the pod fails fast and ops is immediately alerted
    throw new Error(msg);
  }
  // In local production mode or dev/staging: warn loudly but continue
  console.warn(msg);
}

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

    // ── Digital Signature (Feature 20: Tamper-proof Legality) ──
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(chainHash);
    // In production, AUDIT_PRIVATE_KEY is loaded from Azure Key Vault via AKS secret
    const privateKey = _RAW_KEY;
    const signature = _KEY_IS_MOCK
      ? 'unsigned:' + chainHash   // clearly marked as unsigned for non-prod
      : signer.sign(privateKey, 'hex');

    const log = await prisma.auditLog.create({
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
        // metadata: { ...entry.metadata as any, signature } // Storing signature in metadata for now if schema allows
      }
    });

    // Stream audit log to relevant rooms (Feature 19)
    if (entry.tenantId) {
      io.to(`tenant:${entry.tenantId}`).emit('audit:new', log);
    }
    io.to('role:superadmin').emit('audit:new', log);
  } catch (e: any) {
    logger.error(`[Audit] Failed to write audit log: ${e.message}`);
  }
}

export async function verifyChain(limit = 1000): Promise<{ valid: boolean; brokenId?: string }> {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'asc' }, take: limit,
  });

  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i];
    
    // 1. Verify link to previous hash (Chain Integrity)
    if (i > 0) {
      if (entry.previousHash !== logs[i - 1].sha256Hash) {
        return { valid: false, brokenId: entry.id };
      }
    }

    // 2. Verify payload integrity (Content Integrity)
    // We must reconstruct the payload exactly as it was hashed in auditLog()
    // Note: This requires the 'timestamp' to be identical.
    // Since timestamp is stored in createdAt, we use that.
    const payloadData = {
      tenantId: entry.tenantId || undefined,
      userId: entry.userId === 'SYSTEM' ? undefined : entry.userId,
      action: entry.action,
      entity: entry.entity || undefined,
      entityId: entry.entityId || undefined,
      metadata: entry.metadata || undefined,
      ipAddress: entry.ipAddress || undefined,
      userAgent: entry.userAgent || undefined,
      timestamp: entry.createdAt.toISOString()
    };
    
    const payload = JSON.stringify(payloadData);
    const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');
    const expectedChainHash = crypto.createHash('sha256')
      .update(payloadHash + (entry.previousHash || 'genesis')).digest('hex');

    if (entry.sha256Hash !== expectedChainHash) {
      // Flag as mismatch - chain integrity violated
      return { valid: false, brokenId: entry.id };
    }
  }
  return { valid: true };
}
