# Feasibility report v4 — report-negation consistency signal (NEG)

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**
Generated reports are **synthetic text**, not clinical documents.
Pre-registration: `docs/evidence/preregistration_v4.md` (frozen before any test evaluation).
Branch `fix/patent-aligned`, all work local (**not pushed**).

---

## 1. Aim

Study v4 asks the one question v1–v3 could not: does a **report-versus-classifier
consistency check (NEG)** add value over the classifier-level gate **D2** for catching
unsafe generated reports? The pipeline under test is the filed design — a generator
conditioned on the structured triage output, followed by a consistency check.

**What this can show:** whether the check catches unsafe reports the classifier-level
gate misses (mechanism). **What it cannot show:** clinical benefit, or how a real medical
vision-language model behaves — on this CPU the generator is a template (G0). **Not a
novelty test:** negation checks against findings exist in the literature.

## 2. Data (fresh, disjoint)

| split | scans | positive scans (authoritative) | slices |
|---|---|---|---|
| validation (fit D2N weights) | 120 | 79 | 960 |
| test (held out) | 180 | 120 | 1,440 |

Drawn from the 973-study remainder of the RSNA 2,000-image subset, **disjoint from v2
train/val/test and from the v3 set** (leakage assertions in code and tests; grouping key
`StudyInstanceUID`; seed 44). Up to 8 slices/scan from the largest series; 11 nearest-in-z
positive swaps. Model: frozen **EfficientNet-B0 `classifier_v2a1.pt`** (reused, not
retrained; temperature 0.798). Test conditions: clean + 9 frozen corruptions (noise/blur/
low-dose ×3). Universe: 1,800 test instances (180 scans × 10 conditions; 1,620 shifted +
180 clean).

## 3. Generators (deviations stated)

- **G0 — template generator (used for all numbers below).** Writes a faithful impression
  from the triage output, then **injects a controlled contradiction at 10%** (flip polarity
  or hedge). This tests the *checking machinery only*: results are **"synthetic injection,
  not model behaviour."** Observed injection rate on the shifted test: **152/1,620 (9.4%)**.
- **G1 — Qwen2.5-1.5B-Instruct (Apache-2.0) via llama.cpp (MIT), text-only.** Planned for a
  subset with a fixed prompt, ≤120 tokens, 3 reports/scan. **Attempted but NOT obtained:**
  the link to the model/CDN hosts failed repeatedly (`curl` error 56; BITS stalled at
  ~7 KB/s for a 1.1 GB file). Recorded as a **deviation — G1 not run.** Not a VLM (filed
  design is image-conditioned); that deviation is also recorded.
- **G2 — permissive VLM:** skipped (no CPU-feasible permissive VLM in budget).

Manifest of prompts, licences and settings: `validation/scripts/v4_generator_manifest.json`.

## 4. Extractor validation (Step 2)

Rule-based NegEx/pyConText-style extractor (own code; `v4_step2_negation.py`), outputs
`present / absent / uncertain / historical / resolved`.

- **Template set** (506 sentences, dev 251 / holdout 255): accuracy **1.00 / 1.00** —
  **but this is leakage-prone** (templates share wording with the rules); treated as a
  smoke test only.
- **Independent adversarial set**, frozen *before* evaluation
  (`v4_negation_adversarial.json`; dev 60 / holdout 60; hand-written distractors,
  scoped negation, synonyms like "blood"/"bleed"): **v1 first run on the untouched
  holdout = 0.700 / 0.700 (primary).** After general rule fixes informed by dev failures,
  **0.983 / 0.983 (post-hoc, optimistic).**
  - Holdout per-class (post-hoc): present P1.00/R1.00 · absent P0.95/R1.00 · uncertain
    P1.00/R0.92 · historical P1.00/R1.00 · resolved P1.00/R1.00.
  - Known residual failures: implicit finding with no haemorrhage word ("subdural
    collection has decreased") → `absent`; "…is not seen, though it cannot be excluded"
    → `absent`.
- Labels are **unreviewed by a clinician**. A clinician pack of **120 sentences**
  (`v4_extractor_clinician_review.csv`) is prepared for the check you offered to arrange.

## 5. Power (Step 5b, before the test run)

Scan-cluster bootstrap on the **validation** set (in-sample D2N, so optimistic): MDE at the
20% review rate = **6.4% (< 15%)** → the design is **adequately powered**. A null/under
result would not be attributable to low power.

## 6. One-shot test evaluation (G0, run once)

Review rates 5/10/20/30%. Arms: **A** (no gate), **B2** (entropy), **D2** (frozen
classifier composite, weights 0.370/0.467/0.371 on C1/C2/C4), **N** (NEG alone),
**D2N** (C1+C2/C4+NEG, weights fitted on validation), plus ablations. Primary = **D2N vs D2
at 20% review, outcome O1 (unsafe reports accepted), shifted test**, scan-cluster bootstrap.

### Primary result

| review rate | D2N vs D2 rel. reduction | 95% CI |
|---|---|---|
| 5% | 0.2% | [−1.9%, 2.8%] |
| 10% | 1.9% | [−0.5%, 4.8%] |
| **20% (primary)** | **5.3%** | **[1.2%, 8.5%]** |
| 30% | 7.9% | [2.3%, 12.5%] |

**Verdict: NOT MET.** At the only primary rate (20%), the reduction is **statistically
significant (CI excludes 0) but below the pre-registered ≥15%** threshold. Paired
error-AUROC for O1, **D2N − D2 = +0.056, 95% CI [0.036, 0.077]**.

### Arms vs no gate A (shifted, 20% review; error = O1)

| arm | error-AUROC | relative reduction vs A | 95% CI |
|---|---|---|---|
| B2 | 0.701 | 33.4% | [0.299, 0.374] |
| D2 | 0.705 | 33.4% | [0.296, 0.377] |
| N (NEG alone) | 0.554 | 13.8% | [0.106, 0.176] |
| **D2N** | **0.761** | **37.0%** | [0.324, 0.414] |
| D2N − NEG (ablation) | 0.709 | 33.2% | [0.294, 0.372] |

- **Clean set** D2N vs D2 at 20% = 13.6% **[−5.9%, 42%]** (ns; n=180, few injections).
- **Per-corruption** D2N vs D2 at 20%: lowdose_1 0.29, lowdose_0 0.23, blur_0 0.15,
  noise_0 0.07, blur_1 0.07, blur_2 0.05, noise_1 0.00, noise_2 −0.03, lowdose_2 −0.10
  (heterogeneous; small per-cell n).

Signal firing (shifted): O1 rate **0.312**, O2 (unfaithful) **0.041**, O3 (classifier
error) **0.280**, **NEG fires on 6.4%**, urgency-mismatch 0.357. Polarity counts: present
972, absent 563, uncertain 85, historical/resolved 0.

## 7. Failure analysis (Step 7)

20 randomly chosen shifted instances (seed 12345); full table in
`validation/reports/v4_failure_analysis.json`.

| study | cond | prob | GT | injected | polarity | NEG | O1 |
|---|---|---|---|---|---|---|---|
| ID_27c83dc | noise_0 | 0.37 | 0 | none | absent | 0.0 | 0 |
| ID_6e1d606 | noise_1 | 0.91 | 1 | none | present | 0.0 | 0 |
| ID_d7edccd | noise_1 | 0.96 | 1 | none | present | 0.0 | 0 |
| ID_f9ed270 | noise_1 | 0.95 | 0 | none | present | 0.0 | 1 |
| ID_2881c3e | noise_2 | 0.49 | 0 | none | absent | 0.0 | 0 |
| ID_3a25147 | noise_2 | 0.29 | 0 | none | absent | 0.0 | 0 |
| ID_f79af93 | noise_2 | 0.32 | 1 | none | absent | 0.0 | 1 |
| ID_17af0b7 | blur_0 | 0.39 | 0 | none | absent | 0.0 | 0 |
| ID_6cf9456 | blur_0 | 0.66 | 0 | flip | absent | 1.0 | 0 |
| ID_37e5da0 | blur_1 | 0.92 | 1 | none | present | 0.0 | 0 |
| ID_43a3a6d | blur_1 | 0.41 | 1 | none | absent | 0.0 | 1 |
| ID_c0e899c | blur_1 | 0.63 | 1 | none | present | 0.0 | 0 |
| ID_eb0a6d0 | blur_1 | 0.56 | 1 | none | present | 0.0 | 0 |
| ID_f711a96 | blur_1 | 0.55 | 1 | none | present | 0.0 | 0 |
| ID_50139b6 | lowdose_0 | 0.00 | 0 | none | absent | 0.0 | 0 |
| ID_6cf9456 | lowdose_0 | 0.01 | 0 | none | absent | 0.0 | 0 |
| ID_78a8e37 | lowdose_0 | 0.50 | 0 | none | present | 0.0 | 1 |
| ID_f54b978 | lowdose_0 | 1.00 | 1 | flip | absent | 1.0 | 1 |
| ID_2a2a6c5 | lowdose_1 | 0.20 | 0 | hedge | uncertain | 0.0 | 0 |
| ID_5ced1ac | lowdose_2 | 0.64 | 1 | none | present | 0.0 | 0 |

**Cause breakdown of the 506 unsafe (O1) shifted reports:**

| cause | count | share |
|---|---|---|
| classifier error (report faithfully mirrors a wrong decision) | 405 | 80% |
| synthetic generator injection (G0 flip/hedge) | 101 | 20% |
| extractor/rule error | 0 | 0% |

NEG can only see the 20% injection-induced unsafe reports (a faithful report cannot
contradict the classifier it was built from). The pre-registered ≥15% bar is therefore
close to the design ceiling of a 10%-injection G0 (≈20%); observed 5.3% at the 20% review
rate is the fraction of injections the gate can reach at that review budget.

## 8. Verdict

**NOT MET.** NEG adds a small, statistically significant signal (paired error-AUROC
+0.056 [0.036, 0.077]; 20%-review relative reduction 5.3% [1.2%, 8.5%]), but **below the
pre-registered ≥15%** success threshold. On this synthetic-injection design the check does
what it is meant to do — it catches injected report/classifier contradictions the
classifier-level gate cannot — but the effect is small once classifier errors dominate the
unsafe set. This is a **mechanism result, not model behaviour**, and supports value, not
novelty, if pursued (raise at the attorney consult).

## 9. Limitations

- **G0 only.** No text LLM (G1 attempted, download failed) and no VLM (G2 skipped):
  text-only/template deviation from the filed image-conditioned design.
- Extractor accuracy is measured on a **synthetic** set whose labels are **unreviewed by a
  clinician**; the independent adversarial set is small (60/60) and the post-fix 0.983 is
  post-hoc/optimistic (untouched primary was 0.700).
- Public RSNA labels; noncommercial licence → research only.
- Scan-level (`StudyInstanceUID`) grouping; single seed; 8 slices/scan; temperature and D2
  weights reused from v2.
- Injured transfer: G0 reports are near-deterministic, so NEG mainly reflects the injected
  contradictions, not generator variability.

## 10. Reproduce

```
set PYTHONPATH=.
pytest validation/tests validation/study/tests          # 42+ unit tests
python validation/scripts/v4_step0_timing.py
python validation/scripts/v4_step2_negation.py
python validation/scripts/v4_step2b_adversarial.py --write      # freeze (already committed)
python validation/scripts/v4_step2b_adversarial.py --eval
python validation/scripts/v4_step4_manifest.py
python validation/scripts/v4_step4_select_slices.py
python validation/scripts/step1b_fetch_tiles.py                 # needs SEWA_IDS_FILE
python validation/scripts/v4_step6_signals.py
python validation/scripts/v4_power.py                           # BEFORE the test eval
python validation/scripts/v4_evaluate.py                        # one shot
python validation/scripts/v4_failure_analysis.py
```

## 11. Decisions for you

1. **Clinician check** of the 120-sentence pack (`v4_extractor_clinician_review.csv`) — the
   extractor’s only verified number is synthetic otherwise.
2. **G1:** retry on a stable network (or supply the GGUF/llama.cpp locally) to test a real
   text generator; otherwise keep the stated deviation.
3. Whether a 10%-injection template is the right stress level, or whether a *realistic*
   generator (with its own error modes) is needed to test whether NEG has clinical value.
4. Keep everything **local** per the v4 prompt until the second application is filed.
