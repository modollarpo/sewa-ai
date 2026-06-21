const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database to fetch admin users...');
  const admins = await prisma.user.findMany({
    where: { 
      role: { in: ['admin', 'superadmin'] }
    },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      status: true
    }
  });
  
  if (admins.length > 0) {
    console.log('Found Admin Users:');
    console.table(admins);
  } else {
    console.log('No admin users found in the database. Fetching top 5 users of any role:');
    const anyUsers = await prisma.user.findMany({
      take: 5,
      select: { email: true, role: true }
    });
    console.table(anyUsers);
  }
}

main()
  .catch(e => console.error('Database connection error:', e))
  .finally(() => prisma.$disconnect());
