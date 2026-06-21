const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding KNH tenant and user...');

  const DEMO_PW = process.env.ADMIN_PASSWORD;
  if (!DEMO_PW) throw new Error("ADMIN_PASSWORD environment variable is required");
  const HASH = await bcrypt.hash(DEMO_PW, 12);

  // 1. Create the KNH tenant
  const knhTenant = await prisma.tenant.upsert({
    where: { slug: 'kenyatta-nh' },
    update: {},
    create: {
      name: 'Kenyatta National Hospital',
      slug: 'kenyatta-nh',
      subdomain: 'knh',
      region: 'ke',
      currency: 'KES',
      language: 'en',
      plan: 'hospital',
      status: 'active',
      latitude: -1.3006,
      longitude: 36.8078,
      timezone: 'Africa/Nairobi',
      address: 'Hospital Rd, Nairobi, Kenya'
    }
  });

  console.log('✅ Created KNH tenant:', knhTenant.id);

  // 2. Create the KNH technician user
  const knhUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: knhTenant.id, email: 'tech@knh.go.ke' } },
    update: { passwordHash: HASH, status: 'active' },
    create: {
      tenantId: knhTenant.id,
      email: 'tech@knh.go.ke',
      passwordHash: HASH,
      role: 'technician',
      firstName: 'Kenyatta',
      lastName: 'Tech',
      status: 'active',
      language: 'en',
      timezone: 'UTC'
    }
  });

  console.log('✅ Created KNH user:', knhUser.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
