# SEWA XAI Knowledge Base

## General FAQ
### Is SEWA XAI safe to use?
No regulatory certification is claimed yet. SEWA XAI is on the CE Mark IIb / UKCA / FDA 510(k) / ISO 13485 **pathway** (see `docs/clinical-dossier/01_Regulatory_Strategy.md`) — none of these have been granted. All critical AI alerts require radiologist review before any patient-care decision, and every model output currently comes from the demo/synthetic pipeline (see the README scope statement).

### How secure is patient data?
Patient data is encrypted at rest (AES‑256) and in transit (TLS 1.3) in Azure deployments. The platform is **designed against** GDPR, HIPAA, and NHS DSPT requirements; compliance is evidenced per deployment and has not been independently certified.

## Radiology FAQ
### Can I edit an AI‑generated report?
Absolutely! Radiologists have full edit control over all reports, and edits are tracked for continuous learning.

## Patient FAQ
### How do I access my scans and reports?
Use the SEWA patient portal at `https://your-hospital.sewaxai.health/patient` or download the SEWA Patient mobile app.
