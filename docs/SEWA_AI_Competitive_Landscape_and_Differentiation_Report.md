# SEWA AI — Clinical AI Competitive Landscape, Market Positioning & Differentiation Report

**Document Ref:** SEWA-AI-REPORT-CLD-001 · **Version:** 1.0 · **Date:** 20 August 2026
**Prepared by:** SEWA AI (Storegrill Inc Ltd, Company No. 14581073)
**Audience:** NHS Trust R&D and Radiology leadership; NIHR / HRC reviewers; university partners; prospective investors and clinical collaborators
**Classification:** CONFIDENTIAL — Not for distribution without written consent

---

## 1. Executive Summary

SEWA AI is a Software-as-a-Medical-Device (SaMD) platform providing **automated triage and prioritisation of adult thoracic and acute radiology studies** (chest X-ray, CT head, CT chest, CT angiography) as **decision support for consultant radiologists**, with mandatory human sign-off enforced at the database layer.

This report answers three questions that NHS and NIHR reviewers repeatedly ask: **(1) Has SEWA researched the competitive landscape? (2) How does SEWA differ from established clinical AI companies? (3) Why does that difference matter to patients, trusts and the health system?**

**Key findings:**

- The clinical imaging AI market is **concentrated in single-condition, single-modality "point solutions"** (Viz.ai, Aidoc, Qure.ai, Lunit, Brainomix) and **comprehensive multi-finding platforms** (Harrison.ai/Annalise.ai). Almost all are **cloud-dependent, confidence-score-based decision aids** that report a single probability value without decomposing uncertainty and without a dedicated hallucination/over-confidence safety gate before alerts are dispatched.
- The fastest-growing incumbent in SEWA's exact space — **Harrison.ai/Annalise.ai** — is a commercial powerhouse (US$112M Series C; >1,000 sites; 40+ NHS Trusts; processes >35% of NHS England CXRs). It competes on **breadth of findings (124 CXR / 130 CT brain)** and has a **peer-reviewed evidence base**, but it is a **decision-support co-pilot**, not a safety-first triage architecture: no published uncertainty decomposition, no hallucination gate before dispatch, no offline/edge capability for continuity of service.
- **Safety and trustworthiness — not raw detection accuracy — is the documented reason NHS imaging AI fails to convert into adoption.** The RCR's own guidance and NICE EVA decisions cite insufficient real-world evidence, alert fatigue, opacity, and the absence of guaranteed human oversight as adoption blockers. SEWA's architecture (uncertainty decomposition, nine-layer Metacognition Gate, database-layer human-in-the-loop, zero-PHI-egress cloud + offline INT8 edge) is **designed from first principles to answer exactly these objections**.
- **SEWA's differentiation is therefore architectural and safety-led, not "more findings."** SEWA deliberately does not compete on finding-count; it competes on: (i) knowing when the AI does not know (epistemic vs aleatoric uncertainty); (ii) blocking autonomous dispatch when hallucination risk is high; (iii) making the human-in-the-loop guarantee non-bypassable; (iv) remaining fully operational during connectivity loss; and (v) transparent, published pricing and a UK/NHS-first regulatory pathway.
- **Honest boundary:** SEWA is at **TRL 5** with **no UKCA/CE mark, no independent clinical validation, and no NHS production deployment yet.** Its performance figures are internal engineering tests only and are not clinical evidence. Every competitor profiled in this report has regulatory clearance and, in most cases, published clinical studies. **SEWA's near-term challenge is therefore not differentiation of intent — it is converting an architecturally differentiated platform into regulated, evidenced, deployed reality via the shadow-trial → NIHR EME → UKCA Class IIb pathway currently in motion.**

---

## 2. Purpose, Scope & Method

### 2.1 Purpose

- Provide an evidence-based map of the clinical imaging AI competitive landscape relevant to SEWA's regulated product (thoracic/acute radiology triage) and its planned modules (pathology, mammography, retinal).
- Articulate SEWA's differentiation rigorously — what is different, what is evidence, and what is still to be proven.
- Support NIHR HRC, NHS Trust, university and investor evaluation conversations with primary sources and dated citations.

### 2.2 Scope

- **Core scope:** AI software that interprets diagnostic imaging for triage, prioritisation, detection, and decision support in adult radiology (CXR, CT head, CT chest, CTA), plus adjacent screening spaces (mammography, retinal, pathology) where SEWA has roadmap claims and where market-defining precedents exist.
- **Out of scope:** LLM scribes/ambient documentation, scheduling/operational AI, genomics AI, and non-imaging diagnostic AI (listed where relevant for context only).
- **Geography:** Primary focus on Great Britain/NHS and Europe; US FDA precedent included because it defines the global regulatory benchmark and competitive trajectory.

### 2.3 Method & Evidence Classification

Every factual statement in this report is assigned an **evidence class**. This is deliberate: SEWA is not a clinical-equivalence claim. The classification lets readers separate what is verified fact, what is SEWA's own engineering, what is a claim SEWA must still validate, and what is external evidence.

| Class | Meaning | Example |
|---|---|---|
| **A** | Verified public fact (primary source: regulator, official company release, peer-reviewed journal) | "Harrison.ai raised US$112M Series C (Feb 2025)" |
| **B** | SEWA internal engineering result (not clinical evidence) | "Internal AUC-ROC 0.961 overall (n=14,200)" |
| **C** | SEWA clinical claim not yet independently validated | "Mandatory sign-off enforced at DB layer" |
| **D** | Management assertion / strategy | "SEWA competes on safety, not finding-count" |
| **E** | SEWA's own analysis of competitor positioning | "Harrison.ai is a co-pilot, not a safety-first gate" |
| **F** | External evidence (studies, reports, guidelines) | "NICE EVA HTE20 fracture-detection decision (Jan 2025)" |

Citations are given as **[Source name, date, URL]** at point of use and consolidated in Section 13. Where a figure is unverifiable or not publicly disclosed, this is stated explicitly; no figure has been fabricated.

---

## 3. The Problem: Why the NHS Needs Triage AI That It Can Trust

### 3.1 The workforce and demand mismatch

- Consultant radiologist vacancy rate ~29% (RCR 2025 census) with ~1.5M backlogged reports **[A, RCR census via SEWA NHS Trust Pack v2.0]**.
- Median urgent-report turnaround measured in hours (SEWA cites 4.2 hours internally) while for time-critical findings, minutes determine outcome — e.g., each 15-minute delay in stroke treatment is associated with loss of ~1M neurons **[F, Saver et al., NEJM 2006]**.
- Diagnostic-delay claims are the largest single category of NHS clinical negligence liability **[F, NHS Resolution 2024]**.
- Workload is unsustainable: RCR/BMA surveys report burnout linked to unsustainable reporting volume **[F, BMA 2023; RCR 2023]**.

### 3.2 The NHS has already decided AI matters — but adoption is conditional

- RCR 2023 census: **at least 54% of radiology departments reported using AI in clinical practice**, and prevalence has risen since **[F, RCR, "AI Deployment in the NHS," 2025]**.
- NHS England has invested substantially: **£123M AI in Health and Care Award**, an **AI Diagnostic Fund**, and the **AI Deployment Platform (AIDP)** **[F, NHS England/Adrine synthesis 2026; RCR 2025]**.
- National deployments now exist at scale: Brainomix stroke AI is rolled out to **every regularly admitting stroke service in England** (70+ hospitals; 107-hospital study) **[F, NHS England news, 2 Dec 2025]**; Harrison.ai reports processing **>35% of NHS England CXRs** **[A, harrison.ai]**. Kheiron/DeepHealth's Mia is the subject of the UK's first comprehensive NHS breast-screening AI evaluation (GEMINI, Nature Cancer 2026) **[F, University of Aberdeen / Nature Cancer, 10 Mar 2026]**.

### 3.3 Why adoption stalls: the "trustworthy AI" gap

- **Alert fatigue** from high false-positive rates and uninterpretable outputs.
- **Opacity** — single confidence scores with no decomposition of *why* the model is uncertain.
- **No guaranteed human oversight** — oversight is enforced in the UI (bypassable) rather than the architecture.
- **No continuity** — cloud-only tools are inoperable during connectivity or cloud outages.
- **Evidence lag** — NICE EVA decisions repeatedly call for more real-world evidence before routine use (e.g., stroke decision-support DG57 concluded "insufficient evidence") **[F, NICE via iatrox synthesis, 2025]**.

The NHS does not have an AI shortage; it has a **trustworthy AI shortage**. That is the problem SEWA is architected to solve, and it is the frame through which this report evaluates every competitor.

---

## 4. Regulatory & Market Context (Great Britain / Europe / US)

### 4.1 UK regulatory baseline for imaging AI

- AI software that contributes to diagnosis is a medical device (SaMD/AIaMD) under the **UK Medical Devices Regulations 2002 (as amended)** and **EU MDR 2017/745**; SEWA classifies as **Class IIb (Rule 11)** on its intended use driving management of time-critical conditions **[A, SEWA-AI-DOC-01; EU MDR 2017/745]**.
- Any NHS-deployed supplier must provide a **DCB0129** clinical safety case and hazard log; the adopting organisation completes a local **DCB0160** safety case; procurement passes the **DTAC** baseline (clinical safety, data protection, cybersecurity, interoperability, usability) **[F, NHS Transformation Directorate; iatrox synthesis 2025]**.
- **NICE** increasingly uses the **Early Value Assessment (EVA)** pathway for time-limited conditional adoption (e.g., fracture detection EVA HTE20 Jan 2025; skin-lesion triage EVA HTE24) while further evidence is generated; conversely stroke decision-support (DG57) was judged to have insufficient evidence for routine use **[F, NICE]**.
- **MHRA AI Airlock** (launched May 2024; expanded cohorts 2025) is a regulatory sandbox testing novel AIaMD in real NHS environments; learnings feed a new **AI-specific regulatory framework expected 2026**, built on Good Machine Learning Practices, Predetermined Change Control Plans (PCCPs), and transparency principles co-developed with FDA and Health Canada **[F, MHRA via regdesk 2026; gov.uk]**.
- **22 July 2025 MHRA reform package:** international reliance on FDA/Health Canada/TGA authorisations for streamlined GB market access; UKCA route reserved for "first-in-market innovative technologies, including AI as a medical device"; digital UDI traceability replacing physical UKCA logo **[F, gov.uk / MHRA 22 Jul 2025]**.
- **Implication for SEWA:** the UK regulatory environment is moving *toward* exactly what SEWA was designed to demonstrate — model governance, change control, transparency, and safety evidence. SEWA's roadmap (DTAC Q4 2026; MHRA NoO Q3 2026–Q1 2027; UKCA Class IIb Q2 2027) aligns with this trajectory **[A, SEWA-AI-DOC-01; SEWA NHS Trust Pack v2.0]**.

### 4.2 US precedent (why it matters globally)

- The FDA's list of AI/ML-enabled devices is dominated by radiology (>75% of cleared AI devices are on the radiology panel; most via the 510(k) equivalence pathway) **[F, AuntMinnie/FDA data via AZmed synthesis, 2025]**.
- **CADt (computer-assisted triage)** predicate pathways (e.g., Viz.ai LVO ContaCT K223042) define the US regulatory benchmark for triage AI; SEWA's US plan is a 510(k) CADt-style submission (Q3 2027 target) **[A, FDA; SEWA-AI-DOC-01]**.
- Key 2025–2026 FDA events defining the competitive frontier: PathAI AISight Dx primary-diagnosis clearance with the first **PCCP** in digital pathology (Jun 2025); Paige PanCancer Detect Breakthrough Device designation (Apr 2025); Aidoc CARE foundation-model Breakthrough Device designation (Oct 2025); Qure.ai qXR-Detect 510(k) (Feb 2026); ArteraAI Breast 510(k) (May 2026); DeepHealth AI mammography breast-density clearance (Apr 2026) **[F, FDA press; vendor releases; healthcareaiinsights.com]**.

---

## 5. Competitor Landscape

### 5.1 Harrison.ai / Annalise.ai — the closest analogue (deep dive)

**Profile.** Sydney-based, founded 2018; merged with Annalise.ai (its radiology JV with I-MED Radiology). US$112M/≈A$179M Series C announced Feb 2025 (co-led Aware Super, ECP, Horizons Ventures; NRFC, Ord Minnett, Wollemi; Blackbird, Alpha JWC), plus A$32M from Australia's National Reconstruction Fund (Feb 2025) **[A, harrison.ai press, Feb 2025; MobiHealthNews 10 Feb 2025]**.

**Products.** HARRISON.AI CHEST X-RAY (up to **124 findings** in <20s), HARRISON.AI CT BRAIN (up to **130 findings** in <90s), HARRISON.AI CT CHEST; Annalise Enterprise CXR/CTB; Annalise CXR Edge (point-of-care, 95 findings in ≤10s) **[A, harrison.ai; Microsoft Marketplace listing; cybernewscentre 2025]**.

**Scale (company-reported).** 1,000+ sites across four continents; **>35% of all CXRs in NHS England** processed with Harrison CXR; **>130 UK hospitals across 45+ NHS Trusts**; 100% of Hong Kong public A&E departments; >50% of Australian radiologists have access; 40+ countries with clinical clearance; 12 FDA clearances; CT Brain algorithm holds FDA Breakthrough Device designation and Medicare NTAP reimbursement; >7M patient impacts; 3,400+ clinicians using its tools **[A, harrison.ai; press Feb 2025]**.

**NHS deployments (RCR AI Registry, verified):** NHS Grampian (Jan 2022, Philips PACS + Soliton Radiology+ RIS); University Hospitals of Morecambe Bay (Mar 2022); Epsom & St Helier (Dec 2022); West Yorkshire and North Yorkshire trusts (BBC coverage) **[F, RCR AI Registry; BBC]**.

**Evidence.** Company reports 40+ global publications; Annalise CXR/CTB validated across settings. Independent evaluation of AI reporting assistants in NHS contexts is ongoing **[A, vendor]**.

**Positioning read (SEWA analysis, class E).** Harrison.ai is a **breadth-first decision-support co-pilot**: it finds more, faster, and integrates into PACS/RIS/EHR. Its value proposition is *catch more, miss less*. It is not architected as a safety gate: there is no published uncertainty decomposition, no pre-dispatch hallucination/over-confidence gate, no offline-capable build, and its intended-use framing is clinician-assisted reporting rather than safety-critical triage enforcement.

### 5.2 Aidoc — always-on enterprise triage

**Profile.** Tel Aviv/New York; a pioneer of the "always-on" AI triage model embedded at the imaging modality and PACS layer. **FDA Breakthrough Device Designation (Oct 2025)** for its **CARE foundation model** covering multiple conditions; platform (aiOS) orchestrates multiple FDA-cleared point algorithms **[F, vendor/healthcareaiinsights]**.

**Positioning read.** Aidoc owns the *enterprise workflow layer* (aiOS integrates many algorithms from many vendors) — a platform/aggregator strategy. It does not publish uncertainty decomposition or a hallucination gate; its model is cloud-hosted decision support. Competes with SEWA on the "always-on triage in the radiology workflow" axis but not on architectural safety guarantees **[E]**.

### 5.3 Qure.ai — global scale, TB heritage

**Profile.** Mumbai/New Delhi; strong TB and global-health footprint. **qXR-Detect** received FDA 510(k) clearance (26 Feb 2026) for detection in lungs, pleura, hila, heart, bone, mediastinum **[F, FDA/510k database]**; qXR widely deployed for TB screening globally and reported in NHS contexts (≈30% faster reporting per NHS AI landscape syntheses) **[F, adrine synthesis 2026]**.

**Positioning read.** Qure is the strongest low-connectivity/global-health player (relevant to SEWA's Africa programme) but its core identity is detection-at-scale, not safety-first uncertainty/oversight architecture. Its NHS CXR presence is real but smaller than Harrison's; evidence base is strong on TB and fracture use cases **[E]**.

### 5.4 Viz.ai — stroke workflow orchestration

**Profile.** San Francisco; LVO ContaCT (FDA K223042) is the CADt market-defining product; ~2,000 hospitals; declared healthcare business profitable in 2025 **[F, vendor/analyst reporting]**.

**Positioning read.** Viz.ai is the proof that a *single, life-critical, workflow-embedded* indication can become a profitable, category-defining business — validating SEWA's thesis that time-critical triage has commercial value. It is stroke-specific and does not cover the broader thoracic/acute condition set SEWA targets; it is cloud-dependent and does not publish uncertainty decomposition **[E]**.

### 5.5 Brainomix — the NHS evidence exemplar

**Profile.** Oxford University spin-out. **Brainomix 360 Stroke** deployed to **every stroke centre in England** (Summer 2024). The **largest real-world evaluation of stroke AI imaging** (Lancet Digital Health, 2 Dec 2025; 452,952 patients across 107 NHS hospitals, 2019–2023) showed: **EVT rates doubled (2.3%→4.6%, ~100% relative increase)** at 26 evaluation hospitals; patient-level analysis of 71,017 ischaemic strokes showed AI use raised EVT likelihood (OR 1.57); AI associated with a **64-minute reduction in door-in-door-out time** at primary stroke centres; more thrombectomy/thrombolysis and more favourable functional outcomes with no mortality increase **[F, Lancet Digital Health, Dec 2025; NHS England news, 2 Dec 2025]**. Series C extended to $25.4M (Feb 2026) **[A, MassDevice 24 Feb 2026]**.

**Positioning read.** Brainomix is the benchmark for *NHS-scale, real-world, published evidence of impact* — the exact evidence bar SEWA must clear. It is stroke-specific (one pathway) and CT-based; SEWA's thoracic/acute multi-modality scope is broader, but Brainomix proves the regulatory/NICE/procurement route works for time-critical triage AI in the NHS **[E]**.

### 5.6 Lunit — screening-focused, global scale

**Profile.** South Korea; **INSIGHT MMG / DBT** for mammography; **INSIGHT Risk** (mammography, 510(k) submitted Dec 2025) **[F, vendor]**; strong Asia/global screening footprint and published radiology AI research.

**Positioning read.** Lunit competes in SEWA's *planned* mammography module, not the current regulated product. Its model is cloud-based screening decision support (recall/no-recall), not time-critical emergency triage, and not an uncertainty/safety-gate architecture **[E]**.

### 5.7 DeepHealth (incl. Kheiron/Mia) — mammography evidence leader

**Profile.** RadNet's AI unit acquired Kheiron Medical (developer of **Mia**, CE-marked AI for breast screening). **GEMINI study (Nature Cancer, 10 Mar 2026)**: prospective NHS evaluation of 10,889 women at NHS Grampian; AI increased cancer detection by **10.4%** and could cut workload >30%; detection of additional interval cancers (Mia found 47 additional interval cancers vs double-reading in the 3-year historical cohort of 55,000 screening events / 220,000 images); AI used alongside, not replacing, human reading; funded by NHS AI in Health and Care Award + NIHR **[F, University of Aberdeen / Nature Cancer, 10 Mar 2026]**. DeepHealth also received FDA clearance for AI mammography breast-density assessment (Apr 2026) **[F, vendor]**.

**Positioning read.** DeepHealth/Kheiron is the reference point for *prospective, NIHR-funded, published evidence in the NHS screening context*. It validates SEWA's UK-first, NHS-partnered evidence strategy for its future mammography module. Not an acute/thoracic triage player **[E]**.

### 5.8 Pathology AI — Paige/Tempus, PathAI, Artera (adjacent, roadmap-relevant)

- **Paige** (MSK spin-out, 2017): first FDA De Novo for AI pathology (Paige Prostate Detect, DEN200080, 21 Sep 2021); Breakthrough designations for Prostate, Lymph Node, and PanCancer Detect (Apr 2025); FullFocus viewer 510(k) clearances (K201005; K241273, Jan 2025). **Acquired by Tempus for $81.25M (Aug 2025)** — a cautionary data point on standalone pathology-AI commercialisation; PanCancer Detect is Research Use Only **[F, healthcareaiinsights.com Jun 2026; paige.ai]**.
- **PathAI**: AISight Dx 510(k) for **primary diagnosis** with the **first PCCP in digital pathology** (K243391, 30 Jun 2025); AIM-MASH became the **first FDA-qualified AI tool for MASH clinical trials** (Dec 2025); Series C $165M (2021); sold diagnostics lab assets to Quest (~$100M, 2024) and pivoted to pharma-services + reference-lab partnerships (MedStar, Labcorp 2026) **[F, pathai.com; healthcareaiinsights.com]**.
- **Artera**: **ArteraAI Breast** FDA 510(k) (May 2026) for early HR+/HER2- breast cancer prognostic/predictive risk stratification **[F, ITN/Artera 6 May 2026]**.

**Positioning read.** Pathology AI consolidates into multimodal oncology platforms (Tempus) or pharma-services models (PathAI); standalone point-solution commercialisation proved structurally difficult (Paige exit at <34% of disclosed funding). For SEWA's planned pathology module (Year 4+), this landscape argues for either a platform partnership strategy or a very narrowly-evidenced single indication — a strategic lesson to carry forward **[E]**.

### 5.9 Retinal AI — autonomous screening precedent

- **Digital Diagnostics** (formerly IDx): **IDx-DR was the first-ever FDA autonomous AI diagnostic** (De Novo, Apr 2018) for more-than-mild diabetic retinopathy; rebranded **LumineticsCore**; 87.4% sensitivity / 89.5% specificity in a 900-patient primary-care study; >1,000 US clinics claimed (unverified) **[F, FDA; AAO; PMC 2025; 510k database]**.
- **Eyenuk EyeArt**: FDA 510(k) (K200667, Aug 2020); prospective multi-centre trial (915 participants): 96%/88% (more-than-mild DR), 92%/94% (vision-threatening DR); CE-marked; used at Temple Health, Utah, Cedars-Sinai **[F, AAO 2020; JAMA Netw Open]**.
- **AEYE Health** (AEYE-DS, 510(k) late 2022) and **iHealthScreen iPredict-DR** (510(k) Jul 2026) continue the autonomous-screening lineage **[F, Healio Jul 2026; PMC 2025]**.
- **Landmark independent evaluation:** Rudnicka et al., Lancet Digital Health (2025): **8 CE-marked ARIAS tested on 201,438 routine consecutive screening encounters (1.2M images) from the North East London DESP**; ARIAS sensitivity for proliferative DR (R3) ranged 95.8–99.5% with results consistent across ethnicity/age/sex/deprivation — a benchmark for how the NHS evaluates autonomous screening AI at scale **[F, Lancet Digital Health 2025; Retinal Physician 2026]**.
- Yet Scotland's 2011 adoption of automated triage remains an exception; **widespread integration of ARIAS into national screening programmes has not occurred** **[F, Retinal Physician 2026]**.

**Positioning read.** Retinal AI proves three things for SEWA: (1) **autonomous AI is regulatorily achievable** (De Novo precedent); (2) the **NHS evaluates screening AI at population scale with strict equity requirements** — the same rigour SEWA's future modules must meet; (3) autonomous diagnostic claims carry **heavy liability burden** (manufacturer responsibility), reinforcing SEWA's conservative decision-support + mandatory-sign-off positioning **[E]**.

---

## 6. Comparative Matrix

### 6.1 Capability matrix (SEWA's own analysis, class E; competitor facts class A/F)

**Table A — Scope, regulatory and clinical footprint** (rows = attributes, columns = vendors)

| Attribute | SEWA AI | Harrison.ai | Aidoc | Qure.ai | Viz.ai | Brainomix |
|---|---|---|---|---|---|---|
| Core regulated scope | Thoracic/acute triage (CXR, CT head, CT chest, CTA) | CXR, CT brain, CT chest | Multi-condition triage (8–12+) | CXR, CT (TB, fracture, qXR-Detect) | Stroke (LVO) | Stroke (CT) |
| Findings coverage | 14 time-critical conditions | 124 CXR / 130 CTB | Condition-specific | Detection across 6 regions | LVO/ICH/Aneurysm | Stroke signature |
| Regulatory (UK/EU/US) | None yet (TRL 5; UKCA IIb Q2 2027 planned) | CE MDR IIb; 12 FDA clearances | FDA-cleared; Breakthrough (2025) | FDA 510(k) Feb 2026; CE | FDA K223042 (CADt) | FDA 510(k); CE |
| NHS production deployments | None yet (pipeline in motion) | 45+ NHS Trusts; >35% of NHS CXR | NHS sites (stroke etc.) | NHS sites | Limited NHS | All English stroke centres (70+ hospitals) |
| Peer-reviewed impact evidence (NHS) | None yet | Yes (vendor-reported 40+ pubs) | Partial | Partial | Partial | **Lancet Digital Health 2025 (452,952 patients)** |

**Table B — Safety, deployment and commercial architecture** (rows = attributes, columns = vendors)

| Attribute | SEWA AI | Harrison.ai | Aidoc | Lunit | DeepHealth/Kheiron |
|---|---|---|---|---|---|
| Uncertainty decomposition (epistemic vs aleatoric) | **Yes — native (MC-Dropout)** | No published evidence | No published evidence | No published evidence | No published evidence |
| Pre-dispatch hallucination/over-confidence gate | **Yes — Metacognition Gate (patent GB2609706.3)** | No published evidence | No published evidence | No published evidence | No published evidence |
| Mandatory human-in-the-loop (non-bypassable) | **Yes — enforced at DB layer** | Reviewer signs off reports | Clinician oversight (UI) | Human reader (screening) | Human reader (screening) |
| Offline/edge deployment | **Yes — INT8 edge + SMS/GSM** | No published evidence | No | No | No |
| Zero-PHI-egress UK sovereign cloud | **Yes (Azure UK South)** | Cloud (multinational) | Cloud | Cloud | Azure UK (via Microsoft) |
| Published transparent pricing | **Yes (£549–£4,999+/mo)** | No | No | No | No |

### 6.2 What the matrix says (class E)

- **No competitor offers the full "trust stack"** SEWA is built around: uncertainty decomposition + pre-dispatch hallucination gate + database-layer mandatory sign-off + offline continuity. Individual features exist piecemeal elsewhere (Aidoc always-on; Qure offline ambitions; PathAI PCCP change-control; Brainomix evidence discipline) — but **none combine them in one safety-critical architecture**.
- **SEWA's regulatory/evidence position is the clear weak point** vs every profiled incumbent: zero clearances, zero independent validation, zero NHS production footprint. This asymmetry is the honest core of the differentiation story: SEWA's *design* is differentiated; its *proof* is not yet.
- **The market has already validated the commercial thesis** for time-critical triage (Viz.ai profitable; Brainomix NHS-scale; Harrison.ai >1,000 sites) — which is precisely the space SEWA targets.

---

## 7. SEWA AI Differentiation — What Is Different and Why It Matters

### 7.1 Architectural differentiation (classes B/C; strategy D)

1. **Uncertainty Quantification Engine (native).** Monte-Carlo Dropout (20 stochastic forward passes) decomposes uncertainty into **epistemic** ("the model does not know this — escalate") vs **aleatoric** ("the image itself is ambiguous — flag for human review"). This converts a blind confidence score into an *actionable escalation signal*. In the NHS trustworthiness frame, this directly answers the RCR/NICE objection that single scores are uninterpretable **[B, SEWA-AI-DOC-12; D, SEWA vision docs]**.
2. **Nine-Layer Metacognition Gate (patent GB2609706.3).** Every AI output is audited across nine safety layers; a hallucination-risk score H∈[0,1] is computed; **H > 0.30 blocks autonomous dispatch — no silent discard, human escalation**. This is a *detection-of-overconfidence* mechanism that no profiled competitor publicly offers **[B, SEWA internal; D]**.
3. **Database-layer human-in-the-loop.** Sign-off is enforced at the persistence layer, not the UI — it cannot be bypassed by frontend manipulation. This is a verifiable architectural guarantee, not a workflow convention **[C — SEWA claim; architecture documented in repo]**.
4. **Zero-PHI-egress + offline continuity.** Cloud (Azure UK South) keeps all data in the UK sovereign boundary; an **INT8-quantised ~18MB edge model runs on a 4-core CPU with no internet** (AES-256-GCM-encrypted SQLite cache, auto-sync on reconnect), plus a GSM/SMS mode for low-connectivity settings (2G-compatible, Africa's Talking). No profiled incumbent offers the same continuity-of-service guarantee **[B/C]**.
5. **Explainability on every finding.** Grad-CAM + SHAP visual explanation per finding; VLM structured report + natural-language impression in 8 languages (incl. Yoruba, Swahili, Arabic) **[B/C]**.
6. **Modular multi-specialty platform.** Triage/radiology is the regulated core; pathology, mammography, retinal workspaces are architected as future modules under strict non-deception governance (each requires its own intended use, evidence, and marking before any claim) **[A, SEWA-AI-DOC-09]**.

### 7.2 Commercial & go-to-market differentiation (classes A/D)

- **Published, transparent pricing** (£549–£4,999+/month; annual discount; outcome-based "pay for door-to-alert improvement" pilot post-NIHR EME) — none of the profiled incumbents publish pricing **[A, SEWA pricing page; trust pack]**.
- **Africa Programme** with 60–80% discounted pricing, local-currency support, offline-first deployment, and local-language support — a deliberate equity play adjacent to Qure's global-health footprint but with SEWA's offline/edge architecture as the enabler **[D, SEWA vision]**.
- **UK/NHS-first regulatory path** — NHS Innovation Service (INN-2604-0064-2), DCB0129 complete, DPIA-001 complete, patent filed, IRAS 372596 in progress, DTAC Q4 2026, MHRA NoO Q3 2026–Q1 2027, UKCA Q2 2027. Shadow-trial → NIHR EME → certification is the evidence route being executed **[A, SEWA-AI-DOC-01; trust pack]**.

### 7.3 Why the difference matters (class D/E)

- **For patients:** conditions where minutes matter (ICH, LVO, PE, pneumothorax, aortic dissection) benefit from a system that knows when it doesn't know, escalates, and never silently discards a critical case — and that keeps working during outages.
- **For trusts:** a non-bypassable sign-off guarantee and a DCB0129-complete safety file de-risk clinical governance; transparent pricing and offline continuity simplify procurement and operations.
- **For the health system:** a UK-sovereign, zero-PHI-egress architecture aligns with NHS data-governance expectations at a time when trust in large-scale data partnerships is contested.

---

## 8. Honest Boundary: What SEWA Is NOT Claiming

To preserve credibility with regulators, clinicians and reviewers, SEWA explicitly does **not** claim:

- **No clinical validation yet.** All performance figures (e.g., internal AUC-ROC 0.961 overall, n=14,200; metacognition catch rate 96.3%, n=500; condition-level sensitivity/specificity/κ) are **internal engineering tests** against internally-curated datasets and are **not independent clinical evidence** **[B, SEWA-AI-DOC-12; trust pack §6]**.
- **No regulatory mark yet.** No UKCA, CE, or FDA authorisation exists. TRL 5. **[A, SEWA-AI-DOC-01]**.
- **No NHS production deployment yet.** Four shadow-trial proposals are with NHS Trusts; none has commenced **[A, trust pack]**.
- **No claims for future modules.** Pathology, mammography, retinal are roadmap-only; they carry no current performance, safety, or regulatory claims and are excluded from the current submission **[A, SEWA-AI-DOC-09]**.
- **Not an autonomous diagnostic device.** Intended use is decision-support triage/prioritisation with mandatory human sign-off; autonomous diagnosis is explicitly out of scope **[A, SEWA-AI-DOC-01]**.

The internal engineering figures in the trust pack are the *basis for designing the clinical investigation*, not its result. The shadow trial (prospective observational service evaluation; 6 months; primary endpoint door-to-alert <5 min for CRITICAL findings; 90% power for 15% improvement at α=0.05) is the designed path to real evidence **[A, trust pack §6]**.

---

## 9. Strategic Positioning & Recommendations

### 9.1 Recommended positioning statement (class D)

> **"SEWA AI is the trust-first clinical imaging platform: it doesn't just detect — it knows when it doesn't know, refuses to silently discard, enforces human sign-off that cannot be bypassed, and keeps working when the network fails. It competes on architectural safety, not finding count."**

### 9.2 Strategic recommendations

1. **Race to evidence, not to finding-count.** The differentiators above mean nothing to the NHS without independent validation. Priority is the shadow-trial → NIHR EME → UKCA sequence. Brainomix's Lancet study and DeepHealth's Nature Cancer GEMINI study define the evidence bar and are the templates to cite.
2. **Publish the safety architecture.** Turn the metacognition gate, uncertainty decomposition, and DB-layer sign-off into peer-reviewed publications and an open technical white paper. No competitor has published this; it is the single most defensible differentiation.
3. **Lead with the "trustworthy AI shortage" narrative** in every NHS/NIHR conversation — it reframes the market from "another detection AI" to "the answer to why adoption fails."
4. **Use the comparative evidence strategically but honestly.** The capability matrix (Section 6) is powerful precisely because it is conservative: mark competitor "No published evidence" as absence-of-evidence, not absence-of-capability.
5. **Leverage the Brainomix/DG57 asymmetry.** NICE has already judged stroke decision-support AI "insufficient evidence" for routine use while Brainomix achieved national rollout — showing that pathway-level evidence wins. SEWA should design its evidence package to satisfy NICE EVA-style scrutiny from day one.
6. **For future modules (pathology/mammography/retinal):** learn from Paige/Tempus (standalone pathology commercialisation is hard — plan platform/partnership strategy), DeepHealth/Kheiron (NIHR-funded prospective NHS evidence wins), and the NEL DESP ARIAS evaluation (population-scale equity benchmarks will be required).
7. **Maintain the non-deception governance** (DOC-09 statement) as a differentiator in itself: in a market where overclaiming is endemic, explicit non-claims are a trust asset.

---

## 10. Risks & Mitigation

| Risk | Assessment | Mitigation |
|---|---|---|
| Incumbent scale (Harrison.ai >1,000 sites) | High competitive pressure in CXR/CTB | Differentiate on safety architecture + NHS-first evidence; avoid head-to-head finding-count marketing |
| No regulatory/clinical evidence yet | Highest material gap | Execute shadow trial + NIHR EME + UKCA roadmap; align with MHRA AI framework trajectory |
| NICE EVA evidence bar | High bar for routine adoption | Design evidence to EVA-style standards; cite DG57 precedent |
| Pathology/module commercialisation | Paige/Tempus exit shows standalone difficulty | Partnership/platform strategy for future modules |
| Autonomous-AI liability precedent | Manufacturer liability for missed diagnoses (US) | Conservative decision-support + mandatory sign-off positioning |
| Procurement timelines | G-Cloud/DTAC are slow gates | DTAC Q4 2026 target; G-Cloud 14 listing; pilot-to-production pathway |
| Cloud-outage dependency across industry | Patient-safety risk | Offline INT8 edge + GSM/SMS continuity (unique differentiator) |

---

## 11. Conclusion

The clinical imaging AI market is crowded, well-funded, and increasingly evidenced — but it is crowded with **detection tools**, not **trust architectures**. The incumbents that have won at scale (Harrison.ai, Brainomix, DeepHealth/Kheiron, Viz.ai) won on breadth, workflow integration, or path-specific evidence. None has publicly delivered the combination of uncertainty decomposition, a pre-dispatch hallucination gate, non-bypassable human sign-off, and offline continuity that SEWA is architected around.

SEWA's differentiation is real, defensible, and aligned with the documented reasons NHS AI adoption stalls. Its challenge is not identity — it is proof. The report recommends doubling down on the evidence pathway (shadow trial → NIHR EME → UKCA Class IIb) and publishing the safety architecture as peer-reviewed science, while using conservative, evidence-classified comparisons in every evaluation conversation.

---

## 12. References & Sources

Primary sources are cited at point of use. Consolidated list (accessed Aug 2026):

1. SEWA AI Regulatory Strategy & Conformity Assessment — SEWA-AI-DOC-01 (July 2026). [SEWA clinical dossier]
2. SEWA AI Clinical Investigation Plan — SEWA-AI-DOC-02; Statistical Analysis Plan — SEWA-AI-DOC-03.
3. SEWA AI Future Services Pipeline — SEWA-AI-DOC-09 (July 2026). [SEWA clinical dossier]
4. SEWA AI Internal Engineering Verification (Annex 12) — SEWA-AI-DOC-12. [SEWA clinical dossier]
5. SEWA AI Evidence Index — SEWA-AI-DOC-13. [SEWA clinical dossier]
6. SEWA AI NHS Trust Pack v2.0/2.1 (11 July 2026). [SEWA]
7. SEWA AI Enterprise v2.0 Vision. [SEWA]
8. Harrison.ai — corporate site and Series C press release (Feb 2025); MobiHealthNews (10 Feb 2025); FundedIQ; cybernewscentre (4 Nov 2025). https://harrison.ai/
9. Annalise Enterprise CXR — RCR AI Registry (updated 27 Feb 2024); Microsoft Marketplace listing. https://www.rcr.ac.uk/our-services/artificial-intelligence-ai/ai-registry/annalise-enterprise-cxr/
10. Aidoc — FDA Breakthrough Device Designation coverage (Oct 2025); healthcareaiinsights.com.
11. Qure.ai qXR-Detect — FDA 510(k) clearance coverage (26 Feb 2026); 510k database.
12. Viz.ai — LVO ContaCT FDA K223042; industry/analyst reporting on ~2,000 hospitals and 2025 profitability.
13. Brainomix — Nagaratnam et al., "AI imaging decision support for acute stroke treatment in England: a prospective observational study," The Lancet Digital Health (2 Dec 2025). https://doi.org/10.1016/j.landig.2025.100927 ; NHS England news (2 Dec 2025); MassDevice (24 Feb 2026).
14. Lunit — INSIGHT Risk 510(k) submission coverage (Dec 2025); corporate site.
15. DeepHealth/Kheiron — de Vries et al., GEMINI study, Nature Cancer (10 Mar 2026). https://doi.org/10.1038/s43018-026-01126-1 ; University of Aberdeen news (10 Mar 2026); Microsoft UK case study (Apr 2024).
16. Paige/Tempus/PathAI/Artera — healthcareaiinsights.com "Paige AI, Tempus Digital Pathology, and PathAI" (Jun 2026); paige.ai press (Apr 2025); pathai.com press (30 Jun 2025, 9 Dec 2025); ITN (6 May 2026); FDA 510(k) K241273, K243391.
17. Retinal AI — FDA De Novo IDx-DR (Apr 2018); AAO (2020); PMC "Autonomous AI in DR Testing" (2025); Rudnicka et al., Lancet Digital Health (2025) 7(11):100914; Retinal Physician (1 May 2026); Healio (9 Jul 2026).
18. RCR — "AI Deployment in the NHS: reviewing progress made" (2025); RCR AI Registry; RCR 2023 census (54% AI use).
19. NICE — EVA HTE20 (fracture, Jan 2025), HTE24 (skin lesion), MTG32 (CCTA), DG57 (stroke, insufficient evidence). https://www.nice.org.uk/
20. MHRA — AI Airlock (2024–2025); Software and AI as a Medical Device Change Programme; 22 July 2025 international-reliance/UKCA reform package; DMHT guidance (Feb 2025). https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency
21. NHS England — AI Lab, AI in Health and Care Award (£123M), AI Diagnostic Fund, DTAC, DCB0129/DCB0160. https://transform.england.nhs.uk/
22. 510(k) database and FDA AI/ML device lists (accessed Aug 2026). https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-and-machine-learning-aiml-enabled-medical-devices

---

## 13. Appendices

### Appendix A — Evidence Classification Summary

| Class | Definition | Used for |
|---|---|---|
| A | Verified public fact (primary source) | Company facts, regulatory status, funding, dates |
| B | SEWA internal engineering result (non-clinical) | Performance figures from Annex 12 / trust pack §6 |
| C | SEWA claim not yet independently validated | Safety-architecture guarantees |
| D | Management assertion / strategy | Positioning, pricing strategy, go-to-market |
| E | SEWA analysis of competitor positioning | Capability matrix, positioning reads |
| F | External evidence (studies, guidelines, reports) | NHS landscape, regulatory context, competitor clinical evidence |

### Appendix B — Source Dataset

A structured CSV companion dataset (competitor / claim / evidence class / source / date / URL) accompanies this report for traceability. [Reference: SEWA_AI_Competitive_Landscape_Source_Data.csv]

### Appendix C — How to Use This Report

- **For NIHR/HRC reviewers:** Section 3 (problem), Section 7 (differentiation), Section 8 (honest boundary).
- **For NHS Trust R&D/Radiology:** Sections 4–7 and Section 10.
- **For investors:** Sections 5, 6, 9, 10.
- **For the SEWA team:** Section 9 recommendations and Section 11 conclusion.

© 2026 SEWA AI — a Storegrill Inc Ltd company · No. 14581073 · INN-2604-0064-2 · GB2609706.3 · info@sewaxai.health