import Stripe from 'stripe';
import Paystack from 'paystack';
import Flutterwave from 'flutterwave-node-v3';
import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../utils/prismaClient';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { generateInvoice } from './invoiceService';
import { AppError } from '../utils/AppError';
import { convertFromGBP } from './fxService';
import { createHubSpotCompany, createHubSpotDeal } from './crmService';

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

// Subscription plans — Stripe products/prices created 2026-06-30 via Stripe API to match Frontend pricing exactly
export const PLANS = {
  starter: { // Starter Plan (formerly Clinic)
    priceUSD: 649, scans: 500,
    stripeProductId: "prod_Uqw9D3AjCqGRKe",
    stripePriceId: {
      "uk": "price_1TrEHJE18kkIjUPtYgaxDLtT",
      "eu": "price_1TrEHKE18kkIjUPtxEuA6L0S",
      "us": "price_1TrEHLE18kkIjUPtfURENS7e",
      "africa": "price_1TrEHME18kkIjUPtQUwAGQ4a"
    },
    stripePriceIdAnnual: {
      "uk": "price_1TrEHJE18kkIjUPtPk1wVQ5j",
      "eu": "price_1TrEHKE18kkIjUPtBHLtlB9N",
      "us": "price_1TrEHLE18kkIjUPt9G9jfm0I",
      "africa": "price_1TrEHNE18kkIjUPtOB4xlYBU"
    }
  },
  hospital: { // Hospital Plan (formerly Pro)
    priceUSD: 2599, scans: 5000,
    stripeProductId: "prod_Uqw9e1oS51reUa",
    stripePriceId: {
      "uk": "price_1TrEHOE18kkIjUPtAU2xhpAl",
      "eu": "price_1TrEHRE18kkIjUPtDzcP4YxD",
      "us": "price_1TrEHTE18kkIjUPtijkk36gg",
      "africa": "price_1TrEHUE18kkIjUPtZqGZyQFA"
    },
    stripePriceIdAnnual: {
      "uk": "price_1TrEHRE18kkIjUPtL2Mf8Bgc",
      "eu": "price_1TrEHSE18kkIjUPtLsRZU7y2",
      "us": "price_1TrEHUE18kkIjUPtoQNJvzWO",
      "africa": "price_1TrEHVE18kkIjUPtrTIISIAn"
    }
  },
  enterprise: { 
    priceUSD: null as number | null, scans: null as number | null,
    stripeProductId: "prod_Uqw9DDy33eDQZK",
    stripePriceId: {} as Record<string, string>,
    stripePriceIdAnnual: {} as Record<string, string>
  },
};

// FX conversion via fxService (live rates with Redis cache + ECB fallback)
export async function convertFromUSD(usdAmount: number, currency: string): Promise<number> {
  const { convertToGBP, convertFromGBP } = await import('./fxService');
  const gbpAmount = await convertToGBP(usdAmount, 'USD');
  return convertFromGBP(gbpAmount, currency);
}


// ── Create Subscription ───────────────────────────────────────
export async function createSubscription(tenantId: string, plan: string, region: string, currency: string, interval: 'monthly'|'annual' = 'monthly') {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new AppError('Tenant not found', 404);

  const providers = PROVIDER_MAP[region] ?? ['stripe'];
  const provider = providers[0];

  logger.info(`Creating ${plan} ${interval} subscription for tenant ${tenantId} via ${provider}`);

  if (provider === 'stripe') {
    return createStripeSubscription(tenant, plan, currency, interval);
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
      include: { assignedTo: true, scan: { include: { tenant: true } } }
    });

    if (!opinion || !opinion.assignedToId || !opinion.assignedTo?.stripeAccountId) {
      logger.warn(`[Payment] Cannot split fee for opinion ${opinionId}: No assigned specialist or Stripe Account ID`);
      return;
    }

    let totalAmountCents = 0;
    let platformFeeCents = 0;
    let hospitalPayoutCents = 0;
    let referringDoctorCents = 0;

    if (opinion.billingType === 'patient') {
      totalAmountCents = 15000; // $150
      platformFeeCents = 1500; // $15 (10%)
      hospitalPayoutCents = 6750; // $67.50 (45%)
      referringDoctorCents = 6750; // $67.50 (45%)
    } else { // hospital pays
      totalAmountCents = 7500; // $75
      platformFeeCents = 750; // $7.50 (10%)
      hospitalPayoutCents = 0; // $0
      referringDoctorCents = 6750; // $67.50 (90% of $75)
    }

    logger.info(`[Payment] Splitting referral fee for scan ${scanId}. specialist (referring doctor): ${referringDoctorCents} cents, hospital: ${hospitalPayoutCents} cents`);

    // Transfer specialist share
    const transferDoctor = await stripe.transfers.create({
      amount: referringDoctorCents,
      currency: 'usd',
      destination: opinion.assignedTo.stripeAccountId,
      transfer_group: `referral_${scanId}`,
      metadata: { scanId, opinionId, specialistId: opinion.assignedToId, type: 'specialist_payout' }
    });

    // Transfer hospital share if applicable
    let hospitalTransferId = null;
    if (hospitalPayoutCents > 0 && opinion.scan.tenant.stripeAccountId) {
      const transferHospital = await stripe.transfers.create({
        amount: hospitalPayoutCents,
        currency: 'usd',
        destination: opinion.scan.tenant.stripeAccountId,
        transfer_group: `referral_${scanId}`,
        metadata: { scanId, opinionId, type: 'hospital_payout' }
      });
      hospitalTransferId = transferHospital.id;
    }

    // Record the payment split in the database
    await prisma.payment.create({
      data: {
        tenantId: opinion.scan.tenantId,
        amount: totalAmountCents / 100,
        currency: 'USD',
        status: 'completed',
        provider: 'stripe',
        externalId: transferDoctor.id, // Primary transfer
        type: 'referral_split',
        metadata: {
          specialistAmount: referringDoctorCents / 100,
          hospitalAmount: hospitalPayoutCents / 100,
          platformFee: platformFeeCents / 100,
          transferId: transferDoctor.id,
          hospitalTransferId
        }
      }
    });

    logger.info(`[Payment] Successfully transferred specialist share for opinion ${opinionId}`);
    return transferDoctor;
  } catch (err: any) {
    logger.error(`[Payment] Split fee failed: ${err.message}`);
    throw new AppError('Fee split failed', 500);
  }
}

export async function chargePatientForReferral(referralId: string, tenant: any) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `SEWA XAI Second Opinion`,
          description: `Global Specialist Review for Scan via ${tenant.name}`,
        },
        unit_amount: 15000,
      },
      quantity: 1,
    }],
    success_url: `${config.APP_URL}/referrals/${referralId}?success=true`,
    cancel_url: `${config.APP_URL}/referrals/${referralId}?canceled=true`,
    metadata: { referralId, type: 'referral_patient_payment' },
  });
  return session;
}

export async function chargeHospitalForReferral(referralId: string, tenant: any) {
  if (!tenant.stripeCustomerId) {
    throw new AppError('Hospital does not have a Stripe Customer ID', 400);
  }
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 7500,
    currency: 'usd',
    customer: tenant.stripeCustomerId,
    description: `SEWA XAI Second Opinion Referral (ID: ${referralId})`,
    metadata: { referralId, type: 'referral_hospital_payment' },
  });
  return paymentIntent;
}

async function createStripeSubscription(tenant: any, plan: string, currency: string, interval: 'monthly'|'annual') {
  const planConfig = PLANS[plan as keyof typeof PLANS];
  if (!planConfig?.priceUSD) throw new AppError('Invalid plan', 400);

  let customerId = tenant.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: tenant.email || undefined,
      name: tenant.name,
      metadata: { tenantId: tenant.id },
    });
    customerId = customer.id;
    await prisma.tenant.update({ where: { id: tenant.id }, data: { stripeCustomerId: customerId } });
  }

  // Get price ID based on interval
  const region = tenant.region ?? 'uk';
  const prices = interval === 'annual' ? planConfig.stripePriceIdAnnual : planConfig.stripePriceId;
  // Use fallback generic USD price if region not supported by Stripe directly
  let priceId = (prices as any)[region];
  if (!priceId && (prices as any)['africa']) priceId = (prices as any)['africa'];
  
  if (!priceId) {
    throw new AppError(`No Stripe price found for plan ${plan}, interval ${interval}, region ${region}`, 400);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${config.APP_URL}/dashboard/billing?success=true`,
    cancel_url: `${config.APP_URL}/dashboard/billing?canceled=true`,
    metadata: { tenantId: tenant.id, plan, interval, type: 'subscription' },
  });

  await prisma.payment.create({
    data: {
      tenantId: tenant.id, type: 'subscription', provider: 'stripe',
      externalId: session.id, amount: planConfig.priceUSD,
      currency, status: 'pending', metadata: { plan, interval, paymentLink: session.url },
    },
  });

  return { provider: 'stripe', paymentLink: session.url, clientSecret: session.client_secret || '' };
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
    customizations: { title: 'SEWA XAI Subscription', logo: 'https://sewaxai.health/logo.png' },
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

  const perScanUSD = tenant.plan === 'starter' ? 2.99 : tenant.plan === 'hospital' ? 1.99 : 0.99;
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

  // Handle both direct PaymentIntent success and hosted Checkout Session success
  if (event.type === 'payment_intent.succeeded' || event.type === 'checkout.session.completed') {
    const obj = event.data.object as any;
    const isSession = event.type === 'checkout.session.completed';
    const externalId = isSession ? obj.id : obj.payment_intent || obj.id;

    if (obj.metadata && obj.metadata.type === 'referral_patient_payment') {
      const referralId = obj.metadata.referralId;
      const opinion = await prisma.secondOpinion.findUnique({ where: { id: referralId } });
      if (opinion) {
        const newStatus = opinion.assignedToId ? 'assigned' : 'pending';
        await prisma.secondOpinion.update({
          where: { id: referralId },
          data: { status: newStatus, paymentStatus: 'paid' }
        });
        logger.info(`[Referral] Patient paid for referral ${referralId}. Status set to ${newStatus}`);
      }
      return;
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { externalId: obj.id },
          { externalId: obj.payment_intent || '' }
        ]
      }
    });

    if (payment) {
      await prisma.payment.updateMany({ where: { id: payment.id }, data: { status: 'succeeded' } });
      
      // ── Activate tenant subscription on successful payment ──
      if (payment.tenantId && payment.metadata) {
        const meta = payment.metadata as any;
        const plan = meta.plan as string;
        const quota = PLANS[plan as keyof typeof PLANS]?.scans ?? 500;
        const now = new Date();
        const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        
        const tenant = await prisma.tenant.update({
          where: { id: payment.tenantId },
          data: {
            plan,
            subscriptionStatus: 'active',
            subscriptionId: externalId,
            scanQuota: quota,
            scansUsedThisMonth: 0,
            billingCycleResetAt: resetAt,
            nextBillDate: new Date(now.setMonth(now.getMonth() + 1)),
          },
        });
        logger.info(`[Billing] Tenant ${payment.tenantId} activated on plan "${plan}" (${quota} scans/month)`);
        
        // Mirror onboarding events to HubSpot CRM asynchronously
        (async () => {
          try {
            const domain = tenant.slug ? `${tenant.slug}.sewaxai.health` : undefined;
            const companyId = await createHubSpotCompany({
              name: tenant.name,
              region: tenant.region || 'uk',
              plan: plan,
              domain
            });

            const planConfig = PLANS[plan as keyof typeof PLANS];
            const amountUSD = planConfig?.priceUSD || 0;

            await createHubSpotDeal({
              tenantName: tenant.name,
              plan,
              amountUSD,
              currency: 'USD',
              hubspotCompanyId: companyId
            });
          } catch (crmErr: any) {
            logger.error(`[CRM] Webhook post-processing failed: ${crmErr.message}`);
          }
        })();

        // Generate and email invoice asynchronously
        generateInvoice(payment.id).catch(e => logger.warn(`[Invoice] ${e.message}`));
      }
      logger.info(`Stripe payment succeeded: ${externalId}`);
    }
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
    TransactionDesc: 'SEWA XAI Subscription',
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
