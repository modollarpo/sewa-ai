import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function main() {
  const seedPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!seedPassword) {
    throw new Error('SEED_ADMIN_PASSWORD environment variable is required to run the seed script');
  }
  const hash = await bcrypt.hash(seedPassword, SALT_ROUNDS);

  // 1. Create Demo Tenants
  const tenants = [
    { name: 'Royal London Hospital', slug: 'royal-london', region: 'uk', currency: 'GBP', subdomain: 'royal-london' },
    { name: 'Kenyatta National Hospital', slug: 'kenyatta-nh', region: 'ke', currency: 'KES', subdomain: 'kenyatta-nh' },
    { name: 'LUTH Lagos', slug: 'luth-lagos', region: 'ng', currency: 'NGN', subdomain: 'luth-lagos' },
    { name: 'Sewa Patient Portal', slug: 'sewa-public', region: 'uk', currency: 'GBP', subdomain: 'portal' },
  ];

  for (const t of tenants) {
    await prisma.tenant.upsert({
      where: { slug: t.slug },
      update: {},
      create: { ...t, plan: 'enterprise', status: 'active' },
    });
  }

  const rl = await prisma.tenant.findUnique({ where: { slug: 'royal-london' } });
  const knh = await prisma.tenant.findUnique({ where: { slug: 'kenyatta-nh' } });

  // 2. Create Demo Users
  const users = [
    { tenantId: rl!.id, email: 'sarah.chen@royallondon.nhs.uk', role: 'radiologist', first: 'Sarah', last: 'Chen' },
    { tenantId: rl!.id, email: 'james.okafor@royallondon.nhs.uk', role: 'doctor', first: 'James', last: 'Okafor' },
    { tenantId: rl!.id, email: 'superadmin@sewaxai.health', role: 'superadmin', first: 'Admin', last: 'Sewa' },
    { tenantId: rl!.id, email: 'patient.smith@example.com', role: 'patient', first: 'John', last: 'Smith' },
    { tenantId: knh!.id, email: 'tech@knh.go.ke', role: 'technician', first: 'Kenyatta', last: 'Tech' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: u.tenantId, email: u.email } },
      update: { passwordHash: hash, status: 'active' }, // always reset demo passwords on re-seed
      create: {
        tenantId: u.tenantId,
        email: u.email,
        passwordHash: hash,
        firstName: u.first,
        lastName: u.last,
        role: u.role,
        status: 'active',
      },
    });
  }

  console.log(`✅ Seeded ${tenants.length} tenants and ${users.length} demo users.`);
}

main().catch((e) => console.error(e)).finally(() => prisma.$disconnect());
