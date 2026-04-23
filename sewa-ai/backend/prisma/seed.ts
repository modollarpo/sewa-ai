import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Create Starter Tenant (Hospital A)
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'hospital-alpha' },
    update: {},
    create: {
      name: 'Hospital Alpha',
      slug: 'hospital-alpha',
      subdomain: 'alpha',
      region: 'ng',
      currency: 'NGN',
      plan: 'starter',
    },
  });

  // 2. Create Admin for Tenant
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@alpha.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@alpha.com',
      passwordHash: 'argon2_hashed_password', // Use argon2 or bcrypt
      firstName: 'John',
      lastName: 'Doe',
      role: 'admin',
    },
  });

  console.log(`✅ Seeded: ${tenant.name}`);
}

main().catch((e) => console.error(e)).finally(() => prisma.$disconnect());
