// SEWA AI — backend/src/routes/analytics.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
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

    // Added for SuperAdmin Dashboard (Feature 5)
    let regionalStats: any[] = [];
    if (req.user!.role === 'superadmin') {
      const stats = await prisma.scan.groupBy({
        by: ['tenantId'],
        _count: { id: true },
      });
      regionalStats = await Promise.all(stats.map(async (s: any) => {
        const t = await prisma.tenant.findUnique({ where: { id: s.tenantId }, select: { name: true, region: true } });
        return { name: t?.name || 'Unknown', count: s._count.id, region: t?.region || 'UK' };
      }));
    }

    res.json({ 
      totalScans, criticalScans, approvedReports, totalPatients, 
      avgAIConfidence: avgConfidence._avg.confidence, 
      avgInferenceMs: avgConfidence._avg.inferenceMs,
      regionalStats
    });
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

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [thisMonthStats, lastMonthStats] = await Promise.all([
      prisma.aIResult.groupBy({
        by: ['primaryFinding', 'urgency'],
        where: isSuper ? { createdAt: { gte: startOfThisMonth } } : { scan: { tenantId }, createdAt: { gte: startOfThisMonth } },
        _count: { id: true },
      }),
      prisma.aIResult.groupBy({
        by: ['primaryFinding'],
        where: isSuper ? { createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } } : { scan: { tenantId }, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } },
        _count: { id: true },
      })
    ]);

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

    // Group by Month (Trends)
    const trendsRaw = await prisma.$queryRaw<any[]>`
      SELECT 
        TO_CHAR(received_at, 'Mon') as month,
        COUNT(*) as count
        FROM "Scan"
      ${isSuper ? Prisma.sql`` : Prisma.sql`WHERE tenant_id = ${tenantId}`}
      AND received_at >= NOW() - INTERVAL '1 year'
      GROUP BY TO_CHAR(received_at, 'Mon'), DATE_TRUNC('month', received_at)
      ORDER BY DATE_TRUNC('month', received_at) ASC
    `;

    res.json({
      conditions: thisMonthStats.map((c: any) => {
        const lastMonthCount = lastMonthStats.find((l: any) => l.primaryFinding === c.primaryFinding)?._count.id || 0;
        const currentCount = c._count.id;
        const trend = lastMonthCount > 0 ? Math.round(((currentCount - lastMonthCount) / lastMonthCount) * 100) : 0;
        return {
          condition: c.primaryFinding,
          urgency: c.urgency,
          count: currentCount,
          trend
        };
      }),
      geography,
      trends: trendsRaw.map((t: any) => ({ month: t.month, count: Number(t.count) })),
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/analytics/referral-network
 * Inter-hospital referral flows for population health
 */
r.get('/referral-network', async (req, res, next) => {
  try {
    // Detect inter-facility clinical flows (Feature 13)
    // We look for scans where the referring doctor belongs to a different tenant than the scan facility
    const flows = await prisma.scan.findMany({
      where: { referringDoctorId: { not: null } },
      include: { 
        referringDoctor: { select: { tenant: { select: { name: true } } } },
        tenant: { select: { name: true } }
      },
      take: 50
    });

    const network: Record<string, { from:string, to:string, count:number }> = {};
    flows.forEach((f: any) => {
      const from = (f as any).referringDoctor?.tenant?.name;
      const to = (f as any).tenant?.name;
      if (from && to && from !== to) {
        const key = `${from}->${to}`;
        if (!network[key]) network[key] = { from, to, count: 0 };
        network[key].count++;
      }
    });

    res.json(Object.values(network));
  } catch (err) { next(err); }
});

export default r;
