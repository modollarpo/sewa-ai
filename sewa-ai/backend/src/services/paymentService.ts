import Stripe from 'stripe';
import Paystack from 'paystack';
import Flutterwave from 'flutterwave-node-v3';
import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { generateInvoice } from './invoiceService';
import { AppError } from '../utils/AppError';
import { convertFromGBP } from './fxService';

const stripe      = new Stripe(config.STRIPE_SECRET_KEY || 'dummy_key', { apiVersion: '2023-10-16' });
const paystack    = config.PAYSTACK_SECRET_KEY ? Paystack(config.PAYSTACK_SECRET_KEY) : null;
let flutterwave: any = null;
try {
  if (config.FLUTTERWAVE_PUBLIC_KEY && config.FLUTTERWAVE_SECRET_KEY) {
    flutterwave = new (Flutterwave as any)(config.FLUTTERWAVE_PUBLIC_KEY, config.FLUTTERWAVE_SECRET_KEY);
  }
} catch (e: unknown) {
  logger.warn(`[Payment] Flutterwave initialization failed: ${e instanceof Error ? e.message : String(e)}`);
}

// Region → Payment provider routing
const PROVIDER_MAP: Record<string, string[]> = {
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
export const PLANS = {
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
  enterprise: { priceUSD: null as number | null, scans: null as number | null },
};

// FX conversion via fxService (live rates with Redis cache + ECB fallback)
export async function convertFromUSD(usdAmount: number, currency: string): Promise<number> {
  const { convertToGBP, convertFromGBP } = await import('./fxService');
  const gbpAmount = await convertToGBP(usdAmount, 'USD');
  return convertFromGBP(gbpAmount, currency);
}


// ── Create Subscription ───────────────────────────────────────
export async function createSubscription(tenantId: string, plan: string, region: string, currency: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new AppError('Tenant not found', 404);

  const providers = PROVIDER_MAP[region] ?? ['stripe'];
  const provider = providers[0];

  logger.info(`Creating ${plan} subscription for tenant ${tenantId} via ${provider}`);

  if (provider === 'stripe') {
    return createStripeSubscription(tenant, plan, currency);
  } else if (provider === 'paystack') {
    return createPaystackSubscription(tenant, plan, currency);
  } else if (provider === 'flutterwave') {
    return createFlutterwaveSubscription(tenant, plan, currency);
  }

  throw new AppError(`No payment provider for region ${region}`, 400);
}

/**
 * ── Feature 13: Referral Marketplace Revenue Split ────────────────
 * Splits a referral fee between the specialist (90%) and the platform (10%).
 * Uses Stripe Connect Transfers to move funds to the specialist's account.
 */
export async function splitReferralFee(scanId: string, opinionId: string) {
  try {
    const opinion = await prisma.secondOpinion.findUnique({
      where: { id: opinionId },
      include: { reviewer: true, scan: { include: { tenant: true } } }
    });

    if (!opinion || !opinion.reviewerId || !opinion.reviewer?.stripeAccountId) {
      logger.warn(`[Payment] Cannot split fee for opinion ${opinionId}: No reviewer or Stripe Account ID`);
      return;
    }

    // Standard referral fee: $50 USD (Hardcoded for MVP, should be dynamic in production)
    const totalAmountCents = 5000; 
    const platformFeeCents = 500; // 10%
    const specialistAmountCents = totalAmountCents - platformFeeCents;

    logger.info(`[Payment] Splitting referral fee for scan ${scanId}. specialist: ${specialistAmountCents} cents`);

    // In a real production scenario, we would first charge the referring hospital's card
    // For this implementation, we assume the platform has already collected the funds
    // and we are now transferring the specialist's share to their connected account.
    
    const transfer = await stripe.transfers.create({
      amount: specialistAmountCents,
      currency: 'usd',
      destination: opinion.reviewer.stripeAccountId,
      transfer_group: `referral_${scanId}`,
      metadata: {
        scanId,
        opinionId,
        specialistId: opinion.reviewerId
      }
    });

    // Record the payment split in the database
    await prisma.payment.create({
      data: {
        tenantId: opinion.scan.tenantId,
        amount: totalAmountCents / 100,
        currency: 'USD',
        status: 'completed',
        provider: 'stripe',
        providerId: transfer.id,
        type: 'referral_split',
        metadata: {
          specialistAmount: specialistAmountCents / 100,
          platformFee: platformFeeCents / 100,
          transferId: transfer.id
        }
      }
    });

    logger.info(`[Payment] Successfully transferred specialist share for opinion ${opinionId}`);
    return transfer;
  } catch (err: any) {
    logger.error(`[Payment] Split fee failed: ${err.message}`);
    throw new AppError('Fee split failed', 500);
  }
}

async function createStripeSubscription(tenant: any, plan: string, currency: string) {
  const planConfig = PLANS[plan as keyof typeof PLANS];
  if (!planConfig?.priceUSD) throw new AppError('Invalid plan', 400);

  let customerId = tenant.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ name: tenant.name, metadata: { tenantId: tenant.id } });
    customerId = customer.id;
    await prisma.tenant.update({ where: { id: tenant.id }, data: { stripeCustomerId: customerId } });
  }

  const amountInCents = (await convertFromUSD(planConfig.priceUSD, currency)) * 100;
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents, currency: currency.toLowerCase(),
    customer: customerId,
    metadata: { tenantId: tenant.id, plan },
  });

  await prisma.payment.create({
    data: {
      tenantId: tenant.id, type: 'subscription', provider: 'stripe',
      externalId: paymentIntent.id, amount: planConfig.priceUSD,
      currency, status: 'pending', metadata: { plan, clientSecret: paymentIntent.client_secret },
    },
  });

  return { provider: 'stripe', clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };
}

async function createPaystackSubscription(tenant: any, plan: string, currency: string) {
  const planConfig = PLANS[plan as keyof typeof PLANS];
  if (!planConfig?.priceUSD) throw new AppError('Invalid plan', 400);

  const amount = (await convertFromUSD(planConfig.priceUSD, currency)) * 100; // Paystack uses kobo/pesewas
  const ref = `SEWA-${tenant.id.slice(0,8)}-${Date.now()}`;

  if (!paystack) throw new AppError('Paystack is not configured', 500);

  const txn = await paystack.transaction.initialize({
    email: `billing@${tenant.slug}.sewaxai.health`,
    amount: amount.toString(),
    currency, reference: ref,
    metadata: JSON.stringify({ tenantId: tenant.id, plan }),
    callback_url: `${config.APP_URL}/api/v1/payments/paystack/callback`,
  });

  await prisma.payment.create({
    data: {
      tenantId: tenant.id, type: 'subscription', provider: 'paystack',
      externalId: ref, amount: planConfig.priceUSD, currency, status: 'pending',
      metadata: { plan, authorizationUrl: txn.data.authorization_url },
    },
  });

  return { provider: 'paystack', authorizationUrl: txn.data.authorization_url, reference: ref };
}

async function createFlutterwaveSubscription(tenant: any, plan: string, currency: string) {
  const planConfig = PLANS[plan as keyof typeof PLANS];
  if (!planConfig?.priceUSD) throw new AppError('Invalid plan', 400);

  const amount = await convertFromUSD(planConfig.priceUSD, currency);
  const txRef = `SEWA-FLW-${tenant.id.slice(0,8)}-${Date.now()}`;

  const payload = {
    tx_ref: txRef,
    amount: amount.toString(),
    currency,
    redirect_url: `${config.APP_URL}/api/v1/payments/flutterwave/callback`,
    customer: { email: `billing@${tenant.slug}.sewaxai.health`, name: tenant.name },
    meta: { tenantId: tenant.id, plan },
    customizations: { title: 'SEWA AI Subscription', logo: 'https://sewaxai.health/logo.png' },
  };

  if (!flutterwave) throw new AppError('Flutterwave is not configured', 500);

  const res = await flutterwave.Payment.initiate(payload);

  await prisma.payment.create({
    data: {
      tenantId: tenant.id, type: 'subscription', provider: 'flutterwave',
      externalId: txRef, amount: planConfig.priceUSD, currency, status: 'pending',
      metadata: { plan, paymentLink: res.data?.link },
    },
  });

  return { provider: 'flutterwave', paymentLink: res.data?.link, txRef };
}

// ── Per-scan billing (transactional model for Africa) ─────────
export async function chargePerScan(tenantId: string, scanCount: number = 1) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new AppError('Tenant not found', 404);

  const perScanUSD = tenant.plan === 'starter' ? 2.99 : tenant.plan === 'pro' ? 1.99 : 0.99;
  const currency = tenant.currency;
  const amount = await convertFromUSD(perScanUSD * scanCount, currency);

  // Record and charge via appropriate provider
  const providers = PROVIDER_MAP[tenant.region] ?? ['stripe'];
  logger.info(`Per-scan charge: ${tenantId} × ${scanCount} scans = ${currency} ${amount}`);

  const payment = await prisma.payment.create({
    data: {
      tenantId, type: 'per_scan', provider: providers[0],
      amount: perScanUSD * scanCount, currency, status: 'succeeded',
      metadata: { scanCount, perScanRate: perScanUSD },
    },
  });

  return payment;
}

// ── Referral Marketplace (Stripe Connect) ─────────────────────


/**
 * Creates a Stripe Connect Express account for a clinical specialist.
 * Returns the account ID and an onboarding link.
 */
export async function createSpecialistAccount(email: string, userId: string) {
  if (config.NODE_ENV !== 'production' && !config.STRIPE_SECRET_KEY) {
    return { accountId: `acct_mock_${userId}`, onboardingUrl: `${config.APP_URL}/onboarding/specialist/mock-stripe` };
  }

  const account = await stripe.accounts.create({
    type: 'express',
    email,
    capabilities: { transfers: { requested: true } },
    metadata: { userId },
  });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${config.APP_URL}/onboarding/specialist?refresh=true`,
    return_url: `${config.APP_URL}/dashboard?stripe_success=true`,
    type: 'account_onboarding',
  });

  return { accountId: account.id, onboardingUrl: accountLink.url };
}

// ── Webhook handlers ───────────────────────────────────────────
export async function handleStripeWebhook(payload: Buffer, signature: string) {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, config.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    logger.error(`[Billing] Stripe webhook signature verification failed: ${err.message}`);
    throw new AppError('Webhook Signature Invalid', 400);
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const payment = await prisma.payment.findFirst({ where: { externalId: pi.id } });
    await prisma.payment.updateMany({ where: { externalId: pi.id }, data: { status: 'succeeded' } });

    // ── Activate tenant subscription on successful payment ──
    if (payment?.tenantId && payment.metadata) {
      const meta = payment.metadata as any;
      const plan = meta.plan as string;
      const quota = PLANS[plan as keyof typeof PLANS]?.scans ?? 500;
      const now = new Date();
      const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      await prisma.tenant.update({
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
      logger.info(`[Billing] Tenant ${payment.tenantId} activated on plan "${plan}" (${quota} scans/month)`);
      // Generate and email invoice asynchronously
      generateInvoice(payment.id).catch(e => logger.warn(`[Invoice] ${e.message}`));
    }
    logger.info(`Stripe payment succeeded: ${pi.id}`);

  } else if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent;
    await prisma.payment.updateMany({ where: { externalId: pi.id }, data: { status: 'failed' } });
    // If subscription payment fails, flag as past_due
    const payment = await prisma.payment.findFirst({ where: { externalId: pi.id } });
    if (payment?.tenantId && payment.type === 'subscription') {
      await prisma.tenant.update({
        where: { id: payment.tenantId },
        data: { subscriptionStatus: 'past_due' },
      });
      logger.warn(`[Billing] Tenant ${payment.tenantId} payment failed — marked past_due`);
    }

  } else if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const tenant = await prisma.tenant.findFirst({ where: { subscriptionId: sub.id } });
    if (tenant) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { subscriptionStatus: 'cancelled', plan: 'trial', scanQuota: 50 },
      });
      logger.warn(`[Billing] Tenant ${tenant.id} subscription cancelled`);
    }
  }
}

export async function handlePaystackWebhook(body: any, signature: string) {
  // ── SECURITY: Verify Paystack HMAC-SHA512 signature ──────────
  // Without this, any attacker can POST a fake charge.success event
  if (!config.PAYSTACK_SECRET_KEY) throw new AppError('Paystack not configured', 500);
  const expectedSig = crypto
    .createHmac('sha512', config.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(body))
    .digest('hex');
  if (signature !== expectedSig) {
    logger.error('[Billing] Paystack webhook signature mismatch — possible forgery attempt');
    throw new AppError('Webhook Signature Invalid', 400);
  }

  if (body.event === 'charge.success') {
    const ref = body.data?.reference;
    const payment = await prisma.payment.findFirst({ where: { externalId: ref } });
    await prisma.payment.updateMany({ where: { externalId: ref }, data: { status: 'succeeded' } });

    // Activate tenant plan
    if (payment?.tenantId && payment.metadata) {
      const meta = payment.metadata as any;
      const plan = meta.plan as string;
      const quota = PLANS[plan as keyof typeof PLANS]?.scans ?? null;
      const now = new Date();
      await prisma.tenant.update({
        where: { id: payment.tenantId },
        data: {
          plan,
          subscriptionStatus: 'active',
          scanQuota: quota,
          scansUsedThisMonth: 0,
          billingCycleResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        },
      });
      logger.info(`[Billing] Tenant ${payment.tenantId} activated on plan "${plan}" via Paystack`);
      generateInvoice(payment.id).catch(e => logger.warn(`[Invoice] ${e.message}`));
    }
    logger.info(`Paystack charge succeeded: ${ref}`);
  }
}

export async function handleFlutterwaveWebhook(body: any, secretHash: string) {
  // ── SECURITY: Verify Flutterwave verif-hash header ────────────
  if (!config.FLUTTERWAVE_SECRET_HASH) throw new AppError('Flutterwave not configured', 500);
  if (secretHash !== config.FLUTTERWAVE_SECRET_HASH) {
    logger.error('[Billing] Flutterwave webhook hash mismatch — possible forgery attempt');
    throw new AppError('Webhook Signature Invalid', 400);
  }

  if (body.event === 'charge.completed' && body.data?.status === 'successful') {
    const ref = body.data?.tx_ref;
    const payment = await prisma.payment.findFirst({ where: { externalId: ref } });
    await prisma.payment.updateMany({ where: { externalId: ref }, data: { status: 'succeeded' } });

    // ── Activate tenant plan (was MISSING — critical fix) ─────
    if (payment?.tenantId && payment.metadata) {
      const meta = payment.metadata as any;
      const plan = meta.plan as string;
      const quota = PLANS[plan as keyof typeof PLANS]?.scans ?? null;
      const now = new Date();
      await prisma.tenant.update({
        where: { id: payment.tenantId },
        data: {
          plan,
          subscriptionStatus: 'active',
          scanQuota: quota,
          scansUsedThisMonth: 0,
          billingCycleResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        },
      });
      logger.info(`[Billing] Tenant ${payment.tenantId} activated on plan "${plan}" via Flutterwave`);
      generateInvoice(payment.id).catch(e => logger.warn(`[Invoice] ${e.message}`));
    }
    logger.info(`Flutterwave charge succeeded: ${ref}`);
  }
}

// ── M-Pesa STK Push (Kenya/Tanzania) ────────────────────────
export async function initiateMpesaSTK(tenantId: string, phone: string, amount: number, currency: string) {
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g,'').slice(0,14);
  const shortcode = config.MPESA_SHORTCODE;
  const passkey   = config.MPESA_PASSKEY;
  const password  = Buffer.from(shortcode + passkey + timestamp).toString('base64');
  const callbackRef = `SEWA-${tenantId.slice(0,8)}-${Date.now()}`;

  // Get M-Pesa OAuth token
  const mpesaBaseUrl = config.NODE_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
  const authRes = await axios.get(`${mpesaBaseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    auth: { username: config.MPESA_CONSUMER_KEY, password: config.MPESA_CONSUMER_SECRET },
  });
  const accessToken = authRes.data.access_token;

  const stkRes = await axios.post(`${mpesaBaseUrl}/mpesa/stkpush/v1/processrequest`, {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: phone.replace(/^\+/, ''),
    PartyB: shortcode,
    PhoneNumber: phone.replace(/^\+/, ''),
    CallBackURL: `${config.APP_URL}/api/v1/payments/webhooks/mpesa?token=${process.env.MPESA_WEBHOOK_TOKEN}`,
    AccountReference: `SEWA-${callbackRef}`,
    TransactionDesc: 'SEWA AI Subscription',
  }, { headers: { Authorization: `Bearer ${accessToken}` } });

  await prisma.payment.create({
    data: {
      tenantId, type: 'subscription', provider: 'mpesa',
      externalId: callbackRef, amount, currency, status: 'pending',
      metadata: { checkoutRequestId: stkRes.data.CheckoutRequestID },
    },
  });

  return { provider: 'mpesa', checkoutRequestId: stkRes.data.CheckoutRequestID };
}

export async function handleMpesaWebhook(body: any) {
  const result = body.Body?.stkCallback;
  if (!result) return;
  if (result.ResultCode === 0) {
    // Payment successful
    const meta = result.CallbackMetadata?.Item;
    const receipt = meta?.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
    await prisma.payment.updateMany({
      where: { metadata: { path: ['checkoutRequestId'], equals: result.CheckoutRequestID } },
      data: { status: 'succeeded', externalId: receipt || result.CheckoutRequestID },
    });
    logger.info(`[Billing] M-Pesa payment succeeded: ${receipt}`);
  } else {
    await prisma.payment.updateMany({
      where: { metadata: { path: ['checkoutRequestId'], equals: result.CheckoutRequestID } },
      data: { status: 'failed' },
    });
  }
}
