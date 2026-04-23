"use strict";
// SEWA AI — backend/src/routes/payments.ts
// Full billing API: subscriptions, webhooks, usage, upgrade, cancel
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_2 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const paymentService_1 = require("../services/paymentService");
const database_1 = require("../config/database");
const AppError_1 = require("../utils/AppError");
const logger_1 = require("../utils/logger");
const r = (0, express_1.Router)();
// ── Webhooks (unauthenticated — called by payment providers) ──
r.post('/webhooks/stripe', express_2.default.raw({ type: 'application/json' }), async (req, res, next) => {
    try {
        await (0, paymentService_1.handleStripeWebhook)(req.body, req.headers['stripe-signature']);
        res.json({ received: true });
    }
    catch (err) {
        next(err);
    }
});
r.post('/webhooks/paystack', async (req, res, next) => {
    try {
        await (0, paymentService_1.handlePaystackWebhook)(req.body);
        res.json({ received: true });
    }
    catch (err) {
        next(err);
    }
});
r.post('/webhooks/flutterwave', async (req, res, next) => {
    try {
        await (0, paymentService_1.handleFlutterwaveWebhook)(req.body);
        res.json({ received: true });
    }
    catch (err) {
        next(err);
    }
});
r.post('/webhooks/mpesa', async (req, res, next) => {
    try {
        await (0, paymentService_1.handleMpesaWebhook)(req.body);
        res.json({ ResultCode: 0, ResultDesc: 'Success' });
    }
    catch (err) {
        next(err);
    }
});
// ── All routes below require authentication ───────────────────
r.use(auth_1.authenticate);
// ── GET /plans — list all available plans for tenant's region ─
r.get('/plans', async (req, res, next) => {
    try {
        const tenant = await database_1.prisma.tenant.findUnique({
            where: { id: req.user.tenantId },
            select: { region: true, currency: true, plan: true, subscriptionStatus: true },
        });
        // Return plan config with region-appropriate pricing
        const region = tenant?.region ?? 'uk';
        const plans = Object.entries(paymentService_1.PLANS).map(([key, plan]) => ({
            id: key,
            name: key.charAt(0).toUpperCase() + key.slice(1),
            priceUSD: plan.priceUSD,
            scans: plan.scans,
            isCurrent: tenant?.plan === key,
        }));
        res.json({ plans, region, currency: tenant?.currency, currentPlan: tenant?.plan });
    }
    catch (err) {
        next(err);
    }
});
// ── GET /status — current subscription and quota status ───────
r.get('/status', async (req, res, next) => {
    try {
        const tenant = await database_1.prisma.tenant.findUnique({
            where: { id: req.user.tenantId },
            select: {
                plan: true, subscriptionStatus: true, subscriptionId: true,
                scanQuota: true, scansUsedThisMonth: true,
                billingCycleResetAt: true, trialEndsAt: true, nextBillDate: true,
                region: true, currency: true,
            },
        });
        if (!tenant)
            throw new AppError_1.AppError('Tenant not found', 404);
        const used = tenant.scansUsedThisMonth;
        const quota = tenant.scanQuota;
        const percentUsed = quota ? Math.round((used / quota) * 100) : 0;
        res.json({
            plan: tenant.plan,
            subscriptionStatus: tenant.subscriptionStatus,
            subscriptionId: tenant.subscriptionId,
            quota: {
                monthly: quota,
                used,
                remaining: quota ? Math.max(0, quota - used) : null,
                percentUsed,
                resetAt: tenant.billingCycleResetAt,
            },
            trial: {
                active: tenant.subscriptionStatus === 'trial',
                endsAt: tenant.trialEndsAt,
                daysLeft: tenant.trialEndsAt
                    ? Math.max(0, Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / 86400000))
                    : null,
            },
            nextBillDate: tenant.nextBillDate,
            region: tenant.region,
            currency: tenant.currency,
        });
    }
    catch (err) {
        next(err);
    }
});
// ── POST /subscription — create / upgrade subscription ────────
r.post('/subscription', (0, auth_1.authorize)('admin', 'superadmin'), async (req, res, next) => {
    try {
        const { tenantId } = req.user;
        const { plan, phone } = req.body;
        if (!plan)
            throw new AppError_1.AppError('plan is required', 400);
        if (!paymentService_1.PLANS[plan])
            throw new AppError_1.AppError(`Unknown plan: ${plan}`, 400);
        const tenant = await database_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { region: true, currency: true, name: true },
        });
        if (!tenant)
            throw new AppError_1.AppError('Tenant not found', 404);
        // Route to M-Pesa if Kenya/Tanzania and phone provided
        if (['ke', 'tz'].includes(tenant.region) && phone) {
            const planConf = paymentService_1.PLANS[plan];
            const amount = planConf.priceUSD ?? 0;
            const result = await (0, paymentService_1.initiateMpesaSTK)(tenantId, phone, amount, tenant.currency);
            return res.json(result);
        }
        const result = await (0, paymentService_1.createSubscription)(tenantId, plan, tenant.region, tenant.currency);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// ── POST /subscription/cancel ────────────────────────────────
r.post('/subscription/cancel', (0, auth_1.authorize)('admin', 'superadmin'), async (req, res, next) => {
    try {
        const { tenantId } = req.user;
        const tenant = await database_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { subscriptionId: true, subscriptionStatus: true },
        });
        if (!tenant?.subscriptionId)
            throw new AppError_1.AppError('No active subscription found', 404);
        // Cancel at Stripe (if applicable) — non-fatal
        try {
            const Stripe = (await Promise.resolve().then(() => __importStar(require('stripe')))).default;
            const { config } = await Promise.resolve().then(() => __importStar(require('../config/env')));
            const stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
            await stripe.subscriptions.cancel(tenant.subscriptionId);
        }
        catch (e) {
            logger_1.logger.warn(`[Billing] Stripe cancellation failed (may be non-Stripe): ${e.message}`);
        }
        await database_1.prisma.tenant.update({
            where: { id: tenantId },
            data: { subscriptionStatus: 'cancelled', plan: 'trial', scanQuota: 50 },
        });
        logger_1.logger.info(`[Billing] Tenant ${tenantId} cancelled subscription`);
        res.json({ message: 'Subscription cancelled. Access continues until end of billing period.' });
    }
    catch (err) {
        next(err);
    }
});
// ── GET /history — payment history ───────────────────────────
r.get('/history', (0, auth_1.authorize)('admin', 'superadmin'), async (req, res, next) => {
    try {
        const { page = '1', limit = '20' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [payments, total] = await Promise.all([
            database_1.prisma.payment.findMany({
                where: { tenantId: req.user.tenantId },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                skip,
            }),
            database_1.prisma.payment.count({ where: { tenantId: req.user.tenantId } }),
        ]);
        res.json({ payments, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    }
    catch (err) {
        next(err);
    }
});
// ── GET /usage — current month scan usage detail ─────────────
r.get('/usage', async (req, res, next) => {
    try {
        const { tenantId } = req.user;
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const [tenant, scansByDay] = await Promise.all([
            database_1.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { plan: true, scanQuota: true, scansUsedThisMonth: true, currency: true },
            }),
            database_1.prisma.scan.groupBy({
                by: ['receivedAt'],
                where: { tenantId, receivedAt: { gte: monthStart } },
                _count: { id: true },
            }),
        ]);
        if (!tenant)
            throw new AppError_1.AppError('Tenant not found', 404);
        // Overage calculation
        const used = tenant.scansUsedThisMonth;
        const quota = tenant.scanQuota;
        const overage = quota ? Math.max(0, used - quota) : 0;
        const overageRate = 1.99; // TODO: pull from OVERAGE_RATES per plan
        const estimatedOverageCharge = overage * overageRate;
        res.json({
            plan: tenant.plan,
            currentPeriod: { start: monthStart, end: new Date(now.getFullYear(), now.getMonth() + 1, 0) },
            scans: { quota, used, remaining: quota ? Math.max(0, quota - used) : null, overage },
            estimatedOverageCharge,
            currency: tenant.currency,
            dailyBreakdown: scansByDay,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = r;
