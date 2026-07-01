import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { forwardLeadToCRM, createHubSpotCompany, createHubSpotDeal } from '../services/crmService';

async function run() {
  console.log('🚀 Starting end-to-end CRM and notification tests...');
  console.log('HubSpot Access Token present:', !!process.env.HUBSPOT_ACCESS_TOKEN);
  console.log('Slack Webhook present:', !!process.env.SUPPORT_SLACK_WEBHOOK);

  // 1. Test Lead capture forward
  console.log('\n--- 1. Testing Lead Forwarding ---');
  try {
    await forwardLeadToCRM({
      name: 'Dr. Test Administrator',
      email: 'test-admin@sewaxai.health',
      organization: 'SEWA XAI Integration Lab',
      message: 'This is a programmatic live-fire test to verify CRM pipeline integration.',
    });
    console.log('✅ Lead forwarding completed.');
  } catch (err: any) {
    console.error('❌ Lead forwarding failed:', err.message);
  }

  // 2. Test Company Auto-Creation
  console.log('\n--- 2. Testing Company Creation ---');
  let companyId: string | null = null;
  try {
    companyId = await createHubSpotCompany({
      name: 'SEWA XAI Test Hospital',
      region: 'uk',
      plan: 'pro',
      domain: 'test-hospital.sewaxai.health',
    });
    console.log('✅ Company creation completed. ID:', companyId);
  } catch (err: any) {
    console.error('❌ Company creation failed:', err.message);
  }

  // 3. Test Deal Auto-Creation
  console.log('\n--- 3. Testing Deal Creation ---');
  try {
    await createHubSpotDeal({
      tenantName: 'SEWA XAI Test Hospital',
      plan: 'pro',
      amountUSD: 1999,
      currency: 'USD',
      hubspotCompanyId: companyId,
    });
    console.log('✅ Deal creation completed.');
  } catch (err: any) {
    console.error('❌ Deal creation failed:', err.message);
  }

  console.log('\n🏁 Integration test complete!');
}

run();
