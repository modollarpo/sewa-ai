// SEWA AI — backend/src/routes/admin.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
const r = Router();
r.use(authenticate, authorize('admin','superadmin'));

r.get('/dashboard', async (req, res, next) => {
  try {
    const { tenantId, role } = req.user!;
    const isSuper = role === 'superadmin';

    // Base filters
    const whereClause = isSuper ? {} : { tenantId };

    const [tenants, totalScans, criticalToday, totalRevenue, totalInferences] = await Promise.all([
      isSuper ? prisma.tenant.count() : Promise.resolve(1),
      prisma.scan.count({ where: whereClause }),
      prisma.scan.count({ 
        where: { 
          ...whereClause, 
          aiResult: { urgency: 'CRITICAL' }, 
          receivedAt: { gte: new Date(new Date().setHours(0,0,0,0)) } 
        } 
      }),
      prisma.payment.aggregate({ 
        where: { ...whereClause, status: 'succeeded' }, 
        _sum: { amount: true } 
      }),
      prisma.aiResult.count({ where: isSuper ? {} : { scan: { tenantId } } }),
    ]);

    const aggregates = await prisma.aiResult.aggregate({
      where: isSuper ? {} : { scan: { tenantId } },
      _avg: { confidence: true, inferenceMs: true }
    });

    res.json({ 
      tenants, 
      totalScans, 
      criticalToday, 
      totalRevenueUSD: totalRevenue._sum.amount ?? 0,
      totalInferences,
      avgAIConfidence: (aggregates._avg.confidence || 0) * 100,
      avgInferenceMs: aggregates._avg.inferenceMs || 0,
      uptime: "99.98%" // Mock for now, drives UI
    });
  } catch (err) { next(err); }
});

r.get('/tenants', async (req, res, next) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: { select: { users: true, scans: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Map to include more stats
    const enriched = await Promise.all(tenants.map(async (t: any) => {
      const [accuracy, revenue] = await Promise.all([
        prisma.aiResult.aggregate({
          where: { scan: { tenantId: t.id } },
          _avg: { confidence: true }
        }),
        prisma.payment.aggregate({
          where: { tenantId: t.id, status: 'succeeded' },
          _sum: { amount: true }
        })
      ]);

      return {
        ...t,
        users: t._count.users,
        scansMonth: t._count.scans, // Simplification for demo
        aiAccuracy: Math.round((accuracy._avg.confidence || 0) * 100),
        revenue: `$${(revenue._sum.amount || 0).toLocaleString()}`
      };
    }));

    res.json(enriched);
  } catch (err) { next(err); }
});

r.patch('/tenants/:id/status', async (req, res, next) => {
  try {
    const t = await prisma.tenant.update({ where: { id: req.params.id }, data: { status: req.body.status } });
    res.json(t);
  } catch (err) { next(err); }
});

r.post('/tenants/:id/rotate-key', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { crypto } = require('crypto');
    const newKey = require('crypto').randomUUID();
    const t = await prisma.tenant.update({
      where: { id },
      data: { apiKey: newKey }
    });
    res.json({ message: 'API Key rotated successfully', apiKey: newKey });
  } catch (err) { next(err); }
});

r.post('/tenants', async (req, res, next) => {
  try {
    const { name, region, plan, currency, primaryContactEmail } = req.body;
    // Create new tenant
    const t = await prisma.tenant.create({
      data: {
        name,
        region: region || 'uk',
        plan: plan || 'PRO',
        currency: currency || 'GBP',
        status: 'active',
      }
    });
    // Optional: create initial admin record or send invite
    res.status(201).json(t);
  } catch (err) { next(err); }
});

export default r;
