import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { triggerAITriage, generateVLMReport, generateICDCodes } from '../services/aiService';
import { AppError } from '../utils/AppError';

const AI_SERVICE_URLS: Record<string, string> = {
  triage:        config.AI_SERVICE_URL,
  vlm:           config.VLM_SERVICE_URL,
  uncertainty:   config.UNCERTAINTY_SERVICE_URL,
  metacognition: config.METACOGNITION_SERVICE_URL,
};

export const getAIHealth = (engine: string) => async (req: Request, res: Response) => {
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

export const triggerTriage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.user!;
    await triggerAITriage(req.params.scanId, tenantId);
    res.json({ message: 'AI Triage triggered' });
  } catch (err) { next(err); }
};

/**
 * Generates a VLM report and streams the result to the client.
 * This provides immediate visual feedback for clinicians during long-running inference.
 */
export const streamVLMReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scanId } = req.params;
    const { tenantId } = req.user!;
    const isStreaming = req.headers.accept === 'text/event-stream';

    if (isStreaming) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
    }

    const sendEvent = (data: any) => {
      if (isStreaming) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    sendEvent({ status: 'initializing', message: 'Connecting to VLM node...' });

    const result = await generateVLMReport(scanId, tenantId);
    
    if (isStreaming) {
      const sentences = result.impression.match(/[^.!?]+[.!?]+/g) || [result.impression];
      for (const sentence of sentences) {
        await new Promise(resolve => setTimeout(resolve, 200)); 
        sendEvent({ status: 'processing', chunk: sentence });
      }
      sendEvent({ status: 'completed', fullText: result.fullText, updatedResult: result.updatedResult });
      res.end();
    } else {
      res.json({ message: 'VLM Report generated', data: result });
    }
  } catch (err: any) {
    logger.error(`[VLM Reporting] Failed for scan ${req.params.scanId}: ${err.message}`);
    if (req.headers.accept === 'text/event-stream') {
      res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
      res.end();
    } else {
      next(err);
    }
  }
};

export const getICD10 = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.user!;
    const scan = await prisma.scan.findFirst({ where: { id: req.params.scanId, tenantId } });
    if (!scan) throw new AppError('Scan not found', 404);

    const codes = await generateICDCodes(req.params.scanId);
    res.json({ message: 'ICD-10 Codes generated', codes });
  } catch (err) { next(err); }
};

export const getAIResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.user!;
    const result = await prisma.aiResult.findFirst({ 
      where: { 
        scanId: req.params.scanId,
        tenantId 
      } 
    });
    if (!result) throw new AppError('AI result not found or access denied', 404);
    res.json(result);
  } catch (err) { next(err); }
};

export const getAIModels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const models = await prisma.aIModel.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(models);
  } catch (err) { next(err); }
};

export const getABTestMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await prisma.aiResult.groupBy({
      by: ['abTestGroup', 'modelVersion'],
      _count: { id: true },
      _avg: { confidence: true, inferenceMs: true },
    });
    res.json(results);
  } catch (err) { next(err); }
};

export const validateResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const { scanId } = req.params;
    const { status, correctedFinding, comments } = req.body;

    const result = await prisma.aiResult.findFirst({ 
      where: { scanId, tenantId } 
    });
    if (!result) throw new AppError('AI result not found or access denied', 404);

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

    if (status === 'CONFIRMED') {
      await prisma.scan.update({ where: { id: scanId }, data: { status: 'validated' } });
    }

    res.json(updated);
  } catch (err) { next(err); }
};

export const startABTest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { modelAId, modelBId, trafficSplit = 50 } = req.body;
    await prisma.aIModel.updateMany({
      where: { id: { in: [modelAId, modelBId] } },
      data: { status: 'ab_test', trafficPct: trafficSplit }
    });
    res.json({ message: 'A/B Test started', modelAId, modelBId, split: `${trafficSplit}/${100-trafficSplit}` });
  } catch (err) { next(err); }
};

export const promoteModel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const model = await prisma.aIModel.findUnique({ where: { id } });
    if (!model) throw new AppError('Model not found', 404);

    await prisma.$transaction([
      prisma.aIModel.updateMany({ where: { type: model.type, status: 'production' }, data: { status: 'deprecated' } }),
      prisma.aIModel.update({ where: { id }, data: { status: 'production', trafficPct: 100 } })
    ]);

    res.json({ message: `Model ${model.version} promoted to production.` });
  } catch (err) { next(err); }
};

export const getProgression = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const { tenantId } = req.user!;

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
};

export const getExplanation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scanId } = req.params;
    const { tenantId } = req.user!;

    const result = await prisma.aiResult.findFirst({
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
};
