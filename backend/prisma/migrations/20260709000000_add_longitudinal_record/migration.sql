-- Migration: Add LongitudinalRecord table for Longitudinal Patient Tracking (Feature 2)
-- This table stores RECIST-equivalent progression metrics per scan per patient.

CREATE TABLE IF NOT EXISTS "LongitudinalRecord" (
  "id"                TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "tenantId"          TEXT         NOT NULL,
  "patientId"         TEXT         NOT NULL,
  "scanId"            TEXT         NOT NULL,
  "recordedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tumorVolumeCm3"    DOUBLE PRECISION,
  "longestDiameterMm" DOUBLE PRECISION,
  "progressionPct"    DOUBLE PRECISION,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LongitudinalRecord_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LongitudinalRecord"
  ADD CONSTRAINT "LongitudinalRecord_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LongitudinalRecord"
  ADD CONSTRAINT "LongitudinalRecord_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LongitudinalRecord"
  ADD CONSTRAINT "LongitudinalRecord_scanId_fkey"
    FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "LongitudinalRecord_tenantId_idx"  ON "LongitudinalRecord"("tenantId");
CREATE INDEX IF NOT EXISTS "LongitudinalRecord_patientId_idx" ON "LongitudinalRecord"("patientId");
CREATE INDEX IF NOT EXISTS "LongitudinalRecord_scanId_idx"    ON "LongitudinalRecord"("scanId");
