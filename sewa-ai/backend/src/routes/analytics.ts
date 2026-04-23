// SEWA AI — backend/src/routes/analytics.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
const r = Router();
r.use(authenticate);

r.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const [totalScans, criticalScans, approvedReports, totalPatients] = await Promise.all([
      prisma.scan.count({ where: { tenantId } }),
      prisma.scan.count({ where: { tenantId, aiResult: { urgency: 'CRITICAL' } } }),
      prisma.report.count({ where: { tenantId, status: 'approved' } }),
      prisma.patient.count({ where: { tenantId } }),
    ]);
    const avgConfidence = await prisma.aIResult.aggregate({
      where: { scan: { tenantId } }, _avg: { confidence: true, inferenceMs: true },
    });
    res.json({ totalScans, criticalScans, approvedReports, totalPatients, avgAIConfidence: avgConfidence._avg.confidence, avgInferenceMs: avgConfidence._avg.inferenceMs });
  } catch (err) { next(err); }
});

r.get('/scan-volume', async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    // Last 7 days scan volume by day
    const rows = await prisma.$queryRaw`
      SELECT DATE(received_at) as day, COUNT(*) as count, priority
      FROM "Scan"
      WHERE tenant_id = ${tenantId}
        AND received_at >= NOW() - INTERVAL '7 days'
      GROUP BY day, priority
      ORDER BY day ASC
    `;
    res.json(rows);
  } catch (err) { next(err); }
});

export default r;
