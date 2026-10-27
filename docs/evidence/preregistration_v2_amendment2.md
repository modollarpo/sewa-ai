# Pre-registration amendment 2 to v2: label-integrity repair + wider unfreeze

**Status:** FROZEN before the **formal** v2 test evaluation (Test A / Test B).
**Parent:** `docs/evidence/preregistration_v2.md`; supersedes the model/labels parts of
`docs/evidence/preregistration_v2_amendment1.md`.
**Branch:** `fix/patent-aligned`. **Marking:** FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

## 0. Why this amendment (data-integrity incident)
Amendment 1's trainer (last-3-blocks, 160px, 8 slices) failed to learn: validation
study-level AUROC stalled at ~0.54 after 4 epochs and a linear probe on the frozen early
features returned val slice-AUROC 0.485 (chance). Investigation found the root cause in the
**label source**, not the model recipe:

- The cached `stage_2_train_with_metadata.csv` is a **long-format, corrupted** file: its
  `ID`/`Label`/`Sub_type` block is **decoupled** from its
  `SOPInstanceUID`/`StudyInstanceUID`/`SeriesInstanceUID`/position block. Every image has 6
  subtype rows whose SOP/Study/Series/position values differ, i.e. the labels belong to a
  *different* image than the one whose id was used to fetch the tile.
- Evidence (`validation/scripts/_verify_labels.py`): for all 6,400 selected image ids the
  metadata `Label` agrees with the authoritative RSNA `stage_2_train.csv` only **72%** of the
  time; metadata slice-positive rate **5.8%** vs the true **14.3%**; metadata study-level
  positivity had no clustering.
- Consequence: amendment-1 training labels were effectively random for ~28% of slices, which
  explains the near-chance validation AUROC.

Two supporting facts were established while diagnosing:

1. With the **real** labels, the existing 8-evenly-spaced-slice selection already captures
   **509/525 (97%)** of truly-positive scans — so the selection rule is **not** the problem
   and is left unchanged.
2. The `SOPInstanceUID → StudyInstanceUID` grouping is **real** (real labels do cluster by the
   metadata's study grouping), so the frozen split manifest remains valid.

## 1. Correction (amendment 2)
| # | Change vs amendment 1 | Reason |
|---|---|---|
| B1 | Per-slice labels now read from the **authoritative `stage_2_train.csv`** (image id → `any`), extracted directly from the RSNA zip (`TRAIN_CSV_OFF`/`TRAIN_CSV_CSIZE`); metadata `Label` ignored. | Corrupt label block |
| B2 | For a truly-positive scan whose 8 selected slices contain **no** positive slice, swap the most peripheral selected slice for the nearest-in-z positive slice (16 scans; +16 tiles). | Guarantee study label = true "any positive slice" |
| B3 | Trainable scope **last 3 blocks → last 6 blocks** (`K_LATE=6`); LR late blocks **3e-4 → 1e-4**. | Restore capacity; lower LR to avoid forgetting |
| B4 | Study label = any positive selected slice (now correct). | Consistent ground truth |

Unchanged from amendment 1: 160px, ≤8 epochs with validation study-level-AUROC early stop,
seed 42, batches 32, no augmentation, top-3 slice aggregation, validation-fitted temperature,
**all signals and arms**, the **primary comparison** (D3 vs better of B1/B2 at 20% review on
Test B), the success criterion, the Holm correction, the power/MDE rule, and the test
corruptions. The 800-scan split and leakage checks are unchanged.

## 2. Resulting split composition (real labels)
| split | scans | positive scans | slice-positive rate |
|---|---|---|---|
| train | 560 | 367 | 25.7% |
| val | 120 | 75 | 23.1% |
| test | 120 | 83 | 26.6% |

## 3. Provenance artifacts
- `validation/data_cache/rsna_image_labels.csv` (752,803 images, 107,933 positive, rate 0.1434).
- `validation/scripts/step1b_slices_v2b.json`, `validation/data_cache/v2_selected_image_ids_b.txt`.
- Probes: `validation/scripts/_verify_labels.py`, `_capture.py`.

## 4. Status
FROZEN before the formal test evaluation. Any further change is post-hoc and will be labelled
`exploratory` in the report.
