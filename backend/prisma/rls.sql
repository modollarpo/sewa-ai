-- 1. Enable RLS on all multi-tenant tables
ALTER TABLE "Scan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;

-- 2. Create the isolation policy
-- It checks if the row's tenantId matches the session variable 'app.current_tenant_id'
CREATE POLICY tenant_isolation_policy ON "Scan"
  USING ("tenantId" = current_setting('app.current_tenant_id'));

CREATE POLICY tenant_isolation_policy ON "Patient"
  USING ("tenantId" = current_setting('app.current_tenant_id'));

-- 3. In your Prisma middleware or Client Extension, set the variable:
-- await prisma.$executeRawUnsafe(`SET app.current_tenant_id = '${user.tenantId}'`);
