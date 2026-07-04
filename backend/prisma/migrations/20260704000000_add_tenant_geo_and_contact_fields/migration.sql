-- AlterTable: add missing columns to Tenant that exist in schema.prisma
-- but were never included in a migration file (schema drift fix)

ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "latitude"            DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude"           DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "timezone"            TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS "address"             TEXT,
  ADD COLUMN IF NOT EXISTS "primaryContactEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "whatsappEnabled"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "smsEnabled"          BOOLEAN NOT NULL DEFAULT false;
