NIHR HealthTech Research Centre Innovation Assessment Form
COMPREHENSIVE REVIEW & GAP ANALYSIS
Storegrill Inc Ltd (SEWA AI) · July 2026

=== EXECUTIVE SUMMARY ===

The form is well-structured, appropriately cautious for TRL 5, and demonstrates mature 
understanding of NHS pathways and regulatory requirements. However, there are significant 
gaps between this draft and the Master Dossier v2.0 that need reconciliation before 
submission. The form undersells SEWA AI's achievements and differentiators.

GRADE: B / Good — can become A- / Strong with targeted revisions

=== CRITICAL GAPS (Must Fix Before Submission) ===

1. INCOMPLETE FIELDS (Page 3)
   - All "Click or tap here to enter" fields must be completed
   - Company Address: 18 Hampshire Close, Binley, Coventry, CV3 2FP
   - Primary Contact: Dolapo Ariyo, Founder & CEO, info@sewaxai.health
   - Company Size: [Insert current headcount]
   - Funding: Seed £650K; seeking collaborative grant applications (NIHR EME Q1 2027)

2. QUESTION 7 — EVIDENCE (Page 8)
   CURRENT: No quantitative data provided
   RECOMMENDED: Add brief quantitative summary WITH disclaimer:

   "Internal engineering testing (n=14,200 across 6 conditions) has generated 
   the following metrics, which should not be interpreted as independent clinical 
   validation:
   - Overall AUC-ROC: 0.961
   - ICH (CT Head): 0.972 (n=2,847)
   - PE (CT Chest): 0.961 (n=1,203)
   - LVO Stroke (CT Angio): 0.958 (n=1,640)
   - Pneumothorax (X-ray): 0.979 (n=889)
   - TB Africa (X-ray): 0.944 (n=3,201)
   - Pneumonia (X-ray): 0.953 (n=2,180)

   The Nine-Layer Metacognition Gate (patent GB2609706.3) achieved a 96.3% 
   hallucination catch rate on an expert-annotated test set (n=500, 3-radiologist 
   consensus, blinded). Expected Calibration Error (ECE): 0.042.

   Independent NHS clinical validation is the immediate next step."

3. QUESTION 8 — REGULATORY PLAN (Page 9)
   CURRENT: Mentions IRAS but no specifics
   RECOMMENDED: Add achieved milestones:

   "Already achieved:
   - NHS Innovation Service: Active (INN-2604-0064-2)
   - DCB0129 Clinical Safety: Complete (SMP-001 + CRM-001)
   - UKIPO Patent: Filed (GB2609706.3, April 2026, sole inventor)
   - IRAS Application: In progress (Project ID 372596, Data-Only Framework)
   - HRA Engagement: Active (Assessor: Syeda Thorpe, May 2026)

   In preparation:
   - MHRA Notice of No Objection (Q3 2026–Q1 2027)
   - DTAC Assessment (Q4 2026 target)
   - UKCA Class IIb (Q2 2027)"

=== HIGH-PRIORITY GAPS (Strengthens Submission Significantly) ===

4. QUESTION 10 — SCALE (Page 11)
   CURRENT: "tens of millions of imaging examinations"
   RECOMMENDED: Use specific dossier data:
   "NHS England processes approximately 7.4 million imaging studies annually across 
   300 NHS Trusts. The Royal College of Radiologists reports 1,939 unfilled consultant 
   radiologist posts (29% vacancy rate), with over 1.5 million reports backlogged."

5. QUESTION 11 — IMPACT (Pages 11-12)
   CURRENT: Generic statements
   RECOMMENDED: Add shadow trial design:
   "A prospective observational shadow trial is planned across 4 NHS Acute Trusts 
   (UHCW, King's College Hospital, UHB, QBM — proposals submitted) with:
   - Primary endpoint: Door-to-alert time <5 minutes for CRITICAL findings
   - Secondary endpoints: Sensitivity, specificity, PPV, NPV, radiologist agreement (κ)
   - Statistical power: 90% to detect 15% improvement at α=0.05"

6. QUESTION 12 — ENVIRONMENTAL SUSTAINABILITY (Page 12)
   CURRENT: Generic "digital-first" and "reducing paper"
   RECOMMENDED: Add quantified claims:
   "Environmental sustainability is embedded in the platform design:
   - Offline edge deployment eliminates patient transport: 9.5 tCO2e saved per 
     African clinic per year (transport eliminated)
   - Cloud-native architecture: 38.9 tCO2e per 10,000 scans (efficient Azure UK South)
   - INT8 quantisation reduces compute energy by 77% vs. FP32
   - Modular platform reduces need for multiple standalone AI systems"

7. QUESTION 13 — HEALTH INEQUALITIES (Page 13)
   CURRENT: Generic AI bias discussion
   RECOMMENDED: Add specific equity architecture:
   "SEWA AI addresses health inequalities through:
   - Africa Programme: 60–80% reduced cost for LMIC deployment
   - Offline edge: INT8 model on 4-core CPU, <£500 hardware, no internet required
   - GSM SMS alerts: 2G compatible, works on weakest signal
   - 8-language VLM support: English, Yoruba, Hausa, Igbo, Swahili, Amharic, Zulu, Arabic
   - Subgroup analysis: Age, sex, ethnicity, modality, scanner type monitored
   - SOP-AI-005: Equity audit standard operating procedure"

8. QUESTION 14 — IMPLEMENTATION (Pages 14-15)
   CURRENT: Generic phased approach
   RECOMMENDED: Add specific details:
   "Phase 1 (Current): Shadow trial proposals submitted to 4 NHS Acute Trusts 
   (UHCW, King's College Hospital, UHB, QBM). Chief Investigator actively being 
   recruited from NHS/university-employed Consultant Radiologist.

   Phase 2: WMSDE (West Midlands Secure Data Environment) access request in 
   progress (IRAS 372596) for retrospective multi-site validation.

   Phase 3: NIHR EME grant application (Q1 2027) for prospective clinical 
   effectiveness study."

9. QUESTION 15 — IT REQUIREMENTS (Page 16)
   CURRENT: Generic cloud/on-premises
   RECOMMENDED: Add deployment modes:
   "SEWA AI supports three deployment modes from a single codebase:
   1. Cloud: Azure UK South, AKS GPU, zero PHI egress (signed ZED-001)
   2. Edge: On-premise, INT8 quantised (~18MB), 4-core CPU, no GPU/internet
   3. SMS: GSM modem, Africa's Talking API, 2G compatible

   All modes share the same Four-Engine safety architecture."

10. QUESTION 17 — 5-YEAR VISION (Page 18)
    CURRENT: Generic expansion plan
    RECOMMENDED: Add financial ambition:
    "5-year commercial targets:
    - Year 3 (2028): EBITDA positive, 22 NHS trusts, 40 African clinics
    - Year 5 (2030): £12.4M ARR base, 55 NHS trusts, 80 African clinics
    - Funding: Series A £5–8M (Q1 2027), Series B £15–25M (Q4 2028)
    - Regulatory: UKCA Class IIb (Q2 2027), EU MDR CE Mark (Q1 2028), 
      FDA 510(k) (2028–2029)"

11. QUESTION 18 — MILESTONES (Pages 19-20)
    CURRENT: Good structure but missing dates
    RECOMMENDED: Add timeline:
    "Immediate (Q3 2026): Confirm Chief Investigator, commence shadow trial
    Q4 2026: DTAC assessment submission, G-Cloud 14 listing
    Q1 2027: NIHR EME application, Series A close
    Q2 2027: UKCA Class IIb certification
    Q1 2028: EU MDR CE Mark live"

12. QUESTION 19 — PPIE (Page 20)
    CURRENT: "formal PPIE activities are yet to commence"
    RECOMMENDED: Add concrete plan:
    "PPIE Strategy (planned):
    - Q3 2026: Establish PPIE advisory group with patient representatives
    - Q4 2026: Patient focus groups on AI acceptability in diagnostic imaging
    - Q1 2027: Co-design patient information materials for shadow trial
    - Q2 2027: Patient surveys on trust, transparency, and explainability
    - Ongoing: Engagement with [named patient organisations — e.g., Stroke 
      Association, British Lung Foundation]"

13. QUESTION 21 — CURRENT PARTNERSHIPS (Page 22)
    CURRENT: Mentions NHS Innovation Service and MedConnect
    RECOMMENDED: Add:
    "Academic engagement: Discussions ongoing with [named universities] for 
    statistical co-applicant and Chief Investigator support.

    NHS Trust engagement: Shadow trial proposals submitted to UHCW, King's 
    College Hospital, UHB, and QBM."

14. QUESTION 23 — SUPPORT REQUEST (Page 24)
    CURRENT: Excellent comprehensive list
    RECOMMENDED: Add specificity:
    "Timeline for support: Immediate (Q3 2026) through Q2 2027
    Funding ask: In-kind support for CI identification, study design, and 
    regulatory navigation. Potential co-application for NIHR EME (Q1 2027)."

=== POSITIVE STRENGTHS TO PRESERVE ===

1. Appropriate caution language ("intended to", "subject to", "following validation")
2. Strong regulatory awareness (ISO 13485, 14971, IEC 62304, 62366-1, DCB0129)
3. Clear NHS workflow integration (PACS/RIS/DICOM, minimal disruption)
4. Modular architecture vision (Pathology → Mammography → Retinal AI)
5. Excellent Question 23 support request

=== REVISION CHECKLIST ===

🔴 CRITICAL (Before submission):
□ Complete all blank fields on Page 3
□ Add quantitative evidence to Q7 (with disclaimer)
□ List achieved regulatory milestones in Q8

🟡 HIGH (Strengthens significantly):
□ Add environmental claims to Q12
□ Add equity/Africa Programme to Q13
□ Add concrete PPIE plan to Q19
□ Add financial milestones to Q17-Q18
□ Name NHS Trusts in Q14
□ Name academic partners in Q21

🟢 MEDIUM (Nice to have):
□ Mention SUS score in Q16
□ Expand deployment modes in Q15
□ Add specific funding ask to Q23
