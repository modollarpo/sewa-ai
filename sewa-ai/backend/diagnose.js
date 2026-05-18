const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
require('dotenv').config({ path: '.env.local' }); // Try local first, fallback to .env if not present.
require('dotenv').config();

async function checkDiagnostics() {
  console.log('--- SEWA AI Backend Diagnostics ---');
  console.log(`Node Environment: ${process.env.NODE_ENV}`);
  console.log(`Database URL: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 35) + '...' : 'Not defined'}`);
  console.log(`Redis URL: ${process.env.REDIS_URL ? process.env.REDIS_URL.substring(0, 35) + '...' : 'Not defined'}`);

  let dbOk = false;
  let redisOk = false;

  // 1. Check Database
  console.log('\n1. Checking Database Connection...');
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const count = await prisma.user.count();
    console.log('✅ Database connection successful!');
    console.log(`   Found ${count} users in the database.`);
    dbOk = true;
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('   Error:', error.message.split('\n')[0]);
  } finally {
    await prisma.$disconnect();
  }

  // 2. Check Redis
  console.log('\n2. Checking Redis Connection...');
  let redisClient;
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000
    });
    
    // Test connection
    const ping = await redisClient.ping();
    console.log('✅ Redis connection successful! Response:', ping);
    redisOk = true;
  } catch (error) {
    console.error('❌ Redis connection failed!');
    console.error('   Error:', error.message);
  } finally {
    if (redisClient) {
      redisClient.disconnect();
    }
  }

  console.log('\n--- Diagnostic Summary ---');
  if (dbOk && redisOk) {
    console.log('✅ All backend infrastructure services are running properly.');
  } else {
    console.log('❌ One or more backend services are down. This is likely causing the 500 Internal Server Error.');
  }
}

checkDiagnostics().catch(console.error);
