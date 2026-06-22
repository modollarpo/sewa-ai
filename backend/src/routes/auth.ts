// SEWA AI — backend/src/routes/auth.ts
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import * as ctrl from '../controllers/authController';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';

const r = Router();

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate a user and return JWT tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *             required: [email, password]
 *     responses:
 *       200:
 *         description: Successful authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
r.post('/login',            authLimiter, ctrl.login);
r.post('/mfa/verify',       authLimiter, ctrl.verifyMFA);
r.post('/mfa/setup',        authenticate, ctrl.setupMFA);
r.post('/mfa/confirm',      authenticate, ctrl.confirmMFA);
r.post('/refresh',          ctrl.refreshToken);
r.post('/logout',           ctrl.logout);
r.post('/register',         authLimiter, ctrl.register);
r.post('/register-specialist', authLimiter, ctrl.registerSpecialist);
r.post('/forgot-password',  authLimiter, ctrl.forgotPassword);
r.post('/reset-password',   authLimiter, ctrl.resetPassword);
r.post('/verify-email',     ctrl.verifyEmail);

// ── Staff Invitation Flow ─────────────────────────────────────
// GET /auth/invite/:token — validate token and return invite details
r.get('/invite/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const user = await prisma.user.findFirst({
      where: { inviteToken: token, status: 'pending_invite' } as any,
      select: { email: true, role: true, tenant: { select: { name: true } } },
    });
    if (!user) return res.status(404).json({ error: 'Invalid or expired invitation token' });
    res.json({ email: user.email, role: user.role, tenantName: (user as any).tenant?.name ?? 'SEWA AI' });
  } catch (err) { next(err); }
});

// POST /auth/invite/:token/accept — activate account with name + password
r.post('/invite/:token/accept', authLimiter, async (req, res, next) => {
  try {
    const { token } = req.params;
    const { firstName, lastName, password } = req.body;

    if (!firstName || !lastName || !password)
      return res.status(400).json({ error: 'firstName, lastName and password are required' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!/[A-Z]/.test(password))
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    if (!/[0-9]/.test(password))
      return res.status(400).json({ error: 'Password must contain at least one number' });

    const user = await prisma.user.findFirst({
      where: { inviteToken: token, status: 'pending_invite' } as any,
    });
    if (!user) return res.status(404).json({ error: 'Invalid or expired invitation token' });

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName, lastName, passwordHash,
        status: 'active',
        inviteToken: null,
      } as any,
    });

    logger.info(`[Auth] Invite accepted: user ${user.id} (${user.email}) activated`);
    res.json({ message: 'Account activated successfully. You may now log in.' });
  } catch (err) { next(err); }
});

export default r;

