# SEWA XAI — Healthcare Value Proposition on a Page
*Aligned with Health Innovation West Midlands (HIWM) & NHS Innovation Framework*
*Marking: FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE. PRE-CLINICAL R&D (TRL 5).*

---

## 1. Scene Setting
- **What the innovation is:** SEWA XAI is a pre-clinical, containerised modular clinical intelligence platform featuring an intracranial haemorrhage (ICH) triage engine running on non-contrast head CT via CPU-optimised ONNX INT8 runtimes, accompanied by uncertainty quantification (Monte Carlo dropout) and explainability modules (Grad-CAM).
- **Where in the health system it is used:** Emergency departments, acute receiving units, and teleradiology reading workflows across secondary and tertiary acute NHS trusts.
- **Who the innovation is relevant to:** Emergency physicians, consultant radiologists, reporting radiographers, and acute care pathway coordinators.
- **What process or pathway your innovation supports or replaces:** Designed to support the pre-read prioritisation and worklist sorting pathway for acute non-contrast head CT scans, aiming to reduce time-to-triage for critical neurological findings while mandating human radiologist sign-off.

---

## 2. Unmet Need / Problem
- **What’s the cause of the problem?** Growing global radiology reporting backlogs, chronic workforce shortages, and rising emergency CT imaging volumes lead to delayed detection of time-critical acute pathologies like intracranial haemorrhage.
- **What are the limitations or inefficiencies of current best practice or existing pathway?** Traditional PACS worklists are FIFO (first-in, first-out) and do not natively re-order studies by clinical urgency prior to opening, causing critical scans to wait behind routine studies during peak hours.
- **Existing approach limitations:** Commercial AI triage tools often require costly dedicated GPU accelerators, lack transparent uncertainty quantification, or operate as black-box solutions that do not integrate cleanly with sovereign data residency and local NHS infrastructure (e.g., DSPT / DCB0129 safety standards).

---

## 3. Consequence of the Problem / Unmet Need
- **Patient and/or staff experience:** Delayed identification of acute ICH increases time-to-treatment in stroke and trauma pathways, heightening clinical risk and contributing to high burnout rates among emergency and radiology staff.
- **Clinical outcomes:** Delayed intervention in acute intracranial events correlates with higher morbidity and mortality.
- **Resource utilisation and service organisation:** Emergency department overcrowding, bottlenecked out-of-hours reporting, and reliance on expensive locum/teleradiology cover to manage backlogs.

---

## 4. What is the Intervention?
- **What the innovation is and how it works:** A modular, CPU-first containerised AI microservice architecture deployed via Azure Kubernetes Service (AKS) or offline edge nodes. It ingests DICOM scans, executes deep learning inference in `<2s`, computes epistemic/aleatoric uncertainty, generates Grad-CAM attribution heatmaps, and re-sorts the clinical worklist accordingly.
- **How the service will be delivered:** Delivered as an enterprise cloud deployment (sovereign Azure regions: UK South, EU, etc.) or packaged as an offline edge DICOM-router appliance for bandwidth-constrained environments.
- **How patients will be identified:** Automated background interception of incoming DICOM CT studies via standard DICOM C-STORE / FHIR R4 interfaces.
- **How organisational change and process implementation will occur:** Integrates into existing RIS/PACS and DICOM viewer workflows. Requires clinical safety hazard logging (DCB0129), local clinical governance approval, and radiologist training emphasizing that AI outputs are triage assists requiring mandatory human confirmation.
- **Clinical pathway changes:** Inserts an automated triage and prioritisation step immediately upon image acquisition, without altering the definitive reporting and sign-off responsibility of the attending radiologist.

---

## 5. What is the Impact, Benefit or Difference in Outcome?
- **Clinical outcomes:** Designed to support faster prioritisation of positive ICH scans (internal RSNA validation study-level AUROC **0.807**, external CQ500 validation study-level AUROC **0.7468** across 486 scans). *Note: Metacognition confirmatory safety-gating endpoint was evaluated as inconclusive (0.0% safety error reduction at 20% review rate, 95% CI [-8.1%, +6.5%]); no hallucination-detection or safety-gating benefit is claimed.*
- **Patient reported outcomes:** Faster initiation of urgent clinical pathways, reducing time-to-diagnosis anxiety and supporting prompt multidisciplinary team escalation.
- **Service organisation (NHS / Trust metrics):** Targeted reduction in worklist turnaround time (TAT) for critical head CTs; efficient allocation of on-call reporting resources; predictable out-of-hours prioritisation.
- **Comparative metrics & Provision of comparative measure:**
  - *Baseline standard pathway:* FIFO PACS worklist review; average urgent CT turnaround dependent on out-of-hours reporting queues.
  - *SEWA XAI pathway:* Automated CPU inference in `<2s`; immediate worklist re-ordering for critical ICH findings.
  - *Transparency commitment:* Pre-registered evaluation protocols, reproducible harness scripts, and calibration logs available in open repository; no commercial claims made without independent prospective clinical trial validation.
