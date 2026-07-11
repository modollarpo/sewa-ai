// SEWA XAI — backend/src/routes/compliance.ts
// Regulatory compliance & consent metrics

import { Router } from 'express';
import { prisma } from '../utils/prismaClient';
import { authenticate, authorize } from '../middleware/auth';
import { generateComplianceReport } from '../services/compliance-evidence';
import { logger } from '../utils/logger';

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

/**
 * GET /api/v1/compliance/report
 * Generate compliance evidence report for a framework (NHS DSPT, HIPAA, GDPR)
 */
r.get('/report', async (req, res, next) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const framework = (req.query.framework as string) || 'NHS DSPT';
    const report = await generateComplianceReport(tenantId, framework);
    res.json(report);
  } catch (err) { next(err); }
});

// --------------- EU AI ACT ENDPOINTS ---------------
const EU_AI_ACT_MODELS = [
  { id: 'triage-ct-head', name: 'CT Head Triage', riskCategory: 'HIGH', status: 'REGISTERED' },
  { id: 'triage-ct-chest', name: 'CT Chest Triage', riskCategory: 'HIGH', status: 'REGISTERED' },
  { id: 'triage-xray-chest', name: 'Chest X-Ray Triage', riskCategory: 'MEDIUM', status: 'REGISTERED' },
  { id: 'mammography', name: 'Mammography Screening', riskCategory: 'HIGH', status: 'REGISTERED' },
  { id: 'retinal-dr', name: 'Diabetic Retinopathy Screening', riskCategory: 'MEDIUM', status: 'REGISTERED' }
];

// Get all EU AI Act registered models
r.get('/eu-ai-act/models', async (req, res, next) => {
  try {
    res.json(EU_AI_ACT_MODELS);
  } catch (err) {
    logger.error('[EU_AI_ACT] Failed to get models:', err);
    next(err);
  }
});

// Get EU AI Act registration summary
r.get('/eu-ai-act/summary', async (req, res, next) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const total = EU_AI_ACT_MODELS.length;
    const highRisk = EU_AI_ACT_MODELS.filter(m => m.riskCategory === 'HIGH').length;
    const mediumRisk = EU_AI_ACT_MODELS.filter(m => m.riskCategory === 'MEDIUM').length;

    res.json({
      total,
      highRisk,
      mediumRisk,
      lastUpdated: new Date().toISOString(),
      tenantId
    });
  } catch (err) {
    logger.error('[EU_AI_ACT] Failed to get summary:', err);
    next(err);
  }
});

// Add EU AI Act model documentation note (demo)
r.post('/eu-ai-act/documentation', async (req, res, next) => {
  try {
    const { modelId, notes } = req.body;
    if (!modelId || !notes) {
      return res.status(400).json({ error: 'modelId and notes are required' });
    }

    res.json({ success: true, modelId, notes, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('[EU_AI_ACT] Failed to add documentation:', err);
    next(err);
  }
});

/**
 * POST /api/v1/compliance/evidence
 * Upload compliance evidence document (audit artifact, certificate, policy doc)
 */
r.post('/evidence', async (req, res, next) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const { framework, controlArea, filename, mimeType } = req.body;

    if (!framework || !filename) {
      return res.status(400).json({ error: 'framework and filename are required' });
    }

    // Record the evidence upload in audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        action: 'COMPLIANCE_EVIDENCE_UPLOADED',
        entity: 'ComplianceRecord',
        entityId: framework,
        metadata: { controlArea, filename, mimeType },
      }
    });

    res.json({
      success: true,
      message: `Evidence '${filename}' uploaded for ${framework}${controlArea ? ` / ${controlArea}` : ''}.`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('[COMPLIANCE] Evidence upload failed:', err);
    next(err);
  }
});

export default r;
