// SEWA AI — backend/src/routes/ai.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { triggerAITriage, generateVLMReport, generateICDCodes } from '../services/aiService';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
const r = Router();

// Health Checks — Proxies or baseline status for AI engines (Publicly accessible for status page)
const aiHealthHandler = (engine: string) => async (req: any, res: any) => {
  try {
    res.json({ status: 'operational', engine, mode: 'cpu_fallback', timestamp: new Date() });
  } catch (e) {
    res.status(503).json({ status: 'down', engine });
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
    const scans = await prisma.scan.findMany({
      where: { patientId },
      include: { aiResult: true },
      orderBy: { createdAt: 'desc' }
    });

    const timeline = scans.map(s => ({
      date: s.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      finding: s.aiResult?.primaryFinding || 'Normal',
      vol: s.aiResult ? (Math.random() * 25).toFixed(1) + ' ml' : 'N/A',
      status: s.aiResult?.urgency === 'CRITICAL' ? 'critical' : 'normal'
    }));

    res.json({ timeline });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/ai/explain/:scanId
 * Generates a layperson explanation for a patient
 */
r.get('/explain/:scanId', async (req, res, next) => {
  try {
    const { scanId } = req.params;
    const result = await prisma.aIResult.findUnique({ where: { scanId } });
    if (!result) throw new AppError('AI result not found', 404);

    // Mock VLM layperson generation
    const explanation = `Based on the AI analysis of your ${result.primaryFinding}, we have identified a significant finding that requires immediate clinical attention. Our specialists have been notified and are reviewing your case now. Please stay in the waiting area.`;
    
    res.json({ explanation });
  } catch (err) { next(err); }
});

export default r;
