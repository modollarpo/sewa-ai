-- Migration: Add ReportVersion, AuditBlock, MlModelValidation, MlDeploymentTrigger
-- Generated: 2026-07-12
-- Run via: kubectl exec -n sewa-ai deploy/sewa-backend -- npx prisma migrate deploy

-- CreateTable: ReportVersion (tamper-evident report snapshots)
CREATE TABLE "ReportVersion" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "technique" TEXT,
    "findings" TEXT NOT NULL,
    "impression" TEXT NOT NULL,
    "recommendation" TEXT,
    "fullText" TEXT,
    "editedBy" TEXT NOT NULL,
    "changeNote" TEXT,
    "sha256Hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AuditBlock (Merkle tree batch)
CREATE TABLE "AuditBlock" (
    "id" TEXT NOT NULL,
    "blockIndex" INTEGER NOT NULL,
    "merkleRoot" TEXT NOT NULL,
    "entryCount" INTEGER NOT NULL,
    "entryIds" TEXT[],
    "previousBlockHash" TEXT,
    "blockHash" TEXT NOT NULL,
    "committed" BOOLEAN NOT NULL DEFAULT false,
    "ledgerTxId" TEXT,
    "ledgerReceipt" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MlModelValidation (FL round validation)
CREATE TABLE "MlModelValidation" (
    "id" TEXT NOT NULL,
    "federatedRoundId" TEXT,
    "modelType" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "previousVersion" TEXT,
    "validationDataset" TEXT NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "precision" DOUBLE PRECISION,
    "recall" DOUBLE PRECISION,
    "f1Score" DOUBLE PRECISION,
    "auroc" DOUBLE PRECISION,
    "loss" DOUBLE PRECISION,
    "sampleSize" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "metricsJson" JSONB,
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ocrImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MlModelValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MlDeploymentTrigger (k8s rollout tracking)
CREATE TABLE "MlDeploymentTrigger" (
    "id" TEXT NOT NULL,
    "validationId" TEXT NOT NULL,
    "modelType" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "sourceImage" TEXT NOT NULL,
    "targetService" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "triggerMetadata" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rollbackAt" TIMESTAMP(3),
    "rollbackReason" TEXT,
    "k8sJobName" TEXT,
    "k8sJobNamespace" TEXT NOT NULL DEFAULT 'sewa-ai',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MlDeploymentTrigger_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "ReportVersion_reportId_version_key" ON "ReportVersion"("reportId", "version");
CREATE INDEX "ReportVersion_reportId_idx" ON "ReportVersion"("reportId");
CREATE INDEX "ReportVersion_createdAt_idx" ON "ReportVersion"("createdAt");

CREATE UNIQUE INDEX "AuditBlock_blockIndex_key" ON "AuditBlock"("blockIndex");
CREATE INDEX "AuditBlock_blockIndex_idx" ON "AuditBlock"("blockIndex");
CREATE INDEX "AuditBlock_committed_idx" ON "AuditBlock"("committed");

CREATE INDEX "MlModelValidation_federatedRoundId_idx" ON "MlModelValidation"("federatedRoundId");
CREATE INDEX "MlModelValidation_modelType_modelVersion_idx" ON "MlModelValidation"("modelType", "modelVersion");
CREATE INDEX "MlModelValidation_passed_idx" ON "MlModelValidation"("passed");

CREATE UNIQUE INDEX "MlDeploymentTrigger_validationId_key" ON "MlDeploymentTrigger"("validationId");
CREATE INDEX "MlDeploymentTrigger_status_idx" ON "MlDeploymentTrigger"("status");
CREATE INDEX "MlDeploymentTrigger_modelType_idx" ON "MlDeploymentTrigger"("modelType");

-- Foreign keys
ALTER TABLE "ReportVersion" ADD CONSTRAINT "ReportVersion_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MlModelValidation" ADD CONSTRAINT "MlModelValidation_federatedRoundId_fkey" FOREIGN KEY ("federatedRoundId") REFERENCES "FederatedRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MlDeploymentTrigger" ADD CONSTRAINT "MlDeploymentTrigger_validationId_fkey" FOREIGN KEY ("validationId") REFERENCES "MlModelValidation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
