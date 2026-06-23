# NHS England SEWA AI Clinical Workflow Playbook
© 2026 SEWA AI — a Storegrill Inc Ltd company

## 1. Purpose
This playbook defines how SEWA AI fits into standard NHS urgent care and radiology workflows, ensuring alignment with NICE guidelines, DSPT requirements, and the NHS Long Term Plan.

## 2. Stroke Code Activation Workflow
- **Step 1 (Scan acquisition)**: CT Head performed in A&E
- **Step 2 (AI triage)**: SEWA AI analyzes within 60 seconds; if ICH/LVO detected and metacognition passes → triggers stroke code
- **Step 3 (Alerting)**: Multi‑channel alert to stroke team (in‑app, SMS, bleep)
- **Step 4 (Radiologist review)**: Radiologist confirms and signs report, which is sent via HL7/EDI to EMR
- **Step 5 (Treatment)**: Thrombolysis or thrombectomy as appropriate

## 3. Key NHS Integration Points
- **NHS Number**: Patient matching uses NHS number as primary identifier
- **NHSmail**: Alerts and reports can be sent to NHSmail accounts (with appropriate IG approval)
- **Spine integration**: Future roadmap item for demographic and GP lookups
- **DSPT compliance**: See `docs/nhs-dspt-compliance.md` for details
