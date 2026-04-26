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

r.get('/integrations/health', authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { checkFHIRHealth } = await import('../services/fhirService');
    const { checkHL7Health }  = await import('../services/hl7Service');
    
    const [fhir, hl7] = await Promise.all([
      checkFHIRHealth(),
      checkHL7Health(),
    ]);
    
    res.json({ fhir, hl7 });
  } catch (err) { next(err); }
});

r.post('/', authorize('superadmin'), validate(TenantOnboardSchema), async (req, res, next) => {
  try {
    const t = await prisma.tenant.create({ data: req.body });
    res.status(201).json(t);
  } catch (err) { next(err); }
});
export default r;
