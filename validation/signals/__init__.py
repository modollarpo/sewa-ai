"""Gate signals, one tested function per signal.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Implemented at Step 4 of the validation prompt; currently scaffolding only.
- uncertainty.py  -> MC-dropout U = 0.6*epistemic + 0.4*aleatoric, N=20
- ood.py          -> Mahalanobis distance, penultimate layer, shrinkage, training-only fit
- coherence.py    -> Grad-CAM vs BHX boxes (or "not evaluated")
- conflict.py     -> high confidence AND high U (validation quantiles)
- negation.py     -> always "not evaluated" (no generated reports in this phase)
"""