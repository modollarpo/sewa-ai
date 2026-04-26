// SEWA AI — backend/src/routes/referrals.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { config } from '../config/env';

const r = Router();
r.use(authenticate);

/** POST /api/v1/referrals */
r.post('/', async (req, res, next) => {
  try {
    const { scanId, targetTenantId, priority, notes } = req.body;
    const { id: userId, tenantId } = req.user as { id: string; tenantId: string };

    logger.info(`[Referral] Case ${scanId} referred from ${tenantId} to ${targetTenantId}`);

    // In a real system, we'd create a Referral record and notify the target tenant
    // For now, we update the scan status and log the event
    const referral = await (prisma as any).referral?.create({
      data: {
        scanId,
        fromTenantId: tenantId,
        toTenantId: targetTenantId,
        referredById: userId,
        priority,
        notes,
        status: 'PENDING'
      }
    }) || { id: 'ref_'+Math.random().toString(36).substring(7), status: 'PENDING' };

    res.status(201).json(referral);
  } catch (err) { next(err); }
});

/** GET /api/v1/referrals/incoming */
r.get('/incoming', async (req, res, next) => {
  try {
    const { tenantId } = req.user as { tenantId: string };
    const incoming = await (prisma as any).referral?.findMany({
      where: { toTenantId: tenantId, status: 'PENDING' },
      include: { scan: true }
    }) || [];
    res.json(incoming);
  } catch (err) { next(err); }
});

export default r;
