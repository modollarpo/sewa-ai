import { prisma, tenantStorage } from '../utils/prismaClient';
import bcrypt from 'bcryptjs';

describe('Enterprise Full Tenant Isolation (RLS) — All Models', () => {
  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;
  let scanA: any;
  let patientA: any;
  let reportA: any;

  beforeAll(async () => {
    // Create test tenants
    tenantA = await prisma.tenant.create({
      data: {
        id: 'tenant-a-full',
        name: 'Tenant A Full',
        slug: 'tenant-a-full',
        subdomain: 'tenantafull',
        region: 'uk',
        currency: 'GBP',
        plan: 'enterprise'
      }
    });
    tenantB = await prisma.tenant.create({
      data: {
        id: 'tenant-b-full',
        name: 'Tenant B Full',
        slug: 'tenant-b-full',
        subdomain: 'tenantbfull',
        region: 'ng',
        currency: 'NGN',
        plan: 'enterprise'
      }
    });

    // Create users with hashed passwords
    const hash = await bcrypt.hash('testpassword', 12);
    userA = await prisma.user.create({
      data: {
        tenantId: tenantA.id,
        email: 'test@tenanta.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: hash,
        role: 'radiologist'
      }
    });
    userB = await prisma.user.create({
      data: {
        tenantId: tenantB.id,
        email: 'test@tenantb.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: hash,
        role: 'doctor'
      }
    });
    patientA = await prisma.patient.create({
      data: {
        tenantId: tenantA.id,
        userId: userA.id,
        mrn: 'RL-MRN-001',
        dateOfBirth: new Date('1980-01-01'),
        sex: 'M'
      }
    });
    scanA = await tenantStorage.run(tenantA.id, async () => {
      return await prisma.scan.create({
        data: {
          id: 'scan-a-full',
          tenantId: tenantA.id,
          patientId: patientA.id,
          modality: 'CT',
          bodyPart: 'HEAD',
          priority: 'STAT',
          status: 'processing'
        }
      });
    });
    await tenantStorage.run(tenantA.id, async () => {
      reportA = await prisma.report.create({
        data: {
          id: 'report-a-full',
          tenantId: tenantA.id,
          scanId: scanA.id,
          authorId: userA.id,
          findings: 'Test finding',
          impression: 'Test impression'
        }
      });
    });
  });

  afterAll(async () => {
    await prisma.report.deleteMany({ where: { id: 'report-a-full' } });
    await prisma.scan.deleteMany({ where: { id: 'scan-a-full' } });
    await prisma.patient.deleteMany({ where: { id: patientA.id } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
  });

  it('should NOT let tenant B access tenant A scan', async () => {
    await tenantStorage.run(tenantB.id, async () => {
      const scan = await prisma.scan.findUnique({ where: { id: 'scan-a-full' } });
      expect(scan).toBeNull();
    });
  });

  it('should NOT let tenant B access tenant A patient', async () => {
    await tenantStorage.run(tenantB.id, async () => {
      const patient = await prisma.patient.findUnique({ where: { id: patientA.id } });
      expect(patient).toBeNull();
    });
  });

  it('should NOT let tenant B access tenant A report', async () => {
    await tenantStorage.run(tenantB.id, async () => {
      const report = await prisma.report.findUnique({ where: { id: 'report-a-full' } });
      expect(report).toBeNull();
    });
  });

  it('should NOT let tenant B access tenant A user', async () => {
    await tenantStorage.run(tenantB.id, async () => {
      const user = await prisma.user.findUnique({ where: { id: userA.id } });
      expect(user).toBeNull();
    });
  });
});
