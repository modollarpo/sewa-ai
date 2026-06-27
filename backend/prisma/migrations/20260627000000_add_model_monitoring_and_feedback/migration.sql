-- Add inviteToken column to User table
ALTER TABLE "User" ADD COLUMN "inviteToken" TEXT;

-- CreateTable
CREATE TABLE "SupportTicket" (
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

-- CreateTable
CREATE TABLE "AIModelVersion" (
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

-- CreateTable
CREATE TABLE "ModelPerformanceMetric" (
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

-- CreateTable
CREATE TABLE "AIDriftEvent" (
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

-- CreateTable
CREATE TABLE "CustomerFeedback" (
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

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteToken_key" ON "User"("inviteToken");

-- CreateIndex
CREATE INDEX "SupportTicket_tenantId_idx" ON "SupportTicket"("tenantId");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_category_idx" ON "SupportTicket"("category");

-- CreateIndex
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

-- CreateIndex
CREATE INDEX "AIModelVersion_modelType_idx" ON "AIModelVersion"("modelType");

-- CreateIndex
CREATE INDEX "AIModelVersion_region_idx" ON "AIModelVersion"("region");

-- CreateIndex
CREATE INDEX "AIModelVersion_active_idx" ON "AIModelVersion"("active");

-- CreateIndex
CREATE INDEX "ModelPerformanceMetric_modelVersionId_idx" ON "ModelPerformanceMetric"("modelVersionId");

-- CreateIndex
CREATE INDEX "ModelPerformanceMetric_tenantId_idx" ON "ModelPerformanceMetric"("tenantId");

-- CreateIndex
CREATE INDEX "ModelPerformanceMetric_modality_idx" ON "ModelPerformanceMetric"("modality");

-- CreateIndex
CREATE INDEX "ModelPerformanceMetric_createdAt_idx" ON "ModelPerformanceMetric"("createdAt");

-- CreateIndex
CREATE INDEX "AIDriftEvent_modelVersionId_idx" ON "AIDriftEvent"("modelVersionId");

-- CreateIndex
CREATE INDEX "AIDriftEvent_tenantId_idx" ON "AIDriftEvent"("tenantId");

-- CreateIndex
CREATE INDEX "AIDriftEvent_status_idx" ON "AIDriftEvent"("status");

-- CreateIndex
CREATE INDEX "CustomerFeedback_tenantId_idx" ON "CustomerFeedback"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerFeedback_userId_idx" ON "CustomerFeedback"("userId");

-- CreateIndex
CREATE INDEX "CustomerFeedback_feedbackType_idx" ON "CustomerFeedback"("feedbackType");

-- CreateIndex
CREATE INDEX "CustomerFeedback_status_idx" ON "CustomerFeedback"("status");

-- CreateIndex
CREATE INDEX "CustomerFeedback_createdAt_idx" ON "CustomerFeedback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedback_tenantId_id_key" ON "CustomerFeedback"("tenantId", "id");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelPerformanceMetric" ADD CONSTRAINT "ModelPerformanceMetric_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "AIModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelPerformanceMetric" ADD CONSTRAINT "ModelPerformanceMetric_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelPerformanceMetric" ADD CONSTRAINT "ModelPerformanceMetric_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIDriftEvent" ADD CONSTRAINT "AIDriftEvent_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "AIModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIDriftEvent" ADD CONSTRAINT "AIDriftEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedback" ADD CONSTRAINT "CustomerFeedback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedback" ADD CONSTRAINT "CustomerFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

