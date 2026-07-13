// SEWA XAI — backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SEWA XAI database (JS)...');
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) throw new Error("SEED_ADMIN_PASSWORD environment variable is required to seed database safely.");
  const HASH = await bcrypt.hash(adminPassword, 12);

  // Tenants
  const rlTenant = await prisma.tenant.upsert({ 
    where:{ slug:'royal-london' },  
    update:{}, 
    create:{ 
      name:'Royal London NHS Trust', 
      slug:'royal-london', 
      subdomain:'royallondon', 
      region:'uk', 
      currency:'GBP',
      language:'en',
      plan:'enterprise', 
      status:'active',
      latitude: 51.5186,
      longitude: -0.0571,
      timezone: 'Europe/London',
      address: 'Whitechapel Rd, London E1 1FR, UK'
    } 
  });

  const luthTenant = await prisma.tenant.upsert({ 
    where:{ slug:'luth-lagos' },    
    update:{}, 
    create:{ 
      name:'Lagos University Teaching Hospital', 
      slug:'luth-lagos', 
      subdomain:'luth', 
      region:'ng', 
      currency:'NGN',
      language:'en',
      plan:'hospital', 
      status:'active',
      latitude: 6.5147,
      longitude: 3.3508,
      timezone: 'Africa/Lagos',
      address: 'Ishaga Rd, Idi-Araba, Lagos, Nigeria'
    } 
  });

  // Users
  const superAdmin = await prisma.user.upsert({ 
    where:{ tenantId_email: { tenantId: rlTenant.id, email: 'superadmin@sewaxai.health' } }, 
    update:{ passwordHash: HASH, status: 'active' }, 
    create:{ 
      tenantId: rlTenant.id, 
      email: 'superadmin@sewaxai.health', 
      passwordHash: HASH, 
      role: 'superadmin', 
      firstName: 'Super', 
      lastName: 'Admin', 
      status: 'active',
      language: 'en',
      timezone: 'UTC'
    }
  });

  const sarahUser = await prisma.user.upsert({ 
    where:{ tenantId_email: { tenantId: rlTenant.id, email: 'sarah.chen@royallondon.nhs.uk' } }, 
    update:{ passwordHash: HASH, status: 'active' }, 
    create:{ 
      tenantId: rlTenant.id, 
      email: 'sarah.chen@royallondon.nhs.uk', 
      passwordHash: HASH, 
      role: 'radiologist', 
      firstName: 'Sarah', 
      lastName: 'Chen', 
      speciality: 'Neuroradiology', 
      licenseNumber: 'GMC-1234567', 
      status: 'active',
      language: 'en',
      timezone: 'UTC'
    }
  });

  const jamesUser = await prisma.user.upsert({ 
    where:{ tenantId_email: { tenantId: rlTenant.id, email: 'james.okafor@royallondon.nhs.uk' } }, 
    update:{ passwordHash: HASH, status: 'active' }, 
    create:{ 
      tenantId: rlTenant.id, 
      email: 'james.okafor@royallondon.nhs.uk', 
      passwordHash: HASH, 
      role: 'doctor', 
      firstName: 'James', 
      lastName: 'Okafor', 
      status: 'active',
      language: 'en',
      timezone: 'UTC'
    }
  });

  // Patient User
  const patientUser = await prisma.user.upsert({ 
    where:{ tenantId_email: { tenantId: rlTenant.id, email: 'patient.smith@example.com' } }, 
    update:{ passwordHash: HASH, status: 'active' }, 
    create:{ 
      tenantId: rlTenant.id, 
      email: 'patient.smith@example.com', 
      passwordHash: HASH, 
      role: 'patient', 
      firstName: 'John', 
      lastName: 'Smith', 
      status: 'active',
      language: 'en',
      timezone: 'UTC'
    }
  });

  // KNH Technician
  const knh = await prisma.tenant.findUnique({ where: { slug: 'kenyatta-nh' } });
  if (knh) {
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: knh.id, email: 'tech@knh.go.ke' } },
      update: { passwordHash: HASH, status: 'active' },
      create: {
        tenantId: knh.id,
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
  }

  const patient = await prisma.patient.upsert({ 
    where:{ userId: patientUser.id }, 
    update:{}, 
    create:{ 
      tenantId: rlTenant.id, 
      userId: patientUser.id, 
      mrn: 'RL-MRN-001', 
      dateOfBirth: new Date('1965-03-15'), 
      sex: 'M', 
      bloodType: 'O+', 
      consentAI: true 
    }
  });

  // Scan
  const scan = await prisma.scan.create({
    data: {
      tenantId: rlTenant.id, 
      patientId: patient.id, 
      modality: 'CT', 
      bodyPart: 'Head', 
      priority: 'STAT', 
      status: 'ai_complete',
      receivedAt: new Date(), 
      dicomStudyUid: '1.2.840.' + Math.floor(Math.random()*9999999),
      storageUrl: `https://sewaaiproductiondicom.blob.core.windows.net/scans/demo/demo-head.dcm`,
    }
  });

  await prisma.aIResult.create({
    data: {
      scanId: scan.id, 
      primaryFinding: 'ICH', 
      urgency: 'CRITICAL', 
      confidence: 0.94, 
      location: 'Right basal ganglia',
      uncertaintyScore: 0.08,
      gradcamUrl: `https://sewaaiproductiondicom.blob.core.windows.net/gradcam/${scan.id}.png`,
      shapValues: JSON.stringify([{f:'Hyperdense region',v:0.42},{f:'Midline shift',v:0.31}]), 
      metacognitionPassed: true,
      modelVersion: 'efficientnet-b4-v2.4.1', 
      inferenceMs: 642
    }
  });

  // Initial federated learning seed
  const flNode = await prisma.federatedNode.upsert({
    where: { id: 'seed-node-royal-london' },
    update: { status: 'active', lastSyncAt: new Date() },
    create: {
      id: 'seed-node-royal-london',
      tenantId: rlTenant.id,
      status: 'active',
      totalScansContributed: 1,
      trustScore: 85,
      dpBudgetTotal: 10.0,
      dpBudgetUsed: 0.1,
      nodePublicKey: 'seed-public-key-royal-london',
      nodeEndpoint: 'https://royal-london.fl.sewaxai.health/weights'
    }
  });

  await prisma.federatedModelVersion.upsert({
    where: { version: 'v1.0.0-seed' },
    update: {},
    create: {
      version: 'v1.0.0-seed',
      weightsBlobUrl: 'https://sewaaiproductionacr.azurecr.io/ai-triage:prod-20260712-113620',
      weightsHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      accuracy: 0.93,
      loss: 0.21,
      participatingNodes: ['seed-node-royal-london'],
      totalDataVolume: 1,
      status: 'production',
      globalEpsilon: 8.5
    }
  });

  await prisma.federatedRound.upsert({
    where: { roundNumber: 0 },
    update: { status: 'completed' },
    create: {
      roundNumber: 0,
      status: 'completed',
      participatingNodes: 1,
      totalDataVolume: 1,
      epochLoss: 0.21,
      accuracy: 0.93,
      aggregatedModelVersion: 'v1.0.0-seed',
      globalEpsilon: 8.5,
      avgTrustScore: 85,
      dpNoiseMultiplier: 0.5,
      failedNodeIds: [],
      durationMs: 1200,
      aggregatedAt: new Date()
    }
  });

  console.log('✅ JS Seed complete!');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { 
    console.error('❌ SEED ERROR:', e.message);
    if (e.description) console.error('Description:', e.description);
    prisma.$disconnect(); 
    process.exit(1); 
  });
