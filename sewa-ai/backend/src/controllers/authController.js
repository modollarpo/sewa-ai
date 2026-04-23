"use strict";
// SEWA AI — src/controllers/authController.ts
// Feature 2: JWT + OAuth2, MFA (TOTP/SMS/Email), Biometric auth, HIPAA audit logging
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.verifyMFA = verifyMFA;
exports.setupMFA = setupMFA;
exports.confirmMFA = confirmMFA;
exports.refreshToken = refreshToken;
exports.logout = logout;
exports.register = register;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const otplib_1 = require("otplib");
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
const env_1 = require("../config/env");
const audit_1 = require("../utils/audit");
const emailService_1 = require("../services/emailService");
const AppError_1 = require("../utils/AppError");
const SALT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
function signTokens(userId, tenantId, role) {
    const payload = { sub: userId, tenantId, role };
    const accessToken = jsonwebtoken_1.default.sign(payload, env_1.config.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
    const refreshToken = jsonwebtoken_1.default.sign(payload, env_1.config.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
    return { accessToken, refreshToken };
}
// POST /api/v1/auth/login
async function login(req, res, next) {
    try {
        const { email, password, tenantSlug } = req.body;
        const tenant = await database_1.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
        if (!tenant || tenant.status === 'suspended') {
            throw new AppError_1.AppError('Invalid tenant or account suspended', 401);
        }
        const user = await database_1.prisma.user.findUnique({
            where: { tenantId_email: { tenantId: tenant.id, email } },
        });
        if (!user)
            throw new AppError_1.AppError('Invalid credentials', 401);
        const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid)
            throw new AppError_1.AppError('Invalid credentials', 401);
        if (user.status !== 'active')
            throw new AppError_1.AppError('Account is not active', 403);
        // MFA required check
        if (user.mfaEnabled) {
            const mfaChallenge = crypto.randomUUID();
            await redis_1.redisClient.setex(`mfa:${mfaChallenge}`, 300, JSON.stringify({ userId: user.id, tenantId: tenant.id }));
            return res.json({ mfaRequired: true, mfaChallenge });
        }
        const { accessToken, refreshToken } = signTokens(user.id, tenant.id, user.role);
        await database_1.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await database_1.prisma.session.create({
            data: {
                userId: user.id, token: refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                ipAddress: req.ip, userAgent: req.headers['user-agent'],
            },
        });
        await (0, audit_1.auditLog)({ tenantId: tenant.id, userId: user.id, action: 'LOGIN', ipAddress: req.ip, metadata: { role: user.role } });
        res.json({
            accessToken, refreshToken,
            user: { id: user.id, email: user.email, role: user.role,
                firstName: user.firstName, lastName: user.lastName,
                tenantId: tenant.id, tenantName: tenant.name,
                region: tenant.region, currency: tenant.currency, language: user.language },
        });
    }
    catch (err) {
        next(err);
    }
}
// POST /api/v1/auth/mfa/verify
async function verifyMFA(req, res, next) {
    try {
        const { mfaChallenge, code } = req.body;
        const raw = await redis_1.redisClient.get(`mfa:${mfaChallenge}`);
        if (!raw)
            throw new AppError_1.AppError('MFA session expired', 401);
        const { userId, tenantId } = JSON.parse(raw);
        const user = await database_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.mfaSecret)
            throw new AppError_1.AppError('MFA not configured', 400);
        const valid = otplib_1.authenticator.verify({ token: code, secret: user.mfaSecret });
        if (!valid)
            throw new AppError_1.AppError('Invalid MFA code', 401);
        await redis_1.redisClient.del(`mfa:${mfaChallenge}`);
        const { accessToken, refreshToken } = signTokens(user.id, tenantId, user.role);
        await (0, audit_1.auditLog)({ tenantId, userId: user.id, action: 'MFA_VERIFIED', ipAddress: req.ip });
        res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role, tenantId } });
    }
    catch (err) {
        next(err);
    }
}
// POST /api/v1/auth/mfa/setup
async function setupMFA(req, res, next) {
    try {
        const userId = req.user.id;
        const secret = otplib_1.authenticator.generateSecret();
        const user = await database_1.prisma.user.findUnique({ where: { id: userId } });
        const otpauth = otplib_1.authenticator.keyuri(user.email, 'SEWA AI', secret);
        await redis_1.redisClient.setex(`mfa_setup:${userId}`, 600, secret);
        res.json({ secret, otpauthUrl: otpauth });
    }
    catch (err) {
        next(err);
    }
}
// POST /api/v1/auth/mfa/confirm
async function confirmMFA(req, res, next) {
    try {
        const userId = req.user.id;
        const { code } = req.body;
        const secret = await redis_1.redisClient.get(`mfa_setup:${userId}`);
        if (!secret)
            throw new AppError_1.AppError('MFA setup session expired', 400);
        const valid = otplib_1.authenticator.verify({ token: code, secret });
        if (!valid)
            throw new AppError_1.AppError('Invalid code', 400);
        await database_1.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true, mfaSecret: secret } });
        await redis_1.redisClient.del(`mfa_setup:${userId}`);
        await (0, audit_1.auditLog)({ userId, action: 'MFA_ENABLED' });
        res.json({ message: 'MFA enabled successfully' });
    }
    catch (err) {
        next(err);
    }
}
// POST /api/v1/auth/refresh
async function refreshToken(req, res, next) {
    try {
        const { refreshToken: token } = req.body;
        if (!token)
            throw new AppError_1.AppError('Refresh token required', 400);
        const session = await database_1.prisma.session.findUnique({ where: { token } });
        if (!session || session.expiresAt < new Date())
            throw new AppError_1.AppError('Invalid or expired session', 401);
        const decoded = jsonwebtoken_1.default.verify(token, env_1.config.JWT_REFRESH_SECRET);
        const { accessToken, refreshToken: newRefresh } = signTokens(decoded.sub, decoded.tenantId, decoded.role);
        await database_1.prisma.session.update({ where: { token }, data: { token: newRefresh, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
        res.json({ accessToken, refreshToken: newRefresh });
    }
    catch (err) {
        next(err);
    }
}
// POST /api/v1/auth/logout
async function logout(req, res, next) {
    try {
        const { refreshToken: token } = req.body;
        if (token)
            await database_1.prisma.session.deleteMany({ where: { token } });
        await (0, audit_1.auditLog)({ userId: req.user?.id, action: 'LOGOUT', ipAddress: req.ip });
        res.json({ message: 'Logged out successfully' });
    }
    catch (err) {
        next(err);
    }
}
// POST /api/v1/auth/register (Hospital self-registration)
async function register(req, res, next) {
    try {
        const { tenantSlug, firstName, lastName, email, password, role = 'doctor' } = req.body;
        const tenant = await database_1.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
        if (!tenant)
            throw new AppError_1.AppError('Tenant not found', 404);
        const existing = await database_1.prisma.user.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email } } });
        if (existing)
            throw new AppError_1.AppError('Email already registered', 409);
        const passwordHash = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
        const user = await database_1.prisma.user.create({
            data: { tenantId: tenant.id, email, passwordHash, firstName, lastName, role },
        });
        await (0, audit_1.auditLog)({ tenantId: tenant.id, userId: user.id, action: 'USER_REGISTERED', metadata: { role } });
        await (0, emailService_1.sendEmail)({ to: email, subject: 'Welcome to SEWA AI', template: 'welcome', data: { firstName, tenantName: tenant.name } });
        res.status(201).json({ message: 'Registration successful. Check your email for verification.' });
    }
    catch (err) {
        next(err);
    }
}
