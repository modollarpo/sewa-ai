// SEWA AI — backend/src/routes/payments.ts
// Full billing API: subscriptions, webhooks, usage, upgrade, cancel
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).

import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  createSubscription,
  chargePerScan,
  initiateMpesaSTK,
  handleStripeWebhook,
  handlePaystackWebhook,
  handleFlutterwaveWebhook,
  handleMpesaWebhook,
  PLANS,
} from '../services/paymentService';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

const r = Router();

// ── Webhooks (unauthenticated — called by payment providers) ──
r.post('/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handleStripeWebhook(req.body, req.headers['stripe-signature'] as string);
      res.json({ received: true });
    } catch (err) { next(err); }
  }
);

r.post('/webhooks/paystack', async (req: Request, res: Response, next: NextFunction) => {
  try { await handlePaystackWebhook(req.body); res.json({ received: true }); }
  catch (err) { next(err); }
});

r.post('/webhooks/flutterwave', async (req: Request, res: Response, next: NextFunction) => {
  try { await handleFlutterwaveWebhook(req.body); res.json({ received: true }); }
  catch (err) { next(err); }
});

r.post('/webhooks/mpesa', async (req: Request, res: Response, next: NextFunction) => {
  try { await handleMpesaWebhook(req.body); res.json({ ResultCode: 0, ResultDesc: 'Success' }); }
  catch (err) { next(err); }
});

// ── All routes below require authentication ───────────────────
r.use(authenticate);

// ── GET /plans — list all available plans for tenant's region ─
r.get('/plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user!.tenantId },
      select: { region: true, currency: true, plan: true, subscriptionStatus: true },
    });

    // Return plan config with region-appropriate pricing
    const region = tenant?.region ?? 'uk';
    const plans = Object.entries(PLANS).map(([key, plan]) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      priceUSD: plan.priceUSD,
      scans: plan.scans,
      isCurrent: tenant?.plan === key,
    }));

    res.json({ plans, region, currency: tenant?.currency, currentPlan: tenant?.plan });
  } catch (err) { next(err); }
});

// ── GET /status — current subscription and quota status ───────
r.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user!.tenantId },
      select: {
        plan: true, subscriptionStatus: true, subscriptionId: true,
        scanQuota: true, scansUsedThisMonth: true,
        billingCycleResetAt: true, trialEndsAt: true, nextBillDate: true,
        region: true, currency: true,
      },
    });
    if (!tenant) throw new AppError('Tenant not found', 404);

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
  } catch (err) { next(err); }
});

// ── POST /subscription — create / upgrade subscription ────────
r.post('/subscription',
  authorize('admin', 'superadmin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req.user!;
      const { plan, phone } = req.body;

      if (!plan) throw new AppError('plan is required', 400);
      if (!PLANS[plan as keyof typeof PLANS]) throw new AppError(`Unknown plan: ${plan}`, 400);

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { region: true, currency: true, name: true },
      });
      if (!tenant) throw new AppError('Tenant not found', 404);

      // Route to M-Pesa if Kenya/Tanzania and phone provided
      if (['ke', 'tz'].includes(tenant.region) && phone) {
        const planConf = PLANS[plan as keyof typeof PLANS];
        const amount = planConf.priceUSD ?? 0;
        const result = await initiateMpesaSTK(tenantId, phone, amount, tenant.currency);
        return res.json(result);
      }

      const result = await createSubscription(tenantId, plan, tenant.region, tenant.currency);
      res.json(result);
    } catch (err) { next(err); }
  }
);

// ── POST /subscription/cancel ────────────────────────────────
r.post('/subscription/cancel',
  authorize('admin', 'superadmin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req.user!;
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { subscriptionId: true, subscriptionStatus: true },
      });

      if (!tenant?.subscriptionId) throw new AppError('No active subscription found', 404);

      // Cancel at Stripe (if applicable) — non-fatal
      try {
        const Stripe = (await import('stripe')).default;
        const { config } = await import('../config/env');
        const stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
        await stripe.subscriptions.cancel(tenant.subscriptionId);
      } catch (e: any) {
        logger.warn(`[Billing] Stripe cancellation failed (may be non-Stripe): ${e.message}`);
      }

      await prisma.tenant.update({
        where: { id: tenantId },
        data: { subscriptionStatus: 'cancelled', plan: 'trial', scanQuota: 50 },
      });

      logger.info(`[Billing] Tenant ${tenantId} cancelled subscription`);
      res.json({ message: 'Subscription cancelled. Access continues until end of billing period.' });
    } catch (err) { next(err); }
  }
);

// ── GET /history — payment history ───────────────────────────
r.get('/history',
  authorize('admin', 'superadmin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = '1', limit = '20' } = req.query as Record<string, string>;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where: { tenantId: req.user!.tenantId },
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          skip,
        }),
        prisma.payment.count({ where: { tenantId: req.user!.tenantId } }),
      ]);
      res.json({ payments, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    } catch (err) { next(err); }
  }
);

// ── GET /usage — current month scan usage detail ─────────────
r.get('/usage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.user!;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [tenant, scansByDay] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true, scanQuota: true, scansUsedThisMonth: true, currency: true },
      }),
      prisma.scan.groupBy({
        by: ['receivedAt'],
        where: { tenantId, receivedAt: { gte: monthStart } },
        _count: { id: true },
      }),
    ]);

    if (!tenant) throw new AppError('Tenant not found', 404);

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
  } catch (err) { next(err); }
});

export default r;
