# SEWA AI — Risk Management File (ISO 14971)

**Document Ref:** SEWA-AI-DOC-05 · **Version:** 1.0 · **July 2026**
**Standard:** ISO 14971:2019 (Application of risk management to medical devices)

---

## 1. Risk Management Plan Summary

| Item | Content |
|---|---|
| Scope | SEWA AI SaMD, Class IIb, intended use per SEWA-AI-DOC-01 |
| Roles | Risk owner (Sponsor); Clinical Safety Officer; independent reviewer |
| Methodology | ISO 14971 with IEC 62304 software-safety classification |
| Acceptability | Risk acceptability matrix (Section 3); ALARP principle |
| Lifecycle | Risk file maintained through design, validation, production, post-market |

---

## 2. Intended Use & Known Hazards

Intended use: decision-support triage/prioritisation of adult thoracic/acute imaging for qualified
radiology professionals, with mandatory human sign-off. Known hazard categories: misdiagnosis
(false negative/positive), hallucination, workflow disruption (alert fatigue), cybersecurity/data
breach, bias, and loss of availability.

---

## 3. Risk Acceptability Matrix

| Severity \ Likelihood | Rare | Unlikely | Possible | Likely | Almost certain |
|---|---|---|---|---|---|
| Negligible | Acceptable | Acceptable | Acceptable | Low | Low |
| Minor | Acceptable | Acceptable | Low | Medium | Medium |
| Serious | Low | Low | Medium | High | High |
| Critical | Low | Medium | High | Unacceptable | Unacceptable |

Residual risks must be reduced to **ALARP** (as low as reasonably practicable) and remain within the
"Acceptable/Low" band for the intended use.

---

## 4. Risk Control Hierarchy

1. **Inherent safety by design** — DB-layer mandatory sign-off; independent U and H gates.
2. **Protective measures** — pseudonymisation, encryption, RBAC, audit logging.
3. **Information for safety** — labelling, training, user manual, uncertainty display.

---

## 5. FMEA Extract (Software)

| Component | Failure mode | Cause | Effect | S | O | D | RPN | Control |
|---|---|---|---|---|---|---|---|---|
| Detection CNN | Misses critical finding | OOD / drift | Missed diagnosis | 4 | 2 | 2 | 16 | U-gate escalate; radiologist sign-off |
| Uncertainty engine | Under-estimates U | Calibration drift | Silent error | 4 | 2 | 2 | 16 | ECE monitoring (L8); CSO review |
| Metacognition gate | H miscalc | Adversarial | False dispatch | 4 | 1 | 2 | 8 | L9 OOD; adversarial training |
| Dispatch | Alert not sent | Pipeline fail | Delayed care | 3 | 3 | 2 | 18 | SMS fallback; multi-channel |
| Audit log | Entry lost | Storage fault | No traceability | 2 | 2 | 2 | 8 | Merkle chain; 6-hourly check |

Severity (1-5), Occurrence (1-5), Detectability (1-5); RPN = S x O x D. All RPNs < 25 with controls.

---

## 6. Overall Residual Risk

After application of the risk controls, the **overall residual risk is judged acceptable** and
consistent with the intended use of a Class IIb decision-support SaMD. Benefit-risk is positive:
earlier critical-finding notification vs. the 4.2-hour median urgent-report baseline, with no
autonomous diagnosis.

---

## 7. Post-Market Risk Monitoring

- Post-Market Surveillance (PMS) plan and Post-Market Clinical Follow-up (PMCF) per ISO 14971 / MDR.
- Continuous performance monitoring (AUC, false-negative rate, override rate) feeds periodic review.
- Incident trending reviewed quarterly by CSO; field-safety corrective action if thresholds breached.

© 2026 SEWA AI — a Storegrill Inc Ltd company · No. 14581073 · info@sewaxai.health
