-- Add MetacognitionAuditLog.layer4Detail (JSON) so the audit record captures
-- BOTH the generic SHAP coherence and the experimental window-specific
-- coherence (deficit, sensitive windows, channel flag, whether the window
-- deficit drove the hallucination-risk check). Required by the window-
-- specific coherence feature (off by default, unvalidated).
--
-- IF NOT EXISTS keeps `migrate deploy` idempotent on environments where
-- `prisma db push` already added the column.

ALTER TABLE "MetacognitionAuditLog"
    ADD COLUMN IF NOT EXISTS "layer4Detail" JSONB;
