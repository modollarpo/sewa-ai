-- Schema drift safety-net migration.
-- The 0_init migration has been regenerated from schema.prisma and now
-- includes all columns. These IF NOT EXISTS statements are retained as
-- a safe idempotent fallback for any database that ran the original
-- 0_init before it was corrected.

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

CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_apiKey_key" ON "Tenant"("apiKey");

ALTER TABLE "Scan"
  ADD COLUMN IF NOT EXISTS "accessionNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "origin"          TEXT NOT NULL DEFAULT 'cloud',
  ADD COLUMN IF NOT EXISTS "fileName"        TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Scan_accessionNumber_key" ON "Scan"("accessionNumber");

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "inviteToken"     TEXT,
  ADD COLUMN IF NOT EXISTS "consentPrefs"    JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "User_inviteToken_key" ON "User"("inviteToken");

ALTER TABLE "AIResult"
  ADD COLUMN IF NOT EXISTS "tenantId"           TEXT,
  ADD COLUMN IF NOT EXISTS "summary"            TEXT,
  ADD COLUMN IF NOT EXISTS "metacognitionFlags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "rawJson"            JSONB,
  ADD COLUMN IF NOT EXISTS "clinicalContext"    TEXT,
  ADD COLUMN IF NOT EXISTS "longitudinalContext" TEXT,
  ADD COLUMN IF NOT EXISTS "icd10Codes"         TEXT;
