# Spec vs Code Decisions (GB2609706.3 + second application)
Date: 2026-10-10
Branch: `fix/patent-aligned`
Baseline (frozen): `g-v1` → commit `bf0cd3f8f4fe73a1b077d47ecb71b60f89325fe7` (2026-10-07 20:30:34 +0100)

Purpose: record every place where the code and the patent/spec text diverge, the resolution we
chose, and whether the resolution needs explicit sign-off. **No formula, threshold or safety gate is
changed without approval** — anything in the "Approval required" column is a proposal only.

## Status (remediation progress)
- Phase 0 done: branch cut from `main`, audit-text corruption fixed, baseline tag verified.
- Contract repair done and merged to `main` (`4ce13a4`): wire contract single source of truth,
  live contract tests 20/20, CI green, honest demo/attribution labels, drift/bias metrics stopped
  fabricating values.
- Reliability MVP (`g-v1`) harness landed; frozen thresholds, `insufficient_data` below N=30.
- Phase 1 (this branch): backend boundary resolver (`backend/src/contracts/boundaries.ts`) derived
  from the wire contract; a live real-HTTP boundary test that exercises the backend's own
  builders/normalisers against the running services.
- Phase 2 (this doc): evidence-based spec-vs-code matrix below. **Stop point — items marked
  "Approval required" need a decision before Phase 2 code changes.**

Evidence legend: `MATCH` = code does what spec says · `MISMATCH` = spec and code disagree ·
`PARTIAL` = partially implemented · `ABSENT` = claimed in spec/marketing but not in code ·
`OPEN` = needs a product/safety decision.

---

## 1. Uncertainty maths
- **Spec** (as read by the prior team): aleatoric = mean p(1−p); composite = 0.6·epistemic + 0.4·aleatoric.
- **Code** (`ai-services/uncertainty/main.py`): epistemic = `std.mean()` (~L235); aleatoric =
  `-Σ(mean·log(mean+eps))` (entropy) (L237); composite = `min(1.0, epistemic + 0.3·aleatoric)` (L238);
  MC noise σ=0.05 via `MC_NOISE_STD` (L212); flag `is_uncertain = epistemic>0.25 or aleatoric>0.5` (L443).
- **Verdict: MISMATCH.** The prior "0.6/0.4 + mean p(1−p)" description is incorrect.
- **Resolution:** keep the shipped formula (it is the evaluated `g-v1` behaviour); correct the spec text
  to match the code. **Approval required** to instead change the code to the spec formula.

## 2. Metacognition layers
- **Spec:** "9-layer" safety gate; SHAP-coherence check; hallucination-risk (H) formula; window-specific coherence.
- **Code** (`ai-services/metacognition/main.py`, ~480 L): docstring enumerates **8** layers (code comments
  number to 9). SHAP coherence `<0.4` sets `SHAP_INCOHERENCE` (L227, method L304); implausible-finding
  hallucination bump `+0.45` (L187); `passed` computed near L275.
- **Verdict: PARTIAL.** Layer count is 8 (naming), not 9; window-specific coherence not implemented.
- **Resolution:** reconcile spec wording to 8 named layers, or implement the 9th layer.
  **Approval required.**

## 3. OOD detection (Mahalanobis) & window-specific coherence
- **Spec/marketing:** OOD/Mahalanobis rejection; window-specific coherence.
- **Code:** no Mahalanobis / OOD implementation anywhere (grep hits only the audit doc and frontend
  marketing pages such as `RoadmapPage.tsx`, `LandingPage.tsx`).
- **Verdict: ABSENT.** Claim appears only in marketing/roadmap copy.
- **Resolution:** either implement OOD + window coherence, or remove the claims from public copy.
  New feature must ship **off by default**. **Approval required** (scope decision).

## 4. Audit hash-chain & digital signature
- **Spec:** tamper-evident, hash-chained, cryptographically signed audit log.
- **Code** (`backend/src/utils/audit.ts`): writer `auditLog()` (L39) chains via `previousHash`/`sha256Hash`
  with `blockIndex`/`merkleRoot` (AuditLog model, `schema.prisma` L728-752); reader `verifyChain()` (L90).
  RSA-SHA256 **signature is computed but not persisted** (~L70 commented) and `verifyChain()` does **not**
  verify signatures; `AUDIT_PRIVATE_KEY` validated at module load (L13-26).
- **Verdict: PARTIAL.** Hash chain = MATCH; cryptographic signing = computed but not stored/verified.
- **Resolution:** persist `signature` and verify in `verifyChain()`, or downgrade the claim to
  "hash-chained (signature not yet persisted)". **Approval required** (schema/claim change).

## 5. Clinician signature / human-review gate on reports
- **Spec:** report cannot leave `draft` without a clinician signature; human-review gate enforced.
- **Code** (`backend/src/controllers/reportController.ts`): `signReport` (L86) enforces role
  radiologist/admin/superadmin (L89) and requires `acknowledgeReview===true` when
  `scan.requiresHumanReview` (403 otherwise, L101-111); sets `status:'approved'`, `signedAt`,
  `signedBy` (L122); audits `REPORT_SIGNED` (L174). Schema `Report`: `status` default `"draft"` (L363),
  `signedAt` (L364), `signedBy` (L365) — **no DB CHECK constraint** (migrations confirm plain
  `signedBy TEXT`). ADR: `docs/adr/003-report-signing-human-review-gate.md`.
- **Verdict: PARTIAL.** Gate is app-level only; DB allows `approved` without a signer.
- **Resolution:** add a DB CHECK constraint (`status='approved'` ⇒ `signedBy IS NOT NULL`) and/or
  keep app-level enforcement documented. **Approval required** (migration).

## 6. demo_mode / clinical-mode refusal
- **Spec:** demo weights must not be used in clinical mode; clinical mode refuses demo.
- **Code:** all services report `demo_mode`/`attribution_method`, but **no code refuses demo** in a
  clinical context — no `CLINICAL_MODE` env or refuse branch exists.
- **Verdict: ABSENT.** Labeling is honest; enforcement of "clinical refuses demo" is missing.
- **Resolution:** add an explicit clinical-mode guard that refuses `demo_mode` responses at the
  orchestrator boundary, default off. **Approval required.**

## 6b. Local port default mismatch
- **Code:** `backend/src/config/env.ts` defaults `UNCERTAINTY_SERVICE_URL` to `localhost:8009`;
  the service and wire contract are `8002`; CI sets `8002` explicitly.
- **Verdict: MISMATCH (latent bug).** Local runs without the env var would miss uncertainty.
- **Resolution:** change the local default to `8002`. Low risk; confirm then fix.

---

## Resolution policy (unchanged)
- Keep existing formulas/thresholds unless an item above is explicitly approved for change; log every
  deviation here.
- Any new safety feature ships **off by default**.
- Demo weights stay labelled; clinical mode must refuse demo.
- No new subject matter is published before the second-application filing.

## Approval checklist (Phase 2 gate)
| # | Item | Proposed action | Needs approval |
|---|------|-----------------|----------------|
| 1 | Uncertainty formula | fix spec text to match code (default) | yes |
| 2 | Metacognition layers | reconcile 8 vs 9 | yes |
| 3 | OOD / window coherence | implement-off-by-default **or** remove claims | yes |
| 4 | Audit signature | persist+verify **or** downgrade claim | yes |
| 5 | Report signature DB constraint | add CHECK constraint | yes |
| 6 | Demo-mode refusal in clinical mode | add off-by-default guard | yes |
| 7 | Uncertainty local default port (8009→8002) | code fix | low |
