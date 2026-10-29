"""
patch_patent_v3.py — Apply mathematical reconciliation patches to the
second UK patent application specification.

Resolves:
  1. Conditional vs unconditional FNR (abstract, section 7.4, claims 1, 3, 15)
  2. Sup formulation explicitly correct (claim 2)
  3. Test E.2 pointing game metric unit (per-box, section 7.5)
  4. Claim 9 monotonicity — weaken from universal assertion to experimental
  5. R_n denominator definition made explicit (section 7.4)

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
"""
from pathlib import Path

ROOT = Path(__file__).parents[1]
SPEC = ROOT / "docs" / "patent" / "UK_Patent_Application_2_Specification_and_Claims.md"

text = SPEC.read_text(encoding="utf-8")
original = text

# -------------------------------------------------------------------------
# Fix 1: Abstract — FNR qualifier
# -------------------------------------------------------------------------
text = text.replace(
    "(iii) a Split Conformal Risk Control safety gate that establishes finite-sample "
    "expected risk bounds on False Negative Rates (E[FNR] <= alpha) under exchangeability "
    "using an empirical calibration quantile threshold (lambda);",
    "(iii) a Split Conformal Risk Control safety gate that establishes finite-sample "
    "expected risk bounds on the conditional False Negative Rate among positive-class imaging "
    "studies (E[FNR_cond] <= alpha) under exchangeability, using an empirical calibration "
    "quantile threshold (lambda) selected as the supremum of safe thresholds satisfying the "
    "finite-sample Bates et al. (2021) bound;"
)

# -------------------------------------------------------------------------
# Fix 2: Summary section 3 — FNR qualifier
# -------------------------------------------------------------------------
text = text.replace(
    "E[L(Y, C_lambda(X))] <= alpha\n   where alpha in (0, 1) is a pre-determined risk ceiling (e.g., alpha = 0.05). "
    "If no lambda satisfies the criterion, the system sets lambda = 0 "
    "(routing 100% of scans to human review).",
    "E[L(Y, C_lambda(X))] = E[I(Y=1 and C_lambda(X)=0) | Y=1] <= alpha\n"
    "   where the expectation is the conditional false-negative rate among positive studies, "
    "alpha in (0, 1) is a pre-determined risk ceiling (e.g., alpha = 0.05), and "
    "the loss L(Y, C_lambda(X)) = I(Y=1 and S(X) < lambda) is evaluated over the "
    "positive-class calibration subset. If no lambda satisfies the criterion, "
    "the system sets lambda = 0 (routing 100% of scans to human review)."
)

# -------------------------------------------------------------------------
# Fix 3: Section 7.4 — make R_n denominator definition explicit + sup/inf note
# -------------------------------------------------------------------------
OLD_74 = """Because loss L is monotonically non-decreasing with respect to threshold lambda (higher thresholds produce more false negatives), the empirical risk across calibration dataset D_cal of n labeled scans is:
R_n(lambda) = (1 / n_pos) * sum_{i: Y_i=1} I(S(X_i) < lambda)

Following Bates et al. (2021), under the assumption that calibration samples and future test samples are exchangeable, the optimal threshold lambda is selected as the supremum of safe thresholds:
lambda = sup { lambda' in [0, 1] : (n / (n + 1)) * R_n(lambda') + (1 / (n + 1)) <= alpha }
If no lambda > 0 satisfies the bound, the system sets lambda = 0, ensuring that no cases are automatically cleared."""

NEW_74 = """Because loss L is monotonically non-decreasing with respect to threshold lambda (higher thresholds produce more false negatives), the empirical conditional false-negative rate across calibration dataset D_cal of n labeled scans is:
R_n(lambda) = (1 / n_pos) * sum_{i: Y_i=1} I(S(X_i) < lambda)
where n_pos = |{i : Y_i = 1}| is the number of positive-class calibration studies. This definition bounds the conditional false-negative rate E[I(C_lambda(X)=0) | Y=1] among studies determined to contain the target condition.

*Distinction from unconditional risk*: The Bates et al. (2021) theorem in its general form bounds E[L(X,Y)] where L = I(Y=1 and S(X)<lambda) — the unconditional false-negative probability P(Y=1, S(X)<lambda). Under prevalence P(Y=1) = pi, the two quantities satisfy:
E[L(X,Y)] = pi * R_n(lambda)
The implementation uses n_pos denominator (conditional FNR), which provides a tighter calibrated bound for the clinically relevant quantity: the fraction of haemorrhagic studies that would be missed.

Following Bates et al. (2021), under the assumption that calibration samples and future test samples are exchangeable, the optimal threshold lambda is selected as the supremum of safe thresholds:
lambda = sup { lambda' in [0, 1] : (n / (n + 1)) * R_n(lambda') + (1 / (n + 1)) <= alpha }
For a monotonically non-decreasing loss, the safe set {lambda' : bound(lambda') <= alpha} is a closed interval [0, lambda*]. The supremum (lambda*) is the most aggressive threshold satisfying the bound, maximising the proportion of studies safely auto-cleared. Note: an equivalent formulation is inf{lambda' : bound(lambda') > alpha}, which produces the identical value.
If no lambda > 0 satisfies the bound, the system sets lambda = 0, ensuring that no cases are automatically cleared."""

text = text.replace(OLD_74, NEW_74)

# -------------------------------------------------------------------------
# Fix 4: Section 7.5 — per-box metric clarification
# -------------------------------------------------------------------------
text = text.replace(
    "In evaluation across 6,283 expert bounding boxes in 226 positive studies from CQ500/BHX, "
    "Masked HiResCAM improved pointing-game hit rates from 11.20% (standard Grad-CAM) to "
    "43.83% overall, and to 62.16% on chronic subdural haematomas.",
    "In evaluation across 6,283 expert bounding box annotations in 226 positive studies from "
    "CQ500/BHX (evaluated per bounding box annotation: a hit is recorded if the peak saliency "
    "pixel falls within the annotated bounding box for any slice in the study), Masked HiResCAM "
    "improved pointing-game hit rates from 11.20% (standard Grad-CAM) to 43.83% overall "
    "(n_hits=2,754 / n_boxes=6,283), and to 62.16% on chronic subdural haematomas."
)

# -------------------------------------------------------------------------
# Fix 5: Section 5 (Summary) HiResCAM description — per-box
# -------------------------------------------------------------------------
text = text.replace(
    "where M_brain(u, v) in {0, 1} isolates intracranial soft tissue (attenuation 0 to +85 HU), "
    "substantially attenuating calvarial bone hyperdensities (+500 to +1500 HU) and improving "
    "pointing-game hit rates from 11.20% to 43.83% (62.16% on chronic subdural haematomas).",
    "where M_brain(u, v) in {0, 1} isolates intracranial soft tissue (attenuation 0 to +85 HU), "
    "substantially attenuating calvarial bone hyperdensities (+500 to +1500 HU) and improving "
    "pointing-game hit rates from 11.20% to 43.83% per bounding box annotation "
    "(n=6,283 expert boxes, 226 positive studies; 62.16% on chronic subdural haematomas)."
)

# -------------------------------------------------------------------------
# Fix 6: Claim 1(d) — conditional FNR qualifier
# -------------------------------------------------------------------------
text = text.replace(
    "   (d) evaluating the study using a split conformal risk control prediction gate "
    "calibrated on a split calibration dataset under exchangeability assumptions to enforce "
    "an expected False Negative Rate bound (E[FNR] <= alpha) via an empirical quantile "
    "threshold (lambda);",
    "   (d) evaluating the study using a split conformal risk control prediction gate "
    "calibrated on a split calibration dataset under exchangeability assumptions to enforce "
    "an expected conditional False Negative Rate bound (E[FNR_cond] <= alpha) among imaging "
    "studies containing the target condition, via an empirical quantile threshold (lambda) "
    "selected as the supremum of the set of safe thresholds satisfying the finite-sample bound;"
)

# -------------------------------------------------------------------------
# Fix 7: Claim 2 — make R_n denominator explicit
# -------------------------------------------------------------------------
text = text.replace(
    "2. The method of Claim 1, wherein the split conformal risk control prediction gate "
    "selects operational probability threshold lambda satisfying:\n"
    "   lambda = sup { lambda' in [0, 1] : (n / (n + 1)) * R_n(lambda') + (1 / (n + 1)) <= alpha }\n"
    "   where n is calibration sample size and R_n(lambda') is empirical false negative risk "
    "evaluated on the split calibration dataset, wherein if no threshold lambda' satisfies "
    "the condition, the system sets lambda = 0 to route 100% of studies to clinician review.",
    "2. The method of Claim 1, wherein the split conformal risk control prediction gate "
    "selects operational probability threshold lambda satisfying:\n"
    "   lambda = sup { lambda' in [0, 1] : (n / (n + 1)) * R_n(lambda') + (1 / (n + 1)) <= alpha }\n"
    "   where n is calibration sample size, n_pos is the number of positive-class calibration "
    "studies, and R_n(lambda') is the empirical conditional false-negative rate:\n"
    "   R_n(lambda') = (1 / n_pos) * sum_{i: Y_i=1} I(S(X_i) < lambda')\n"
    "   wherein if no threshold lambda' satisfies the condition, the system sets lambda = 0 "
    "to route 100% of studies to clinician review; the supremum formulation equivalently "
    "represents the infimum of the complement set of unsafe thresholds for a monotonically "
    "non-decreasing loss function."
)

# -------------------------------------------------------------------------
# Fix 8: Claim 3 — conditional FNR explicit
# -------------------------------------------------------------------------
text = text.replace(
    "3. The method of Claim 1, wherein the clinical risk tolerance threshold alpha is "
    "configured as 0.05, establishing a finite-sample expected risk bound of 5.0% on "
    "False Negative Rate under exchangeable target-site imaging conditions.",
    "3. The method of Claim 1, wherein the clinical risk tolerance threshold alpha is "
    "configured as 0.05, establishing a finite-sample expected conditional false-negative "
    "rate bound of 5.0% among imaging studies determined to contain the target condition "
    "(E[I(C_lambda=0) | Y=1] <= 0.05), under the exchangeability assumption that "
    "calibration studies and future target-site studies are drawn from the same distribution."
)

# -------------------------------------------------------------------------
# Fix 9: Claim 9 — weaken monotonicity assertion
# -------------------------------------------------------------------------
text = text.replace(
    "9. The method of Claim 1, wherein epistemic uncertainty variance computed across "
    "stochastic forward passes exhibits a monotonic non-decreasing rank correlation "
    "(Spearman rho >= 0.85) evaluated across discrete image acquisition noise levels.",
    "9. The method of Claim 1, wherein epistemic uncertainty variance computed across "
    "stochastic forward passes exhibits a positive Spearman rank correlation (rho > 0) "
    "with respect to discrete levels of simulated image acquisition noise, as "
    "experimentally evaluated; wherein in a specific embodiment evaluated across "
    "five Gaussian noise levels (sigma in {0.00, 0.05, 0.10, 0.20, 0.35}), "
    "a Spearman rank correlation of rho = 0.9000 (p = 0.0374) was observed."
)

# -------------------------------------------------------------------------
# Write patched file
# -------------------------------------------------------------------------
if text == original:
    print("WARNING: No changes applied — check target strings match exactly.")
else:
    SPEC.write_text(text, encoding="utf-8")
    # Count changes
    import difflib
    diff = list(difflib.unified_diff(original.splitlines(), text.splitlines(), lineterm=""))
    added = sum(1 for l in diff if l.startswith("+") and not l.startswith("+++"))
    removed = sum(1 for l in diff if l.startswith("-") and not l.startswith("---"))
    print(f"Patched specification: +{added} lines, -{removed} lines.")
    print(f"Saved → {SPEC}")
