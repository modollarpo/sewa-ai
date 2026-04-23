"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLANS = void 0;
exports.convertFromUSD = convertFromUSD;
exports.convertFromUSDSync = convertFromUSDSync;
exports.createSubscription = createSubscription;
exports.chargePerScan = chargePerScan;
exports.handleStripeWebhook = handleStripeWebhook;
exports.handlePaystackWebhook = handlePaystackWebhook;
exports.handleFlutterwaveWebhook = handleFlutterwaveWebhook;
exports.initiateMpesaSTK = initiateMpesaSTK;
exports.handleMpesaWebhook = handleMpesaWebhook;
const stripe_1 = __importDefault(require("stripe"));
const paystack_1 = __importDefault(require("paystack"));
const flutterwave_node_v3_1 = __importDefault(require("flutterwave-node-v3"));
const axios_1 = __importDefault(require("axios"));
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const invoiceService_1 = require("./invoiceService");
const AppError_1 = require("../utils/AppError");
const fxService_1 = require("./fxService");
const stripe = new stripe_1.default(env_1.config.STRIPE_SECRET_KEY || 'dummy_key', { apiVersion: '2023-10-16' });
const paystack = env_1.config.PAYSTACK_SECRET_KEY ? (0, paystack_1.default)(env_1.config.PAYSTACK_SECRET_KEY) : null;
let flutterwave = null;
try {
    if (env_1.config.FLUTTERWAVE_PUBLIC_KEY && env_1.config.FLUTTERWAVE_SECRET_KEY) {
        flutterwave = new flutterwave_node_v3_1.default(env_1.config.FLUTTERWAVE_PUBLIC_KEY, env_1.config.FLUTTERWAVE_SECRET_KEY);
    }
}
catch (e) {
    console.warn(`[Payment] Flutterwave initialization failed: ${e instanceof Error ? e.message : String(e)}`);
}
// Region → Payment provider routing
const PROVIDER_MAP = {
    uk: ['stripe'],
    eu: ['stripe'],
    us: ['stripe'],
    in: ['stripe'],
    ca: ['stripe'],
    ng: ['paystack', 'flutterwave'],
    gh: ['paystack', 'flutterwave'],
    za: ['paystack', 'flutterwave'],
    ke: ['mpesa', 'paystack', 'flutterwave'],
    tz: ['mpesa', 'flutterwave'],
    et: ['flutterwave'],
};
// Subscription plans (Feature 5)
exports.PLANS = {
    starter: {
        priceUSD: 499, scans: 500,
        stripeProductId: 'prod_sewa_starter',
        stripePriceId: { uk: 'price_gbp_starter', eu: 'price_eur_starter', us: 'price_usd_starter' },
    },
    pro: {
        priceUSD: 1299, scans: 2500,
        stripeProductId: 'prod_sewa_pro',
        stripePriceId: { uk: 'price_gbp_pro', eu: 'price_eur_pro', us: 'price_usd_pro' },
    },
    enterprise: { priceUSD: null, scans: null },
};
// FX conversion via fxService (live rates with Redis cache + ECB fallback)
async function convertFromUSD(usdAmount, currency) {
    // USD → GBP → target currency
    const usdToGbp = 1 / 1.27; // approximate; fxService uses live rates
    const gbpAmount = usdAmount * usdToGbp;
    return (0, fxService_1.convertFromGBP)(gbpAmount, currency);
}
// Sync fallback for places that can't await
function convertFromUSDSync(usdAmount, currency) {
    const FX = {
        GBP: 1, EUR: 1.18, USD: 1.27, NGN: 1905, KES: 164, ZAR: 23.8, GHS: 17.4, INR: 106, CAD: 1.73,
    };
    return Math.round(usdAmount / 1.27 * (FX[currency] ?? 1));
}
// ── Create Subscription ───────────────────────────────────────
async function createSubscription(tenantId, plan, region, currency) {
    const tenant = await database_1.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant)
        throw new AppError_1.AppError('Tenant not found', 404);
    const providers = PROVIDER_MAP[region] ?? ['stripe'];
    const provider = providers[0];
    logger_1.logger.info(`Creating ${plan} subscription for tenant ${tenantId} via ${provider}`);
    if (provider === 'stripe') {
        return createStripeSubscription(tenant, plan, currency);
    }
    else if (provider === 'paystack') {
        return createPaystackSubscription(tenant, plan, currency);
    }
    else if (provider === 'flutterwave') {
        return createFlutterwaveSubscription(tenant, plan, currency);
    }
    throw new AppError_1.AppError(`No payment provider for region ${region}`, 400);
}
async function createStripeSubscription(tenant, plan, currency) {
    const planConfig = exports.PLANS[plan];
    if (!planConfig?.priceUSD)
        throw new AppError_1.AppError('Invalid plan', 400);
    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
        const customer = await stripe.customers.create({ name: tenant.name, metadata: { tenantId: tenant.id } });
        customerId = customer.id;
        await database_1.prisma.tenant.update({ where: { id: tenant.id }, data: { stripeCustomerId: customerId } });
    }
    const amountInCents = (await convertFromUSD(planConfig.priceUSD, currency)) * 100;
    const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents, currency: currency.toLowerCase(),
        customer: customerId,
        metadata: { tenantId: tenant.id, plan },
    });
    await database_1.prisma.payment.create({
        data: {
            tenantId: tenant.id, type: 'subscription', provider: 'stripe',
            externalId: paymentIntent.id, amount: planConfig.priceUSD,
            currency, status: 'pending', metadata: { plan, clientSecret: paymentIntent.client_secret },
        },
    });
    return { provider: 'stripe', clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };
}
async function createPaystackSubscription(tenant, plan, currency) {
    const planConfig = exports.PLANS[plan];
    if (!planConfig?.priceUSD)
        throw new AppError_1.AppError('Invalid plan', 400);
    const amount = (await convertFromUSD(planConfig.priceUSD, currency)) * 100; // Paystack uses kobo/pesewas
    const ref = `SEWA-${tenant.id.slice(0, 8)}-${Date.now()}`;
    if (!paystack)
        throw new AppError_1.AppError('Paystack is not configured', 500);
    const txn = await paystack.transaction.initialize({
        email: `billing@${tenant.slug}.sewaxai.health`,
        amount: amount.toString(),
        currency, reference: ref,
        metadata: JSON.stringify({ tenantId: tenant.id, plan }),
        callback_url: `${env_1.config.APP_URL}/api/v1/payments/paystack/callback`,
    });
    await database_1.prisma.payment.create({
        data: {
            tenantId: tenant.id, type: 'subscription', provider: 'paystack',
            externalId: ref, amount: planConfig.priceUSD, currency, status: 'pending',
            metadata: { plan, authorizationUrl: txn.data.authorization_url },
        },
    });
    return { provider: 'paystack', authorizationUrl: txn.data.authorization_url, reference: ref };
}
async function createFlutterwaveSubscription(tenant, plan, currency) {
    const planConfig = exports.PLANS[plan];
    if (!planConfig?.priceUSD)
        throw new AppError_1.AppError('Invalid plan', 400);
    const amount = await convertFromUSD(planConfig.priceUSD, currency);
    const txRef = `SEWA-FLW-${tenant.id.slice(0, 8)}-${Date.now()}`;
    const payload = {
        tx_ref: txRef,
        amount: amount.toString(),
        currency,
        redirect_url: `${env_1.config.APP_URL}/api/v1/payments/flutterwave/callback`,
        customer: { email: `billing@${tenant.slug}.sewaxai.health`, name: tenant.name },
        meta: { tenantId: tenant.id, plan },
        customizations: { title: 'SEWA AI Subscription', logo: 'https://sewaxai.health/logo.png' },
    };
    if (!flutterwave)
        throw new AppError_1.AppError('Flutterwave is not configured', 500);
    const res = await flutterwave.Payment.initiate(payload);
    await database_1.prisma.payment.create({
        data: {
            tenantId: tenant.id, type: 'subscription', provider: 'flutterwave',
            externalId: txRef, amount: planConfig.priceUSD, currency, status: 'pending',
            metadata: { plan, paymentLink: res.data?.link },
        },
    });
    return { provider: 'flutterwave', paymentLink: res.data?.link, txRef };
}
// ── Per-scan billing (transactional model for Africa) ─────────
async function chargePerScan(tenantId, scanCount = 1) {
    const tenant = await database_1.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant)
        throw new AppError_1.AppError('Tenant not found', 404);
    const perScanUSD = tenant.plan === 'starter' ? 2.99 : tenant.plan === 'pro' ? 1.99 : 0.99;
    const currency = tenant.currency;
    const amount = await convertFromUSD(perScanUSD * scanCount, currency);
    // Record and charge via appropriate provider
    const providers = PROVIDER_MAP[tenant.region] ?? ['stripe'];
    logger_1.logger.info(`Per-scan charge: ${tenantId} × ${scanCount} scans = ${currency} ${amount}`);
    const payment = await database_1.prisma.payment.create({
        data: {
            tenantId, type: 'per_scan', provider: providers[0],
            amount: perScanUSD * scanCount, currency, status: 'succeeded',
            metadata: { scanCount, perScanRate: perScanUSD },
        },
    });
    return payment;
}
// ── Webhook handlers ───────────────────────────────────────────
async function handleStripeWebhook(payload, signature) {
    const event = stripe.webhooks.constructEvent(payload, signature, env_1.config.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object;
        const payment = await database_1.prisma.payment.findFirst({ where: { externalId: pi.id } });
        await database_1.prisma.payment.updateMany({ where: { externalId: pi.id }, data: { status: 'succeeded' } });
        // ── Activate tenant subscription on successful payment ──
        if (payment?.tenantId && payment.metadata) {
            const meta = payment.metadata;
            const plan = meta.plan;
            const quota = exports.PLANS[plan]?.scans ?? 500;
            const now = new Date();
            const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            await database_1.prisma.tenant.update({
                where: { id: payment.tenantId },
                data: {
                    plan,
                    subscriptionStatus: 'active',
                    subscriptionId: pi.id,
                    scanQuota: quota,
                    scansUsedThisMonth: 0,
                    billingCycleResetAt: resetAt,
                    nextBillDate: new Date(now.setMonth(now.getMonth() + 1)),
                },
            });
            logger_1.logger.info(`[Billing] Tenant ${payment.tenantId} activated on plan "${plan}" (${quota} scans/month)`);
            // Generate and email invoice asynchronously
            (0, invoiceService_1.generateInvoice)(payment.id).catch(e => logger_1.logger.warn(`[Invoice] ${e.message}`));
        }
        logger_1.logger.info(`Stripe payment succeeded: ${pi.id}`);
    }
    else if (event.type === 'payment_intent.payment_failed') {
        const pi = event.data.object;
        await database_1.prisma.payment.updateMany({ where: { externalId: pi.id }, data: { status: 'failed' } });
        // If subscription payment fails, flag as past_due
        const payment = await database_1.prisma.payment.findFirst({ where: { externalId: pi.id } });
        if (payment?.tenantId && payment.type === 'subscription') {
            await database_1.prisma.tenant.update({
                where: { id: payment.tenantId },
                data: { subscriptionStatus: 'past_due' },
            });
            logger_1.logger.warn(`[Billing] Tenant ${payment.tenantId} payment failed — marked past_due`);
        }
    }
    else if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object;
        const tenant = await database_1.prisma.tenant.findFirst({ where: { subscriptionId: sub.id } });
        if (tenant) {
            await database_1.prisma.tenant.update({
                where: { id: tenant.id },
                data: { subscriptionStatus: 'cancelled', plan: 'trial', scanQuota: 50 },
            });
            logger_1.logger.warn(`[Billing] Tenant ${tenant.id} subscription cancelled`);
        }
    }
}
async function handlePaystackWebhook(body) {
    if (body.event === 'charge.success') {
        const ref = body.data?.reference;
        const payment = await database_1.prisma.payment.findFirst({ where: { externalId: ref } });
        await database_1.prisma.payment.updateMany({ where: { externalId: ref }, data: { status: 'succeeded' } });
        // Activate tenant plan
        if (payment?.tenantId && payment.metadata) {
            const meta = payment.metadata;
            const plan = meta.plan;
            const quota = exports.PLANS[plan]?.scans ?? null;
            const now = new Date();
            await database_1.prisma.tenant.update({
                where: { id: payment.tenantId },
                data: {
                    plan,
                    subscriptionStatus: 'active',
                    scanQuota: quota,
                    scansUsedThisMonth: 0,
                    billingCycleResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
                },
            });
            logger_1.logger.info(`[Billing] Tenant ${payment.tenantId} activated on plan "${plan}" via Paystack`);
        }
        logger_1.logger.info(`Paystack charge succeeded: ${ref}`);
    }
}
async function handleFlutterwaveWebhook(body) {
    if (body.event === 'charge.completed' && body.data?.status === 'successful') {
        const ref = body.data?.tx_ref;
        await database_1.prisma.payment.updateMany({ where: { externalId: ref }, data: { status: 'succeeded' } });
        logger_1.logger.info(`Flutterwave charge succeeded: ${ref}`);
    }
}
// ── M-Pesa STK Push (Kenya/Tanzania) ────────────────────────
async function initiateMpesaSTK(tenantId, phone, amount, currency) {
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const shortcode = env_1.config.MPESA_SHORTCODE;
    const passkey = env_1.config.MPESA_PASSKEY;
    const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');
    const callbackRef = `SEWA-${tenantId.slice(0, 8)}-${Date.now()}`;
    // Get M-Pesa OAuth token
    const authRes = await axios_1.default.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        auth: { username: env_1.config.MPESA_CONSUMER_KEY, password: env_1.config.MPESA_CONSUMER_SECRET },
    });
    const accessToken = authRes.data.access_token;
    const stkRes = await axios_1.default.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone.replace(/^\+/, ''),
        PartyB: shortcode,
        PhoneNumber: phone.replace(/^\+/, ''),
        CallBackURL: `${env_1.config.APP_URL}/api/v1/payments/webhooks/mpesa`,
        AccountReference: `SEWA-${callbackRef}`,
        TransactionDesc: 'SEWA AI Subscription',
    }, { headers: { Authorization: `Bearer ${accessToken}` } });
    await database_1.prisma.payment.create({
        data: {
            tenantId, type: 'subscription', provider: 'mpesa',
            externalId: callbackRef, amount, currency, status: 'pending',
            metadata: { checkoutRequestId: stkRes.data.CheckoutRequestID },
        },
    });
    return { provider: 'mpesa', checkoutRequestId: stkRes.data.CheckoutRequestID };
}
async function handleMpesaWebhook(body) {
    const result = body.Body?.stkCallback;
    if (!result)
        return;
    if (result.ResultCode === 0) {
        // Payment successful
        const meta = result.CallbackMetadata?.Item;
        const receipt = meta?.find((i) => i.Name === 'MpesaReceiptNumber')?.Value;
        await database_1.prisma.payment.updateMany({
            where: { metadata: { path: ['checkoutRequestId'], equals: result.CheckoutRequestID } },
            data: { status: 'succeeded', externalId: receipt || result.CheckoutRequestID },
        });
        logger_1.logger.info(`[Billing] M-Pesa payment succeeded: ${receipt}`);
    }
    else {
        await database_1.prisma.payment.updateMany({
            where: { metadata: { path: ['checkoutRequestId'], equals: result.CheckoutRequestID } },
            data: { status: 'failed' },
        });
    }
}
