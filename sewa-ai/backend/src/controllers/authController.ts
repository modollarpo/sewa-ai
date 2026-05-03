// SEWA AI — src/controllers/authController.ts
// Feature 2: JWT + OAuth2, MFA (TOTP/SMS/Email), Biometric auth, HIPAA audit logging

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';  // explicit import for Node 18 compat
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { prisma } from '../config/database';
import { redisClient } from '../config/redis';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { auditLog } from '../utils/audit';
import { sendEmail } from '../services/emailService';
import { AppError } from '../utils/AppError';
import { createSpecialistAccount } from '../services/paymentService';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_TTL  = '15m';
const REFRESH_TOKEN_TTL = '7d';

function signTokens(userId: string, tenantId: string, role: string) {
  const payload = { sub: userId, tenantId, role };
  const accessToken  = jwt.sign(payload, config.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
  return { accessToken, refreshToken };
}

// POST /api/v1/auth/login
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, tenantSlug } = req.body;

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant || tenant.status === 'suspended') {
      throw new AppError('Invalid tenant or account suspended', 401);
    }

    const user = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });
    if (!user) throw new AppError('Invalid credentials', 401);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError('Invalid credentials', 401);

    if (user.status !== 'active') throw new AppError('Account is not active', 403);

    // MFA required check
    if (user.mfaEnabled) {
      const mfaChallenge = randomUUID();  // Node 18 safe
      await redisClient.setex(`mfa:${mfaChallenge}`, 300, JSON.stringify({ userId: user.id, tenantId: tenant.id }));
      return res.json({ mfaRequired: true, mfaChallenge });
    }

    const { accessToken, refreshToken } = signTokens(user.id, tenant.id, user.role);

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await prisma.session.create({
      data: {
        userId: user.id, token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip, userAgent: req.headers['user-agent'],
      },
    });

    await auditLog({ tenantId: tenant.id, userId: user.id, action: 'LOGIN', ipAddress: req.ip, metadata: { role: user.role } });

    res.json({
      accessToken, refreshToken,
      user: { id: user.id, email: user.email, role: user.role,
        firstName: user.firstName, lastName: user.lastName,
        tenantId: tenant.id, tenantName: tenant.name,
        region: tenant.region, currency: tenant.currency, language: user.language },
    });
  } catch (err) { next(err); }
}

// POST /api/v1/auth/mfa/verify
export async function verifyMFA(req: Request, res: Response, next: NextFunction) {
  try {
    const { mfaChallenge, code } = req.body;
    const raw = await redisClient.get(`mfa:${mfaChallenge}`);
    if (!raw) throw new AppError('MFA session expired', 401);

    const { userId, tenantId } = JSON.parse(raw);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) throw new AppError('MFA not configured', 400);

    const valid = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!valid) throw new AppError('Invalid MFA code', 401);

    await redisClient.del(`mfa:${mfaChallenge}`);
    const { accessToken, refreshToken } = signTokens(user.id, tenantId, user.role);
    await auditLog({ tenantId, userId: user.id, action: 'MFA_VERIFIED', ipAddress: req.ip });

    // Fetch tenant to return full user shape (matching login response)
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, region: true, currency: true } });

    res.json({
      accessToken, refreshToken,
      user: {
        id: user.id, email: user.email, role: user.role,
        firstName: user.firstName, lastName: user.lastName,
        tenantId,
        tenantName: tenant?.name ?? '',
        region: tenant?.region ?? 'uk',
        currency: tenant?.currency ?? 'GBP',
        language: user.language ?? 'en',
      },
    });
  } catch (err) { next(err); }
}

// POST /api/v1/auth/mfa/setup
export async function setupMFA(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const secret = authenticator.generateSecret();
    const user   = await prisma.user.findUnique({ where: { id: userId } });
    const otpauth = authenticator.keyuri(user!.email, 'SEWA AI', secret);

    await redisClient.setex(`mfa_setup:${userId}`, 600, secret);
    res.json({ secret, otpauthUrl: otpauth });
  } catch (err) { next(err); }
}

// POST /api/v1/auth/mfa/confirm
export async function confirmMFA(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { code } = req.body;
    const secret = await redisClient.get(`mfa_setup:${userId}`);
    if (!secret) throw new AppError('MFA setup session expired', 400);

    const valid = authenticator.verify({ token: code, secret });
    if (!valid) throw new AppError('Invalid code', 400);

    await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true, mfaSecret: secret } });
    await redisClient.del(`mfa_setup:${userId}`);
    await auditLog({ userId, action: 'MFA_ENABLED' });

    res.json({ message: 'MFA enabled successfully' });
  } catch (err) { next(err); }
}

// POST /api/v1/auth/refresh
export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: token } = req.body;
    if (!token) throw new AppError('Refresh token required', 400);

    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) throw new AppError('Invalid or expired session', 401);

    const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as { sub: string; tenantId: string; role: string };
    const { accessToken, refreshToken: newRefresh } = signTokens(decoded.sub, decoded.tenantId, decoded.role);

    await prisma.session.update({ where: { token }, data: { token: newRefresh, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
    res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) { next(err); }
}

// POST /api/v1/auth/logout
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: token } = req.body;
    if (token) await prisma.session.deleteMany({ where: { token } });
    await auditLog({ userId: req.user?.id, action: 'LOGOUT', ipAddress: req.ip });
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
}

// POST /api/v1/auth/register (Hospital self-registration)
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantSlug, firstName, lastName, email, password, role = 'doctor' } = req.body;

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      throw new AppError(`Facility code "${tenantSlug}" not recognized. Please contact your hospital administrator.`, 404);
    }

    const existing = await prisma.user.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email } } });
    if (existing) throw new AppError('This email is already registered at this institution.', 409);

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    // New accounts start as 'pending_verification' until email is confirmed
    const user = await prisma.user.create({
      data: { tenantId: tenant.id, email, passwordHash, firstName, lastName, role, status: 'pending_verification' },
    });

    await auditLog({ tenantId: tenant.id, userId: user.id, action: 'USER_REGISTERED', metadata: { role } });

    // Generate email verification token (expires 24 hours)
    const verifyToken = randomUUID();
    await redisClient.setex(`verify:${verifyToken}`, 24 * 60 * 60, user.id);
    const verifyLink = `${config.FRONTEND_URL}/verify-email?token=${verifyToken}`;

    // Send email verification (non-fatal)
    sendEmail({
      to: email,
      subject: 'Verify your SEWA AI clinical account',
      template: 'verify_email',
      data: { firstName, verifyLink },
    }).catch((e: any) => logger.warn(`[Auth] Verification email failed for ${email}: ${e.message}`));

    res.status(201).json({ message: 'Registration successful. Please check your email to verify your account before signing in.' });
  } catch (err) { next(err); }
}

// POST /api/v1/auth/register-specialist
export async function registerSpecialist(req: Request, res: Response, next: NextFunction) {
  try {
    const { firstName, lastName, email, password, speciality, licenseNumber } = req.body;

    // Use a special global tenant for independent specialists if no specific tenant is provided
    let tenant = await prisma.tenant.findUnique({ where: { slug: 'specialists' } });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'SEWA Specialist Network', slug: 'specialists', subdomain: 'specialists', region: 'uk', currency: 'GBP', status: 'active'
        }
      });
    }

    const existing = await prisma.user.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email } } });
    if (existing) throw new AppError('This email is already registered in the specialist network.', 409);

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id, email, passwordHash, firstName, lastName,
        role: 'radiologist', speciality, licenseNumber, status: 'active'
      },
    });

    // Create Stripe Connect account
    const stripeInfo = await createSpecialistAccount(email, user.id);
    await prisma.user.update({ where: { id: user.id }, data: { stripeAccountId: stripeInfo.accountId } });

    await auditLog({ tenantId: tenant.id, userId: user.id, action: 'SPECIALIST_REGISTERED', metadata: { speciality } });
    
    res.status(201).json({ 
      message: 'Specialist account created', 
      stripeOnboardingUrl: stripeInfo.onboardingUrl 
    });
  } catch (err) { next(err); }
}

// POST /api/v1/auth/forgot-password
export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, tenantSlug } = req.body;
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new AppError('Tenant not found', 404);

    const user = await prisma.user.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email } } });
    if (!user) {
      // Don't leak user existence in prod, but for demo we can be explicit or just return success
      return res.json({ message: 'If an account exists, a reset link has been sent.' });
    }

    const token = randomUUID();
    await redisClient.setex(`reset:${token}`, 3600, user.id); // 1 hour

    await sendEmail({
      to: email,
      subject: 'Reset your SEWA AI password',
      template: 'forgot_password',
      data: { firstName: user.firstName, resetLink: `${config.FRONTEND_URL}/reset-password?token=${token}&tenant=${tenantSlug}` }
    });

    res.json({ message: 'Password reset link sent to your email.' });
  } catch (err) { next(err); }
}

// POST /api/v1/auth/reset-password
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body;
    const userId = await redisClient.get(`reset:${token}`);
    if (!userId) throw new AppError('Invalid or expired reset token', 400);

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await redisClient.del(`reset:${token}`);

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) { next(err); }
}

// POST /api/v1/auth/verify-email
export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.body;
    const userId = await redisClient.get(`verify:${token}`);
    if (!userId) throw new AppError('Invalid or expired verification token', 400);

    await prisma.user.update({ where: { id: userId }, data: { status: 'active' } });
    await redisClient.del(`verify:${token}`);

    res.json({ message: 'Email verified successfully. Account is now active.' });
  } catch (err) { next(err); }
}
