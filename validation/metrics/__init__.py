"""Metrics per arm and review rate + patient-level bootstrap.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Implemented at Steps 6-7 of the validation prompt; currently scaffolding only.
- error-detection AUROC, risk-coverage + area, unsafe-accepted rate,
  missed haemorrhage, sensitivity/specificity, human-review share.
- patient-level bootstrap (>=1000 resamples, fixed seeds)."""