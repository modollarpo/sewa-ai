-- SEWA XAI — add Scan pipeline tracking, quality columns & AIResult metacognitionScore
-- These columns exist in schema.prisma but were never migrated.

ALTER TABLE "Scan"
  ADD COLUMN IF NOT EXISTS "pipelineStage"       TEXT,
  ADD COLUMN IF NOT EXISTS "pipelineStartedAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pipelineCompletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pipelineMetadata"    JSONB,
  ADD COLUMN IF NOT EXISTS "qualityScore"        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "qualityFlags"        TEXT[];

CREATE INDEX IF NOT EXISTS "Scan_pipelineStage_idx" ON "Scan"("pipelineStage");

ALTER TABLE "AIResult"
  ADD COLUMN IF NOT EXISTS "metacognitionScore" DOUBLE PRECISION;
