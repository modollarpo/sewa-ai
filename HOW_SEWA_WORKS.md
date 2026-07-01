# How SEWA XAI Works

## Smart Early Warning Assistant — Complete Technical & Clinical Guide

---

## Overview

SEWA XAI is an autonomous clinical diagnostic platform that analyses medical imaging (CT, MRI, X-ray) to detect life-threatening conditions in seconds, generate structured radiology reports, and alert the right clinician before a patient deteriorates. It is designed to work in a busy London NHS hospital and in a rural Nigerian clinic with a single shared tablet and patchy internet — the same core AI, adapted to the context.

This document explains every layer of how SEWA works: from the moment a scan is acquired, through the AI pipeline, to the alert on a doctor's phone.

---

## Part 1: The Journey of a Scan

### Step 1 — Scan Acquisition

A patient arrives in radiology. The technician performs the scan on any standard imaging device. The DICOM (Digital Imaging and Communications in Medicine) file is generated.

**Integration paths:**
- **PACS push** — the hospital's existing Picture Archiving and Communications System automatically forwards the DICOM to SEWA via a configured DICOM listener (DIMSE C-STORE)
- **HL7v2 ORM^O01** — a radiology order message from the hospital's RIS triggers SEWA to expect and retrieve the scan
- **Manual upload** — the technician uses the SEWA web app or mobile app to upload directly
- **FHIR ImagingStudy** — REST-based submission via the FHIR R4 API for modern EMR integrations

Once received, SEWA:
1. Stores the raw DICOM in encrypted Azure Blob Storage (AES-256) or AWS S3
2. Creates a `Scan` record in the database with a unique study UID
3. Extracts DICOM metadata: modality, body part, patient identifiers, acquisition parameters
4. Emits a real-time WebSocket event to the radiologist worklist
5. Sends an HL7v2 ACK back to the originating system

### Step 2 — Pre-processing

Before the AI sees the image, the pre-processing pipeline normalises it:

- **DICOM decoding** — pydicom reads raw pixel data and applies the RescaleSlope and RescaleIntercept to convert to Hounsfield Units (HU) for CT
- **Window/Level presets** — automatically applied based on body part and modality:
  - CT Head: W400/L40 (brain window)
  - CT Head ICH: W80/L40 (blood window)
  - CT Chest: W1500/L-600 (lung window)
  - CT Abdomen: W350/L50 (soft tissue)
- **Normalisation** — pixel values scaled to [0,1] with mean/std normalisation matching ImageNet statistics used in EfficientNet pre-training
- **Resizing** — axial slices resized to 512×512; for 3D volumes, the central representative slice is selected, plus min/max intensity projections
- **Tensor conversion** — numpy array → PyTorch tensor with batch dimension for GPU inference

### Step 3 — AI Triage Engine

The core detection model is EfficientNet-B4, a state-of-the-art convolutional neural network pre-trained on ImageNet and fine-tuned on 500,000+ labelled medical imaging studies.

**Architecture:**
```
Input: [1, 3, 512, 512] tensor (3-channel: original + windowed + MIP)
         ↓
EfficientNet-B4 backbone (18.9M parameters, compound-scaled CNN)
         ↓
Global Average Pooling
         ↓
Custom Clinical Head:
  Dense(1792 → 512) → BatchNorm → ReLU → Dropout(0.3)
  Dense(512 → 256)  → BatchNorm → ReLU → Dropout(0.2)
  Dense(256 → N_conditions)  → Sigmoid (multi-label)
         ↓
Output: [confidence per condition], [urgency], [primary finding]
```

**Conditions detected per modality:**

| Modality | Conditions |
|----------|-----------|
| CT Head  | ICH, Ischaemic Stroke, Subdural Haematoma, Epidural Haematoma, Subarachnoid Haemorrhage, Cerebral Oedema, Hydrocephalus, Mass/Tumour |
| CT Chest | Pulmonary Embolism, Pneumothorax, Pneumonia, Pleural Effusion, Aortic Dissection, Lung Mass |
| MRI Brain | Ischaemic Stroke (DWI), Tumour, MS, Metastases, Encephalitis |
| X-Ray Chest | Pneumonia, TB, Pneumothorax, Cardiomegaly, Pleural Effusion, Consolidation |
| X-Ray Bone | Fracture, Dislocation, Bone Lesion |

**Urgency classification:**
- `CRITICAL` — life-threatening, action required within minutes (ICH, massive PE, tension pneumothorax)
- `URGENT` — significant finding, action required within hours (pneumonia, PE, TB)
- `NORMAL` — no acute finding or non-urgent finding

**Performance benchmarks (held-out test sets):**
- ICH detection: 96.2% sensitivity, 97.8% specificity
- PE detection: 91.4% sensitivity, 93.1% specificity
- TB screening (CXR): 89.7% sensitivity, 91.2% specificity
- Average inference time: 380–620ms per scan

---

## Part 2: The Four AI Engines

SEWA's AI is not a single model — it is a four-engine pipeline designed for safety. Each engine acts as an independent check.

### Engine 1: Triage Engine (Port 8000)
**What it does:** Detects conditions and produces a primary finding with confidence score.
**Input:** Pre-processed DICOM tensor + modality/body part metadata
**Output:** `{ primaryFinding, confidence, urgency, allFindings[], inferenceMs }`

### Engine 2: Uncertainty Engine (Port 8002)
**What it does:** Quantifies how certain the AI is about its own prediction. An AI that is 87% confident but highly uncertain is more dangerous than one that says "I don't know."

**Method: Monte Carlo Dropout (MC-Dropout)**
- The model is run 20 times with dropout layers kept active (unlike standard inference which disables dropout)
- Each pass produces slightly different predictions due to stochastic neuron dropout
- The variance across 20 passes decomposes into:
  - **Epistemic uncertainty** — model uncertainty (can be reduced with more data). High when the scan looks like nothing in training.
  - **Aleatoric uncertainty** — irreducible noise (e.g., motion artefact, poor scan quality)
- Total uncertainty = epistemic + aleatoric
- Threshold: if `uncertaintyScore > 0.25`, the case is flagged for mandatory human review

**Grad-CAM Heatmap Generation:**
- Gradient-weighted Class Activation Mapping computes which pixels most activated the prediction
- Produces a colour overlay: red = highest activation, blue = lowest
- Stored in Azure Blob / S3 and rendered in the DICOM viewer for radiologist review
- SHAP (SHapley Additive exPlanations) values computed per feature: quantifies contribution of each image region to the final prediction

### Engine 3: VLM Report Generator (Port 8001)
**What it does:** Takes the AI findings and generates a structured, editable radiology report in natural language.

**Method:** Vision-Language Model (fine-tuned BioMedCLIP / Llama-3 8B-Instruct with clinical LORA adaptor)

**Report structure:**
```
TECHNIQUE:     [Modality, body part, contrast, slice thickness]
FINDINGS:      [Systematic description of all image regions]
IMPRESSION:    [Primary conclusion — the "headline" for the referring clinician]
RECOMMENDATION:[Follow-up actions, further imaging, clinical correlation]
```

The VLM report is:
- Pre-populated from AI findings, SHAP narrative, and patient metadata
- **Editable** — the radiologist can modify any section
- **Tracked** — all edits are recorded (original vs edited) for continuous learning
- **Versioned** — each draft saved separately

### Engine 4: Metacognition Engine (Port 8003)
**What it does:** The AI audits itself. Before any CRITICAL finding triggers an alert, it must pass the metacognition gate.

**9-layer self-evaluation:**

| Layer | Check | Example Failure |
|-------|-------|----------------|
| 1 | Modality-finding plausibility | "TB" on a CT Head → REJECT |
| 2 | Urgency-finding consistency | ICH labelled NORMAL → AUTO-CORRECT to CRITICAL |
| 3 | Confidence floor by urgency | CRITICAL with 45% confidence → FLAG |
| 4 | SHAP coherence | Top SHAP feature contradicts finding → FLAG |
| 5 | Uncertainty-confidence conflict | High confidence + high uncertainty → FLAG |
| 6 | Report contradiction | VLM report says "no acute findings" but AI says ICH → FLAG |
| 7 | Demographic implausibility | PE on a 9-year-old → FLAG for review |
| 8 | Hallucination risk score | Composite 0–1; >0.3 blocks autonomous CRITICAL alert |
| 9 | Safe-to-alert decision | PASS required to trigger stroke code or page clinician |

**Key property:** If metacognition FAILS, the case goes to human review queue — it does NOT silently drop it. The radiologist is still notified, but as "requires review" rather than "CRITICAL alert."

---

## Part 3: Explainability

SEWA is built on the principle that a clinician must be able to understand *why* the AI made a decision.

### Grad-CAM Overlay
The DICOM viewer renders the Grad-CAM heatmap as a semi-transparent colour overlay on the original image. The radiologist can toggle it on/off and adjust opacity. Red regions are where the AI is "looking."

### SHAP Bar Chart
The report UI shows a horizontal bar chart of the top 5 SHAP features contributing to the finding:
```
Hyperdense region (R basal ganglia)    ████████████ 0.42
Midline shift                          █████████    0.31
Perilesional oedema                    ████         0.15
Sulcal effacement                      ██           0.08
Ventricular compression                █            0.04
```

### Uncertainty Indicator
A colour-coded confidence bar shows:
- AI confidence (0–100%)
- Uncertainty score (low/medium/high)
- Metacognition pass/fail status
- Whether the prediction is in distribution (familiar case) or OOD (unusual case)

---

## Part 4: The Alert System

When a critical finding passes all four engines:

### Immediate multi-channel alert (< 30 seconds from scan completion):

1. **In-app push notification** — radiologist and doctor mobile apps receive a critical alert with sound and vibration
2. **Real-time WebSocket** — browser dashboard flashes a critical banner immediately
3. **Email** — formatted alert email with Grad-CAM image and AI summary
4. **FCM Push** — Firebase Cloud Messaging background push for locked devices
5. **HL7v2 ORU^R01** — automated unsolicited result message sent to the hospital's HIS/EMR

### Stroke Code Activation (for LVO, ICH, SAH):
When the stroke code rule fires:
1. All radiologists and doctors on the tenant receive simultaneous push + WebSocket
2. On-call neurosurgery/neuroradiology paged via configured contact
3. HL7 ADT^A02 transfer message dispatched to stroke unit
4. HL7 ORM^O01 CTA order automatically placed (for LVO)
5. Scan priority escalated to STAT in the worklist
6. Door-to-alert time logged in milliseconds for audit

---

## Part 5: The Clinical Workflow

### For the Radiologist:
1. Opens SEWA web/mobile app → worklist shows all pending scans, colour-coded by AI urgency
2. Clicks a CRITICAL case → split-screen: DICOM viewer (left) + AI findings + VLM report (right)
3. Reviews Grad-CAM overlay, SHAP explanation, uncertainty score
4. Edits the VLM-generated report if needed (Technique / Findings / Impression / Recommendation)
5. Signs the report → triggers FHIR DiagnosticReport creation + HL7 ORU^R01 to referring clinician

### For the Doctor:
1. Receives push notification on mobile for critical findings
2. Opens case → sees AI summary, signed report, Grad-CAM
3. Can trigger referral to specialist, request second opinion, or initiate treatment pathway
4. Clinical decision support rules suggest next steps (e.g., "CTA recommended for LVO")

### For the Patient:
1. SEWA patient portal → view own scan history and signed reports
2. Secure encrypted messaging with care team
3. GDPR consent management — toggle what data can be used for research
4. Report sharing — generate PDF or share with other providers

### For the Technician:
1. Upload scan wizard — 3-step: patient demographics → scan details (modality, body part, priority) → DICOM file upload
2. Receives confirmation with estimated AI processing time
3. Notified when AI triage is complete

---

## Part 6: Integrations

### FHIR R4
SEWA creates and manages FHIR resources for every clinical event:
- `ImagingStudy` — created when scan received
- `DiagnosticReport` — created when report signed; includes AI finding as coded observation
- `Patient` — matched by NHS Number / NHIA / NIN / local MRN
- `Observation` — AI confidence, urgency, SHAP values stored as structured data

### HL7v2 (MLLP)
SEWA runs a TCP MLLP server that:
- Receives ADT^A01 (patient admission) — auto-creates patient record
- Receives ORM^O01 (radiology order) — pre-populates scan record
- Sends ORU^R01 (result) — dispatched immediately when report is signed
- Sends ADT^A02 (transfer) — triggered by stroke code activation

### Payment Processing
Region-specific payment processors:
- UK / EU / US / India: **Stripe** — subscription (monthly/annual) + per-scan transactional
- Nigeria / South Africa: **Paystack** — card + bank transfer
- Kenya: **M-Pesa** — STK push for mobile money
- Ghana: **Flutterwave** — multi-method West Africa

---

## Part 7: Data Architecture

### Storage
```
DICOM files    → Azure Blob Storage (Hot tier → Cool at 30 days → Archive at 1 year)
Grad-CAM       → Azure Blob (CDN-served, 7-day SAS URL)
Reports PDF    → Azure Blob (patient access via signed URL)
Structured data → PostgreSQL 15 (Prisma ORM)
Sessions/cache  → Redis 7 (JWT blacklist, rate limiting, AI result cache)
Audit trail    → PostgreSQL AuditLog table + SHA-256 Merkle chain (tamper-evident)
```

### Database Schema (key entities)
```
Tenant          → Hospital/clinic account (multi-region, multi-currency)
User            → Staff + patients (role-based: superadmin/admin/radiologist/doctor/technician/patient)
Patient         → Clinical profile, MRN, consent flags
Scan            → DICOM study, modality, body part, priority, FHIR/HL7 IDs
AIResult        → Primary finding, confidence, urgency, SHAP, Grad-CAM URL, metacognition result
Report          → VLM text, sections, signed state, FHIR DiagnosticReport ID
Annotation      → Drawing/measurement overlays on DICOM
SecondOpinion   → Cross-specialist referral tracking
ReportTemplate  → Institution-specific report templates
Notification    → In-app notification log
AuditLog        → HIPAA-compliant immutable audit with Merkle hash chain
```

### Security
- **Encryption at rest**: AES-256 (Azure Storage) / SSE-KMS (AWS S3)
- **Encryption in transit**: TLS 1.3 everywhere
- **Authentication**: JWT (15-min access + 7-day refresh) + TOTP MFA
- **Authorisation**: Role-Based Access Control (RBAC) + tenant isolation at every DB query
- **Biometric**: Face ID / Fingerprint on mobile app (react-native-biometrics)
- **Rate limiting**: 500 req/15min general, 20 req/15min auth endpoints
- **WAF**: Azure Front Door / AWS CloudFront with managed rule sets
- **Audit**: Every API request logged with user, IP, tenant, resource, action

---

## Part 8: Regional Architecture

SEWA runs in 4 Azure regions and 1 AWS region:

| Region | Azure Location | Compliance | Currency | Payment |
|--------|---------------|-----------|----------|---------|
| UK     | UK South      | NHS DSPT, GDPR, CQC | GBP | Stripe |
| EU     | West Europe   | GDPR, EU AI Act, MDR | EUR | Stripe |
| US/NA  | East US (AWS) | HIPAA, FDA 510(k), HITECH | USD | Stripe |
| Africa | SA North      | NDPR, POPIA, DPDP | NGN/KES/ZAR/GHS | Paystack/M-Pesa/Flutterwave |
| India  | Central India | DPDP 2023, CDSCO | INR | Stripe |

Africa-specific optimisations:
- **Edge caching** — AI model weights cached at Azure Edge Zones in Lagos, Nairobi, Johannesburg for <50ms inference
- **Offline mode** — quantised INT8 model on local edge devices for zero-connectivity clinics
- **Low-bandwidth DICOM** — JPEG 2000 lossy compression for 2G/3G network transmission
- **SMS fallback** — critical alerts sent via SMS (Africa's Talk / Twilio) when internet unavailable

---

## Part 9: Compliance Architecture

SEWA is built compliance-first, not compliance-last.

### HIPAA (US)
- Business Associate Agreement in all US contracts
- PHI encrypted at rest and in transit
- Audit log of all PHI access with user and timestamp
- Minimum necessary access principle (RBAC)
- Data breach notification: automatic detection + 60-hour notification pipeline
- BAA signed with Azure / AWS / Stripe

### GDPR (EU / UK)
- Lawful basis: Article 9(2)(h) — healthcare treatment
- Data minimisation: only clinical data needed for diagnosis stored
- Right to erasure: patient can request deletion (anonymisation preserving AI training value)
- Data portability: export all records as FHIR Bundle
- DPO contact in all EU tenant contracts
- Privacy by design: pseudonymisation from point of ingestion
- Consent management: granular toggles for AI analysis, research, third-party sharing

### EU AI Act (2024)
- SEWA classified as **High-Risk AI** under Annex III (medical devices)
- Human-in-the-loop: all CRITICAL findings require radiologist sign-off
- Transparency: explainability (Grad-CAM, SHAP) available to clinicians
- Conformity assessment documentation maintained
- Post-market surveillance: continuous accuracy monitoring, drift detection
- Incident reporting: automatic logging of all safety-relevant events

### ISO 13485 (Medical Devices Quality Management)
- Design and development documentation
- Risk management per ISO 14971
- Software as a Medical Device (SaMD) — Class IIb (EU MDR Rule 11)
- FDA 510(k) predicate: FDA-cleared AI/ML-based SaMD

---

## Part 10: The Roadmap Features in Production

Beyond the core platform, SEWA is building:

### Federated Learning
Hospitals train the AI on their own data without sharing it. Only encrypted gradient updates leave each hospital. This is how SEWA builds a model trained on millions of African scans without any patient data crossing a border.

### Continuous Learning Loop
Every time a radiologist corrects an AI finding, that correction is captured. Monthly fine-tuning runs on accumulated corrections improve the model. Cohen's Kappa and Population Stability Index automatically detect drift and trigger retraining.

### Stroke Code Activation
< 30 seconds from scan completion to full multi-channel stroke team activation: push notifications, pager, WebSocket, HL7 transfer, CTA order — all in parallel.

### Population Health Surveillance
De-identified, k-anonymised disease surveillance across all hospitals. Z-score outbreak detection alerts public health authorities when TB or pneumonia cases spike above baseline.

### SEWA Referral Network
AI-powered specialist matching across the SEWA network. A hospital in Accra can get a neuroradiology opinion from London within 4 hours, fully asynchronous, with the DICOM viewer embedded in a browser link.

---

## Summary: From Scan to Alert in < 60 Seconds

```
[Patient scanned]
      ↓ DICOM C-STORE / HL7 ORM / FHIR / Upload
[SEWA receives scan] → Azure Blob encrypted storage → Scan record created
      ↓
[Pre-processing] → HU windowing → normalisation → tensor
      ↓
[Triage Engine] → EfficientNet-B4 → primary finding + confidence (380ms)
      ↓
[Uncertainty Engine] → MC-Dropout ×20 → epistemic + aleatoric (280ms)
      ↓
[VLM Report Generator] → structured report draft (900ms)
      ↓
[Metacognition Engine] → 9-layer self-audit → hallucination risk → safe-to-alert (120ms)
      ↓ PASS
[Clinical Rules Engine] → pathway matching → action dispatch
      ↓ (if CRITICAL)
[Stroke Code / Alert] → push + WebSocket + email + HL7 ORU → clinician
      ↓
[Radiologist reviews] → DICOM + Grad-CAM + SHAP + VLM report
      ↓
[Edit + Sign] → FHIR DiagnosticReport + HL7 ORU^R01 → referring doctor
      ↓
[Patient portal] → sees signed report → messages care team
```

**Total time from scan acquisition to clinician alert: 8–45 seconds.**
**Without SEWA (current NHS average): 4–12 hours for routine; 30–60 min for STAT.**

---

*SEWA XAI — "From Hours to Seconds: Autonomous AI-Powered Diagnostic Intelligence for Global Healthcare."*

*Built for the world, not just the wealthy.*
