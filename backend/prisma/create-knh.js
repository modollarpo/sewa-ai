// SEWA AI — create missing kenyatta-nh tenant + technician user
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createKNH() {
  const DEMO_PW = process.env.ADMIN_PASSWORD;
  if (!DEMO_PW) throw new Error("ADMIN_PASSWORD environment variable is required");
  const hash = await bcrypt.hash(DEMO_PW, 12);

  // Ensure kenyatta-nh tenant exists
  const knh = await prisma.tenant.upsert({
    where: { slug: 'kenyatta-nh' },
    update: {},
    create: {
      name: 'Kenyatta National Hospital',
      slug: 'kenyatta-nh',
      subdomain: 'kenyatta-nh',
      region: 'ke',
      currency: 'KES',
      language: 'en',
      plan: 'hospital',
      status: 'active',
    },
  });
  console.log('Tenant kenyatta-nh id:', knh.id);

  // Upsert technician user
  const tech = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: knh.id, email: 'tech@knh.go.ke' } },
    update: { passwordHash: hash, status: 'active' },
    create: {
      tenantId: knh.id,
      email: 'tech@knh.go.ke',
      passwordHash: hash,
      role: 'technician',
      firstName: 'Kenyatta',
      lastName: 'Tech',
      status: 'active',
      language: 'en',
      timezone: 'UTC',
    },
  });
  console.log('Technician created/updated:', tech.email, '| role:', tech.role);
  console.log('Password set via ADMIN_PASSWORD env variable');
  await prisma.$disconnect();
}

createKNH().catch((e) => {
  console.error('ERROR:', e.message);
  prisma.$disconnect();
  process.exit(1);
});
