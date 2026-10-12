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

## Open decisions (see `docs/evidence/feasibility_report.md` §8)

CQ500 access route; RSNA non-commercial approval; learned composite weights; keep or drop the OOD signal.
