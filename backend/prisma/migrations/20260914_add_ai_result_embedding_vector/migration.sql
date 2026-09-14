-- Migration: Add AIResult async embedding reindex columns (Azure Service Bus / Queue Storage)
-- Generated: 2026-09-14

ALTER TABLE "AIResult"
  ADD COLUMN IF NOT EXISTS "embeddingVector" TEXT,
  ADD COLUMN IF NOT EXISTS "embeddingUpdatedAt" TIMESTAMP(3);