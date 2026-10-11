# SEWA AI Public-Data Feasibility Study (validation/)

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Task: binary **intracranial haemorrhage vs no haemorrhage** on **non-contrast head CT**.
Workload lives here and must not touch production services, filed patent documents, audit reports or deployment config.

## Status

- Step 1 (data + licences): **STOPPED_FOR_APPROVAL** — all candidate datasets are non-commercial; see `data_manifest.json`.
- No data downloaded. No models trained. No pre-registration written yet (Step 5).

## Directory layout

```
validation/
  config/study.yaml          Frozen study parameters (from the coding prompt).
  config/load_config.py      YAML loader shared by preprocessing/signals/metrics.
  preprocessing/             DICOM -> HU -> 3-window tensor, caching, patient-level splits.
  signals/                   One tested function per gate signal (MC-dropout U, OOD, coherence, conflict).
  metrics/                   Error-detection AUROC, risk-coverage, bootstrap CIs.
  tests/                     pytest suite (leakage test, signal tests).
  data/                      GIT-IGNORED raw data (datasets, cache).
  models/                    GIT-IGNORED weights and checkpoints.
  data_manifest.json         Licence/checksum/sampling record for every dataset.
  licence_requests/          Drafted permission requests (RSNA Mira, Qure.ai).
```

## Reproduction

Not reproducible yet — no data or pre-registration committed. Follow the prompt steps in order:
Step 1 licences (open) -> Step 2 preprocessing -> Step 3 model+baseline -> Step 4 signals
-> Step 5 pre-registration (`docs/evidence/preregistration.md`) -> Step 6 experiments -> Step 7 report -> Step 8 wrap-up.

## Ground rules (from the prompt, binding)

1. Truth over appearance; report negatives/null results.
2. Licences first; stop-and-ask on noncommercial/unclear/credentialed access; no unofficial mirrors; never re-identify; never redistribute.
3. No data/model weights in git (`validation/data/`, `validation/models/` are ignored).
4. Work stays in `validation/`; don't change production/patent/audit/deployment without asking.
5. Ask before >50 GB downloads; prefer a documented patient-level subset.
6. No network -> write exact manual download instructions and stop.
7. Every report/figure/model carries "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."
8. Do not push to any public remote.

## Environment

- Local Python: `C:\Python314\python.exe` (numpy, pytest, PyYAML present; pandas/sklearn to be installed).
- No NVIDIA GPU / nvidia-smi on this machine -> CPU-only training; a small subset model was planned for this.