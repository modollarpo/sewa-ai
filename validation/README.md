# SEWA AI Public-Data Feasibility Study (`validation/`)

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Task: binary **intracranial haemorrhage vs no haemorrhage** on **non-contrast head CT**.
This folder must not touch production services, filed patent documents, audit reports or
deployment config.

## Status

- Step 1 (data + licences): **RSNA subset obtained + verified**; **CQ500 external test blocked**
  (official host `headctstudy.qure.ai` DNS-unreachable from this machine). See `data_manifest.json`.
- Step 2 preprocessing: done (HU + 3 windows + 224), slice-level. RSNA has no patient id ->
  image-level splits (documented limitation).
- Step 3 model: EfficientNet-B0 fully fine-tuned (CPU), best val AUROC 0.918. Baselines B1/B2 dirty
  (no temperature scaling yet).
- Step 4 signals: U, OOD (Mahalanobis), conflict implemented + tested; attribution (no BHX) and
  negation (no reports) marked **not evaluated**.
- Step 5 pre-registration: committed (`docs/evidence/preregistration.md`).
- Step 6 experiments: arms A, B1, B2, C1, C2, C4, D, E run on RSNA dev.
- Step 7 report: `docs/evidence/feasibility_report.md` + figures in `reports/`.
- Step 8 wrap-up: this README + decision list in the report.

**Headline (RSNA dev, test n=300):** the composite score H does **not** beat single-pass
baselines (error AUROC 0.685 vs 0.751); the OOD component is at chance and is the only
component that hurts. The pre-registered >=20% criterion is NOT met. Negative result.

## Directory layout

```
validation/
  config/study.yaml              Frozen study parameters.
  preprocessing/build_tensors.py GCS-sourced resumable tile cache -> rsna_2000_224_3win.npz
  preprocessing/make_splits.py   Deterministic image-level split + leakage test
  study/metrics.py               AUROC (mid-rank), risk-coverage/AURC, Brier, ECE, bootstrap CI
  study/compare.py               relative reduction + CI, success criterion
  study/data.py                  npz/split loading, channel stats, tensor building
  study/model.py                 EfficientNet-B0 + MC-dropout helpers
  study/signals.py               U (frozen formula), Mahalanobis OOD, conflict
  study/precompute_features.py   frozen features (head path)
  study/train_head.py            dropout head on frozen features
  study/train.py                 full fine-tune (resumable, --resume)
  study/run_study.py             arms A,B1,B2,C1,C2,C4,D,E -> reports/
  study/figures.py               dependency-free SVG figures
  study/tests/                   pytest suite (metrics, signals)
  scripts/kaggle_to_blob.py      Kaggle -> Azure blob (AzCli credential)
  data_subsets/                  subset + split CSVs (committed)
  data_cache/                    GIT-IGNORED tensors/features/preds
  models/                        GIT-IGNORED weights (classifier.pt, head.pt, latest.pt)
  reports/                       study_report_{head,full}.{json,md}, curves npz, figures
  data_manifest.json             licence/checksum/sampling record
  licence_requests/              drafted permission requests (RSNA, Qure.ai)
```

## Reproduce

```
python -u -m validation.preprocessing.build_tensors --workers 16
python -u -m validation.preprocessing.make_splits
python -u -m validation.study.train --epochs 12 --batch 8        # CPU; resumable via --resume
python -u -m validation.study.run_study --model full             # cached -> fast
python -u -m validation.study.figures --tag full
python -m pytest validation/study/tests -q
```

## Ground rules (from the prompt, binding)

1. Truth over appearance; report negatives/null results.
2. Licences first; stop-and-ask on noncommercial/unclear/credentialed access; no unofficial mirrors; never re-identify; never redistribute.
3. No data/model weights in git (`validation/data/`, `validation/data_cache/`, `validation/models/` ignored).
4. Work stays in `validation/`; don't change production/patent/audit/deployment without asking.
5. Ask before >50 GB downloads; prefer a documented subset.
6. No network -> write exact manual download instructions and stop.
7. Every report/figure/model carries "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."
8. Do not push to any public remote.

## Environment

- `C:\Python314\python.exe`: Python 3.14.2, numpy 2.4.1, scikit-learn 1.9.1, torch 2.10.0+cpu, PyYAML, pytest.
- No GPU -> CPU-only (batch 8 fine-tune; ~14-25 min/epoch on this 4-core box; ~7.9 GB RAM, batch 32 OOMs).

## v4 — report-negation signal study (latest; local, not pushed)

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE. See
`docs/evidence/feasibility_report_v4.md` and `docs/evidence/preregistration_v4.md`.

- **Question:** does a report-versus-classifier consistency check (**NEG**) add value over
  the classifier-level gate **D2** at catching unsafe generated reports?
- **Result (one-shot, G0 template + 10% injected contradictions):** primary D2N vs D2 at
  20% review, shifted disjoint test, unsafe-accepted **5.3% relative reduction
  [1.2%, 8.5%]** — significant but **below the pre-registered ≥15% ⇒ NOT MET**. Paired
  error-AUROC D2N−D2 = +0.056 [0.036, 0.077]. MDE at 20% = 6.4% (adequately powered).
- **Primary numbers are G0** (template + 10% injected contradictions). **G1** (Qwen2.5-1.5B,
  text-only; GGUF sha256-verified) was run separately for generator/input consistency:
  149/150 generations assert *present*, so **0/75 contradictions on decided-present** vs
  **74/75 (98.7%) on decided-absent** scans (~44% population-weighted). G2 (VLM) skipped.
  No image-conditioned generator was run — a deviation from the filed design.
- **Extractor:** rule-based; independent adversarial holdout primary **0.700** (untouched),
  0.983 post-hoc after fixes; labels **unreviewed by a clinician** (120-sentence pack
  prepared).

Reproduce (from repo root, `PYTHONPATH=.`):

```
python validation/scripts/v4_step4_manifest.py
python validation/scripts/v4_step4_select_slices.py
python validation/scripts/step1b_fetch_tiles.py        # set SEWA_IDS_FILE=validation/data_cache/v4_selected_image_ids.txt
python validation/scripts/v4_step6_signals.py
python validation/scripts/v4_power.py                  # BEFORE the test eval
python validation/scripts/v4_evaluate.py               # run once
python validation/scripts/v4_failure_analysis.py
python validation/scripts/v4_g1_qwen.py --scans 50     # G1 (needs verified GGUF + llama.cpp)
pytest validation/tests validation/study/tests -q
```

## Open decisions (see `docs/evidence/feasibility_report.md` §8; v4 list in `feasibility_report_v4.md` §11)

CQ500 access route; RSNA non-commercial approval; learned composite weights; keep or drop the OOD signal. v4: clinician-check the extractor pack; retry G1 on a stable network; keep local until the second application is filed.
