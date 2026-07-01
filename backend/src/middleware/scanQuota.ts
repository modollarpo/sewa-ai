// SEWA XAI — backend/src/middleware/scanQuota.ts
// Enforces monthly scan quota per tenant plan before processing any scan.
// Called by scanController before triggerAITriage.
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).

import { Request, Response, NextFunction } from 'express';
import { prisma }      from '../config/database';
import { redisClient } from '../config/redis';
import { logger }      from '../utils/logger';
import { AppError }    from '../utils/AppError';

// Monthly scan limits by plan (null = unlimited)
const PLAN_QUOTAS: Record<string, number | null> = {
  trial:      50,
  starter:    500,
  hospital:   5000,   // Hospital plan (formerly 'pro')
  enterprise: null,   // unlimited
  impact:     null,   // Africa unlimited plan
  'impact+':  null,
};

// Overage rates in USD per scan above quota
export const OVERAGE_RATES: Record<string, number> = {
  starter:    2.99,
  hospital:   1.99,   // Hospital plan (formerly 'pro')
  enterprise: 0.99,
  trial:      0,      // trial never charges overage — just blocks
  impact:     0,
  'impact+':  0,
};

// ── Middleware ─────────────────────────────────────────────────
export async function enforceQuota(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const cacheKey = `quota:${tenantId}`;

    // Check Redis cache first (TTL 60s) to avoid DB hit on every scan
    const cached = await redisClient.get(cacheKey).catch((): null => null);
    let tenant: any;

    if (cached) {
      tenant = JSON.parse(cached);
    } else {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          plan: true,
          status: true,
          scanQuota: true,
          scansUsedThisMonth: true,
          billingCycleResetAt: true,
          trialEndsAt: true,
          subscriptionStatus: true,
          region: true,
          currency: true,
        },
      });

      if (tenant) {
        await redisClient.setex(cacheKey, 60, JSON.stringify(tenant)).catch(() => {});
      }
    }

    if (!tenant) return next(new AppError('Tenant not found', 404));

    // ── Check tenant status ──────────────────────────────────
    if (tenant.status === 'suspended') {
      throw new AppError(
        'Account suspended. Contact support: support@sewaxai.health',
        402
      );
    }

    // ── Check trial expiry ───────────────────────────────────
    if (tenant.subscriptionStatus === 'trial' && tenant.trialEndsAt) {
      if (new Date() > new Date(tenant.trialEndsAt)) {
        throw new AppError(
          'Free trial expired. Upgrade to continue: https://app.sewaxai.health/billing',
          402
        );
      }
    }

    // ── Check subscription status ────────────────────────────
    if (tenant.subscriptionStatus === 'past_due') {
      logger.warn(`[Quota] Tenant ${tenantId} subscription is past_due`);
      // Allow 7-day grace period — log warning but don't block
    }

    if (tenant.subscriptionStatus === 'cancelled') {
      throw new AppError(
        'Subscription cancelled. Reactivate at https://app.sewaxai.health/billing',
        402
      );
    }

    // ── Check monthly quota ──────────────────────────────────
    const planKey = (tenant.plan || 'starter').toLowerCase();
    const quota = tenant.scanQuota ?? PLAN_QUOTAS[planKey] ?? PLAN_QUOTAS['starter'];

    if (quota !== null) {
      // Check if billing cycle needs resetting
      const now = new Date();
      const resetAt = tenant.billingCycleResetAt ? new Date(tenant.billingCycleResetAt) : null;

      if (resetAt && now > resetAt) {
        // Reset quota counter for new billing cycle (do this async — don't block)
        prisma.tenant.update({
          where: { id: tenantId },
          data: {
            scansUsedThisMonth: 0,
            billingCycleResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          },
        }).then((): void => {
          redisClient.del(cacheKey).catch((): null => null);
        }).catch((err: any): void => {
          logger.error(`[Quota] Failed to reset billing cycle for ${tenantId}: ${err.message}`);
        });

        // Current request is in new cycle — allow it
        return next();
      }

      if (tenant.scansUsedThisMonth >= quota) {
        const overageRate = OVERAGE_RATES[planKey] ?? 0;

        if (overageRate === 0) {
          // Trial or impact plan — hard block
          throw new AppError(
            `Monthly scan limit reached (${quota} scans). Upgrade your plan: https://app.sewaxai.health/billing`,
            429
          );
        }

        // Pro/Starter — allow overage, flag for billing
        req.body._overage = true;
        req.body._overageRate = overageRate;
        logger.info(`[Quota] Tenant ${tenantId} in overage: ${tenant.scansUsedThisMonth}/${quota} — rate £${overageRate}/scan`);
      }
    }

    // Attach quota info to request for use in controller
    req.body._quotaInfo = {
      plan: planKey,
      quota,
      used: tenant.scansUsedThisMonth,
      remaining: quota !== null ? Math.max(0, quota - tenant.scansUsedThisMonth) : null,
    };

    next();
  } catch (err) {
    next(err);
  }
}

// ── Post-scan quota increment ──────────────────────────────────
export async function incrementQuota(tenantId: string, overage: boolean, overageRate: number): Promise<void> {
  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { scansUsedThisMonth: { increment: 1 } },
    });

    // Invalidate Redis cache
    await redisClient.del(`quota:${tenantId}`).catch(() => {});

    // If overage, record charge (async — don't block scan processing)
    if (overage && overageRate > 0) {
      const { chargePerScan } = await import('../services/paymentService');
      chargePerScan(tenantId, 1).catch(err => {
        logger.error(`[Quota] Per-scan charge failed for ${tenantId}: ${err.message}`);
      });
    }
  } catch (err: any) {
    logger.error(`[Quota] increment failed for ${tenantId}: ${err.message}`);
  }
}
