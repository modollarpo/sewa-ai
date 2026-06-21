// SEWA AI — backend/src/routes/referrals.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { AppError } from '../utils/AppError';

const r = Router();
r.use(authenticate);

/** POST /api/v1/referrals */
r.post('/', async (req, res, next) => {
  try {
    const { scanId, targetTenantId, priority, notes } = req.body;
    const { id: userId, tenantId } = req.user as { id: string; tenantId: string };

    // Security Gap: verify the scan actually belongs to the user's tenant
    const scan = await prisma.scan.findFirst({ where: { id: scanId, tenantId } });
    if (!scan) throw new AppError('Scan not found or access denied', 404);

    logger.info(`[Referral] Case ${scanId} referred from ${tenantId} to ${targetTenantId}`);

    // Feature 13: Clinical Referral (Second Opinion)
    const secondOpinion = await prisma.secondOpinion.create({
      data: {
        scanId,
        requesterId: userId,
        notes,
        status: 'pending'
      }
    });

    res.status(201).json(secondOpinion);
  } catch (err) { next(err); }
});

/** GET /api/v1/referrals/incoming */
r.get('/incoming', async (req, res, next) => {
  try {
    const { tenantId } = req.user as { tenantId: string };
    
    // Incoming referrals are cases where the scan belongs to another tenant 
    // but a specialist in this tenant is assigned or it's a global pool.
    // For this implementation, we return pending opinions that need assignment.
    const incoming = await prisma.secondOpinion.findMany({
      where: { status: 'pending' },
      include: { 
        scan: { 
          include: { 
            patient: { select: { mrn: true } },
            tenant: { select: { name: true } }
          } 
        },
        requester: { select: { firstName: true, lastName: true } }
      }
    });
    res.json(incoming);
  } catch (err) { next(err); }
});

export default r;
