// SEWA AI — backend/src/routes/annotations.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';
const r = Router();
r.use(authenticate);
r.get('/:scanId',  async (req, res, next) => {
  try { res.json(await prisma.annotation.findMany({ where: { scanId: req.params.scanId } })); } catch (e) { next(e); }
});
r.post('/', async (req, res, next) => {
  try {
    const a = await prisma.annotation.create({ data: { ...req.body, userId: req.user!.id } });
    res.status(201).json(a);
  } catch (err) { next(err); }
});
r.delete('/:id', async (req, res, next) => {
  try { await prisma.annotation.delete({ where: { id: req.params.id } }); res.json({ success: true }); } catch (e) { next(e); }
});
export default r;
