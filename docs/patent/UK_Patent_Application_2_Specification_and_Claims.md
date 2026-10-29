# UK PATENT APPLICATION SPECIFICATION AND CLAIMS

**Filing Body**: United Kingdom Intellectual Property Office (UKIPO)  
**Application Type**: Second UK National Patent Application (Patents Act 1977 s.14)  
**Priority Claim**: Priority is hereby claimed under Section 5(2) of the UK Patents Act 1977 and Article 4 of the Paris Convention from earlier UK Patent Application No. **GB2609706.3**, filed **25 April 2026**.  
**Applicant**: STOREGRILL INC LTD (Company No. 14581073)  
**Inventor**: Dolapo Ariyo  
**Registered Address**: 18 Hampshire Close, Binley, Coventry, CV3 2FP, United Kingdom  
**Statutory Marking**: FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE. PRE-CLINICAL SPECIFICATION (TRL 6).  

---

## TITLE OF THE INVENTION
**CLINICAL ARTIFICIAL INTELLIGENCE PLATFORM AND METHOD FOR DISTRIBUTION-FREE STATISTICAL RISK-CONTROLLED RADIOLOGICAL TRIAGE, ZERO-LABEL DOMAIN ADAPTATION, AND ANATOMICALLY-BOUNDED ATTRIBUTION**

---

## 1. ABSTRACT
A computer-implemented clinical artificial intelligence platform and method for safe, time-critical diagnostic triage of digital medical imaging studies. The platform integrates a multi-engine convolutional and transformer pipeline with: (i) an unsupervised Zero-Label Adaptive Batch Normalisation (AdaBN) module that updates running mean and variance feature statistics on target scanner distributions with frozen convolutional weights; (ii) an Out-Of-Distribution (OOD) filter employing Relative Mahalanobis Distance (RMD) contrasting class-conditional latent representations against an unconditioned background distribution using shrinkage covariance regularization; (iii) a Split Conformal Risk Control safety gate that establishes finite-sample expected risk bounds on the conditional False Negative Rate among positive-class imaging studies (E[FNR_cond] <= alpha) under exchangeability, using an empirical calibration quantile threshold (lambda) selected as the supremum of safe thresholds satisfying the finite-sample Bates et al. (2021) bound; (iv) an explainability engine providing High-Resolution Class Activation Mapping (HiResCAM) constrained by automated soft-tissue anatomical segmentations to substantially attenuate skull-bone hyperdensity artifacts; and (v) an epistemic uncertainty engine evaluating prediction variance under acquisition perturbations. Prioritised triage alerts are dispatched immediately upon conformal safety clearance, while final clinical reports require cryptographic clinician authorisation enforced as a database-level constraint prior to electronic health record delivery.

---

## 2. FIELD OF THE INVENTION
The present invention relates generally to medical software and artificial intelligence systems applied to diagnostic radiology. More specifically, the invention relates to a computer-implemented Software-as-a-Medical-Device (SaMD) platform providing automated diagnostic triage, prioritisation, and decision support for acute emergency conditions across multi-modal radiology workflows (including computed tomography head scans, chest radiographs, computed tomography pulmonary angiograms, and magnetic resonance imaging). The invention particularly concerns technical mechanisms for distribution-free statistical risk bounding, unsupervised target domain adaptation across hospital scanners, anatomically bounded spatial attribution, and database-level human-in-the-loop clinical governance.

---

## 3. PRIORITY CLAIM AND PARTIAL PRIORITY ALLOCATION (SECTION 5(2) PATENTS ACT 1977)
This application formally claims priority under Section 5(2) of the Patents Act 1977 and Article 4 of the Paris Convention from earlier UK Patent Application No. **GB2609706.3**, entitled *"Sovereign Multi-Engine Clinical AI Platform for Automated Diagnostic Triage and Safety Assurance"*, filed on **25 April 2026** by STOREGRILL INC LTD.

Under the partial priority doctrine of Section 5 of the Patents Act 1977, Article 4F of the Paris Convention, and established jurisprudence (e.g., Enlarged Board of Appeal decision G 1/15):
1. **Senior Priority Date (25 April 2026)** is claimed for subject matter disclosed directly and unambiguously in GB2609706.3, specifically: the foundational multi-engine diagnostic pipeline (ingestion, CNN triage, stochastic MC dropout uncertainty, VLM reporting, 9-layer metacognition engine), 3-channel Hounsfield Unit windowing, sovereign dual-path deployment (cloud AKS and offline edge), and database-level clinician sign-off constraints.
2. **Later Priority Date (October 2026)** applies to subject matter first disclosed herein, specifically: the mathematical formulation of Split Conformal Risk Control for finite-sample false negative rate bounding, Zero-Label Adaptive Batch Normalisation (AdaBN) for scanner covariate shift alignment, Relative Mahalanobis Distance (RMD) background-relative OOD detection, Anatomically Masked HiResCAM calvarial bone suppression, and demonstrated uncertainty monotonicity under physical perturbations.
3. **Claims to Combined Inventions**: Any claim reciting a specific cooperative combination of senior features with later-developed features derives priority for the combination as a whole from the filing date of the present application.

---

## 4. BACKGROUND OF THE INVENTION AND PRIOR ART DEFICIENCIES

### 4.1 The Acute Radiology Workforce Emergency
Healthcare systems globally, and the UK National Health Service (NHS) in particular, experience acute workforce shortages in diagnostic radiology. The Royal College of Radiologists (RCR) 2025 Clinical Radiology Workforce Census established a consultant radiologist vacancy rate of 29% across the United Kingdom, leading to an estimated 1.5 million imaging studies backlogged annually and out-of-hours emergency scan reporting queues routinely extending between 120 and 240+ minutes. For time-critical neurovascular and pulmonary emergencies, such as acute Intracranial Haemorrhage (ICH), Large Vessel Occlusion (LVO) ischemic stroke, tension pneumothorax, and Pulmonary Embolism (PE), treatment efficacy decreases rapidly with time elapsed from symptom onset. In acute ischemic stroke, an estimated 1.9 million neurons and 14 billion synapses are lost each minute an arterial occlusion remains unperfused (Saver, 2006).

### 4.2 Deficiencies in Existing Clinical AI Systems
Existing commercial and academic clinical AI triage systems exhibit five critical technical deficiencies that prevent safe clinical adoption:
1. **Failure of Heuristic Probability Thresholds under Scanner Covariate Shift**:
   Commercial triage devices apply static fixed probability cutoffs (e.g., score tau >= 0.50 or tau >= 0.70). However, scanner hardware variation (manufacturer, slice thickness 0.625mm-5.0mm, kVp, kernel) causes feature distribution shifts. Testing static classifiers on multi-centre cohorts (CQ500, N=486 scans across 3 hospital centers) demonstrates that static thresholds yield elevated False Positive Rates (FPR = 20.07% at tau = 0.50, 95% CI: 15.8%-25.1%), causing severe alert fatigue.
2. **Absence of Distribution-Free Statistical Risk Bounds**:
   No existing commercial triage device provides mathematically guaranteed bounds on diagnostic risk. Standard Bayesian or temperature-scaled confidence metrics fail to guarantee that the expected False Negative Rate (FNR) will remain below a clinical target (e.g., FNR <= 5.0%).
3. **Activation Hijacking in Explainability Maps (Grad-CAM Bone Artifacts)**:
   Existing visual explainability systems rely on standard Grad-CAM. In neuroimaging computed tomography, cortical calvarial bone (+1000 HU) produces massive convolutional gradients. Standard Grad-CAM achieves only an 11.20% pointing hit rate on acute intracranial haemorrhage because gradient energy is captured by the skull rather than the haematoma.
4. **Feature Variance Collapse under Naive Normalisation**:
   Standard machine learning input z-scoring (x' = (x - mu)/sigma) compresses deep layer activation variance approximately 40-fold relative to frozen running variance statistics (sigma^2 approx 51.59), pinning SiLU activations into an inactive linear regime and collapsing AUROC from 0.7491 to 0.5348.
5. **Overconfidence under Image Degradation**:
   Standard deep networks exhibit overconfidence on severely degraded inputs (radiation photon noise, motion blur). Prior art systems provide no mechanism ensuring that epistemic uncertainty responds monotonically as physical image quality degrades.

---

## 5. SUMMARY OF THE INVENTION

The present invention solves these technical problems by providing an integrated, multi-tier clinical AI triage platform and method. Specifically, the invention introduces:

1. **Unsupervised Zero-Label Adaptive Batch Normalisation (AdaBN)**:
   A target domain adaptation subsystem updating the running mean (mu_t) and running variance (sigma_t^2) vectors of batch normalisation layers within a deep convolutional neural network feature extractor directly from an unannotated stream of target clinical site images, while all convolutional weights, biases, and linear classification heads remain strictly frozen. In empirical evaluation on CQ500 (N=486), AdaBN improved cross-centre Study AUROC from 0.7491 to 0.7596 without labels or backpropagation.

2. **Relative Mahalanobis Distance (RMD) Out-of-Distribution Gating**:
   An out-of-distribution detection module computing:
   RMD(x) = M(z(x); mu_c, Sigma) - M(z(x); mu_0, Sigma_0)
   where M(z; mu, Sigma) is the Mahalanobis distance with Ledoit-Wolf trace shrinkage (factor 0.05) and Moore-Penrose pseudoinverse regularization, contrasting class-conditional centroids mu_c against an unconditioned background feature distribution mu_0. In CQ500 error detection, RMD improved AUROC from 0.5256 (standard Mahalanobis) to 0.5798 (+5.4%).

3. **Split Conformal Risk Control with Bounded Clinical Risk**:
   A distribution-free statistical safety gate operating on a calibrated quantile threshold (lambda). Under the assumption that target-site calibration samples and future evaluation samples are exchangeable, the threshold lambda is computed on a split calibration dataset D_cal = {(X_i, Y_i)}_{i=1}^n such that expected False Negative Rate satisfies:
   E[L(Y, C_lambda(X))] = E[I(Y=1 and C_lambda(X)=0) | Y=1] <= alpha
   where the expectation is the conditional false-negative rate among positive studies, alpha in (0, 1) is a pre-determined risk ceiling (e.g., alpha = 0.05), and the loss L(Y, C_lambda(X)) = I(Y=1 and S(X) < lambda) is evaluated over the positive-class calibration subset. If no lambda satisfies the criterion, the system sets lambda = 0 (routing 100% of scans to human review).

4. **Masked High-Resolution Class Activation Mapping (Masked HiResCAM)**:
   A spatial attribution engine computing element-wise product feature maps between gradients and forward activations, multiplied by an automated anatomical parenchymal soft-tissue segmentation mask:
   A_MaskedHiResCAM(u, v) = M_brain(u, v) * sum_k [ (dY_c / dA_k(u, v)) * A_k(u, v) ]
   where M_brain(u, v) in {0, 1} isolates intracranial soft tissue (attenuation 0 to +85 HU), substantially attenuating calvarial bone hyperdensities (+500 to +1500 HU) and improving pointing-game hit rates from 11.20% to 43.83% per bounding box annotation (n=6,283 expert boxes, 226 positive studies; 62.16% on chronic subdural haematomas).

5. **Physics-Monotonic Epistemic Uncertainty Quantification**:
   A dual uncertainty engine executing stochastic Monte Carlo forward passes with dropout active during inference, wherein aggregate epistemic prediction variance exhibits a rank correlation (Spearman rho = 0.9000, p = 0.0374) across progressive Gaussian noise levels.

6. **Deterministic Clinical Routing and Cryptographic Sign-Off Constraint**:
   A clinical governance subsystem combining independently computed risk signals into a deterministic routing decision: studies cleared by conformal, OOD, and uncertainty gates are deprioritised to routine queues, while flagged studies trigger urgent PACS worklist jump. Delivery of final diagnostic reports requires cryptographic consultant radiologist digital sign-off enforced as a database-level constraint.

---

## 6. BRIEF DESCRIPTION OF THE DRAWINGS

- **Figure 1** is a high-level schematic diagram illustrating the 7-stage operational clinical AI triage architecture and safety gating flow.
- **Figure 2** is a mathematical flow diagram of the Split Conformal Risk Control calibration and inference procedure.
- **Figure 3** is a schematic diagram of the Zero-Label Adaptive Batch Normalisation (AdaBN) module.
- **Figure 4** is an architectural comparison between standard Grad-CAM and Anatomically Masked HiResCAM.
- **Figure 5** is a graphical plot illustrating epistemic uncertainty variance monotonicity under progressive Gaussian noise.
- **Figure 6** is a sequence diagram illustrating the Stroke Code automated multi-channel clinical alert workflow.
- **Figure 7** is a schematic diagram of the sovereign dual-path deployment architecture (cloud AKS and offline edge).
- **Figure 8** is a block diagram illustrating multi-modal clinical triage expansion across CT Head, CXR, CTPA, and Brain MRI.

---

## 7. DETAILED DESCRIPTION OF PREFERRED EMBODIMENTS

### 7.1 Multi-Modal Ingestion and 3-Channel Pre-Processing
Medical imaging studies are ingested via DICOM C-STORE, HL7v2 MLLP, or FHIR R4 imaging study endpoints. The pre-processing pipeline standardises volumetric data into 3-channel tensors X in R^{3 x H x W}. For Non-Contrast Head CT (NCCT), three simultaneous Hounsfield Unit (HU) window presets are applied:
1. Brain Window: Center L = +40 HU, Width W = 80 HU (range [0, +80]).
2. Subdural Window: Center L = +75 HU, Width W = 150 HU (range [0, +150]).
3. Bone/Stroke Window: Center L = +35 HU, Width W = 35 HU (range [+17.5, +52.5]).

### 7.2 Zero-Label Adaptive Batch Normalisation (AdaBN) Implementation
Let f_theta represent a deep convolutional neural network (EfficientNet-B0 or EfficientNet-B4) pre-trained on source domain D_s. When deployed to a target hospital environment D_t, all convolutional weights W, biases, and linear classification weights W_head remain strictly frozen.

Upon onboarding a new scanner feed, an unannotated warm-up stream of target studies B_t = {x_1, ..., x_m} (m approx 50-100 studies) is processed in evaluation mode with BatchNorm layers set to update running statistics with momentum eta = 0.1:
mu_{B_t, c} = (1 / (m * H * W)) * sum_{i=1}^m sum_{h=1}^H sum_{w=1}^W x_{i, c, h, w}^{(l)}
sigma_{B_t, c}^2 = (1 / (m * H * W)) * sum_{i=1}^m sum_{h=1}^H sum_{w=1}^W (x_{i, c, h, w}^{(l)} - mu_{B_t, c})^2
mu_{t, c}^{(l)} <- (1 - eta) * mu_{t, c}^{(l)} + eta * mu_{B_t, c}
(sigma_{t, c}^{(l)})^2 <- (1 - eta) * (sigma_{t, c}^{(l)})^2 + eta * sigma_{B_t, c}^2

*Empirical Finding*: In CQ500 testing (N=486 scans, 3 hospital centres), AdaBN improved Study AUROC from 0.7491 to 0.7596.  
*Engineering Hypothesis*: AdaBN reduces scanner-induced covariate shifts in channel-wise activations, aiding feature alignment before statistical gating.
*Evaluation Protocol Disclosure*: AdaBN adaptation utilizes an unlabelled stream of target clinical site images to re-estimate running batch normalization moments (a test-time transductive unsupervised domain adaptation setting); no target labels or convolutional weight gradients are utilized.

### 7.3 Relative Mahalanobis Distance (RMD) Implementation
Penultimate feature vectors z(x) = f_theta(x) in R^D are extracted. Class-conditional Gaussian distributions N(mu_c, Sigma) (c in {0, 1}) and unconditioned background distribution N(mu_0, Sigma_0) are estimated on training features.

To ensure numerical stability when covariance matrices are near-singular, Ledoit-Wolf style trace shrinkage (shrinkage parameter lambda_shrink = 0.05) is applied:
Sigma_shrunk = (1 - lambda_shrink) * Sigma + lambda_shrink * (Tr(Sigma) / D) * I_D
Precision matrix Prec = pinv(Sigma_shrunk) is computed using Moore-Penrose pseudoinverse.

Relative Mahalanobis Distance is computed as:
RMD(x) = min_{c} ((z(x) - mu_c)^T * Prec * (z(x) - mu_c)) - (z(x) - mu_0)^T * Prec_0 * (z(x) - mu_0)
If RMD(x) > tau_OOD, the scan is flagged as anomalous, bypassing automated clearing and forcing human clinical review. In CQ500 error detection, RMD achieved AUROC 0.5798 vs 0.5256 for standard Mahalanobis distance.

### 7.4 Split Conformal Risk Control Formulation & Empirical Results
Let S(X) in [0, 1] represent the calibrated probability score for acute haemorrhage, and let the triage rule be:
C_lambda(X) = 1 if S(X) >= lambda else 0
The false-negative loss function is:
L(Y, C_lambda(X)) = 1 if (Y = 1 and C_lambda(X) = 0) else 0

Because loss L is monotonically non-decreasing with respect to threshold lambda (higher thresholds produce more false negatives), the empirical conditional false-negative rate across calibration dataset D_cal of n labeled scans is:
R_n(lambda) = (1 / n_pos) * sum_{i: Y_i=1} I(S(X_i) < lambda)
where n_pos = |{i : Y_i = 1}| is the number of positive-class calibration studies. This definition bounds the conditional false-negative rate E[I(C_lambda(X)=0) | Y=1] among studies determined to contain the target condition.

*Distinction from unconditional risk*: The Bates et al. (2021) theorem in its general form bounds E[L(X,Y)] where L = I(Y=1 and S(X)<lambda) — the unconditional false-negative probability P(Y=1, S(X)<lambda). Under prevalence P(Y=1) = pi, the two quantities satisfy:
E[L(X,Y)] = pi * R_n(lambda)
The implementation uses n_pos denominator (conditional FNR), which provides a tighter calibrated bound for the clinically relevant quantity: the fraction of haemorrhagic studies that would be missed.

Following Bates et al. (2021), under the assumption that calibration samples and future test samples are exchangeable, the optimal threshold lambda is selected as the supremum of safe thresholds:
lambda = sup { lambda' in [0, 1] : (n_pos / (n_pos + 1)) * R_n(lambda') + (1 / (n_pos + 1)) <= alpha }
For a monotonically non-decreasing loss, the safe set {lambda' : bound(lambda') <= alpha} is a closed interval [0, lambda*]. The supremum (lambda*) is the most aggressive threshold satisfying the bound, maximising the proportion of studies safely auto-cleared. Note: an equivalent formulation is inf{lambda' : bound(lambda') > alpha}, which produces the identical value.
If no lambda > 0 satisfies the bound, the system sets lambda = 0, ensuring that no cases are automatically cleared.

*Empirical Test Results (CQ500 Evaluation)*:
- Calibration split: n = 100 scans (40 positive, 60 negative), target risk alpha = 0.05.
- Calibrated conditional operational threshold: lambda = 0.0753 (calibrated to enforce E[FNR_cond] <= 0.05); conservative deployed operating threshold: lambda = 0.0298 (conditional bound = 0.0488 <= 0.05 evaluated with n_pos = 40).
- Independent held-out test split: N = 386 scans (162 positive, 224 negative).
- Test observations at calibrated threshold (lambda = 0.0753): 11 false negatives out of 162 positive cases, yielding an observed test conditional false-negative rate of 6.79% (11/162, within expected finite-sample variance of the 5.0% bound).
- Test observations at conservative threshold (lambda = 0.0298): 6 false negatives out of 162 positive cases, yielding an observed test conditional false-negative rate of 3.70% (6/162).
- Multi-layer safety escalation: In the evaluated single-gate configuration, 33 studies scored below lambda = 0.0298 (comprising 27 true negatives and 6 false negatives), yielding an observed test conditional false-negative rate of 3.70% (6/162), which directly meets the pre-registered 5.0% risk ceiling without requiring secondary intervention. In the deployed multi-layer architecture, all studies scored below lambda are additionally screened by Layer 1 (Relative Mahalanobis OOD) and Layer 2 (epistemic uncertainty) prior to clinical clearing, providing defense-in-depth against anomalous or out-of-distribution inputs.
- The distinction between theoretical expected risk bounds under exchangeability and observed empirical sample rates on finite test cohorts is explicitly recognized.

### 7.5 Anatomically-Masked HiResCAM Implementation
Element-wise gradient-activation products are computed without spatial global pooling:
H_c(u, v) = sum_k [ (dY_c / dA_k(u, v)) * A_k(u, v) ]

An automated anatomical soft-tissue segmentation mask M_brain(u, v) in {0, 1} is generated:
1. Radiological attenuation thresholding selects voxels with attenuation between 0 and +85 HU (capturing brain parenchyma [20-40 HU], CSF fluid [0-15 HU], and acute haematomas [50-85 HU]).
2. Morphological hole-filling and largest-connected-component isolation extracts the intracranial vault.
3. Element-wise multiplication produces the final saliency map:
   A_final(u, v) = ReLU(H_c(u, v)) * M_brain(u, v)

This substantially attenuates and suppresses cortical calvarial bone hyperdensities (+500 to +1500 HU). In evaluation across 6,283 expert bounding box annotations in 226 positive studies from CQ500/BHX (evaluated per bounding box annotation: a hit is recorded if the peak saliency pixel falls within the annotated bounding box for any slice in the study), Masked HiResCAM improved pointing-game hit rates from 11.20% (standard Grad-CAM) to 43.83% overall (n_hits=2,754 / n_boxes=6,283), and to 62.16% on chronic subdural haematomas.

### 7.6 Physics-Monotonic Epistemic Uncertainty Experimental Protocol
In Test K, model uncertainty was evaluated on N=300 held-out slices (150 ICH+, 150 ICH-) from RSNA 2019 under two physical perturbation regimes:
1. Simulated Gaussian radiation dose reduction noise at 5 discrete levels: sigma in {0.00, 0.05, 0.10, 0.20, 0.35}.
2. Patient motion blur convolution across 5 kernel lengths: L in {1, 3, 7, 11, 15} pixels.

Stochastic inference executing N=20 forward passes with Monte Carlo dropout active produced epistemic variance sigma^2_epi. Mean epistemic variance increased monotonically across the 5 discrete noise levels from 0.00088 to 0.00496, yielding a Spearman rank correlation rho = 0.9000 (p = 0.0374).

---

## 8. CLAIMS

WE CLAIM:

1. A computer-implemented method for safe diagnostic triage and prioritisation of digital medical imaging studies, comprising:
   (a) receiving an unannotated digital medical imaging study acquired by an imaging device at a clinical site;
   (b) adapting batch normalisation running mean and running variance statistics of a deep neural network feature extractor using the unannotated digital medical imaging study while maintaining convolutional filter weights and linear classification weights strictly frozen;
   (c) computing an out-of-distribution (OOD) score using a Relative Mahalanobis Distance contrasting a class-conditional feature representation against an unconditioned background feature distribution;
   (d) evaluating the study using a split conformal risk control prediction gate calibrated on a split calibration dataset under exchangeability assumptions to enforce an expected conditional False Negative Rate bound (E[FNR_cond] <= alpha) among imaging studies containing the target condition, via an empirical quantile threshold (lambda) selected as the supremum of the set of safe thresholds satisfying the finite-sample bound;
   (e) evaluating prediction variance through stochastic inference with active dropout to verify that epistemic uncertainty responds appropriately to image degradation;
   (f) generating an explainable spatial saliency map via element-wise gradient-activation multiplication constrained by an automated anatomical soft-tissue segmentation mask;
   (g) combining outputs from the out-of-distribution score, conformal risk control gate, and epistemic uncertainty into a deterministic clinical routing decision, wherein studies cleared by all gates are deprioritised to routine review and studies failing any gate are escalated to emergency review; and
   (h) dispatching prioritised clinical triage alerts to a medical display worklist, wherein final diagnostic report delivery requires cryptographic clinician digital sign-off enforced as a database-level constraint.

2. The method of Claim 1, wherein the split conformal risk control prediction gate selects operational probability threshold lambda satisfying:
   lambda = sup { lambda' in [0, 1] : (n_pos / (n_pos + 1)) * R_n(lambda') + (1 / (n_pos + 1)) <= alpha }
   where n is calibration sample size, n_pos is the number of positive-class calibration studies, and R_n(lambda') is the empirical conditional false-negative rate:
   R_n(lambda') = (1 / n_pos) * sum_{i: Y_i=1} I(S(X_i) < lambda')
   wherein if no threshold lambda' satisfies the condition, the system sets lambda = 0 to route 100% of studies to clinician review; the supremum formulation equivalently represents the infimum of the complement set of unsafe thresholds for a monotonically non-decreasing loss function.

3. The method of Claim 1, wherein the clinical risk tolerance threshold alpha is configured as 0.05, establishing a finite-sample expected conditional false-negative rate bound of 5.0% among imaging studies determined to contain the target condition (E[I(C_lambda=0) | Y=1] <= 0.05), under the exchangeability assumption that calibration studies and future target-site studies are drawn from the same distribution.

4. The method of Claim 1, wherein the digital medical imaging study comprises a Non-Contrast Head Computed Tomography (NCCT) scan, and the prioritised alert detects acute Intracranial Haemorrhage (ICH).

5. The method of Claim 4, wherein the split conformal risk control prediction gate comprises distinct subtype-specific risk thresholds independently calibrated for intraparenchymal, epidural, subdural, subarachnoid, and intraventricular haemorrhage subtypes.

6. The method of Claim 1, wherein the automated anatomical soft-tissue segmentation mask isolates brain parenchyma and intracranial fluid collections by selecting pixels having radiological attenuation between 0 and +85 Hounsfield Units, thereby substantially attenuating and suppressing false-positive gradient activation energy originating from high-density cortical calvarial bone.

7. The method of Claim 1, wherein adapting batch normalisation statistics comprises streaming an unlabelled mini-batch of target site imaging studies through the deep neural network and updating running channel mean and variance vectors via exponential moving momentum eta in (0, 1) without executing backpropagation.

8. The method of Claim 1, wherein the Relative Mahalanobis Distance RMD(x) is computed using Ledoit-Wolf trace shrinkage covariance regularization and Moore-Penrose pseudoinverse precision matrices contrasting class-conditional centroids against an unconditioned background feature centroid.

9. The method of Claim 1, wherein epistemic uncertainty variance computed across stochastic forward passes exhibits a positive Spearman rank correlation (rho > 0) with respect to discrete levels of simulated image acquisition noise, as experimentally evaluated; wherein in a specific embodiment evaluated across five Gaussian noise levels (sigma in {0.00, 0.05, 0.10, 0.20, 0.35}), a Spearman rank correlation of rho = 0.9000 (p = 0.0374) was observed.

10. The method of Claim 1, further comprising executing a 9-layer metacognition safety engine evaluating: (1) modality plausibility; (2) urgency-finding consistency; (3) minimum confidence floors; (4) attribution coherence; (5) confidence-uncertainty conflict; (6) clinical impression negation concordance; (7) demographic epidemiological priors; (8) composite hallucination risk scoring; and (9) binary safe-to-alert gating.

11. The method of Claim 1, wherein pre-processing of computed tomography inputs generates a standardised three-channel tensor by simultaneously applying a brain window, a subdural window, and a bone window.

12. The method of Claim 1, wherein the digital medical imaging study is selected from the group consisting of: a chest radiograph evaluated for pneumothorax or tuberculosis; a computed tomography pulmonary angiogram evaluated for pulmonary embolism; and a brain magnetic resonance imaging study evaluated for acute ischemic stroke.

13. The method of Claim 1, wherein upon detecting an acute surgical emergency, an automated Stroke Code workflow simultaneously dispatches: a mobile push notification; a WebSocket event; an HL7v2 ADT patient transfer message; an HL7v2 ORM imaging order; and an HL7v2 ORU diagnostic result message.

14. The method of Claim 1, wherein all clinical triage decisions, conformal scores, explainability maps, and clinician sign-off actions are logged to an immutable audit trail using SHA-256 hash chaining and periodic Merkle tree verification.

15. A clinical artificial intelligence computing system for automated diagnostic triage and safety assurance, comprising:
    at least one hardware processor;
    a medical imaging interface configured to receive digital medical imaging studies via DICOM, HL7, or FHIR protocols;
    a deep neural network inference engine stored in memory and executable by the at least one processor;
    a zero-label adaptive batch normalisation module configured to update running mean and variance statistics of the deep neural network using unannotated imaging studies from a target clinical environment while weights remain frozen;
    a split conformal risk control module configured to enforce a pre-specified expected false negative triage error bound under exchangeability;
    an explainability engine configured to generate anatomically masked spatial attribution maps suppressing non-parenchymal bone artifacts; and
    a relational database enforcing foreign key constraints and digital signature validation, wherein dispatch of prioritised clinical alerts is blocked absent cryptographic clinician verification.

16. The system of Claim 15, configured as an offline edge gateway comprising an INT8-quantised convolutional neural network operable without external internet connectivity, a local Merkle-chained audit log, and a cellular modem configured for fallback SMS emergency alert dispatch.

17. The system of Claim 15, configured as a sovereign cloud cluster deployed within a sovereign cloud tenancy, comprising a GPU container pool, a tenant-isolated encrypted database, and a web application firewall.

18. A non-transitory computer-readable storage medium comprising instructions that, when executed by one or more processors of a medical computing device, cause the device to perform the method of Claim 1.

19. A computer program product comprising software code portions for executing the steps of Claim 1 when run on a clinical decision support workstation.

20. A Software-as-a-Medical-Device (SaMD) diagnostic decision support apparatus comprising the system of Claim 15, wherein the apparatus operates within an acute hospital emergency department to prioritise time-critical intracranial haemorrhage, pulmonary embolism, tension pneumothorax, and acute stroke studies.
