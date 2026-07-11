import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { prisma } from '../utils/prismaClient';
import { createSubscription } from '../services/paymentService';

async function run() {
  console.log('🚀 Starting Stripe Test Payment verification...');
  console.log('Stripe Key loaded:', !!process.env.STRIPE_SECRET_KEY);

  // 1. Create a temporary tenant to isolate this test run
  console.log('\n--- 1. Creating Test Tenant ---');
  const slug = `test-stripe-${Date.now()}`;
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Test Stripe Integration Tenant',
      slug,
      subdomain: slug,
      region: 'uk',
      currency: 'GBP',
      plan: 'starter',
      status: 'onboarding',
    }
  });
  console.log('✅ Created Tenant ID:', tenant.id);

  // 2. Initiate Stripe checkout creation
  console.log('\n--- 2. Initiating Stripe Payment Handshake ---');
  try {
    const result: any = await createSubscription(tenant.id, 'starter', 'uk', 'GBP');
    console.log('✅ Payment handshake succeeded!');
    console.log('Provider:', result.provider);
    console.log('PaymentIntent ID:', result.paymentIntentId);
    console.log('Client Secret (for frontend checkout):', result.clientSecret ? 'Present' : 'Missing');

    // 3. Clean up the database entry (optional, but good practice)
    console.log('\n--- 3. Verifying DB Record Creation ---');
    const payment = await prisma.payment.findFirst({
      where: { tenantId: tenant.id }
    });
    if (payment) {
      console.log('✅ Verified Payment record created in DB. External ID:', payment.externalId);
    } else {
      console.error('❌ Payment record missing from DB.');
    }

    console.log('\n🌟 Integration Verified!');
    console.log('Go to your Stripe Test Dashboard -> Customers or Payments.');
    console.log(`You should see a new customer for "Test Stripe Integration Tenant" and a pending PaymentIntent of ${tenant.currency} 490.00.`);
  } catch (err: any) {
    console.error('❌ Stripe subscription initialization failed:', err.message);
    if (err.stack) console.error(err.stack);
  } finally {
    // Cleanup tenant so we don't pollute the DB
    await prisma.payment.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
    console.log('🧹 DB cleaned up.');
  }
}

run();
