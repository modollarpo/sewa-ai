// SEWA XAI — backend/src/routes/secondOpinions.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../utils/prismaClient';
import { auditLog } from '../utils/audit';
import { AppError } from '../utils/AppError';
const r = Router();
r.use(authenticate);

r.get('/specialists', async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const specialists = await prisma.user.findMany({
      where: {
        tenantId,
        role: { in: ['radiologist', 'doctor'] },
        status: 'active',
      },
      select: { id: true, firstName: true, lastName: true, role: true, speciality: true, email: true },
    });
    res.json(specialists);
  } catch (err) { next(err); }
});

r.get('/', async (req, res, next) => {
  try {
    const { tenantId, id: userId, role } = req.user!;
    let where: any = { tenantId };
    // Show only your own unless admin
    if (!['admin', 'superadmin'].includes(role)) {
      where = { OR: [{ requesterId: userId }, { assignedToId: userId }] };
    }
    const opinions = await prisma.secondOpinion.findMany({
      where,
      include: { scan: { include: { patient: true, aiResult: true } }, requester: true, assignedTo: true, report: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(opinions);
  } catch (err) { next(err); }
});

r.post('/', async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const { scanId, reportId, priority, reason } = req.body;

    // Security: verify scan belongs to this tenant
    const scan = await prisma.scan.findFirst({ where: { id: scanId, tenantId } });
    if (!scan) throw new AppError('Scan not found in this institution', 404);

    // Calculate SLA deadline based on priority
    const slaDeadline = priority === 'STAT' ? new Date(Date.now() + 1 * 60 * 60 * 1000) : // 1h
                       priority === 'URGENT' ? new Date(Date.now() + 4 * 60 * 60 * 1000) : //4h
                       new Date(Date.now() + 48 * 60 * 60 * 1000); //48h

    const so = await prisma.secondOpinion.create({ 
      data: { 
        ...req.body, 
        requesterId: userId,
        slaDeadline,
      } 
    });
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
    if (!opinion || opinion.scan?.tenantId !== tenantId) {
      throw new AppError('Second opinion not found in this institution', 404);
    }
    // Only the assigned reviewer or an admin can update the opinion
    const isReviewer = opinion.assignedToId === userId;
    const isAdmin = ['admin', 'superadmin'].includes(role);
    if (!isReviewer && !isAdmin) throw new AppError('Only the assigned reviewer can submit this opinion', 403);
    const so = await prisma.secondOpinion.update({ where: { id: req.params.id }, data: req.body });
    await auditLog({ tenantId, userId, action: 'SECOND_OPINION_UPDATED', entity: 'SecondOpinion', entityId: so.id });
    res.json(so);
  } catch (err) { next(err); }
});

r.get('/pending', async (req, res, next) => {
  try {
    const items = await prisma.secondOpinion.findMany({ 
      where: { assignedToId: req.user!.id, status: 'pending' }, 
      include: { scan: { include: { patient: true, aiResult: true } } } 
    });
    res.json(items);
  } catch (err) { next(err); }
});

export default r;
