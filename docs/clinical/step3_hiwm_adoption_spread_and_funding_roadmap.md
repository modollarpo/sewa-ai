# Health Innovation West Midlands: Adoption, Spread & Funding Roadmap

**Document Identifier**: `SEWA-HIWM-STEP3-001`  
**Target Recipient**: Joanne Mewis (Senior Innovation Advisor, HIWM), Regional Innovation Leadership, Health Innovation Network (HIN)  
**Governing Context**: Realization of Joanne Mewis's Strategic Directives from the HIWM Engagement Meeting  
**Marking**: **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.** (Adoption & Funding Blueprint)

---

## Executive Overview: Bridging Evidence to NHS Adoption

Health Innovation West Midlands (HIWM) acts as the key regional catalyst for accelerating healthcare innovation across NHS trusts in Birmingham, Coventry, Warwickshire, Worcestershire, and the wider Midlands. 

This roadmap establishes the formal execution strategy aligned directly with **Joanne Mewis's guidance**:
1. Completion of the **HIN Innovation Academy** modules.
2. Alignment with the national **HIN Adoption and Spread Planning Playbook**.
3. Mapping to **NICE Evidence Standards Framework (ESF) Tier C**.
4. Executing an active funding acquisition pipeline (**SBRI Healthcare Phase 1** & **AI Award**).
5. Launching the prospective multicenter pilot **SEWA-SHADOW-1**.

---

## 1. Execution of Joanne Mewis's 5 Strategic Actions

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        JOANNE MEWIS STRATEGIC ACTION BLUEPRINT                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
          │
          ├──────────────────────────────────────────────────────────────────┐
          ▼                                                                  ▼
┌─────────────────────────────────┐                        ┌─────────────────────────────────┐
│ ACTION 1: INNOVATION ACADEMY    │                        │ ACTION 2: NICE ESF TIER C       │
│ • Module 1: Regulatory Reqs     │                        │ • Interventions with Direct     │
│ • Module 2: Funding Innovation  │                        │   Health Outcome (Triage)       │
│ • Module 3: Evaluating Innov    │                        │ • Pre-registered Tier C Ledger  │
└─────────────────────────────────┘                        └─────────────────────────────────┘
          │                                                                  │
          ├──────────────────────────────────────────────────────────────────┤
          ▼                                                                  ▼
┌─────────────────────────────────┐                        ┌─────────────────────────────────┐
│ ACTION 3: HIN SPREAD PLAYBOOK   │                        │ ACTION 4: SBRI & GRANT PIPELINE │
│ • 5-Pillar Case for Change      │                        │ • SBRI Healthcare Phase 1       │
│ • Trust Adoption Archetype      │                        │ • NHS AI Award Pipeline         │
│ • Sustainability & De-adoption  │                        │ • HIWM Regional Co-Sponsorship  │
└─────────────────────────────────┘                        └─────────────────────────────────┘
          │                                                                  │
          └─────────────────────────────────┬────────────────────────────────┘
                                            ▼
                         ┌─────────────────────────────────────┐
                         │ ACTION 5: SEWA-SHADOW-1 DEPLOYMENT  │
                         │ • 1,200 Scans Across West Midlands  │
                         │ • Zero Clinical Disruption Pilot    │
                         └─────────────────────────────────────┘
```

---

## 2. The 5-Pillar NHS Value Case (HIN Adoption Framework)

### Pillar 1: Scene Setting (Yellow)
- Non-contrast head CT is the primary diagnostic workhorse for trauma, acute stroke, and unexplained neurological collapse across NHS acute emergency departments.
- 24/7 emergency service delivery is legally governed by the requirement for 100% consultant radiologist sign-off.

### Pillar 2: Unmet Need (Light Green)
- Emergency head CT volume exceeds 2.5 million scans annually across NHS England, growing at 7%–9% year-on-year.
- The 2023 RCR Census reveals a 29% national consultant radiologist shortage (26% vacancy across West Midlands acute trusts).
- Out-of-hours queues delay acute ICH review by 120–240+ minutes, breaching the NICE 60-minute acute stroke imaging target.

### Pillar 3: Consequence (Red)
- Delayed decompression of acute epidural or subdural haematomas leads to secondary brain injury, herniation, and avoidable mortality.
- Outsourced teleradiology and emergency locum cover exceed £285 million annually in England.
- Acute neurological bed-days cost the NHS £450–£600 per day.

### Pillar 4: Intervention (Dark Teal)
- **SEWA XAI**: A 7-layer sub-1.5 second CPU-executable clinical triage and safety platform.
- Eliminates expensive GPU infrastructure barriers; deployed within sovereign UK South Azure healthcare cloud.
- 7-layer defense: Zero-Label AdaBN adaptation (ADR 004), Split Conformal Risk Control ($\text{FNR} \le 5.0\%$), Layer 6 Metacognitive Report Negation Safety Gate, and Masked HiResCAM explainability.

### Pillar 5: Impact & Measured Outcomes (Blue)
- **Empirical Feasibility to Date**: 15 pre-registered benchmarks (Tests A through O) logged on public data.
- **Pre-Registered Clinical Targets**:
  - Door-to-read latency reduced from 120–240 mins to $<30\text{ mins}$ for critical haemorrhage.
  - Clinical escalation reduced from 90–150 mins to $<45\text{ mins}$.
  - Out-of-hours outsourced reporting expenditure reduced by 15%–25%.
  - Safe autonomous clearing of normal scans: $\ge 10.0\%$ with $\text{FNR} \le 5.0\%$.

---

## 3. NICE Evidence Standards Framework (ESF) Tier C Mapping

NICE classifies digital health technologies into Tiers A, B, and C. SEWA XAI is evaluated under **Tier C (Interventions with a direct health outcome - Clinical Triage)**:

| NICE ESF Tier C Standard | SEWA XAI Specification & Evidence Base | Verification Status |
|:---|:---|:---:|
| **Standard 1: Credibility with UK Health Professionals** | Designed with consultant radiologists; 100% human sign-off retained; 3-member neuroradiology adjudication panel established for prospective study. | **SATISFIED** |
| **Standard 2: High-Quality Comparative Studies** | Prospective shadow-mode comparative study (`SEWA-SHADOW-1`, $N=1,200$) comparing AI against standard NHS radiologist reporting. | **PROTOCOL READY** |
| **Standard 3: Accurate Diagnostic Performance** | Pre-registered endpoints: AUROC $\ge 0.80$; sensitivity $\ge 90.0\%$ across all 4 acute ICH subtypes; $\text{FNR} \le 5.0\%$ Split Conformal bound. | **EVIDENCE LOGGED (Tests A–O)** |
| **Standard 4: Health Economic Analysis** | Discrete event queue simulation modeling door-to-read reduction and out-of-hours locum cost savings. | **BLUEPRINT READY** |
| **Standard 5: Algorithmic Fairness & Bias** | Zero-Label AdaBN adaptation (ADR 004) eliminates scanner vendor bias across GE, Siemens, and Philips systems. | **VERIFIED (Test C.2 / AdaBN)** |
| **Standard 6: Explainability & Safety Governance** | Masked HiResCAM (Test E.2) provides anatomically bounded spatial attribution; DCB0129 Hazard Log active. | **VERIFIED (Test E.2 / DCB0129)** |

---

## 4. Grant Funding Blueprint: SBRI Healthcare Phase 1

### 1. Proposal Summary
- **Competition**: SBRI Healthcare Phase 1 — Urgent and Emergency Care / Stroke Pathway Innovation.
- **Project Title**: Clinical Validation of Metacognitive AI for Urgent Emergency Head CT Triage in the West Midlands.
- **Funding Request**: £99,850 (100% funded feasibility contract, 6-month duration).
- **Lead Commercial Sponsor**: SEWA AI Health Technologies Ltd.
- **NHS Partner**: University Hospitals Birmingham NHS Foundation Trust / HIWM.

### 2. Work Packages (6-Month Feasibility Phase)
- **WP1 (Months 1–2)**: Edge Gateway Deployment, Trust Caldicott Guardian approval, and Phase 1 AdaBN calibration across local GE and Siemens CT scanners.
- **WP2 (Months 3–5)**: Prospective shadow-mode ingestion of 600 emergency head CTs with zero clinician disruption.
- **WP3 (Month 6)**: Independent 3-consultant adjudication panel review, health economic discrete event simulation, and Phase 2 commercialisation dossier.
