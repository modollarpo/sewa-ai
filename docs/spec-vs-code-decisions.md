# Spec vs Code Decisions (GB2609706.3 + second application)
Date: 2026-10-10
Branch: `fix/patent-aligned`
Baseline (frozen): `g-v1` → commit `bf0cd3f8f4fe73a1b077d47ecb71b60f89325fe7` (2026-10-07 20:30:34 +0100)

Purpose: record every place where the code and the patent/spec diverge, the resolution we chose, and
whether it needs sign-off. **No formula, threshold, architecture or safety change is made without
approval** — items marked "Approval required" are proposals only.

## Status
- Remote confirmed **private** (`modollarpo/sewa-ai`, `isPrivate: true`) — no public disclosure route
  for unfiled material. Nothing pushed since this branch was cut.
- **Phase 1 acceptance met:** all four AI services booted locally (triage 8000, vlm 8001,
  uncertainty 8002, metacognition 8003) and the live boundary test
  `backend/src/__tests__/contract-real-services.test.ts` passes **5/5** against them — all four stages
  return HTTP 200 with real values, and the backend's own builders/normalisers round-trip. Wired into
  the `contract-test` CI job.
- Static suites green: `reliabilityEval` + `wireContract` 80/80; `tsc --noEmit` clean; lint 0 errors.
- **Phase 2 = this document. Awaiting approval of the resolutions below before any code change.**

### Evidence note (filing date)
The `g-v1` tag dated 2026-10-07 is useful as **dated development evidence** for work done after the
filing. It does **not** establish anything relative to the **25 April 2026** filing date. Any feature
that must count as filed prior art needs to be tied to the filed disclosure, not to this repo history.

---

## 1. Uncertainty maths — keep the filed formula, fix the thresholds
- **Filed/reference formula:** the filed estimator for epistemic and aleatoric uncertainty is the
  reference we must keep. (Exact filed expression to be quoted from GB2609706.3 in this doc when the
  text is available in-repo; not yet present.)
- **Code** (`ai-services/uncertainty/main.py`): epistemic = `std.mean()` over MC passes (L235);
  aleatoric = `-Σ(mean·log(mean+eps))` (L238 region, L237); composite = `min(1.0, epistemic +
  0.3·aleatoric)` (L238); gate `is_uncertain = epistemic > 0.25 or aleatoric > 0.5` (L443);
  MC perturbation = **input Gaussian noise** σ=`MC_NOISE_STD` (default 0.05) (L212).
- **Problem:** with input-noise perturbation the per-class standard deviation is far below `0.25`, so
  the epistemic branch of the gate **can never fire**. A safety signal that can never fire is
  non-functional.
- **Decision (proposed):** **keep the filed formula**; choose epistemic/aleatoric thresholds that can
  actually trigger on real data (retune from 0.25/0.5 — values to be derived from the evaluated
  distribution, not guessed). Do **not** change the maths.
- **Approval required.**

## 2. Dropout vs input noise
- **Filed:** Monte-Carlo **dropout** (stochastic forward passes through dropout layers).
- **Code:** approximates MC-Dropout with **calibrated Gaussian input noise** (σ=0.05) on ONNX INT8,
  documented as an intentional speed trade-off (L196-207) and labelled
  `attribution_method = onnx-occlusion-finite-difference` / `MC-Dropout … ONNX noise-injection`.
- **Verdict: MISMATCH (documented deviation).** The code approximates rather than performs dropout.
- **Resolution:** implement **real MC dropout** (enable dropout at inference across N passes) and
  record the deviation from the current input-noise implementation. Retaining input-noise as a
  fallback is acceptable only if labelled; it must not be presented as dropout.
- **Approval required.**

## 2b. Triggerable thresholds are the reason dropout matters
Real MC dropout raises the epistemic variance to a range where a triggerable threshold is meaningful;
combined with item 1 this is the correct pairing (real dropout + retuned thresholds), not input-noise
with an artificially lowered threshold.

## 2.5 Model architecture — pick one and record why
- **Conflict in code:** `ai-services/triage/model.py` builds **EfficientNet-B0** (L51/L59) with an
  explicit rationale ("CPU-optimised ~5.3M params vs B4 19M — identical clinical utility", L9-10);
  `ai-services/uncertainty/model.py` builds **EfficientNet-B4** (`SEWATriageModel`, L28-35).
- **Platform fact:** the deployment is **all CPU / ONNX-INT8, no GPU pool** (see work-state notes).
- **Proposed decision:** standardise on **EfficientNet-B0** for both (CPU-optimised, INT8-friendly,
  already the triage backbone), and record the rationale here. **Approval required** (architecture
  choice affects what performance/claims we can make).

## 2. OOD detection & window-specific coherence — build, don't document away
- **Spec:** out-of-distribution signal (Mahalanobis) and window-specific coherence.
- **Code:** **no** OOD/Mahalanobis anywhere (`grep` over `ai-services/` = 0 hits); metacognition has a
  generic **SHAP coherence** check (`<0.4` → `SHAP_INCOHERENCE`, L226-234, scoring L304-318) but **no
  window-specific** variant (0 hits for "window" in `metacognition/main.py`).
- **Resolution:** **build** the OOD/Mahalanobis signal and window-specific coherence (new features,
  **off by default** until validated). Do **not** remove the claims. **Approval required** (scope).

## 2. Grad-CAM / SHAP — already real; keep
- **Code** (`ai-services/uncertainty/main.py`): SHAP values via finite-difference/occlusion
  attribution (`compute_onnx_attribution`, L257+), Grad-CAM via ONNX saliency map
  (`compute_saliency_map_onnx`, L433/about L275+) with heatmap render + upload (L440-441). Demo path
  is honestly labelled `demo-random-attribution` / `demo_mode`. This is **implemented (PARTIAL:
  ONNX-approximation, not PyTorch backprop)** and should be **kept and strengthened**, not dropped.
- **Resolution:** keep; optionally note the ONNX-approximation vs exact-backprop distinction. No
  claim removal.

## 3. Report signature / human-review gate
- **Spec:** report cannot leave `draft` without a clinician signature; human-review gate enforced.
- **Code** (`backend/src/controllers/reportController.ts`): `signReport` (L86) enforces role (L89) and
  requires `acknowledgeReview===true` when `scan.requiresHumanReview` (403, L101-111), sets
  `status:'approved', signedAt, signedBy` (L122), audits `REPORT_SIGNED` (L174). `schema.prisma` Report
  has `status String @default("draft")` (L363), `signedAt` (364), `signedBy` (365) — **no DB CHECK
  constraint**; enforcement is app-level only.
- **Resolution:** add a DB `CHECK` constraint so `status='approved'` requires `signedBy`/`signedAt`
  (defence in depth), keeping the existing app gate. **Approval required** (migration).

## 4. Audit hash-chain & digital signature
- **Spec:** tamper-evident, hash-chained, cryptographically signed audit log.
- **Code** (`backend/src/utils/audit.ts`): hash chain real — writer `auditLog()` (L39) chains via
  `previousHash`/`sha256Hash` with `blockIndex`/`merkleRoot` (AuditLog model, `schema.prisma` L728-752);
  reader `verifyChain()` (L90). RSA-SHA256 **signature is computed but not persisted** (~L70
  commented) and `verifyChain()` does **not** verify signatures; `AUDIT_PRIVATE_KEY` validated at load
  (L13-26).
- **Resolution:** persist the signature and verify it in `verifyChain()` (keeps the claim true).
  **Approval required** (schema + verify change).

## 5. demo_mode refusal in clinical mode
- **Spec:** clinical mode must refuse demo weights.
- **Code:** all services emit `demo_mode`, but nothing refuses demo in clinical mode (0 hits for a
  clinical/refuse switch).
- **Resolution:** add a clinical-mode guard that refuses demo-derived output (off by default, enabled
  in clinical config). **Approval required.**

## 5b. Uncertainty local default port (8009 vs 8002)
- **Code:** `backend/src/config/env.ts` defaults `UNCERTAINTY_SERVICE_URL` to `localhost:8009`; the
  service and contract use `8002`. **Low-risk code fix.** No claim impact.

---

## Resolution policy
- **Prefer building the feature over deleting the claim.** If the spec/marketing asserts a capability,
  the default path is to implement it (off by default until validated), not to strike the language —
  unless the user explicitly chooses to drop it.
- Keep filed formulas as filed; where an implementation detail cannot make the filed value fire (e.g.
  the `0.25` epistemic threshold), retune the threshold and record the deviation.
- Record any deviation from the code (e.g. real dropout vs input-noise) explicitly in this doc.
- New features ship **off by default**; demo weights stay labelled; clinical mode must refuse demo.
- Anything that changes what we can claim requires approval.

## Approval table
| # | Item | Proposed resolution | Impact on claims | Approval |
|---|------|---------------------|------------------|----------|
| 1 | Uncertainty formula/threshold | keep filed formula; retune thresholds so they can trigger | preserves claim | yes |
| 2 | Dropout | implement real MC-Dropout; note deviation | preserves claim | yes |
| 3 | OOD + window coherence | build (off by default) | preserves claim | yes |
| 4 | Grad-CAM/SHAP | keep (ONNX-approx); optionally strengthen | preserves claim | no (keep) |
| 5 | Architecture B0/B4 | standardise B0 (+ rationale) | sets performance claim | yes |
| 6 | Report-signature DB constraint | add CHECK constraint | strengthens | yes |
| 7 | Audit signature | persist + verify | preserves claim | yes |
| 8 | Uncertainty local default port | 8009 → 8002 | none | low |

---

## Phase 2 implementation status (approved; landed 2026-10-10)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 8 | Uncertainty port | ✅ | `backend/src/config/env.ts` local default `8002` |
| 7 | Audit signature | ✅ | `backend/src/utils/audit.ts` canonical payload + persisted `payloadHash`/`signature`, `verifyChain()` verifies; `AuditLog` columns via migration `20261010000000_…` |
| 6 | Report-signature DB CHECK | ✅ | same migration adds `report_approved_requires_signature` (`NOT VALID`) |
| 5 | Architecture B0 | ✅ | `ai-services/uncertainty/model.py` `DEFAULT_BACKBONE="efficientnet_b0"`, rationale in header (B4/resnet50 retained for experiments) |
| 2 | Real MC-Dropout | ✅ | `model.py` `enable_mc_dropout`/`mc_dropout_predict`; `main.py` `mc_dropout_torch` + dispatcher. ONNX input-noise retained **only** as labelled fallback (`mc_method="onnx-input-noise"`). New response fields `mc_method`/`ood_score`/`ood_flag` added to `wire-contract.json` + `normaliseUncertainty` + contract test |
| 1 | Triggerable thresholds | ✅ (provisional) | `EPISTEMIC_THRESHOLD=0.15`, `ALEATORIC_THRESHOLD=0.40`, env-overridable; filed formula unchanged. Values to be finalised after N≥300 calibration |
| 3 (OOD) | Mahalanobis OOD | ✅ (off by default) | `main.py` `_load_ood_reference`/`compute_ood`; enabled only with `OOD_ENABLED=true` **and** fitted `ood_reference.npz`. `/health` reports `ood_enabled` |
| 3 (window) | Window-specific coherence | ⏳ **awaiting definition** | No spec text in-repo defining the "window". Generic SHAP coherence already exists. Needs the exact intended semantics before building |
| 4 | Grad-CAM/SHAP | ✅ kept | unchanged; ONNX-approximation labelled |
| 5 | Clinical-mode demo refusal | ✅ | `backend/src/services/clinicalMode.ts` (`assertClinicalModeSafe`, fail-closed); `CLINICAL_MODE` env in `config/env.ts`; wired at single persistence choke point in `aiOrchestrator.ts` before `AIResult.create`; 7 unit tests |

Verification for this batch: `tsc --noEmit` clean; `eslint` 0 errors; `wireContract.test.ts` 47/47;
`clinicalMode.test.ts` 7/7; live `contract-real-services.test.ts` 5/5 and Python `tests/contract`
20/20 against all four booted services (uncertainty now serving `mc_method`/`ood_score`/`ood_flag`).
