// SEWA AI — backend/src/routes/tenants.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { validate }  from '../middleware/validate';
import { TenantOnboardSchema } from '../utils/validators';

const r = Router();
r.use(authenticate);

r.get('/me', async (req, res, next) => {
  try {
    const t = await prisma.tenant.findUnique({ where: { id: req.user!.tenantId } });
    res.json(t);
  } catch (err) { next(err); }
});

r.post('/', authorize('superadmin'), validate(TenantOnboardSchema), async (req, res, next) => {
  try {
    const t = await prisma.tenant.create({ data: req.body });
    res.status(201).json(t);
  } catch (err) { next(err); }
});
export default r;
