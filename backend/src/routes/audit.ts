// SEWA AI — backend/src/routes/audit.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { verifyChain } from '../utils/audit';
const r = Router();
r.use(authenticate, authorize('admin','superadmin'));
r.get('/', async (req, res, next) => {
  try {
    const { page='1', limit='100', userId, action } = req.query as Record<string,string>;
    const where: any = {};
    if (req.user!.role !== 'superadmin') where.tenantId = req.user!.tenantId;
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt:'desc' }, take: parseInt(limit), skip: (parseInt(page)-1)*parseInt(limit) }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ logs, total });
  } catch (err) { next(err); }
});
r.get('/verify', async (req, res, next) => {
  try { res.json(await verifyChain()); } catch (err) { next(err); }
});
export default r;
