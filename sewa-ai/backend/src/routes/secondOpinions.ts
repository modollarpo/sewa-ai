// SEWA AI — backend/src/routes/secondOpinions.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';
import { auditLog } from '../utils/audit';
const r = Router();
r.use(authenticate);
r.post('/', async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const so = await prisma.secondOpinion.create({ data: { ...req.body, requesterId: userId } });
    await auditLog({ tenantId, userId, action: 'SECOND_OPINION_REQUESTED', entity: 'SecondOpinion', entityId: so.id });
    res.status(201).json(so);
  } catch (err) { next(err); }
});
r.patch('/:id', async (req, res, next) => {
  try {
    const so = await prisma.secondOpinion.update({ where: { id: req.params.id }, data: req.body });
    res.json(so);
  } catch (err) { next(err); }
});
r.get('/pending', async (req, res, next) => {
  try {
    const items = await prisma.secondOpinion.findMany({ where: { reviewerId: req.user!.id, status: 'pending' }, include: { scan: { include: { aiResult: true } } } });
    res.json(items);
  } catch (err) { next(err); }
});
export default r;
