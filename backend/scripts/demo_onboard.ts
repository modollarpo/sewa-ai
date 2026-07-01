import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

declare var process: any;

const prisma = new PrismaClient();

async function main() {
  console.log('🏥 SEWA XAI — Automated Demo Hospital Onboarding');
  console.log('---------------------------------------');

  const name = 'St. Thomas NHS Trust (Demo)';
  const slug = 'st-thomas-demo';
  const region = 'uk';
  const currency = 'GBP';
  const plan = 'enterprise';
  
  const adminEmail = 'it.director@stthomas.nhs.uk.demo';
  const adminFirstName = 'Sarah';
  const adminLastName = 'Connor';
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('DEMO_ADMIN_PASSWORD environment variable is required to run the demo onboard script');
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const apiKey = `sk_live_${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '').slice(0, 8)}`; // Longer, more secure key
  const subdomain = `${slug}.sewaxai.health`;

  try {
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        subdomain,
        region,
        currency,
        plan,
        apiKey,
        status: 'active',
        users: {
          create: {
            email: adminEmail,
            firstName: adminFirstName,
            lastName: adminLastName,
            passwordHash,
            role: 'admin',
            language: 'en',
            status: 'active'
          }
        }
      },
      include: {
        users: true
      }
    });

    console.log('\n✅ Successfully onboarded demo hospital (Hardened Flow)');
    console.log('---------------------------------------');
    console.log(`Tenant ID:    ${tenant.id}`);
    console.log(`Name:         ${tenant.name}`);
    console.log(`Subdomain:    ${tenant.subdomain}`);
    console.log(`API Key:      ${tenant.apiKey}`);
    console.log('---------------------------------------');
    console.log(`Admin User:   ${tenant.users[0].email}`);
    console.log(`Admin Role:   ${tenant.users[0].role}`);
    console.log(`Admin Pass:   ${adminPassword}`);
    console.log('---------------------------------------');
    console.log('⚠️ Please store the API Key securely. It is required for DICOM integration (Site-to-Site VPN) and FHIR API access.');

  } catch (error) {
    console.error('\n❌ Error creating tenant:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
