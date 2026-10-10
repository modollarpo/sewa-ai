// SEWA XAI — src/utils/audit.ts
// Merkle-chained tamper-evident audit log + chain verification
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import crypto from 'crypto';
import { prisma } from '../utils/prismaClient';
import { io } from '../index';
import { logger } from './logger';
import { sealAuditBlock } from '../services/merkleBlockService';

// G2: Validate AUDIT_PRIVATE_KEY at module load time.
// In production this key must come from Azure Key Vault via the sewa-secrets AKS secret.
// If missing or mock, log a CRITICAL warning. In strict mode (production) throw to fail the pod.
const _RAW_KEY = process.env.AUDIT_PRIVATE_KEY ?? '';
const _KEY_IS_MOCK = !_RAW_KEY || _RAW_KEY.includes('MOCK') || _RAW_KEY.length < 64;
const _IS_AZURE_DEPLOY = process.env.DEPLOY_TARGET === 'azure';
// Public key for signature verification, derived from the signing key so we do
// not need a second secret. null when no real key is configured.
let _PUBLIC_KEY: crypto.KeyObject | null = null;
if (!_KEY_IS_MOCK) {
  try { _PUBLIC_KEY = crypto.createPublicKey(_RAW_KEY); }
  catch { _PUBLIC_KEY = null; console.warn('[AUDIT] Could not derive public key from AUDIT_PRIVATE_KEY; signatures cannot be verified.'); }
}
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

// Recursively sort object keys so the JSON that gets hashed is independent of
// insertion order. Postgres stores `Json` as jsonb, which does NOT preserve key
// order, so without this the payload hash written and the one re-derived by
// verifyChain() could differ for the same logical entry.
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = canonicalize((value as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return value;
}

interface CanonicalFields {
  tenantId?: string;
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

// The single canonical serialization used by BOTH the writer and the verifier.
// Changing this changes every hash, so treat it as a frozen format.
function canonicalPayload(f: CanonicalFields, timestampISO: string): string {
  return JSON.stringify({
    tenantId: f.tenantId ?? undefined,
    userId: f.userId ?? undefined,
    action: f.action,
    entity: f.entity ?? undefined,
    entityId: f.entityId ?? undefined,
    metadata: f.metadata ? canonicalize(f.metadata) : undefined,
    ipAddress: f.ipAddress ?? undefined,
    userAgent: f.userAgent ?? undefined,
    timestamp: timestampISO,
  });
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    const last = await prisma.auditLog.findFirst({
      orderBy: { createdAt: 'desc' }, select: { sha256Hash: true }
    });
    // Fix the timestamp up front and persist it as createdAt, so verifyChain()
    // (which reads createdAt) reconstructs the exact same payload. userId is
    // normalised to the value actually stored so the hash matches on read-back.
    const timestamp = new Date();
    const payload = canonicalPayload({ ...entry, userId: entry.userId || 'SYSTEM' }, timestamp.toISOString());
    const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');
    const chainHash = crypto.createHash('sha256')
      .update(payloadHash + (last?.sha256Hash || 'genesis')).digest('hex');

    // ── Digital Signature (Feature 20: Tamper-proof Legality) ──
    // In production, AUDIT_PRIVATE_KEY is loaded from Azure Key Vault via AKS secret.
    const signature = _KEY_IS_MOCK
      ? 'unsigned:' + chainHash   // clearly marked as unsigned for non-prod
      : crypto.createSign('RSA-SHA256').update(chainHash).sign(_RAW_KEY, 'hex');

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
        payloadHash,
        signature,
        previousHash: last?.sha256Hash || 'genesis',
        createdAt: timestamp,
      }
    });

    // Stream audit log to relevant rooms (Feature 19)
    if (entry.tenantId) {
      io.to(`tenant:${entry.tenantId}`).emit('audit:new', log);
    }
    io.to('role:superadmin').emit('audit:new', log);

    // Auto-seal merkle block when threshold is reached
    const unsealedCount = await prisma.auditLog.count({ where: { blockIndex: null } });
    if (unsealedCount >= 50) {
      sealAuditBlock().catch(e => logger.warn(`[Audit] Auto-seal failed: ${e.message}`));
    }
  } catch (e: any) {
    logger.error(`[Audit] Failed to write audit log: ${e.message}`);
  }
}

export interface ChainVerification {
  valid: boolean;
  brokenId?: string;
  reason?: string;
  blocksChecked: number;
  signaturesPresent: number;
  signaturesVerified: number;
}

export async function verifyChain(limit = 1000): Promise<ChainVerification> {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'asc' }, take: limit,
  });

  let signaturesPresent = 0;
  let signaturesVerified = 0;

  const fail = (entry: { id: string }, reason: string): ChainVerification => ({
    valid: false, brokenId: entry.id, reason,
    blocksChecked: logs.length, signaturesPresent, signaturesVerified,
  });

  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i];

    // 1. Chain link — each block's previousHash must equal the prior block's hash.
    const expectedPrev = i === 0 ? 'genesis' : (logs[i - 1].sha256Hash || 'genesis');
    if ((entry.previousHash || 'genesis') !== expectedPrev) {
      return fail(entry, 'chain link broken: previousHash does not match prior sha256Hash');
    }

    // 2. Payload integrity — rebuild the canonical payload exactly as written.
    const payload = canonicalPayload({
      tenantId: entry.tenantId ?? undefined,
      userId: entry.userId ?? undefined,
      action: entry.action,
      entity: entry.entity ?? undefined,
      entityId: entry.entityId ?? undefined,
      metadata: entry.metadata ?? undefined,
      ipAddress: entry.ipAddress ?? undefined,
      userAgent: entry.userAgent ?? undefined,
    }, entry.createdAt.toISOString());
    const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');

    // payloadHash column: only present on rows written after the signing fix.
    if (entry.payloadHash && entry.payloadHash !== payloadHash) {
      return fail(entry, 'payload tampered: stored payloadHash != recomputed payloadHash');
    }

    const expectedChainHash = crypto.createHash('sha256')
      .update(payloadHash + (entry.previousHash || 'genesis')).digest('hex');
    if (entry.sha256Hash !== expectedChainHash) {
      return fail(entry, 'chain hash mismatch: sha256Hash != sha256(payloadHash + previousHash)');
    }

    // 3. Signature — verify RSA over the chain hash when a signature is present.
    if (entry.signature) {
      signaturesPresent++;
      if (entry.signature.startsWith('unsigned:')) {
        // Non-prod marker; must still match the chain hash it was written for.
        if (entry.signature !== 'unsigned:' + (entry.sha256Hash || '')) {
          return fail(entry, 'unsigned marker does not match chain hash');
        }
      } else if (_PUBLIC_KEY) {
        const ok = crypto.createVerify('RSA-SHA256').update(entry.sha256Hash || '').verify(_PUBLIC_KEY, entry.signature, 'hex');
        if (!ok) return fail(entry, 'RSA signature invalid');
        signaturesVerified++;
      } else {
        return fail(entry, 'signature present but no AUDIT_PRIVATE_KEY/AUDIT_PUBLIC_KEY available to verify');
      }
    }
  }

  return { valid: true, blocksChecked: logs.length, signaturesPresent, signaturesVerified };
}
