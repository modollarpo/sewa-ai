import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';
import { calibrationService } from '../services/calibrationService';
import { federatedV2Service } from '../services/federatedV2Service';
import { getSystemHealth, getPipelineMetrics, getSecurityEvents } from '../services/observabilityService';
import { authenticate, authorize } from '../middleware/auth';

const v2Router = Router();

// ── Auth gate (audit E-08) ────────────────────────────────────────────────
// v2 serves observability / self-audit / FL admin + rollback endpoints and was
// previously mounted unauthenticated. All routes now require a superadmin.
v2Router.use(authenticate, authorize('superadmin'));

// ── Self-Audit Endpoints ───────────────────────────────────────────

v2Router.get('/self-audit/scan/:scanId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user as { tenantId: string };
    const record = await prisma.metacognitionAuditLog.findFirst({
      where: { scanId: req.params.scanId, tenantId },
    });
    if (!record) return res.status(404).json({ error: 'Audit record not found' });

    // Re-run the live self-audit against the persisted pipeline I/O so the
    // endpoint exercises the otherwise dead runSelfAudit path (audit E-09).
    let liveSelfAudit = null;
    try {
      const aiResult = await prisma.aIResult.findUnique({
        where: { scanId: req.params.scanId },
        include: { scan: true },
      });
      if (aiResult?.rawJson) {
        const raw = aiResult.rawJson as any;
        const selfAuditService = (await import('../services/selfAuditService')).selfAuditService;
        liveSelfAudit = await selfAuditService.runSelfAudit({
          scanId: aiResult.scanId,
          tenantId,
          modality: aiResult.scan?.modality ?? 'CT',
          bodyPart: aiResult.scan?.bodyPart ?? null,
          patientAge: null,
          patientSex: null,
          triage: {
            primaryFinding: aiResult.primaryFinding,
            urgency: aiResult.urgency,
            confidence: aiResult.confidence,
            findings: (raw.triage?.allFindings ?? []).map((f: any) => ({ name: f.condition, confidence: f.probability })),
          },
          uncertainty: {
            epistemic: raw.uncertainty?.epistemicUncertainty ?? 0,
            aleatoric: raw.uncertainty?.aleatoricUncertainty ?? 0,
            composite: raw.uncertainty?.compositeScore ?? 0,
          },
          vlm: {
            impression: aiResult.vlmImpression ?? '',
            findings: raw.vlm?.findings ? [raw.vlm.findings] : [],
            confidence: aiResult.confidence,
          },
          metacognition: {
            layers: (raw.metacog?.flags ?? []).map((f: any) => ({
              id: f.code,
              passed: f.severity === 'ERROR' ? false : true,
              detail: `${f.severity}: ${f.message}`,
            })),
            hallucinationRisk: raw.metacog?.hallucination_risk ?? 0,
            safeToAlert: raw.metacog?.safe_to_alert ?? false,
          },
        });
      }
    } catch (e: any) {
      liveSelfAudit = { error: `Recompute failed: ${e.message}` };
    }

    res.json({ ...record, liveSelfAudit });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch audit record' });
  }
});

v2Router.get('/self-audit/calibration', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || 'system';
    const result = await calibrationService.generateModalitySummaries(tenantId);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch calibration data' });
  }
});

v2Router.get('/self-audit/calibration/drift', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || 'system';
    const modality = req.query.modality as string | undefined;
    const result = await calibrationService.detectCalibrationDrift(tenantId, modality);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to detect drift' });
  }
});

v2Router.get('/self-audit/contradictions', async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const results = await prisma.metacognitionAuditLog.findMany({
      where: { contradictionDetected: true, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ contradictions: results, count: results.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch contradictions' });
  }
});

v2Router.get('/self-audit/dashboard', async (_req: Request, res: Response) => {
  try {
    const [totalAudits, contradictions, decisions] = await Promise.all([
      prisma.metacognitionAuditLog.count(),
      prisma.metacognitionAuditLog.count({ where: { contradictionDetected: true } }),
      prisma.metacognitionAuditLog.groupBy({
        by: ['overallDecision'],
        _count: true,
      }),
    ]);
    res.json({
      totalAudits,
      contradictions,
      contradictionRate: totalAudits > 0 ? contradictions / totalAudits : 0,
      decisionBreakdown: decisions.map((d) => ({
        decision: d.overallDecision,
        count: d._count,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

// ── Federated Learning V2 Endpoints ────────────────────────────────

v2Router.get('/federated/v2/dashboard', async (_req: Request, res: Response) => {
  try {
    const [nodes, rounds, versions] = await Promise.all([
      prisma.federatedNode.count(),
      prisma.federatedRound.count(),
      prisma.federatedModelVersion.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);
    res.json({
      totalNodes: nodes,
      totalRounds: rounds,
      recentVersions: versions,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch FL dashboard' });
  }
});

v2Router.get('/federated/v2/rounds', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const rounds = await prisma.federatedRound.findMany({
      orderBy: { roundNumber: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const total = await prisma.federatedRound.count();
    res.json({ rounds, total, page, limit });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch rounds' });
  }
});

v2Router.get('/federated/v2/models', async (_req: Request, res: Response) => {
  try {
    const versions = await prisma.federatedModelVersion.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ versions });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch model versions' });
  }
});

v2Router.post('/federated/v2/models/:version/rollback', async (req: Request, res: Response) => {
  try {
    const { version } = req.params;
    const { reason } = req.body as { reason?: string };
    await federatedV2Service.rollbackModel(version, reason || 'Manual rollback');
    res.json({ message: `Rolled back to ${version}` });
  } catch (e) {
    res.status(500).json({ error: 'Failed to rollback model' });
  }
});

// ── Observability Endpoints ────────────────────────────────────────

v2Router.get('/observability/health', async (_req: Request, res: Response) => {
  try {
    const health = await getSystemHealth();
    res.json(health);
  } catch (e) {
    res.status(500).json({ status: 'unhealthy', error: 'Health check failed' });
  }
});

v2Router.get('/observability/pipeline', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || 'system';
    const hours = parseInt(req.query.hours as string) || 24;
    const metrics = await getPipelineMetrics(tenantId, hours);
    res.json(metrics);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch pipeline metrics' });
  }
});

v2Router.get('/observability/security', async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const events = await getSecurityEvents(hours);
    res.json({ events, count: events.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch security events' });
  }
});

export default v2Router;
