# SEWA AI — Clinical Risk Management File (DCB0129)

**Document Ref:** SEWA-AI-DOC-04 · **Version:** 1.0 · **July 2026**
**Standards:** NHS DCB0129 (Clinical Risk Management System for Health IT) · SMP-001 + CRM-001

---

## 1. Clinical Safety Case (SMP-001)

SEWA AI is a Class IIb decision-support SaMD. The clinical safety argument is that **no patient is
placed at increased risk** because (a) the device never issues a final diagnosis, (b) all critical
outputs require mandatory radiologist sign-off enforced at the database layer, and (c) two
independent safety gates (uncertainty U and hallucination H) escalate or block uncertain/erroneous
outputs before any clinician sees them.

**Top-level safety claim:** *When used as intended by qualified radiology professionals, SEWA AI
reduces time-to-radiologist-notification for critical findings without increasing the rate of
missed critical diagnoses compared with standard reporting.*

---

## 2. Clinical Risk Management Process (CRM-001)

| Stage | Activity |
|---|---|
| 1. Define clinical context | Acute NHS radiology triage; users = consultant radiologists / reporting radiographers |
| 2. Identify hazards | Structured hazard analysis (Section 3) |
| 3. Estimate & evaluate risk | Likelihood x severity; residual after mitigation |
| 4. Control risks | Architectural + procedural controls |
| 5. Verify & validate | DCB0129 verification; clinical investigation (SEWA-AI-DOC-02) |
| 6. Review | Periodic safety review; PPIE input |

---

## 3. Hazard Log (Representative)

| ID | Hazard | Cause | Severity | Likelihood (pre) | Mitigation | Residual |
|---|---|---|---|---|---|---|
| H-01 | Missed critical finding (false negative) | Model error / OOD input | Critical | Low | 4-engine stack; U>0.25 escalate; radiologist sign-off; H BLOCK | Low |
| H-02 | Hallucinated finding reaches clinician | Metacognition bypass | Critical | Very Low | Nine-layer gate; H>0.30 BLOCK; DB-layer enforcement | Very Low |
| H-03 | Alert fatigue | Over-alerting | Major | Medium | Triage-only scope; uncertainty heatmap; SUS testing | Low-Medium |
| H-04 | Wrong laterality/location | Localisation error | Major | Low | Grad-CAM plausibility (L3); bounding-box check | Low |
| H-05 | Delayed notification (system) | Pipeline failure | Major | Medium | 5-channel dispatch + SMS fallback (edge) | Low |
| H-06 | Re-identification | Data leak | Major | Low | TRE; pseudonymisation; AES-256-GCM; zero PHI egress | Very Low |
| H-07 | Algorithmic bias | Skewed training | Major | Low | Subgroup monitoring (SOP-AI-005); equity audit | Low |

---

## 4. Clinical Safety Officer (CSO)

A Clinical Safety Officer is to be appointed on project commencement with authority to suspend
deployment if residual risk is unacceptable. The CSO chairs the periodic safety review and owns
CRM-001.

---

## 5. PPIE in Clinical Safety

Patient and public contributors review acceptability, explainability preferences and alert-fatigue
concerns (SEWA-AI-DOC-10). Safety-relevant feedback feeds the periodic review.

---

## 6. Residual Risk Conclusion

With the controls above, the **overall residual clinical risk is acceptable** for a decision-support
SaMD operated by qualified professionals within the intended use. This conclusion is provisional
pending the prospective clinical investigation (SEWA-AI-DOC-02) and is revisited at each safety
review.

© 2026 SEWA AI — a Storegrill Inc Ltd company · No. 14581073 · info@sewaxai.health
