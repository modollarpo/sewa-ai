# ADR 003: Report Signing Requires Acknowledgment of AI Review Flags

## Status
Accepted (2026-10-07)

## Context
The AI pipeline marks a scan `requiresHumanReview` when the uncertainty engine
raises `HIGH_UNCERTAINTY` or the metacognition gate fails
(`backend/src/services/aiOrchestrator.ts`, `scan.update` with
`requiresHumanReview: !metacog.passed || uncertainty.highUncertaintyFlag`,
reason `HIGH_UNCERTAINTY` / `METACOGNITION_FAIL`).

Audit §34 step 3 required either gating report signing on that flag or
explicitly documenting the policy decision. The gate exists
(`backend/src/controllers/reportController.ts`, `signReport`), but the policy
itself — and its interaction with the current UI — was previously undocumented.

## Decision
1. **Signing is blocked while a review flag is set.** `POST
   /api/v1/reports/:id/sign` returns `403` with a descriptive message unless
   the caller sends `acknowledgeReview: true` in the request body. No report
   state changes on the 403.
2. **Acknowledgment is an audited human act.** A successful acknowledgment
   writes an `REVIEW_ACKNOWLEDGED_ON_SIGN` audit-log entry containing the scan
   id, report id, and the original `humanReviewReason`, so "who released this
   and why" is recoverable later.
3. **Signers are role-checked.** Only `radiologist`, `admin`, `superadmin`
   may sign (unchanged).
4. **The web UI does not acknowledge.** The frontend has no caller that sends
   `acknowledgeReview`; a flagged scan therefore cannot be signed from the UI
   until the review flag is released through the review workflow. This is
   intended: the UI must not be a silent bypass of the safety gate. API
   clients that have completed a documented human review may pass
   `acknowledgeReview: true` explicitly.

## Alternatives considered
- **Remove the gate (allow unconditional signing)** — rejected: it would make
  the AI safety gate advisory-only (audit E-13).
- **Auto-acknowledge after N seconds / on open** — rejected: an automatic
  acknowledgment is indistinguishable from no acknowledgment in the audit log.
- **Block permanently until an adjudication is filed** — rejected for now as
  it would require a review workflow that does not yet exist end-to-end; the
  acknowledgment path keeps the process manual and explicit in the meantime.

## Consequences
- No scan can be signed while flagged without an explicit, logged human
  acknowledgment.
- Radiologists may see `403` on signing; the error text states the reason and
  the two remedies (release the review flag, or acknowledge after review).
- Any future UI for release/acknowledge must surface `humanReviewReason` to
  the signer before sending `acknowledgeReview: true`.
