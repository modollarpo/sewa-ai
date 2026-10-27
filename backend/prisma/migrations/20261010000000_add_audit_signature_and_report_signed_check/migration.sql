-- 1) Audit tamper-evidence (spec-vs-code #7 / audit E-09).
--    The RSA signature over the chain hash was computed in audit.ts but never
--    persisted, and verifyChain() could not re-derive the payload hash because
--    it rebuilt the JSON in a different key order than it was written. Both are
--    fixed together with the canonical-payload helpers in backend/src/utils/audit.ts.
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "payloadHash" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "signature" TEXT;

-- 2) Report human-review gate defence in depth (ADR 003 / spec-vs-code #6).
--    App-level gate already exists in reportController.signReport(); this adds a
--    DB-level guarantee that an approved/signed report carries a signer and time.
--    NOT VALID: do not fail on any pre-existing rows, but enforce all new writes.
ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "report_approved_requires_signature";
ALTER TABLE "Report" ADD CONSTRAINT "report_approved_requires_signature"
  CHECK (
    status NOT IN ('approved', 'signed')
    OR ("signedBy" IS NOT NULL AND "signedAt" IS NOT NULL)
  ) NOT VALID;
