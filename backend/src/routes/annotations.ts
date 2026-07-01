// SEWA XAI — backend/src/routes/annotations.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../utils/prismaClient';
import { AppError } from '../utils/AppError';
const r = Router();
r.use(authenticate);
r.get('/:scanId', async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    // Verify the scan belongs to this tenant before returning annotations
    const scan = await prisma.scan.findFirst({ where: { id: req.params.scanId, tenantId } });
    if (!scan) throw new AppError('Scan not found', 404);
    res.json(await prisma.annotation.findMany({ where: { scanId: req.params.scanId } }));
  } catch (e) { next(e); }
});
r.post('/', async (req, res, next) => {
  try {
    const { id: userId, tenantId } = req.user!;
    // Verify the target scan belongs to this tenant
    const scan = await prisma.scan.findFirst({ where: { id: req.body.scanId, tenantId } });
    if (!scan) throw new AppError('Scan not found', 404);
    const a = await prisma.annotation.create({ data: { ...req.body, userId } });
    res.status(201).json(a);
  } catch (err) { next(err); }
});
r.delete('/:id', async (req, res, next) => {
  try {
    const { id: userId } = req.user!;
    const annotation = await prisma.annotation.findUnique({ where: { id: req.params.id } });
    if (!annotation) throw new AppError('Annotation not found', 404);
    if (annotation.userId !== userId) throw new AppError('You can only delete your own annotations', 403);
    await prisma.annotation.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});
export default r;
