const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting production database repair...');

  // 1. Update AIResult.tenantId based on Scan.tenantId
  console.log('1. Populating tenantId in AIResult table...');
  const updatedResults = await prisma.$executeRaw`
    UPDATE "AIResult" 
    SET "tenantId" = "Scan"."tenantId" 
    FROM "Scan" 
    WHERE "AIResult"."scanId" = "Scan"."id" AND "AIResult"."tenantId" IS NULL
  `;
  console.log(`✅ Updated ${updatedResults} rows in AIResult.`);

  // 2. Optional: Check if we have the superadmin user seeded
  console.log('2. Checking if superadmin user exists...');
  const superadmin = await prisma.user.findFirst({
    where: { role: 'superadmin' }
  });

  if (superadmin) {
    console.log(`✅ Found superadmin: ${superadmin.email}`);
  } else {
    console.log('⚠️ Superadmin not found! Let\'s run the production seed...');
    // We can also check if we need to seed the database
  }
}

main()
  .catch(e => console.error('Repair failed:', e))
  .finally(() => prisma.$disconnect());
