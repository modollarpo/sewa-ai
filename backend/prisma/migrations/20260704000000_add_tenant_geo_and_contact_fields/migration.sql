-- Schema drift fix: backfill all columns added to schema.prisma after the
-- 0_init migration was originally written.
-- All statements use IF NOT EXISTS / safe variants for idempotency.
-- Databases migrated from the updated 0_init already have these columns
-- and Postgres will silently skip them.

-- ── Tenant ────────────────────────────────────────────────────────────────
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

-- ── Scan ──────────────────────────────────────────────────────────────────
ALTER TABLE "Scan"
  ADD COLUMN IF NOT EXISTS "accessionNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "origin"          TEXT NOT NULL DEFAULT 'cloud',
  ADD COLUMN IF NOT EXISTS "fileName"        TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Scan_accessionNumber_key" ON "Scan"("accessionNumber");

-- ── User ──────────────────────────────────────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "inviteToken"     TEXT,
  ADD COLUMN IF NOT EXISTS "consentPrefs"    JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "User_inviteToken_key" ON "User"("inviteToken");
