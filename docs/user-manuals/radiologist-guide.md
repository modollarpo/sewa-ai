# Radiologist User Manual

## SEWA XAI — Radiologist User Guide

---

## Overview

## 1. Getting Started
### 1.1 Logging In
- Navigate to your SEWA tenant (e.g., `https://your-hospital.sewaxai.health`
- Enter your email, then enter your email address and password
- Complete MFA (Multi-Factor Authentication if enabled
- After login, you'll land on your Radiologist Workspace

---

## 2. Workspace Layout
The workspace has 3-panel layout:
- Left: Scan Worklist
- Middle: DICOM Viewer
- Right: AI Findings + Report Editor

---

## 3. Scan Worklist
Shows all pending scans, color-coded by urgency:
- Red: CRITICAL
- Orange: URGENT
- Green: NORMAL
- Gray: ROUTINE

### 3.1 Filtering & Sorting
- Filter by modality, date range, status, or priority
- Sort by time received or urgency

---

## 4. DICOM Viewer
### 4.1 Controls:
- Pan: Click & Pan
- Zoom: Scroll or use zoom buttons
- Window/Level: Adjust W/L using sliders or presets
- Toggle Grad-CAM overlay (AI highlight
- Measurements: Use measure tool to click two points for distance
- Toggle fullscreen

---

## 5. Reviewing AI Findings

### Left Side:
- Primary finding + confidence %
- All findings list
- SHAP explanation (SHapley Additive exPlanations
- Uncertainty score (low/medium/high)
- Metacognition status (Pass/Fail

### Right:
- VLM-generated report draft
- Editable sections:
  - Technique
  - Findings
  - Impression
  - Recommendations

## 6. Signing & Finalizing Reports
- Review and edit the report
- When done, click "Sign Report"
- Confirm your signature is timestamped and immutable
- FHIR DiagnosticReport is created
- HL7 ORU^R01 sent to referring clinician

---

## 7. Second Opinions
- Click "Request Second Opinion"
- Assign to specialist from dropdown
- Add a message
- Send request
---

## 8. AI Feedback (Continuous Learning
- When you edit a report or disagree with an AI finding, your correction recorded for continuous learning
- Use thumbs up/thumbs down buttons on findings
---

---

## 9. Help & Support
- Click Help menu for help
- Contact your SEWA support team via Support Tickets
---

## 10. Glossary

| Term | Description |
| Grad-CAM | Gradient-weighted Class Activation Mapping shows which pixels influenced prediction most activated the
