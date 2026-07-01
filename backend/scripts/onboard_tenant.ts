import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
declare var require: any;
declare var process: any;
const readline = require('readline');

const prisma = new PrismaClient();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('🏥 SEWA XAI — Hospital Onboarding Script');
  console.log('---------------------------------------');

  const name = await question('Hospital Name (e.g., St. Thomas Hospital): ');
  const slug = await question('Tenant Slug (e.g., st-thomas): ');
  const region = await question('Region [uk, eu, us, ng, ke, za, gh, in] (default: uk): ') || 'uk';
  const currency = await question('Currency [GBP, EUR, USD, NGN, KES, ZAR, GHS, INR] (default: GBP): ') || 'GBP';
  const plan = await question('Plan [starter, pro, enterprise] (default: enterprise): ') || 'enterprise';
  
  console.log('\n👤 Hospital Admin User Setup');
  const adminEmail = await question('Admin Email: ');
  const adminFirstName = await question('Admin First Name: ');
  const adminLastName = await question('Admin Last Name: ');
  const adminPassword = await question('Admin Password: ');

  // Create
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const apiKey = `sk_live_${uuidv4().replace(/-/g, '')}`;
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
            role: 'admin', // The top-level user for a tenant is typically 'admin'
            language: 'en',
            status: 'active'
          }
        }
      },
      include: {
        users: true
      }
    });

    console.log('\n✅ Successfully onboarded hospital!');
    console.log('---------------------------------------');
    console.log(`Tenant ID:    ${tenant.id}`);
    console.log(`Name:         ${tenant.name}`);
    console.log(`Subdomain:    ${tenant.subdomain}`);
    console.log(`API Key:      ${tenant.apiKey}`);
    console.log('---------------------------------------');
    console.log(`Admin User:   ${tenant.users[0].email}`);
    console.log(`Admin Role:   ${tenant.users[0].role}`);
    console.log('---------------------------------------');
    console.log('⚠️ Please store the API Key securely. It is required for DICOM integration (Site-to-Site VPN) and FHIR API access.');

  } catch (error) {
    console.error('\n❌ Error creating tenant:', error);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();
