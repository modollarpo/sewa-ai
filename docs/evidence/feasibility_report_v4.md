# Feasibility report v4 — report-negation consistency signal (NEG)

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**
Generated reports are **synthetic text**, not clinical documents.
Pre-registration: `docs/evidence/preregistration_v4.md` (frozen before any test evaluation).
Branch `fix/patent-aligned`, all work local (**not pushed**).

---

## Design flaw (pre-registration) — recorded, not re-scored

The pre-registered **≥15%** success bar sat **near the ceiling of the G0 design**. NEG can
only see the **injected** contradictions; those are ≈**20%** of unsafe (O1) reports (101/506
in the test run), because a report faithfully built from the classifier cannot contradict it.
A perfect NEG that flagged every injection (and no classifier error) could therefore reduce
unsafe-accepted reports by at most ≈ the injection share (~20%); the observed 5.3% at the 20%
review rate is the fraction reachable at that review budget. **This is a flaw in the
pre-registered threshold, not a re-score of the frozen criterion — the verdict stays NOT MET.**

---

## 1. Aim

Study v4 asks the one question v1–v3 could not: does a **report-versus-classifier
consistency check (NEG)** add value over the classifier-level gate **D2** for catching
unsafe generated reports? The pipeline under test is the filed design — a generator
conditioned on the structured triage output, followed by a consistency check.

**What this can show:** whether the check catches unsafe reports the classifier-level
gate misses (mechanism). **What it cannot show:** clinical benefit, or how a real medical
vision-language model behaves — no image-conditioned generator was run (G0 template; G1
text-only). **Not a novelty test:** negation checks against findings exist in the literature.

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
- **G1 — Qwen2.5-1.5B-Instruct (Apache-2.0) via llama.cpp win-cpu-x64 b11583 (MIT), text-only.**
  Model `qwen2.5-1.5b-instruct-q4_k_m.gguf` from the official HF repo
  (`Qwen/Qwen2.5-1.5B-Instruct-GGUF`); **size 1,117,320,736; SHA256 verified
  `6a1a2eb6…9407e`** (matches the HF LFS pointer / `X-Linked-ETag`). Fixed prompt
  (system + triage line), ≤120 new tokens, temperature 0.7, top-p 0.9, **3 reports/scan**,
  seeds fixed. **Not a VLM** (the filed design is image-conditioned) — a recorded deviation.
  - **Run on a 50-scan stratified subset (25 decided-present / 25 decided-absent, 150
    generations; `validation/reports/v4_g1_qwen.json`).** Measured only **generator-introduced
    contradiction**: report polarity vs. the triage decision.
    - **decided-present scans: 0/75 contradictions** (model said *present* in 75/75).
    - **decided-absent scans: 74/75 = 98.7% contradictions** (model still said *present* in
      74/75). Overall on the balanced subset, the **extractor-flagged contradiction rate
      (UNVALIDATED, upper bound) = 49.3%**; **population-weighted ≈ 44%** using the test
      set's 45% decided-absent share. (Extractor-flagged only: no clinician labels yet, so
      this is an **upper bound** on the true rate — see §4c.)
    - **Interpretation:** the text-only model has a strong "haemorrhage-present" prior
      (149/150 generations assert *present*) and effectively ignores a low probability; it
      does not faithfully reflect its input. **This measures generator/input inconsistency,
      not detection accuracy** — no accuracy claim is made (labels unreviewed by a clinician).
  - **Prompt variant b (explicit decision).** Same 50 scans, seeds and settings, but the
    prompt adds the decision string ("haemorrhage detected" / "no haemorrhage detected").
    Extractor-flagged rate **0.067** (150 generations; polarity absent 65 / present 85) vs
    **0.493** for variant a — the explicit decision largely removes the "present" prior.
    `validation/reports/v4_g1_qwen_b.json`, `v4_g1_prompt_compare.json`. **Under manual
    labels**, `v4_g1_prompt_compare.py` reports each variant's true rate and their paired
    scan-cluster-bootstrap difference once both blinded sheets are returned.
- **G2 — permissive VLM:** skipped (no CPU-feasible permissive VLM in budget).

Manifest of prompts, licences, artefacts and checksums:
`validation/scripts/v4_generator_manifest.json`. Runner: `validation/scripts/v4_g1_qwen.py`.

## 4. Extractor validation (Step 2)

Rule-based NegEx/pyConText-style extractor (own code; `v4_step2_negation.py`), outputs
`present / absent / uncertain / historical / resolved`.

- **Template set** (506 sentences, dev 251 / holdout 255): accuracy **1.00 / 1.00** —
  **but this is leakage-prone** (templates share wording with the rules); treated as a
  smoke test only.
- **Independent adversarial set**, frozen *before* evaluation
  (`v4_negation_adversarial.json`; dev 60 / holdout 60; hand-written distractors,
  scoped negation, synonyms like "blood"/"bleed"). **Extractor accuracy = 0.700** — the
  **untouched** first run on the held-out split (the headline number to quote). The **0.983**
  figure is **post-hoc** (after general rule fixes informed by the dev split) and
  **optimistic — label it post-hoc, not the accuracy.**
  - Holdout per-class (post-hoc, 0.983 configuration): present P1.00/R1.00 · absent
    P0.95/R1.00 · uncertain P1.00/R0.92 · historical P1.00/R1.00 · resolved P1.00/R1.00.
  - Known residual failures: implicit finding with no haemorrhage word ("subdural
    collection has decreased") → `absent`; "…is not seen, though it cannot be excluded"
    → `absent`.
- Labels are **unreviewed by a clinician**. A clinician pack of **120 sentences**
  (`v4_extractor_clinician_review.csv`) is prepared for the check you offered to arrange.

### 4b. Extractor v2 (probability-aware) — G1 follow-up

The v1 extractor ignores probability/likelihood phrasing (e.g. "low probability of
haemorrhage", "…is unlikely", "90% probability"), which the G1 reports contain. v2
(`v4_step2_negation_v2.py`) adds low/high/moderate phrase rules, an "unlikely" rule and a
numeric-probability reader ("10%", "0.15 probability"); other triggers are reused from v1.

- **Development set (new, disjoint from the 150 G1 reports):** `build_prob_set()` — a
  probability-phrasing synthetic set, split dev/holdout with a fixed seed
  (`v4_negation_v2_set.json`). v2 accuracy **1.000 dev / 1.000 holdout** vs v1 **0.583 /
  0.539** (`v4_negation_v2.json`). **Synthetic and templated — a smoke test, not clinical
  evidence.**
- **Exploratory re-run on the 150 G1 reports (variant a), applied ONCE, untuned**
  (`v4_negation_v2_g1_exploratory.json`): extractor-flagged rate **0.493 (v1) → 0.240 (v2)**;
  v2 polarity absent 34 / present 110 / uncertain 6. **Still UNVALIDATED** — the extractor's
  notion of "low probability ⇒ not asserted" may be wrong for some reports, so these rates
  await the clinician labels.

### 4c. Blinded clinician labelling (in progress)

150 reports for each prompt variant a and b were exported in **random order** to
`v4_g1_blinded_labelling_sheet.csv` / `v4_g1b_blinded_labelling_sheet.csv`, showing the
decision, probability, urgency and report text but **not** the extractor polarity or
contradiction flag (label column: `consistent | contradicts | ambiguous`; plus `notes` and
`clinician_signoff`).

Additional labelling pack (`v4_build_label_pack.py`, hashes in
`docs/evidence/label_hashes.txt`):

- **One merged 300-row sheet** `v4_g1_merged_labelling_sheet.csv`: variants a+b shuffled
  with a fixed seed and re-numbered `R001…R300`, with **no column revealing the prompt
  variant**. A **private key** `v4_g1_merged_key_PRIVATE.json` maps `new_id → variant +
  original row_id + scan`. A random **50** rows are flagged `second_labeller_subset` (for a
  second labeller, to compute agreement). The `instructions` column carries the rule:
  *"If a report both asserts and denies the finding, label it ambiguous and add a note."*
- A **clinician copy** of the extractor review **without `proposed_label`**
  (`v4_extractor_clinician_review_clinician.csv`); the original is kept unchanged as the key.
- On return, `v4_merged_label_analysis.py` reports **inter-labeller Cohen's kappa**, the
  extractor-vs-clinician confusion matrix, and the **true contradiction rate per prompt
  variant with scan-cluster bootstrap 95% CIs** (resampling the 50 `StudyInstanceUID`
  clusters), plus failure examples. `v4_g1_label_analysis.py` (`--extractor v1|v2`) and
  `v4_g1_prompt_compare.py` cover the per-variant sheets and the paired a−b difference.

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

No "extractor error" row is claimed: **G0 and the extractor share template wording**, so a
zero here would be **no evidence of extractor accuracy** — the extractor is only validated on
the independent adversarial set (§4: **0.700** untouched holdout). NEG can only see the 20%
injection-induced unsafe reports (a faithful report cannot contradict the classifier it was
built from). The pre-registered ≥15% bar is therefore close to the design ceiling of a
10%-injection G0 (≈20%); observed 5.3% at the 20% review rate is the fraction of injections
the gate can reach at that review budget (see the Design-flaw note at the top).

## 8. Verdict

**NOT MET.** NEG adds a small, statistically significant signal (paired error-AUROC
+0.056 [0.036, 0.077]; 20%-review relative reduction 5.3% [1.2%, 8.5%]), but **below the
pre-registered ≥15%** success threshold. On this synthetic-injection design the check does
what it is meant to do — it catches injected report/classifier contradictions the
classifier-level gate cannot — but the effect is small once classifier errors dominate the
unsafe set. This is a **mechanism result, not model behaviour**, and supports value, not
novelty, if pursued (raise at the attorney consult).

## 9. Limitations

- **Primary numbers are G0 (template).** G1 (Qwen2.5-1.5B, text-only) was run separately and
  only for generator/input consistency; G2 (VLM) skipped. No image-conditioned generator was
  tested, so nothing here reflects the filed design's actual generator.
- **G1 is text-only and small** (50 scans, 150 generations, one prompt). Its ~44% weighted
  extractor-flagged contradiction rate (UNVALIDATED, upper bound) reflects a strong "present" prior (149/150 assert haemorrhage present),
  not clinical accuracy; no clinician-reviewed labels were used.
- Extractor accuracy is measured on a **synthetic** set whose labels are **unreviewed by a
  clinician**; the independent adversarial set is small (60/60) and the post-fix 0.983 is
  post-hoc/optimistic (untouched primary was 0.700).
- **Extractor v2's 1.000 dev/holdout is on a templated probability set** and shows only that
  the added rules fire as intended — it is **not** an accuracy claim on real text. The v2
  application to the 150 G1 reports is **exploratory/untuned** and still **unvalidated**;
  the blinded label sheets (variants a and b) are the missing validation.
- **All G1 contradiction numbers are extractor-flagged** and therefore **upper bounds** until
  the clinician labels return; the blinded sheets deliberately hide the extractor flag so the
  extractor-vs-label confusion matrix is not circular.
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
python validation/scripts/v4_g1_qwen.py --scans 50              # G1 variant a (needs verified GGUF + llama.cpp)
python -m validation.scripts.v4_g1_qwen --scans 50 --prompt-variant b   # G1 variant b
python -m validation.scripts.v4_step2_negation_v2               # extractor v2 (synthetic dev/holdout)
python -m validation.scripts.v4_step2c_negation_v2_g1           # v2 on the 150 G1 reports (exploratory)
python -m validation.scripts.v4_g1_export_blinded               # blinded sheet (variant a)
python -m validation.scripts.v4_g1_export_blinded --json validation/reports/v4_g1_qwen_b.json \
    --out validation/reports/v4_g1b_blinded_labelling_sheet.csv
python -m validation.scripts.v4_g1_prompt_compare               # rates now; true rates after labels
python -m validation.scripts.v4_g1_label_analysis \
    --labels validation/reports/v4_g1_blinded_labelling_sheet.csv   # after labels return
```

## 11. Decisions for you

1. **Clinician check** of the 120-sentence pack (`v4_extractor_clinician_review.csv`) — the
   extractor’s only verified number is synthetic otherwise.
2. **Label the merged sheet** (`v4_g1_merged_labelling_sheet.csv`, 300 rows, variant-blind;
   column `label` = consistent/contradicts/ambiguous, and `label_2` on the 50
   `second_labeller_subset` rows). On return, run `v4_merged_label_analysis.py` (kappa +
   confusion + per-variant rates). The blinded `proposed_label`-free
   `v4_extractor_clinician_review_clinician.csv` covers the extractor check.
3. **G1 result:** the text-only model almost always asserts "present" and so contradicts any
   low-probability triage. Decide whether to (a) accept this as a limitation, (b) add a
   stronger prompt / few-shot or constrain output, or (c) move to an image-conditioned
   generator (G2), which is the design actually filed. (Variant b — explicit decision — is
   the (b) experiment: extractor-flagged rate fell from 0.493 to 0.067.)
3. Whether a 10%-injection template is the right stress level, or whether a *realistic*
   generator (with its own error modes) is needed to test whether NEG has clinical value.
4. Keep everything **local** per the v4 prompt until the second application is filed.
