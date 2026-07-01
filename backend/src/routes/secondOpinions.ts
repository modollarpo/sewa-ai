// SEWA XAI — backend/src/routes/secondOpinions.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../utils/prismaClient';
import { auditLog } from '../utils/audit';
import { AppError } from '../utils/AppError';
const r = Router();
r.use(authenticate);

r.post('/', async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const { scanId, reportId } = req.body;

    // Security Gap: verify scan belongs to this tenant
    const scan = await prisma.scan.findFirst({ where: { id: scanId, tenantId } });
    if (!scan) throw new AppError('Scan not found in this institution', 404);

    const so = await prisma.secondOpinion.create({ data: { ...req.body, requesterId: userId } });
    await auditLog({ tenantId, userId, action: 'SECOND_OPINION_REQUESTED', entity: 'SecondOpinion', entityId: so.id });
    res.status(201).json(so);
  } catch (err) { next(err); }
});

r.patch('/:id', async (req, res, next) => {
  try {
    const { id: userId, role, tenantId } = req.user!;
    const opinion = await prisma.secondOpinion.findUnique({ 
      where: { id: req.params.id },
      include: { scan: { select: { tenantId: true } } }
    });
    if (!opinion || (opinion.scan as any)?.tenantId !== tenantId) {
      throw new AppError('Second opinion not found in this institution', 404);
    }
    // Only the assigned reviewer or an admin can update the opinion
    const isReviewer = opinion.assignedToId === userId;
    const isAdmin = ['admin', 'superadmin'].includes(role);
    if (!isReviewer && !isAdmin) throw new AppError('Only the assigned reviewer can submit this opinion', 403);
    const so = await prisma.secondOpinion.update({ where: { id: req.params.id }, data: req.body });
    res.json(so);
  } catch (err) { next(err); }
});

r.get('/pending', async (req, res, next) => {
  try {
    const items = await prisma.secondOpinion.findMany({ where: { assignedToId: req.user!.id, status: 'pending' }, include: { scan: { include: { aiResult: true } } } });
    res.json(items);
  } catch (err) { next(err); }
});

export default r;
