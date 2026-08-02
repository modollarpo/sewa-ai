import { prisma, tenantStorage } from '../utils/prismaClient';

describe('Enterprise Tenant Isolation (RLS)', () => {
  let tenantA: any;
  let tenantB: any;
  let scanA: any;

  beforeAll(async () => {
    // Create Tenant A
    tenantA = await prisma.tenant.create({
      data: {
        id: 'tenant-a-iso',
        name: 'Tenant A Isolation',
        slug: 'tenant-a-iso',
        subdomain: 'tenant-a-iso',
        region: 'uk',
        currency: 'GBP',
        plan: 'starter',
        stripeAccountId: 'acct_test_tenant_a_iso'
      }
    });

    // Create Tenant B
    tenantB = await prisma.tenant.create({
      data: {
        id: 'tenant-b-iso',
        name: 'Tenant B Isolation',
        slug: 'tenant-b-iso',
        subdomain: 'tenant-b-iso',
        region: 'uk',
        currency: 'GBP',
        plan: 'starter',
        stripeAccountId: 'acct_test_tenant_b_iso'
      }
    });

    // Insert data as Tenant A
    await tenantStorage.run(tenantA.id, async () => {
      const userA = await prisma.user.create({
        data: {
          tenantId: tenantA.id,
          email: 'tenant-a-iso-user@example.com',
          passwordHash: 'not-a-real-hash',
          firstName: 'Tenant',
          lastName: 'A',
          role: 'doctor'
        }
      });

      await prisma.patient.create({
        data: {
          tenantId: tenantA.id,
          userId: userA.id,
          mrn: 'PATIENT-A-ISO',
          dateOfBirth: new Date('1980-01-01'),
          sex: 'M'
        }
      });

      scanA = await prisma.scan.create({
        data: {
          id: 'scan-a-iso',
          tenantId: tenantA.id,
          modality: 'CT',
          bodyPart: 'HEAD',
          priority: 'STAT',
          status: 'UPLOADED'
        }
      });
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = ''`); // reset session
    await prisma.scan.deleteMany({ where: { id: scanA.id } });
    await prisma.patient.deleteMany({ where: { tenantId: tenantA.id } });
    await prisma.user.deleteMany({ where: { tenantId: tenantA.id } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
  });

  it('should successfully read scan A when authenticated as Tenant A', async () => {
    await tenantStorage.run(tenantA.id, async () => {
      const scan = await prisma.scan.findUnique({ where: { id: scanA.id } });
      expect(scan).toBeTruthy();
      expect(scan?.id).toBe(scanA.id);
    });
  });

  it('should fail to read scan A when authenticated as Tenant B due to Postgres RLS', async () => {
    await tenantStorage.run(tenantB.id, async () => {
      const scan = await prisma.scan.findUnique({ where: { id: scanA.id } });
      expect(scan).toBeNull();
    });
  });

});
