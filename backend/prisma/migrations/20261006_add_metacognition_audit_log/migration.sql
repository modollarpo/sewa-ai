-- CreateTable: MetacognitionAuditLog
-- Generated to match schema.prisma (2026-10-06). The model existed in the
-- schema but no migration ever created the table (audit E-09: zero writers,
-- and the table is absent from deployed DBs).

CREATE TABLE "MetacognitionAuditLog" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aiResultId" TEXT NOT NULL,

    "layer1ModalityPlausibility" TEXT NOT NULL,
    "layer1Detail" JSONB,
    "layer2UrgencyConsistency" TEXT NOT NULL,
    "layer2Detail" JSONB,
    "layer3ConfidenceFloor" TEXT NOT NULL,
    "layer3Detail" JSONB,
    "layer4SHAPCoherence" TEXT NOT NULL,
    "layer5UncertaintyConflict" TEXT NOT NULL,
    "layer6ReportConcordance" TEXT NOT NULL,
    "layer7DemographicPlausibility" TEXT NOT NULL,
    "layer8HallucinationRisk" DOUBLE PRECISION NOT NULL,
    "layer9SafeToAlert" BOOLEAN NOT NULL,

    "contradictionDetected" BOOLEAN NOT NULL DEFAULT false,
    "contradictionType" TEXT,
    "contradictionSeverity" TEXT,
    "contradictionDetail" JSONB,
    "vlmSemanticSimilarity" DOUBLE PRECISION,

    "clinicalRulesPassed" INTEGER NOT NULL DEFAULT 0,
    "clinicalRulesFailed" INTEGER NOT NULL DEFAULT 0,
    "clinicalRuleViolations" JSONB,

    "brierScore" DOUBLE PRECISION,
    "calibrationBin" TEXT,

    "explainabilityReportUrl" TEXT,
    "reasoningChain" JSONB,

    "overallDecision" TEXT NOT NULL,
    "decisionConfidence" DOUBLE PRECISION NOT NULL,
    "decisionReasoning" TEXT NOT NULL,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetacognitionAuditLog_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "MetacognitionAuditLog_scanId_idx" ON "MetacognitionAuditLog"("scanId");
CREATE INDEX "MetacognitionAuditLog_tenantId_idx" ON "MetacognitionAuditLog"("tenantId");
CREATE INDEX "MetacognitionAuditLog_overallDecision_idx" ON "MetacognitionAuditLog"("overallDecision");
CREATE INDEX "MetacognitionAuditLog_contradictionDetected_idx" ON "MetacognitionAuditLog"("contradictionDetected");
CREATE INDEX "MetacognitionAuditLog_createdAt_idx" ON "MetacognitionAuditLog"("createdAt");