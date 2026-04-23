// SEWA AI — backend/src/routes/users.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
const r = Router();
r.use(authenticate);
r.get('/me', async (req, res, next) => {
  try {
    const u = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id:true, email:true, firstName:true, lastName:true, role:true, speciality:true, licenseNumber:true, language:true, mfaEnabled:true, lastLoginAt:true, tenant:{ select:{ name:true, region:true, currency:true, plan:true } } } });
    res.json(u);
  } catch (err) { next(err); }
});
r.patch('/me', async (req, res, next) => {
  try {
    const { firstName, lastName, language, timezone, speciality } = req.body;
    const u = await prisma.user.update({ where: { id: req.user!.id }, data: { firstName, lastName, language, timezone, speciality } });
    res.json(u);
  } catch (err) { next(err); }
});
r.post('/fcm-token', async (req, res, next) => {
  try {
    // Store FCM token for push notifications (Feature 14)
    const { token, platform } = req.body;
    await prisma.user.update({ where: { id: req.user!.id }, data: { biometricKey: token /* reuse field */ } });
    res.json({ success: true });
  } catch (err) { next(err); }
});
r.get('/', authorize('admin','superadmin'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({ where: { tenantId: req.user!.tenantId }, select: { id:true, email:true, firstName:true, lastName:true, role:true, status:true, lastLoginAt:true, mfaEnabled:true } });
    res.json(users);
  } catch (err) { next(err); }
});
export default r;
