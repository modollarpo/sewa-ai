// SEWA AI — backend/src/routes/ai.ts
import { Router } from 'express';
import axios from 'axios';
import { authenticate, authorize } from '../middleware/auth';
import { triggerAITriage, generateVLMReport, generateICDCodes } from '../services/aiService';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { config } from '../config/env';
import { logger } from '../utils/logger';
const r = Router();

// Health Checks — Actively proxy to each AI microservice (C2 fix)
const AI_SERVICE_URLS: Record<string, string> = {
  triage:        config.AI_SERVICE_URL,
  vlm:           config.VLM_SERVICE_URL,
  uncertainty:   config.UNCERTAINTY_SERVICE_URL,
  metacognition: config.METACOGNITION_SERVICE_URL,
};

const aiHealthHandler = (engine: string) => async (req: any, res: any) => {
  const serviceUrl = AI_SERVICE_URLS[engine];
  try {
    const upstream = await axios.get(`${serviceUrl}/health`, { timeout: 3000 });
    res.json({
      status: upstream.data?.status ?? 'operational',
      engine,
      mode: upstream.data?.mode ?? 'cpu',
      upstreamLatencyMs: upstream.data?.latencyMs,
      timestamp: new Date(),
    });
  } catch (e: any) {
    logger.warn(`[AI Health] ${engine} health check failed: ${e.message}`);
    res.status(503).json({ status: 'down', engine, error: e.message, timestamp: new Date() });
  }
};

r.get('/triage/health',       aiHealthHandler('triage'));
r.get('/vlm/health',          aiHealthHandler('vlm'));
r.get('/uncertainty/health',  aiHealthHandler('uncertainty'));
r.get('/metacognition/health',aiHealthHandler('metacognition'));

r.use(authenticate);

r.post('/triage/:scanId', authorize('admin','superadmin','radiologist'), async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    await triggerAITriage(req.params.scanId, tenantId);
    res.json({ message: 'AI Triage triggered' });
  } catch (err) { next(err); }
});

r.post('/vlm/:scanId', authorize('admin','superadmin','radiologist'), async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const result = await generateVLMReport(req.params.scanId, tenantId);
    res.json({ message: 'VLM Report generated', data: result });
  } catch (err) { next(err); }
});

r.post('/icd10/:scanId', authorize('admin','superadmin','radiologist'), async (req, res, next) => {
  try {
    const codes = await generateICDCodes(req.params.scanId);
    res.json({ message: 'ICD-10 Codes generated', codes });
  } catch (err) { next(err); }
});

r.get('/result/:scanId', async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const result = await prisma.aIResult.findFirst({ 
      where: { 
        scanId: req.params.scanId,
        tenantId // Enforce tenant isolation
      } 
    });
    if (!result) throw new AppError('AI result not found or access denied', 404);
    res.json(result);
  } catch (err) { next(err); }
});

r.get('/models', async (req, res, next) => {
  try {
    const models = await prisma.aIModel.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(models);
  } catch (err) { next(err); }
});

r.get('/ab-test/metrics', authorize('admin','superadmin'), async (req, res, next) => {
  try {
    // A/B test metrics: compare model groups (Feature 7)
    const results = await prisma.aIResult.groupBy({
      by: ['abTestGroup', 'modelVersion'],
      _count: { id: true },
      _avg: { confidence: true, inferenceMs: true },
    });
    res.json(results);
  } catch (err) { next(err); }
});

r.post('/validate/:scanId', authorize('radiologist','doctor','admin','superadmin'), async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const { scanId } = req.params;
    const { status, correctedFinding, comments } = req.body; // status: 'CONFIRMED' | 'REJECTED'

    const result = await prisma.aiResult.findUnique({ where: { scanId } });
    if (!result) throw new AppError('AI result not found', 404);

    const updated = await prisma.aiResult.update({
      where: { scanId },
      data: {
        validationStatus: status,
        humanCorrectedFinding: correctedFinding || null,
        validationComments: comments || null,
        validatedBy: userId,
        validatedAt: new Date(),
      }
    });

    // If confirmed, maybe auto-generate the report
    if (status === 'CONFIRMED') {
      await prisma.scan.update({ where: { id: scanId }, data: { status: 'validated' } });
    }

    res.json(updated);
  } catch (err) { next(err); }
});

r.post('/ab-test/start', authorize('superadmin'), async (req, res, next) => {
  try {
    const { modelAId, modelBId, trafficSplit = 50 } = req.body;
    // Set status of both models to ab_test
    await prisma.aIModel.updateMany({
      where: { id: { in: [modelAId, modelBId] } },
      data: { status: 'ab_test', trafficPct: trafficSplit }
    });
    res.json({ message: 'A/B Test started', modelAId, modelBId, split: `${trafficSplit}/${100-trafficSplit}` });
  } catch (err) { next(err); }
});

r.patch('/models/:id/promote', authorize('superadmin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    // Set this model to production, deprecate others of the same type if needed
    const model = await prisma.aIModel.findUnique({ where: { id } });
    if (!model) throw new AppError('Model not found', 404);

    await prisma.$transaction([
      prisma.aIModel.updateMany({ where: { type: model.type, status: 'production' }, data: { status: 'deprecated' } }),
      prisma.aIModel.update({ where: { id }, data: { status: 'production', trafficPct: 100 } })
    ]);

    res.json({ message: `Model ${model.version} promoted to production.` });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/ai/progression/:patientId
 * Longitudinal disease progression (AI-tracked volumes over time)
 */
r.get('/progression/:patientId', async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { tenantId } = req.user!;

    // Verify patient belongs to this tenant
    const patient = await prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new AppError('Patient not found', 404);

    const scans = await prisma.scan.findMany({
      where: { patientId, tenantId },
      include: { aiResult: true },
      orderBy: { createdAt: 'desc' }
    });

    const timeline = scans.map((s: any) => ({
      date: s.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      finding: s.aiResult?.primaryFinding || 'Normal',
      vol: (s.aiResult?.rawJson as any)?.triage?.size
           ?? (s.aiResult ? 'Measured' : 'N/A'),
      status: s.aiResult?.urgency === 'CRITICAL' ? 'critical' : 'normal'
    }));

    res.json({ timeline });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/ai/explain/:scanId
 * Generates a contextual layperson explanation for a patient
 * AP3 fix: uses real AI result fields instead of hardcoded mock string
 */
r.get('/explain/:scanId', async (req, res, next) => {
  try {
    const { scanId } = req.params;
    const { tenantId } = req.user!;

    // Enforce tenant isolation — patients/staff can only explain scans in their facility
    const result = await prisma.aIResult.findFirst({
      where: { scanId, scan: { tenantId } },
      include: { scan: { select: { modality: true, bodyPart: true, tenantId: true } } }
    });
    if (!result) throw new AppError('AI result not found or access denied', 404);

    const urgency  = (result as any).urgency  ?? 'NORMAL';
    const finding  = result.primaryFinding ?? 'No significant findings';
    const conf     = result.confidence ? Math.round((result as any).confidence * 100) : null;
    const vlm      = (result as any).vlmFindings ?? '';
    const modality = (result as any).scan?.modality ?? 'scan';
    const bodyPart = (result as any).scan?.bodyPart ?? 'area';

    let urgencyText = 'Our clinical team has been informed and will review your results soon.';
    if (urgency === 'CRITICAL') {
      urgencyText = 'Our clinical team has been urgently alerted and is reviewing your case right now. Please remain available for immediate contact.';
    } else if (urgency === 'URGENT') {
      urgencyText = 'Your results have been flagged for priority review. A clinician will contact you shortly.';
    }

    const confidenceText = conf ? ` The AI system assessed this finding with ${conf}% confidence.` : '';
    const vlmText = vlm ? ` Additional detail: ${vlm}` : '';

    const explanation = `Your ${modality} scan of the ${bodyPart.toLowerCase()} has been analysed by the SEWA AI system. `
      + `The main finding identified is: ${finding}.`
      + confidenceText
      + ` ${urgencyText}`
      + vlmText;

    res.json({ explanation, finding, urgency, confidence: conf });
  } catch (err) { next(err); }
});

export default r;
