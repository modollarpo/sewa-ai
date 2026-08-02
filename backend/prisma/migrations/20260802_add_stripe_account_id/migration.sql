-- Migration: Add stripeAccountId to Tenant
-- Generated: 2026-08-02

ALTER TABLE "Tenant" ADD COLUMN "stripeAccountId" TEXT;