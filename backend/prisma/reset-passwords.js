// SEWA AI — one-shot production password reset
// Run via: node prisma/reset-passwords.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetPasswords() {
  const DEMO_PW = 'SewaAI2024!';
  const hash = await bcrypt.hash(DEMO_PW, 12);

  const emails = [
    'superadmin@sewaxai.health',
    'sarah.chen@royallondon.nhs.uk',
    'james.okafor@royallondon.nhs.uk',
    'patient.smith@example.com',
    'tech@knh.go.ke',
  ];

  let total = 0;
  for (const email of emails) {
    const result = await prisma.user.updateMany({
      where: { email, status: { not: 'deleted' } },
      data: { passwordHash: hash, status: 'active' },
    });
    console.log(`  ${email}: ${result.count} row(s) updated`);
    total += result.count;
  }

  console.log(`\nDone — reset ${total} user password(s) to: ${DEMO_PW}`);
  await prisma.$disconnect();
}

resetPasswords().catch((e) => {
  console.error('RESET ERROR:', e.message);
  prisma.$disconnect();
  process.exit(1);
});
