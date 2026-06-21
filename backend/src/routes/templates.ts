// SEWA AI — backend/src/routes/templates.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
const r = Router();
r.use(authenticate);
r.get('/', async (req, res, next) => {
  try {
    const { specialty, modality } = req.query as Record<string,string>;
    const where: any = { tenantId: req.user!.tenantId, isActive: true };
    if (specialty) where.specialty = specialty;
    if (modality) where.modality = modality;
    res.json(await prisma.reportTemplate.findMany({ where }));
  } catch (err) { next(err); }
});
r.post('/', authorize('admin','superadmin','radiologist'), async (req, res, next) => {
  try {
    const t = await prisma.reportTemplate.create({ data: { ...req.body, tenantId: req.user!.tenantId } });
    res.status(201).json(t);
  } catch (err) { next(err); }
});
export default r;
