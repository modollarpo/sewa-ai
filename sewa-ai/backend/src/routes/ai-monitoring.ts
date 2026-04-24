// SEWA AI — backend/src/routes/ai-monitoring.ts
// Real-time AI platform observability — Super Admin only

import { Router } from 'express';
import axios from 'axios';
import { authenticate, authorize } from '../middleware/auth';
import { config } from '../config/env';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const r = Router();

// Only Super Admins can see the global AI health
r.use(authenticate, authorize('superadmin'));

r.get('/health', async (req, res, next) => {
  try {
    const services = [
      { name: 'Triage Engine',        url: config.AI_SERVICE_URL },
      { name: 'VLM Report Gen',       url: config.VLM_SERVICE_URL },
      { name: 'Uncertainty Engine',   url: config.UNCERTAINTY_SERVICE_URL },
      { name: 'Metacognition AI',     url: config.METACOGNITION_SERVICE_URL },
    ];

    const results = await Promise.all(services.map(async (s) => {
      try {
        const start = Date.now();
        const resp = await axios.get(`${s.url}/health`, { timeout: 3000 });
        const latency = Date.now() - start;
        return {
          name: s.name,
          status: 'healthy',
          latency,
          version: resp.data.version || 'v2.4.1',
          backend: resp.data.backend || 'unknown'
        };
      } catch (err: any) {
        return {
          name: s.name,
          status: 'unreachable',
          error: err.message,
          url: s.url
        };
      }
    }));

    res.json(results);
  } catch (err) { next(err); }
});

r.get('/metrics', async (req, res, next) => {
  try {
    const [last200, stats] = await Promise.all([
      // Get last 200 inference results
      prisma.aiResult.findMany({
        take: 200,
        orderBy: { createdAt: 'desc' },
        include: { scan: { select: { modality: true, bodyPart: true, tenantId: true } } }
      }),
      // Aggregate confidence and latency
      prisma.aiResult.aggregate({
        _avg: { confidence: true, inferenceMs: true },
        _count: { id: true }
      })
    ]);

    res.json({
      events: last200,
      aggregates: {
        avgConfidence: stats._avg.confidence || 0,
        avgLatencyMs: stats._avg.inferenceMs || 0,
        totalCount: stats._count.id
      }
    });
  } catch (err) { next(err); }
});

export default r;
