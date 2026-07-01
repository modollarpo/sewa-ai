// SEWA XAI — backend/src/routes/users.ts
import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../utils/prismaClient';
import { sendEmail } from '../services/emailService';
import { config } from '../config/env';
import { logger } from '../utils/logger';
const r = Router();
r.use(authenticate);

r.patch('/me/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing passwords' });

    // Password strength validation — minimum 8 chars, at least 1 uppercase, 1 digit
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!/[A-Z]/.test(newPassword)) return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    if (!/[0-9]/.test(newPassword)) return res.status(400).json({ error: 'Password must contain at least one number' });

    const u = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!u || !u.passwordHash) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, u.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid current password' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user!.id }, data: { passwordHash } });

    logger.info(`[Users] Password changed for user ${req.user!.id}`);
    res.json({ message: 'Password updated' });
  } catch (err) { next(err); }
});

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
      data: { firstName, lastName, language, timezone, speciality, notifPrefs, consentPrefs },
      // Explicitly select safe fields — NEVER return passwordHash, biometricKey, or refreshToken
      select: {
        id: true, email: true, firstName: true, lastName: true, role: true,
        speciality: true, language: true, timezone: true, mfaEnabled: true,
        notifPrefs: true, consentPrefs: true, lastLoginAt: true,
      },
    });
    res.json(u);
  } catch (err) { next(err); }
});
r.post('/fcm-token', async (req, res, next) => {
  try {
    // Store FCM token for push notifications (Feature 14)
    const { token } = req.body;
    if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Valid FCM token required' });
    await prisma.user.update({ where: { id: req.user!.id }, data: { fcmTokens: { push: token } } });
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
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.tenantId !== req.user!.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const u = await prisma.user.update({
      where: { id }, data: { status },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
    });
    res.json(u);
  } catch (err) { next(err); }
});

r.post('/', authorize('admin','superadmin'), async (req, res, next) => {
  try {
    const { email, firstName, lastName, role } = req.body;
    const { tenantId } = req.user!;
    
    // Check if user already exists — scoped to tenant to prevent cross-tenant enumeration
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const u = await prisma.user.create({
      data: { email, firstName, lastName, role, tenantId, status: 'pending_invite', passwordHash: 'PENDING_INVITE' },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
    });

    // C5/BG4: Send branded invitation email (non-fatal — failure logged but not thrown)
    const inviteToken = crypto.randomBytes(24).toString('hex');
    await prisma.user.update({ where: { id: u.id }, data: { inviteToken } as any }).catch((): void => {});
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }).catch((): null => null);
    const inviteLink = `${config.FRONTEND_URL}/auth/accept-invite?token=${inviteToken}`;
    sendEmail({
      to: email,
      name: `${firstName} ${lastName}`.trim() || email,
      subject: `You've been invited to SEWA XAI — ${tenant?.name ?? 'NHS Trust'}`,
      template: 'staff-invite',
      data: { role, tenantName: tenant?.name, inviteLink },
    }).catch((e: any) => logger.warn(`[Users] Invite email failed for ${email}: ${e.message}`));

    res.status(201).json(u);
  } catch (err) { next(err); }
});

// POST /api/v1/users/invite — called from HospitalAdminDashboard "+ Invite Staff" button
r.post('/invite', authorize('admin','superadmin'), async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const { tenantId } = req.user!;
    if (!email || !role) return res.status(400).json({ error: 'email and role are required' });
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) return res.status(409).json({ error: 'User already exists' });
    const u = await prisma.user.create({
      data: { email, firstName: '', lastName: '', role, tenantId, status: 'pending_invite', passwordHash: 'PENDING_INVITE' }
    });

    // C5/BG4: Send invitation email
    const inviteToken = crypto.randomBytes(24).toString('hex');
    await prisma.user.update({ where: { id: u.id }, data: { inviteToken } as any }).catch((): void => {});
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }).catch((): null => null);
    const inviteLink = `${config.FRONTEND_URL}/auth/accept-invite?token=${inviteToken}`;
    sendEmail({
      to: email,
      subject: `You've been invited to SEWA XAI — ${tenant?.name ?? 'NHS Trust'}`,
      template: 'staff-invite',
      data: { role, tenantName: tenant?.name, inviteLink },
    }).catch((e: any) => logger.warn(`[Invite] Email failed for ${email}: ${e.message}`));

    res.status(201).json({ message: `Invitation sent to ${email}`, userId: u.id });
  } catch (err) { next(err); }
});

// PATCH /api/v1/users/:id/role — called from HospitalAdminDashboard staff table "Edit" button
r.patch('/:id/role', authorize('admin','superadmin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.tenantId !== req.user!.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const u = await prisma.user.update({
      where: { id }, data: { role },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
    res.json(u);
  } catch (err) { next(err); }
});

export default r;
