# Priority Matrix: GB2609706.3 (First App) vs UK Patent Application 2

**First App:** GB2609706.3 "Sovereign Multi-Engine Clinical AI Platform for Automated Diagnostic Triage and Safety Assurance" filed 25 April 2026  
**Applicant:** STOREGRILL INC LTD | Inventor: Dolapo Ariyo  
**First App Claims:** 10 claims (from Claims OPI.docx)

## First App Claims (for reference)
1. Multi-Engine Diagnostic Orchestration (Method) - 4 engines, uncertainty, VLM report, 9-layer metacognition, alerts, DB-level signature constraint
2. Metacognition Safety Layer (Method) - 9 layers with specific checks, H <= 0.30, route to human review on failure
3. Federated Learning with Human Approval Gate (System) - DP noise, no PHI, weighted averaging, human approval gate, audit logging
4. Stroke Code Activation Workflow (Method) - 5 channels simultaneously, door-to-alert time, present findings with Grad-CAM/SHAP/uncertainty
5. Sovereign Self-Hosted Deployment (Device) - cloud path + offline edge path with INT8, SMS fallback, Merkle chain across offline/online
6. Uncertainty-Gated Human Escalation (Method) - composite uncertainty (epistemic+aleatoric) routes to human review if > threshold, independent of triage and metacognition
7. Three-Channel CT Pre-Processing (Dependent on Claim 1) - 3 window presets
8. Immutable Audit Trail (Dependent) - SHA-256 hash chaining, Merkle tree batch verification, both cloud and edge
9. Multi-Language VLM (Dependent) - multiple languages including English/French/Arabic/Swahili
10. Hallucination Risk Score (Dependent) - combines SHAP coherence, uncertainty-confidence conflict, composite uncertainty, Mahalanobis OOD, negation detection

## Comparison to App 2 Claims

| App 2 Claim | Feature | First App Support | Priority | Rationale |
|---|---|---|---|---|
| 1(a) | Receive unannotated imaging study via DICOM/HL7/FHIR | Claim 1(a) similar | Senior (25 Apr 2026) | Core ingestion disclosed |
| 1(b) | Zero-label AdaBN, frozen weights | Not present | Later (App 2) | New adaptation mechanism |
| 1(c) | RMD OOD score, background-conditional contrast | First app has Mahalanobis OOD mentioned in Claim 10 ("Mahalanobis out-of-distribution distance") and §4.3.3 | Mixed/Possibly Senior for concept, Later for RMD formula details | Claim 10 references Mahalanobis OOD; App 2 adds Relative Mahalanobis with specific formulation |
| 1(d) | Split conformal risk control, E[FNR_cond]<=α, supremum threshold | Not present | Later (App 2) | Entirely new statistical method |
| 1(e) | Epistemic uncertainty via MC dropout, degradation response | Claims 1(d), 6 cover MC dropout uncertainty and mandatory escalation | Senior for MC dropout/uncertainty; Later for monotonicity-under-degradation response | Claim 6 says "composite uncertainty score derived from epistemic and aleatoric decomposition of Monte Carlo Dropout variance mandatorily routes... when exceeds threshold, independently of triage and metacognition" - senior. Degradation monotonicity response is new. |
| 1(f) | Anatomically masked HiResCAM | First app has Grad-CAM/SHAP (Claims 1(c), 4) but not anatomically masked HiResCAM | Later for masked variant | Standard attribution disclosed, masked variant new |
| 1(g) | Combine gates into deterministic routing | Claims 1,2 cover gating | Senior for concept | Core gating disclosed |
| 1(h) | Authorised sign-off enforced as DB constraint requiring metadata | Claim 1(h): "requiring a qualified clinician's digital signature before clinical output delivery, enforced as a database-level constraint independent of application logic" | Senior (25 Apr 2026) | Directly disclosed |
| 2 | Conformal bound formula with n_pos/Bates | Not present | Later | New mathematical formulation |
| 3 | alpha=0.05 bound | Not present | Later | New |
| 4 | NCCT ICH detection | Implied by multi-condition scope | Senior for concept | First app says "fourteen conditions" across modalities |
| 5 | Subtype-specific thresholds | Not present | Later | New detail |
| 6 | HU ranges for parenchymal mask (0-85 HU) | Not present | Later | New |
| 7 | AdaBN details (momentum, no backprop) | Not present | Later | New |
| 8 | RMD with Ledoit-Wolf shrinkage/pinv | Claim 10 mentions Mahalanobis; formula details new | Mixed | Core concept senior, specific formulation later |
| 9 | Degradation response failure detection | Not present as stated | Later | New |
| 10 | 9-layer metacognition details | Claim 2 fully specifies 9 layers | Senior (25 Apr 2026) | Directly disclosed with same structure |
| 11 | 3-channel windowing | Claim 7 | Senior | Directly disclosed as dependent claim |
| 12 | Multi-modal (CXR, CTPA, MRI) | First app says "CT, MRI, X-ray, Ultrasound" and multiple modalities | Senior | Disclosed |
| 13 | Stroke Code workflow | Claim 4 | Senior | Directly disclosed |
| 14 | Immutable audit trail SHA-256/Merkle | Claims 5,8 | Senior | Directly disclosed |
| 15 | System claim with DB signature validation | Claim 1(h), Claim 3, Claim 5 | Senior for DB constraint; mixed for specifics | Core concept senior |
| 16-17 | Edge/cloud deployment | Claims 5(a),(b) | Senior | Directly disclosed |
| 18-20 | Medium/apparatus claims | Derive from above | Mixed | Depend on method claims |
| 21 | Masked HiResCAM independent method | Not present (has Grad-CAM/SHAP) | Later | New method |
| 22 | Coupling claim (AdaBN->RMD, AdaBN->conformal, masked->metacognition) | Not present as combination | Later | Combination of new+old elements likely takes later priority for combination |
| 23-25 | Mask details (hole-filling, ReLU-then-multiply, sub-ranges) | Not present | Later | New |
| 26 | Independent coupling system claim | Not present | Later | New combination |

## Key Observations
1. **Strong senior priority** for core platform: multi-engine orchestration, 9-layer metacognition, uncertainty gating, Stroke Code, federated learning with approval gate, sovereign deployment, audit trail, DB-enforced sign-off
2. **Later priority** for the novel statistical/ML innovations in App 2: AdaBN, split conformal risk control, RMD formalization with shrinkage, masked HiResCAM, degradation monotonicity response
3. **Combinations** of senior + later elements (Claims 22, 26) likely take priority from App 2 filing date
4. **Risk**: Need to verify exact support in first app text for borderline cases (RMD/Mahalanobis, exact DB constraint language)
5. **No UK grace period** - any public disclosure between 25 April and App 2 filing could kill novelty for new matter

## Recommendation
Focus patent protection on the **combinations** that include the new technical elements (AdaBN + conformal + RMD + masked attribution) as these appear to have later priority but may have stronger inventive step arguments around the specific couplings. The core platform elements have senior priority from GB2609706.3.
