-- AlterTable: add all columns that exist in schema.prisma Tenant model
-- but were missing from the 0_init migration (schema drift fix).
-- Uses IF NOT EXISTS so this is safe to run against databases that
-- already have some or all of these columns.

ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "latitude"            DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude"           DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "timezone"            TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS "address"             TEXT,
  ADD COLUMN IF NOT EXISTS "apiKey"              TEXT,
  ADD COLUMN IF NOT EXISTS "supportedModalities" TEXT[] NOT NULL DEFAULT ARRAY['CT','XRAY']::TEXT[],
  ADD COLUMN IF NOT EXISTS "primaryContactEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "whatsappEnabled"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "smsEnabled"          BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex (apiKey must be unique per schema.prisma)
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_apiKey_key" ON "Tenant"("apiKey");
