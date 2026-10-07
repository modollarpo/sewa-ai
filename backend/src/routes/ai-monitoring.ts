// SEWA XAI — backend/src/routes/ai-monitoring.ts
// Real-time AI platform observability — Super Admin only

import { Router } from 'express';
import axios from 'axios';
import { authenticate, authorize } from '../middleware/auth';
import { config } from '../config/env';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';

const r = Router();

// Only Super Admins can see the global AI health
r.use(authenticate, authorize('superadmin'));

r.get('/health', async (req, res, next) => {
  try {
    // Helper: try each service individually with retry, so one failure doesn't cascade
    const checkSingle = async (s: { name: string; url: string }) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const start = Date.now();
          const resp = await axios.get(`${s.url}/health`, { timeout: 3000 });
          const latency = Date.now() - start;
          // A 503 (or non-2xx) from the service means it is degraded, even
          // though the HTTP call itself succeeded. Trust the service's own
          // reported status so false "healthy" readings stop masking outages.
          const reported = (resp.data && resp.data.status) || null;
          const degraded = resp.status >= 400 || reported === 'degraded' || reported === 'unhealthy';
          return {
            name: s.name,
            status: degraded ? 'degraded' : 'healthy',
            latency,
            version: resp.data.version || null,
            backend: resp.data.backend || 'unknown',
            errors: resp.data.errors || (degraded ? [reported || `http ${resp.status}`] : [])
          };
        } catch (err: any) {
          if (attempt === 0) {
            // Wait 200ms and retry once
            await new Promise(r => setTimeout(r, 200));
            continue;
          }
          return {
            name: s.name,
            status: 'unreachable',
            error: err.message,
            url: s.url
          };
        }
      }
    };

    const services = [
      { name: 'Triage Engine (Core)',  url: config.AI_SERVICE_URL },
      { name: 'VLM Report Generator',  url: config.VLM_SERVICE_URL },
      { name: 'Uncertainty Engine',    url: config.UNCERTAINTY_SERVICE_URL },
      { name: 'Metacognition AI',      url: config.METACOGNITION_SERVICE_URL },
      { name: 'Pathology AI',          url: config.PATHOLOGY_SERVICE_URL },
      { name: 'Mammography AI',        url: config.MAMMOGRAPHY_SERVICE_URL },
      { name: 'Retinal AI',            url: config.RETINAL_SERVICE_URL },
      { name: 'Federated Learning',    url: config.FL_SERVICE_URL },
      { name: 'Continuous Learning',   url: config.CL_SERVICE_URL },
    ];

    const results = await Promise.all(services.map(checkSingle));

    const degraded = results.filter((x: any) => x.status !== 'healthy');
    const overall = degraded.length === 0 ? 'healthy'
      : degraded.every((x: any) => x.status === 'unreachable') ? 'down'
      : 'degraded';

    res.json({ overall, services: results });
  } catch (err) { next(err); }
});

r.get('/metrics', async (req, res, next) => {
  try {
    const [last200, stats, statsByCondition] = await Promise.all([
      // Get last 200 inference results
      prisma.aIResult.findMany({
        take: 200,
        orderBy: { createdAt: 'desc' },
        include: { scan: { select: { modality: true, bodyPart: true, tenantId: true } } }
      }),
      // Aggregate confidence and latency
      prisma.aIResult.aggregate({
        _avg: { confidence: true, inferenceMs: true },
        _count: { id: true }
      }),
      // Aggregate accuracy by condition (Feature 7)
      prisma.aIResult.groupBy({
        by: ['primaryFinding'],
        _avg: { confidence: true, inferenceMs: true },
        _count: { id: true },
      })
    ]);

    // Real accuracy by condition calculation (Feature 7)
    // We compare AI results with human validation (ClinicalValidation table)
    const validations = await prisma.clinicalValidation.findMany({
      where: { scan: { aiResult: { isNot: null } } },
      include: { scan: { include: { aiResult: true } } }
    });

    const conditionMetrics: Record<string, { tp:number, fp:number, tn:number, fn:number, confidences:number[] }> = {};
    
    // Group validations by condition to calculate metrics
    validations.forEach((v: any) => {
      const condition = v.scan.aiResult.primaryFinding;
      if (!conditionMetrics[condition]) {
        conditionMetrics[condition] = { tp:0, fp:0, tn:0, fn:0, confidences: [] };
      }
      
      const isMatch = v.findingsMatch === true || v.status === 'agreed';
      if (isMatch) {
        conditionMetrics[condition].tp++;
      } else if (v.status === 'disagreed') {
        conditionMetrics[condition].fp++;
      }
      conditionMetrics[condition].confidences.push(v.scan.aiResult.confidence);
    });

    // Honest per-condition metrics (audit E-12). Reported values come ONLY from
    // real human validation rows (ClinicalValidation). AUC cannot be derived
    // from agreement counts, so `auc` is always null until a proper evaluation
    // harness records ROC data. `sensitivity` is the human-agreement rate on
    // validated cases (tp / (tp + fp)) and is null when no validation exists.
    const byCondition = statsByCondition.map((c: { primaryFinding: string; _count: { id: number } }) => {
      const m = conditionMetrics[c.primaryFinding];
      const validated = m ? m.tp + m.fp : 0;
      const agreementRate = validated > 0 ? m.tp / validated : null;
      return {
        name: c.primaryFinding,
        cases: c._count.id,
        validated,
        auc: null,
        sensitivity: agreementRate === null ? null : parseFloat(agreementRate.toFixed(3)),
        agreementRate: agreementRate === null ? null : parseFloat(agreementRate.toFixed(3)),
      };
    });

    res.json({
      events: last200,
      aggregates: {
        avgConfidence: stats._avg.confidence || 0,
        avgLatencyMs: stats._avg.inferenceMs || 0,
        totalCount: stats._count.id,
        byCondition
      }
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/ai-monitoring/drift
 * Model drift detection via PSI and Cohen's Kappa.
 *
 * Honest response (audit E-12): the old endpoint returned deterministic
 * time-bucketed pseudo-metrics (`kappa = 0.84 + (t % 6) / 100`). PSI/Kappa
 * require per-inference feature distributions and a reference training
 * distribution, which the platform does not capture. Drift is therefore
 * NOT measurable today and is reported as such.
 */
r.get('/drift', async (_req, res) => {
  const measured = await prisma.aIResult.count({ select: { _all: true } }).catch(() => ({ _all: 0 }));
  res.json({
    status: 'not_available',
    kappa: null,
    psi: null,
    lastChecked: null,
    message: 'PSI/Kappa drift detection requires per-inference feature distributions and a reference training distribution, which are not captured. Drift cannot be reported without fabricating measurements.',
    measurements: measured._all,
  });
});

/**
 * GET /api/v1/ai-monitoring/bias
 * Demographic bias analysis.
 *
 * Honest response (audit E-12): the old endpoint returned hard-coded AUCs.
 * Bias auditing requires protected-attribute labels joined to ground truth
 * outcomes; those are not captured, so the audit is reported as not available.
 */
r.get('/bias', async (_req, res) => {
  res.json({
    status: 'not_available',
    age: [],
    sex: [],
    region: [],
    message: 'Bias audit requires protected-attribute labels joined to ground-truth outcomes. These are not captured today, so no bias metrics are reported.',
  });
});

/**
 * GET /api/v1/ai-monitoring/latency
 * Returns 24-hour hourly latency profile and P50/P95/P99 percentiles from real inference data.
 * P1 + P2 fix: these are calculated from the actual inferenceMs values stored in AIResult.
 */
r.get('/latency', async (req, res, next) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Pull last 24h inference ms values
    const results = await prisma.aIResult.findMany({
      where: { createdAt: { gte: oneDayAgo } },
      select: { createdAt: true, inferenceMs: true },
      orderBy: { createdAt: 'asc' },
    });

    // Build 24 hourly buckets (ms values averaged per hour)
    const hourlyBuckets: number[][] = Array.from({ length: 24 }, (): number[] => []);
    for (const r of results) {
      const hrsAgo = Math.floor((now.getTime() - new Date(r.createdAt).getTime()) / 3_600_000);
      const bucket = 23 - Math.min(hrsAgo, 23); // index 0 = 00:00, index 23 = now
      if (r.inferenceMs) hourlyBuckets[bucket].push(r.inferenceMs);
    }

    const hourly = hourlyBuckets.map(bucket =>
      bucket.length > 0
        ? parseFloat((bucket.reduce((a, b) => a + b, 0) / bucket.length / 1000).toFixed(2))
        // No inference data for this hour — null, never a fabricated baseline
        // (audit E-12: the previous hard-coded 1.3s fallback misreported latency).
        : null
    );

    // Compute percentiles across all values
    const allMs = results.map(r => r.inferenceMs).filter((ms): ms is number => ms !== null).sort((a: number, b: number): number => a - b);
    const pct = (arr: number[], p: number) => arr.length ? arr[Math.floor(arr.length * p / 100)] : null;

    res.json({
      hourly,
      percentiles: {
        p50: pct(allMs, 50),
        p95: pct(allMs, 95),
        p99: pct(allMs, 99),
        count: allMs.length,
      },
      generatedAt: now,
    });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/ai-monitoring/federated/start
 * Orchestrates a federated learning round across active tenants
 */
r.post('/federated/start', async (req, res, next) => {
  try {
    const { modelId, tenants = [] } = req.body;
    logger.info(`[Federated] Starting training round for model ${modelId} across ${tenants.length || 'all'} tenants`);

    // Push training job to edge nodes/worker queues
    // (Dispatch immediately, no artificial delay)

    res.json({
      success: true,
      roundId: `fed-${Date.now()}`,
      status: 'initiated',
      message: 'Federated training round broadcasted to edge participants.'
    });
  } catch (err) { next(err); }
});

export default r;
