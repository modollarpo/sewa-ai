"use strict";
// SEWA AI — backend/src/middleware/scanQuota.ts
// Enforces monthly scan quota per tenant plan before processing any scan.
// Called by scanController before triggerAITriage.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OVERAGE_RATES = void 0;
exports.enforceQuota = enforceQuota;
exports.incrementQuota = incrementQuota;
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
const AppError_1 = require("../utils/AppError");
// Monthly scan limits by plan (null = unlimited)
const PLAN_QUOTAS = {
    trial: 50,
    starter: 500,
    pro: 2000,
    enterprise: null, // unlimited
    impact: null, // Africa unlimited plan
    'impact+': null,
};
// Overage rates in USD per scan above quota
exports.OVERAGE_RATES = {
    starter: 2.99,
    pro: 1.99,
    enterprise: 0.99,
    trial: 0, // trial never charges overage — just blocks
    impact: 0,
    'impact+': 0,
};
// ── Middleware ─────────────────────────────────────────────────
async function enforceQuota(req, res, next) {
    try {
        const { tenantId } = req.user;
        const cacheKey = `quota:${tenantId}`;
        // Check Redis cache first (TTL 60s) to avoid DB hit on every scan
        const cached = await redis_1.redisClient.get(cacheKey).catch(() => null);
        let tenant;
        if (cached) {
            tenant = JSON.parse(cached);
        }
        else {
            tenant = await database_1.prisma.tenant.findUnique({
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
                await redis_1.redisClient.setex(cacheKey, 60, JSON.stringify(tenant)).catch(() => { });
            }
        }
        if (!tenant)
            return next(new AppError_1.AppError('Tenant not found', 404));
        // ── Check tenant status ──────────────────────────────────
        if (tenant.status === 'suspended') {
            throw new AppError_1.AppError('Account suspended. Contact support: support@sewaxai.health', 402);
        }
        // ── Check trial expiry ───────────────────────────────────
        if (tenant.subscriptionStatus === 'trial' && tenant.trialEndsAt) {
            if (new Date() > new Date(tenant.trialEndsAt)) {
                throw new AppError_1.AppError('Free trial expired. Upgrade to continue: https://app.sewaxai.health/billing', 402);
            }
        }
        // ── Check subscription status ────────────────────────────
        if (tenant.subscriptionStatus === 'past_due') {
            logger_1.logger.warn(`[Quota] Tenant ${tenantId} subscription is past_due`);
            // Allow 7-day grace period — log warning but don't block
        }
        if (tenant.subscriptionStatus === 'cancelled') {
            throw new AppError_1.AppError('Subscription cancelled. Reactivate at https://app.sewaxai.health/billing', 402);
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
                database_1.prisma.tenant.update({
                    where: { id: tenantId },
                    data: {
                        scansUsedThisMonth: 0,
                        billingCycleResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
                    },
                }).then(() => {
                    redis_1.redisClient.del(cacheKey).catch(() => null);
                }).catch((err) => {
                    logger_1.logger.error(`[Quota] Failed to reset billing cycle for ${tenantId}: ${err.message}`);
                });
                // Current request is in new cycle — allow it
                return next();
            }
            if (tenant.scansUsedThisMonth >= quota) {
                const overageRate = exports.OVERAGE_RATES[planKey] ?? 0;
                if (overageRate === 0) {
                    // Trial or impact plan — hard block
                    throw new AppError_1.AppError(`Monthly scan limit reached (${quota} scans). Upgrade your plan: https://app.sewaxai.health/billing`, 429);
                }
                // Pro/Starter — allow overage, flag for billing
                req.body._overage = true;
                req.body._overageRate = overageRate;
                logger_1.logger.info(`[Quota] Tenant ${tenantId} in overage: ${tenant.scansUsedThisMonth}/${quota} — rate £${overageRate}/scan`);
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
    }
    catch (err) {
        next(err);
    }
}
// ── Post-scan quota increment ──────────────────────────────────
async function incrementQuota(tenantId, overage, overageRate) {
    try {
        await database_1.prisma.tenant.update({
            where: { id: tenantId },
            data: { scansUsedThisMonth: { increment: 1 } },
        });
        // Invalidate Redis cache
        await redis_1.redisClient.del(`quota:${tenantId}`).catch(() => { });
        // If overage, record charge (async — don't block scan processing)
        if (overage && overageRate > 0) {
            const { chargePerScan } = await Promise.resolve().then(() => __importStar(require('../services/paymentService')));
            chargePerScan(tenantId, 1).catch(err => {
                logger_1.logger.error(`[Quota] Per-scan charge failed for ${tenantId}: ${err.message}`);
            });
        }
    }
    catch (err) {
        logger_1.logger.error(`[Quota] increment failed for ${tenantId}: ${err.message}`);
    }
}
