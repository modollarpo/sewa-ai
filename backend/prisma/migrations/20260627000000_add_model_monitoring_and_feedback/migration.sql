-- Migration 20260627: Add model monitoring, feedback, and support tables.
-- NOTE: The 0_init migration has been regenerated from schema.prisma and now
-- includes all these tables/columns. Every statement here uses IF NOT EXISTS
-- so this migration is fully idempotent when run after the updated 0_init.

-- ── User columns ─────────────────────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "consentPrefs" JSONB;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inviteToken"  TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_inviteToken_key" ON "User"("inviteToken");

-- ── Tables (all already created by 0_init; kept here for safety) ─────────
CREATE TABLE IF NOT EXISTS "SupportTicket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "zendeskId" TEXT,
    "assignedTo" TEXT,
    "tags" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AIModelVersion" (
    "id" TEXT NOT NULL,
    "modelType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "region" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deployedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "AIModelVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ModelPerformanceMetric" (
    "id" TEXT NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scanId" TEXT,
    "modality" TEXT NOT NULL,
    "condition" TEXT,
    "metricType" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "sampleSize" INTEGER,
    "windowStart" TIMESTAMP(3),
    "windowEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModelPerformanceMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AIDriftEvent" (
    "id" TEXT NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "tenantId" TEXT,
    "driftType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'detected',
    "metadata" JSONB,
    CONSTRAINT "AIDriftEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CustomerFeedback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "score" INTEGER,
    "subject" TEXT,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'new',
    "prioritized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerFeedback_pkey" PRIMARY KEY ("id")
);

-- ── Indexes (IF NOT EXISTS) ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "SupportTicket_tenantId_idx"  ON "SupportTicket"("tenantId");
CREATE INDEX IF NOT EXISTS "SupportTicket_userId_idx"    ON "SupportTicket"("userId");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx"    ON "SupportTicket"("status");
CREATE INDEX IF NOT EXISTS "SupportTicket_category_idx"  ON "SupportTicket"("category");
CREATE INDEX IF NOT EXISTS "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

CREATE INDEX IF NOT EXISTS "AIModelVersion_modelType_idx" ON "AIModelVersion"("modelType");
CREATE INDEX IF NOT EXISTS "AIModelVersion_region_idx"    ON "AIModelVersion"("region");
CREATE INDEX IF NOT EXISTS "AIModelVersion_active_idx"    ON "AIModelVersion"("active");

CREATE INDEX IF NOT EXISTS "ModelPerformanceMetric_modelVersionId_idx" ON "ModelPerformanceMetric"("modelVersionId");
CREATE INDEX IF NOT EXISTS "ModelPerformanceMetric_tenantId_idx"       ON "ModelPerformanceMetric"("tenantId");
CREATE INDEX IF NOT EXISTS "ModelPerformanceMetric_modality_idx"       ON "ModelPerformanceMetric"("modality");
CREATE INDEX IF NOT EXISTS "ModelPerformanceMetric_createdAt_idx"      ON "ModelPerformanceMetric"("createdAt");

CREATE INDEX IF NOT EXISTS "AIDriftEvent_modelVersionId_idx" ON "AIDriftEvent"("modelVersionId");
CREATE INDEX IF NOT EXISTS "AIDriftEvent_tenantId_idx"        ON "AIDriftEvent"("tenantId");
CREATE INDEX IF NOT EXISTS "AIDriftEvent_status_idx"          ON "AIDriftEvent"("status");

CREATE INDEX IF NOT EXISTS "CustomerFeedback_tenantId_idx"     ON "CustomerFeedback"("tenantId");
CREATE INDEX IF NOT EXISTS "CustomerFeedback_userId_idx"       ON "CustomerFeedback"("userId");
CREATE INDEX IF NOT EXISTS "CustomerFeedback_feedbackType_idx" ON "CustomerFeedback"("feedbackType");
CREATE INDEX IF NOT EXISTS "CustomerFeedback_status_idx"       ON "CustomerFeedback"("status");
CREATE INDEX IF NOT EXISTS "CustomerFeedback_createdAt_idx"    ON "CustomerFeedback"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerFeedback_tenantId_id_key" ON "CustomerFeedback"("tenantId", "id");

-- ── Foreign Keys (use DO block to skip if already exists) ─────────────────
DO $$ BEGIN
  ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ModelPerformanceMetric" ADD CONSTRAINT "ModelPerformanceMetric_modelVersionId_fkey"
    FOREIGN KEY ("modelVersionId") REFERENCES "AIModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ModelPerformanceMetric" ADD CONSTRAINT "ModelPerformanceMetric_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ModelPerformanceMetric" ADD CONSTRAINT "ModelPerformanceMetric_scanId_fkey"
    FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AIDriftEvent" ADD CONSTRAINT "AIDriftEvent_modelVersionId_fkey"
    FOREIGN KEY ("modelVersionId") REFERENCES "AIModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AIDriftEvent" ADD CONSTRAINT "AIDriftEvent_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerFeedback" ADD CONSTRAINT "CustomerFeedback_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerFeedback" ADD CONSTRAINT "CustomerFeedback_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
