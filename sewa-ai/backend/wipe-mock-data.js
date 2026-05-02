const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging mock clinical data from production database...');
  
  // Delete dependent records first to satisfy foreign key constraints
  await prisma.session.deleteMany({});
  await prisma.auditLog.deleteMany({});
  
  // Delete the mock AI results, scans, and patients
  await prisma.aIResult.deleteMany({});
  await prisma.scan.deleteMany({});
  await prisma.patient.deleteMany({});

  
  // Delete the dummy hospital users (but keep the superadmin!)
  await prisma.user.deleteMany({
    where: { role: { not: 'superadmin' } }
  });
  
  // Delete mock tenants except the one assigned to superadmin (if any)
  const superAdmin = await prisma.user.findFirst({ where: { role: 'superadmin' } });
  if (superAdmin) {
    await prisma.tenant.deleteMany({
      where: { id: { not: superAdmin.tenantId } }
    });
  } else {
    await prisma.tenant.deleteMany({});
  }

  console.log('✅ Mock data purged! Only SuperAdmin and primary tenant remain.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { 
    console.error('❌ ERROR:', e);
    prisma.$disconnect(); 
    process.exit(1); 
  });
