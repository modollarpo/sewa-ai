-- Migration: Add FederatedWeightUpload, FederatedModelVersion, FederatedTrustAudit, FLBenchmark
-- Also add missing columns to FederatedNode and FederatedRound
-- Generated: 2026-07-13
-- Run via: kubectl exec -n sewa-ai deploy/sewa-backend -- npx prisma migrate deploy

-- 1. FederatedWeightUpload (persistent weight uploads per round)
CREATE TABLE "FederatedWeightUpload" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "weightsHash" TEXT NOT NULL,
    "weightsBlobUrl" TEXT,
    "sampleCount" INTEGER NOT NULL,
    "localLoss" DOUBLE PRECISION,
    "localAccuracy" DOUBLE PRECISION,
    "gradientNorm" DOUBLE PRECISION,
    "dpEpsilonUsed" DOUBLE PRECISION NOT NULL,
    "dpDelta" DOUBLE PRECISION NOT NULL DEFAULT 0.00001,
    "clipNorm" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "signatureValid" BOOLEAN NOT NULL DEFAULT false,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "FederatedWeightUpload_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FederatedWeightUpload_nodeId_idx" ON "FederatedWeightUpload"("nodeId");
CREATE INDEX "FederatedWeightUpload_roundId_idx" ON "FederatedWeightUpload"("roundId");
CREATE INDEX "FederatedWeightUpload_uploadedAt_idx" ON "FederatedWeightUpload"("uploadedAt");

-- 2. FederatedModelVersion (versioned aggregated models)
CREATE TABLE "FederatedModelVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "roundId" TEXT,
    "weightsBlobUrl" TEXT NOT NULL,
    "weightsHash" TEXT NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "loss" DOUBLE PRECISION,
    "participatingNodes" TEXT[],
    "totalDataVolume" INTEGER NOT NULL,
    "globalEpsilon" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'production',
    "deployedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rolledBackAt" TIMESTAMP(3),
    "rollbackReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FederatedModelVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FederatedModelVersion_version_key" ON "FederatedModelVersion"("version");
CREATE INDEX "FederatedModelVersion_status_idx" ON "FederatedModelVersion"("status");

-- 3. FederatedTrustAudit (trust score change log)
CREATE TABLE "FederatedTrustAudit" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "previousScore" DOUBLE PRECISION,
    "newScore" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "triggeredBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FederatedTrustAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FederatedTrustAudit_nodeId_idx" ON "FederatedTrustAudit"("nodeId");
CREATE INDEX "FederatedTrustAudit_event_idx" ON "FederatedTrustAudit"("event");
CREATE INDEX "FederatedTrustAudit_createdAt_idx" ON "FederatedTrustAudit"("createdAt");

-- 4. FLBenchmark (per-node benchmark results per round)
CREATE TABLE "FLBenchmark" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "localAccuracy" DOUBLE PRECISION NOT NULL,
    "localF1" DOUBLE PRECISION,
    "localAuroc" DOUBLE PRECISION,
    "localPrecision" DOUBLE PRECISION,
    "localRecall" DOUBLE PRECISION,
    "inferenceLatencyMs" INTEGER,
    "samplesUsed" INTEGER NOT NULL,
    "modalityBreakdown" JSONB,
    "accuracyDelta" DOUBLE PRECISION,
    "rankAmongNodes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FLBenchmark_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FLBenchmark_roundId_idx" ON "FLBenchmark"("roundId");
CREATE INDEX "FLBenchmark_nodeId_idx" ON "FLBenchmark"("nodeId");
CREATE INDEX "FLBenchmark_tenantId_idx" ON "FLBenchmark"("tenantId");

-- 5. Add missing columns to FederatedNode
ALTER TABLE "FederatedNode" ADD COLUMN "nodePublicKey" TEXT;
ALTER TABLE "FederatedNode" ADD COLUMN "nodeEndpoint" TEXT;
ALTER TABLE "FederatedNode" ADD COLUMN "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 50;
ALTER TABLE "FederatedNode" ADD COLUMN "trustFactors" JSONB;
ALTER TABLE "FederatedNode" ADD COLUMN "dpBudgetTotal" DOUBLE PRECISION NOT NULL DEFAULT 10.0;
ALTER TABLE "FederatedNode" ADD COLUMN "dpBudgetUsed" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "FederatedNode" ADD COLUMN "dpBudgetResetAt" TIMESTAMP(3);
ALTER TABLE "FederatedNode" ADD COLUMN "roundsParticipated" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FederatedNode" ADD COLUMN "roundsMissed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FederatedNode" ADD COLUMN "lastWeightsHash" TEXT;
ALTER TABLE "FederatedNode" ADD COLUMN "avgGradientNorm" DOUBLE PRECISION;
ALTER TABLE "FederatedNode" ADD COLUMN "quarantineReason" TEXT;
ALTER TABLE "FederatedNode" ADD COLUMN "quarantinedAt" TIMESTAMP(3);

-- 6. Add missing columns to FederatedRound
ALTER TABLE "FederatedRound" ADD COLUMN "aggregatedModelVersion" TEXT;
ALTER TABLE "FederatedRound" ADD COLUMN "globalEpsilon" DOUBLE PRECISION;
ALTER TABLE "FederatedRound" ADD COLUMN "avgTrustScore" DOUBLE PRECISION;
ALTER TABLE "FederatedRound" ADD COLUMN "minTrustThreshold" DOUBLE PRECISION NOT NULL DEFAULT 60;
ALTER TABLE "FederatedRound" ADD COLUMN "dpNoiseMultiplier" DOUBLE PRECISION;
ALTER TABLE "FederatedRound" ADD COLUMN "weightsSnapshotsUrl" TEXT;
ALTER TABLE "FederatedRound" ADD COLUMN "failedNodeIds" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "FederatedRound" ADD COLUMN "rejectedUploads" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FederatedRound" ADD COLUMN "durationMs" INTEGER;
