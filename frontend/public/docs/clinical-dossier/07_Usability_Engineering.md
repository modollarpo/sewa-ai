# SEWA AI — Usability Engineering File (IEC 62366-1)

**Document Ref:** SEWA-AI-DOC-07 · **Version:** 1.0 · **July 2026**
**Standard:** IEC 62366-1:2015+A1:2020 (Usability engineering for medical devices)

---

## 1. Use Specification

| Element | Definition |
|---|---|
| Intended users | Consultant radiologists; reporting radiographers (governed); clinical safety officers |
| Use environment | NHS radiology departments; PACS workstations; offline edge clinics |
| Application | Decision-support triage/prioritisation with mandatory sign-off |
| Training | 2–4h radiologists; 1h radiographers; 2–3h IT; 1h clinical leads |

---

## 2. User Interface (UI) Flow

1. Scan receipt (DICOM to PACS).
2. AI processing (four engines) — invisible to workflow.
3. Alert with bounding box, confidence, uncertainty decomposition, Grad-CAM, VLM report.
4. Clinician review → confirm / modify / reject → **sign-off (SIGNED=true)**.
5. Dispatch (PACS overlay / FHIR / HL7 / SMS).

---

## 3. Known Use Errors & Mitigations

| Use error | Cause | Mitigation |
|---|---|---|
| Ignoring AI flag | Alert fatigue | Triage-only scope; uncertainty heatmap; SUS testing |
| Misreading uncertainty | Poor explanation | Epistemic/aleatoric decomposition shown; training |
| Bypassing sign-off | UI shortcut | DB-layer enforcement (cannot bypass) |
| Wrong severity ack | Laterality confusion | Grad-CAM localisation; structured report |

---

## 4. Usability Validation

- **SUS score:** 81.4 ("Excellent") from internal testing with 12 radiologists (internal; to be repeated independently).
- **Formatively:** cognitive walkthrough with radiologists during development.
- **Summatively:** usability test with ≥10 representative users pre-deployment; pass criterion = zero use errors with unacceptable risk.
- **NASA-TLX / alert-fatigue** metrics collected during the clinical investigation (SEWA-AI-DOC-02).

---

## 5. Training & Competency

Training materials, user manual and e-learning modules delivered at go-live; quarterly refresher;
new-staff onboarding. Competency sign-off recorded.

---

## 6. Post-Market Usability Monitoring

- Override-rate and override-reason logging (target <5%; alert if >15%).
- User feedback surveys; usability incidents trended by CSO.

© 2026 SEWA AI — a Storegrill Inc Ltd company · No. 14581073 · info@sewaxai.health
