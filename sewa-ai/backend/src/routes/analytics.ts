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

r.get('/population-health', async (req, res, next) => {
  try {
    const { tenantId, role } = req.user!;
    const isSuper = role === 'superadmin';
    const where = isSuper ? {} : { tenantId };

    // Group by AI findings (Conditions)
    const conditionStats = await prisma.aIResult.groupBy({
      by: ['primaryFinding', 'urgency'],
      where: isSuper ? {} : { scan: { tenantId } },
      _count: { id: true },
    });

    // Group by Tenant/Hospital (Geography)
    const regionalStats = await prisma.scan.groupBy({
      by: ['tenantId'],
      where: isSuper ? {} : { tenantId },
      _count: { id: true },
    });

    // Enrich geography with tenant info
    const geography = await Promise.all(regionalStats.map(async (stat: any) => {
      const t = await prisma.tenant.findUnique({ 
        where: { id: stat.tenantId }, 
        select: { name: true, region: true, latitude: true, longitude: true, timezone: true } 
      });
      return {
        tenantId: stat.tenantId,
        name: t?.name || 'Unknown',
        region: t?.region || 'Global',
        lat: t?.latitude || null,
        lng: t?.longitude || null,
        timezone: t?.timezone || 'UTC',
        count: stat._count.id,
      };
    }));

    res.json({
      conditions: conditionStats.map((c: any) => ({
        condition: c.primaryFinding,
        urgency: c.urgency,
        count: c._count.id,
      })),
      geography,
    });
  } catch (err) { next(err); }
});

export default r;
