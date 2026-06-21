// SEWA AI — backend/src/routes/compliance.ts
// Regulatory compliance & consent metrics

import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';

const r = Router();

// Only Admins or Compliance officers (or superadmins) should see this
r.use(authenticate, authorize('admin', 'superadmin'));

/**
 * GET /api/v1/compliance/frameworks
 */
r.get('/frameworks', async (req, res, next) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const records = await prisma.complianceRecord.findMany({
      where: { tenantId }
    });
    res.json(records);
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/compliance/consent-metrics
 */
r.get('/consent-metrics', async (req, res, next) => {
  try {
    const tenantId = (req as any).user.tenantId;
    
    // In a real app, these would count Patient records with specific consent flags
    const [total, aiConsent, researchConsent, optOuts] = await Promise.all([
      prisma.patient.count({ where: { tenantId } }),
      prisma.patient.count({ where: { tenantId, consentAI: true } }),
      prisma.patient.count({ where: { tenantId, consentResearch: true } }),
      prisma.patient.count({ where: { tenantId, consentAI: false } }),
    ]);

    res.json({
      total,
      aiConsent,
      researchConsent,
      optOuts,
      timestamp: new Date().toISOString()
    });
  } catch (err) { next(err); }
});

export default r;
