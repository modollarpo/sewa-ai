-- CreateTable: schema.prisma models with no migration (2026-10-07)
-- Generated with `prisma migrate diff --from-empty --to-schema-datamodel`
-- so column types/defaults match schema.prisma exactly.
-- Missing tables found by comparing schema.prisma models against all prior
-- migrations: EdgePreProcessing, EdgeSite, CalibrationRecord,
-- CalibrationSummary, ExplainabilityReport. Prisma models exist but the
-- tables were never created (same failure mode as audit E-09), so every DB
-- built from migrations - including CI and production - lacks them.
-- IF NOT EXISTS keeps `migrate deploy` safe on environments where
-- `prisma db push` already created them.

CREATE TABLE IF NOT EXISTS "EdgePreProcessing" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "edgeDeviceId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "qualityScore" DOUBLE PRECISION,
    "qualityFlags" TEXT[],
    "blurScore" DOUBLE PRECISION,
    "noiseEstimate" DOUBLE PRECISION,
    "motionArtifact" BOOLEAN NOT NULL DEFAULT false,
    "urgencyHint" TEXT,
    "urgencyConfidence" DOUBLE PRECISION,
    "urgencyMethod" TEXT,
    "anonymizationVersion" TEXT,
    "anonymizationComplete" BOOLEAN NOT NULL DEFAULT false,
    "phiStrippedTags" TEXT[],
    "metadataExtracted" JSONB,
    "processingMs" INTEGER,
    "qualityModelVersion" TEXT,
    "triageModelVersion" TEXT,
    "edgeSoftwareVersion" TEXT,
    "offlineQueued" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EdgePreProcessing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EdgeSite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'uk',
    "supportedModalities" TEXT[] DEFAULT ARRAY['CT', 'XR']::TEXT[],
    "hasGpu" BOOLEAN NOT NULL DEFAULT false,
    "hasLocalRedis" BOOLEAN NOT NULL DEFAULT false,
    "enabledFeatures" TEXT[] DEFAULT ARRAY['quality_assessment', 'anonymization']::TEXT[],
    "maxOfflineQueueSizeMB" INTEGER NOT NULL DEFAULT 5000,
    "heartbeatIntervalSec" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastHeartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalDevices" INTEGER NOT NULL DEFAULT 0,
    "totalScansProcessed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EdgeSite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CalibrationRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "modality" TEXT,
    "modelVersion" TEXT,
    "predictedConfidence" DOUBLE PRECISION NOT NULL,
    "actualOutcome" BOOLEAN NOT NULL,
    "confidenceBin" TEXT NOT NULL,
    "scanId" TEXT,
    "aiResultId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalibrationRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CalibrationSummary" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "modality" TEXT,
    "modelVersion" TEXT,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "eceBin02" DOUBLE PRECISION,
    "eceBin24" DOUBLE PRECISION,
    "eceBin46" DOUBLE PRECISION,
    "eceBin68" DOUBLE PRECISION,
    "eceBin810" DOUBLE PRECISION,
    "eceOverall" DOUBLE PRECISION NOT NULL,
    "brierScore" DOUBLE PRECISION NOT NULL,
    "eceTrend" TEXT,
    "driftDetected" BOOLEAN NOT NULL DEFAULT false,
    "driftAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalibrationSummary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExplainabilityReport" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aiResultId" TEXT NOT NULL,
    "reasoningSteps" JSONB NOT NULL,
    "shapNarrative" TEXT,
    "gradCamRegions" JSONB,
    "summaryText" TEXT NOT NULL,
    "contradictionText" TEXT,
    "reportBlobUrl" TEXT,
    "reportFormat" TEXT NOT NULL DEFAULT 'json',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExplainabilityReport_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "EdgePreProcessing_scanId_key" ON "EdgePreProcessing"("scanId");
CREATE INDEX IF NOT EXISTS "EdgePreProcessing_edgeDeviceId_idx" ON "EdgePreProcessing"("edgeDeviceId");
CREATE INDEX IF NOT EXISTS "EdgePreProcessing_siteId_idx" ON "EdgePreProcessing"("siteId");
CREATE INDEX IF NOT EXISTS "EdgePreProcessing_urgencyHint_idx" ON "EdgePreProcessing"("urgencyHint");
CREATE UNIQUE INDEX IF NOT EXISTS "EdgeSite_siteId_key" ON "EdgeSite"("siteId");
CREATE INDEX IF NOT EXISTS "EdgeSite_tenantId_idx" ON "EdgeSite"("tenantId");
CREATE INDEX IF NOT EXISTS "EdgeSite_status_idx" ON "EdgeSite"("status");
CREATE INDEX IF NOT EXISTS "CalibrationRecord_tenantId_idx" ON "CalibrationRecord"("tenantId");
CREATE INDEX IF NOT EXISTS "CalibrationRecord_modality_idx" ON "CalibrationRecord"("modality");
CREATE INDEX IF NOT EXISTS "CalibrationRecord_confidenceBin_idx" ON "CalibrationRecord"("confidenceBin");
CREATE INDEX IF NOT EXISTS "CalibrationRecord_createdAt_idx" ON "CalibrationRecord"("createdAt");
CREATE INDEX IF NOT EXISTS "CalibrationSummary_tenantId_modality_idx" ON "CalibrationSummary"("tenantId", "modality");
CREATE INDEX IF NOT EXISTS "CalibrationSummary_windowStart_idx" ON "CalibrationSummary"("windowStart");
CREATE UNIQUE INDEX IF NOT EXISTS "ExplainabilityReport_scanId_key" ON "ExplainabilityReport"("scanId");
CREATE INDEX IF NOT EXISTS "ExplainabilityReport_scanId_idx" ON "ExplainabilityReport"("scanId");
CREATE INDEX IF NOT EXISTS "ExplainabilityReport_tenantId_idx" ON "ExplainabilityReport"("tenantId");
