-- AlterTable: backfill columns that were added to schema.prisma after the
-- 0_init migration was written (schema drift fix).
-- This migration is safe to re-run — all statements are IF NOT EXISTS.
-- Databases migrated from the updated 0_init will already have these columns
-- and Postgres will silently skip them.

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

-- Unique index for apiKey (IF NOT EXISTS requires PG 9.5+ — always available on PG 15)
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_apiKey_key" ON "Tenant"("apiKey");
