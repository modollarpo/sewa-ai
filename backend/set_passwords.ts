import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Password123!', 12);
  await prisma.user.updateMany({
    data: { passwordHash: hash }
  });
  console.log('All user passwords have been reset to: Password123!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
