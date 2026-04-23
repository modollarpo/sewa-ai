// SEWA AI — backend/src/routes/admin.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
const r = Router();
r.use(authenticate, authorize('admin','superadmin'));

r.get('/dashboard', async (req, res, next) => {
  try {
    const [tenants, totalScans, criticalToday, totalRevenue] = await Promise.all([
      prisma.tenant.count(),
      prisma.scan.count(),
      prisma.scan.count({ where: { aiResult: { urgency: 'CRITICAL' }, receivedAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
      prisma.payment.aggregate({ where: { status: 'succeeded' }, _sum: { amount: true } }),
    ]);
    res.json({ tenants, totalScans, criticalToday, totalRevenueUSD: totalRevenue._sum.amount ?? 0 });
  } catch (err) { next(err); }
});

r.get('/tenants', async (req, res, next) => {
  try {
    const tenants = await prisma.tenant.findMany({ include: { _count: { select: { users:true, scans:true } } }, orderBy: { createdAt: 'desc' } });
    res.json(tenants);
  } catch (err) { next(err); }
});

r.patch('/tenants/:id/status', async (req, res, next) => {
  try {
    const t = await prisma.tenant.update({ where: { id: req.params.id }, data: { status: req.body.status } });
    res.json(t);
  } catch (err) { next(err); }
});

export default r;
