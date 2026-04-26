// SEWA AI — backend/src/routes/users.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
const r = Router();
r.use(authenticate);
r.get('/me', async (req, res, next) => {
  try {
    const u = await prisma.user.findUnique({ 
      where: { id: req.user!.id }, 
      select: { 
        id:true, email:true, firstName:true, lastName:true, role:true, speciality:true, 
        licenseNumber:true, language:true, timezone:true, mfaEnabled:true, lastLoginAt:true, 
        notifPrefs:true, consentPrefs:true,
        tenant:{ select:{ name:true, region:true, currency:true, plan:true } },
        patientRecord: { select: { id:true, mrn:true, dateOfBirth:true, sex:true, consentAI:true, consentResearch:true, consentThirdParty:true } }
      } 
    });
    res.json(u);
  } catch (err) { next(err); }
});
r.patch('/me', async (req, res, next) => {
  try {
    const { firstName, lastName, language, timezone, speciality, notifPrefs, consentPrefs } = req.body;
    const u = await prisma.user.update({ 
      where: { id: req.user!.id }, 
      data: { firstName, lastName, language, timezone, speciality, notifPrefs, consentPrefs } 
    });
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
    const users = await prisma.user.findMany({ 
      where: { tenantId: req.user!.tenantId }, 
      select: { id:true, email:true, firstName:true, lastName:true, role:true, status:true, lastLoginAt:true, mfaEnabled:true } 
    });
    res.json(users);
  } catch (err) { next(err); }
});

r.patch('/:id/status', authorize('admin','superadmin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    // Security check: ensure admin only updates users in their own tenant
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.tenantId !== req.user!.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const u = await prisma.user.update({ where: { id }, data: { status } });
    res.json(u);
  } catch (err) { next(err); }
});

r.post('/', authorize('admin','superadmin'), async (req, res, next) => {
  try {
    const { email, firstName, lastName, role } = req.body;
    const { tenantId } = req.user!;
    
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const u = await prisma.user.create({
      data: {
        email, firstName, lastName, role, tenantId,
        status: 'active',
        password: 'ChangeMe123!', // Mock password for now
      }
    });
    res.status(201).json(u);
  } catch (err) { next(err); }
});
export default r;
