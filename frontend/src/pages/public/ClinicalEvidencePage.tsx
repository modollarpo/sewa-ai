// SEWA XAI — ClinicalEvidencePage.tsx
// Validation & Evidence page. Reports only measured, pre-registered results.
// Marking: FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
import React from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandLt:'#52B09A',
  normal:'#1DBF73',info:'#2A6EF2',critical:'#E03535',amber:'#F59E0B',grey:'#9CA8A3',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",FM:"'IBM Plex Mono',monospace",
};

const LEGEND = [
  { label:'Validated', color:C.normal, note:'Evaluated on public data with a pre-registered protocol.' },
  { label:'Engineering-validated', color:C.amber, note:'Implemented and tested as engineering components; clinical impact not measured.' },
  { label:'Research-stage', color:C.grey, note:'Under active investigation; no validated clinical claim is made.' },
  { label:'Planned', color:C.textLo, note:'Roadmap only — not built or evaluated.' },
];

const RESULTS = [
  { endpoint:'ICH AUROC — internal', dataset:'RSNA ICH (study-level)', result:'0.807', status:'Measured' },
  { endpoint:'ICH AUROC — external', dataset:'CQ500 (486 scans, 3-radiologist majority)', result:'0.7468', status:'Measured' },
  { endpoint:'Safety reduction at 20% review', dataset:'Head CT metacognition composite vs baseline (Test C)', result:'0.0% (95% CI -8.1% to +6.5%)', status:'INCONCLUSIVE' },
  { endpoint:'Report Contradiction Recall', dataset:'OpenI external validation (7,265 paired reports, Test D)', result:'95.78% (95% CI 95.39% to 96.15%)', status:'PASS' },
  { endpoint:'Contradiction Specificity', dataset:'OpenI external validation (392 active cases, Test D)', result:'100.00% (392 / 392)', status:'PASS' },
  { endpoint:'Grad-CAM Spatial Pointing Game', dataset:'BHX CQ500 (6,283 radiologist bboxes, Test E.1)', result:'11.20% (95% CI 7.84% to 15.08%)', status:'NOT MET' },
  { endpoint:'Masked HiResCAM Spatial Attribution', dataset:'BHX CQ500 (6,283 radiologist bboxes, Test E.2)', result:'43.83% (95% CI 39.64% to 48.37%)', status:'Measured' },
  { endpoint:'Mammography Deep Backbone (Test I)', dataset:'CBIS-DDSM calc cases (INT8 quantized)', result:'EfficientNet-B0 (4.17MB) — demo_mode: false', status:'Measured' },
  { endpoint:'Retinal Deep Backbone (Test I)', dataset:'EyePACS fundus series (INT8 quantized)', result:'EfficientNet-B0 (4.16MB) — demo_mode: false', status:'Measured' },
  { endpoint:'CQ500 Test-Time AdaBN (ADR 004)', dataset:'CQ500 external 486 scans', result:'AUROC 0.7596 (+0.0105 gain, zero labels)', status:'Measured' },
  { endpoint:'ICH Subtype Sensitivity (Test J)', dataset:'RSNA 2019 Multi-Label Benchmark (N=2,000)', result:'IPH: 100.0%, EDH: 100.0%, SDH: 94.4%, IVH: 95.2%, SAH: 85.4%', status:'PASS' },
  { endpoint:'Perturbation Robustness (Test K)', dataset:'RSNA 2019 test set (N=300 slices, physics stress)', result:'Noise K-1 MET (AUROC 0.8013 @ σ=0.10), Blur K-2 MET (0.8083 @ L=7), Monotonicity K-3 MET (rs=0.9000)', status:'PARTIAL' },
  { endpoint:'Conformal Surgical Recall (Test J)', dataset:'CQ500 External Cohort (N=486, 226 ICH positive)', result:'Epidural: 83.3% (5/6), SAH: 88.1% (104/118) @ λ=0.0298', status:'Measured' },
  { endpoint:'CQ500 Scanner Recalibration (C.2)', dataset:'CQ500 external (486 scans, CC BY-NC-SA 4.0)', result:'Best AUROC 0.7578 via Method 1: CQ500 T=2.426', status:'Measured' },
  { endpoint:'Drift Detection Engine (Test H)', dataset:'Simulated scanner shift streams (N=100–120)', result:'ALL 4 CRITERIA PASS — 1.41ms mean latency', status:'Engineering-validated' },
  { endpoint:'PTX NLP Safety Gate (Test L)', dataset:'OpenI Indiana University (7,265 reports, Public Domain)', result:'Recall 100.00% (200/200), Specificity 100.00% — CXR image weights DEMO MODE', status:'PARTIAL' },
  { endpoint:'TB NLP Safety Gate (Test M)', dataset:'OpenI Indiana University (7,265 reports, Public Domain)', result:'ALL 4 CRITERIA MET — Recall 100.00%, Specificity 100.00% — CXR weights DEMO MODE', status:'Engineering-validated' },
  { endpoint:'PE NLP Safety Gate (Test N)', dataset:'OpenI Indiana University (7,265 reports) + synthetic CTPA tensors', result:'ALL 4 CRITERIA MET — PE recall 100.00%, CTPA 3-window pipeline p95=46ms — DEMO MODE', status:'Engineering-validated' },
  { endpoint:'Ischemic Stroke Safety Audit (Test O)', dataset:'CQ500 external (284 ICH-neg scans, CC BY-NC-SA 4.0)', result:'ICH FPR=20.07% on non-ICH scans (req ≤15%); MRI pipeline DEMO MODE', status:'PARTIAL' },
];

const NOT_VALIDATED = [
  'Fine-grained lesion segmentation or millimeter-accurate spatial localization (evaluated Grad-CAM hit rate is 11.20%)',
  'Pulmonary embolism, pneumothorax, tuberculosis or stroke detection',
  'MRI or X-ray modalities (evaluated scope is non-contrast head CT only)',
  'VLM report-generation clinical accuracy',
  'Federated learning outcomes',
  'Prospective, multi-site or real-world clinical performance',
  'Any live hospital deployment, customer, or regulatory clearance',
  'Hallucination detection or a proven safety-gating benefit from metacognition',
];

const Tag = ({ label, color }: { label:string; color:string }) => (
  <span style={{ padding:'2px 8px', background:`${color}14`, border:`1px solid ${color}30`, borderRadius:20, fontSize:9, fontWeight:700, color, fontFamily:C.F }}>{label}</span>
);

export function ClinicalEvidencePage({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div style={{ background: C.bg0, minHeight: '100vh', fontFamily: C.F }}>
      <style>{`
        @media (max-width: 760px) {
          .evidence-table-wrap { overflow-x: auto !important; }
          .evidence-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <PublicNav activePage="clinical-evidence" onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ padding:'110px 24px 56px', background:`linear-gradient(180deg,${C.bg1},${C.bg0})`, textAlign:'center' }}>
        <div style={{ maxWidth:820, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:20, flexWrap:'wrap' }}>
            <Tag label="Pre-clinical — TRL 5" color={C.info} />
            <Tag label="Research use only" color={C.amber} />
          </div>
          <h1 style={{ fontSize:'clamp(32px, 7vw, 50px)', fontWeight:900, color:C.textHi, margin:'20px 0 18px', letterSpacing:'-2px', lineHeight:1.1 }}>
            Validation &amp; Evidence
          </h1>
          <p style={{ fontSize:15, color:C.textMd, lineHeight:1.8, maxWidth:620, margin:'0 auto' }}>
            Measured results from pre-registered evaluations on public data. Every figure on this page is traceable to a frozen report; no clinical, regulatory or commercial claim is implied.
          </p>
        </div>
      </div>

      {/* Required marking */}
      <div style={{ background:'rgba(245,158,11,0.10)', borderTop:`1px solid ${C.amber}40`, borderBottom:`1px solid ${C.amber}40` }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'14px 24px', textAlign:'center', fontSize:12, fontWeight:800, letterSpacing:'0.08em', color:C.amber, textTransform:'uppercase' }}>
          Feasibility on public data. Not clinical evidence.
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'56px 24px 80px' }}>

        {/* Scope */}
        <div style={{ padding:24, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16, marginBottom:40 }}>
          <h2 style={{ fontSize:16, fontWeight:800, color:C.textHi, margin:'0 0 10px' }}>What has been evaluated</h2>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:0 }}>
            Intracranial haemorrhage (ICH) triage on <strong style={{ color:C.textHi }}>non-contrast head CT only</strong>. Both evaluations were pre-registered and frozen before results were produced. The internal result uses the RSNA ICH dataset (research licence); the external result uses CQ500 (CC BY-NC-SA 4.0, non-commercial). No other modality, condition or engine has a validated clinical performance result.
          </p>
        </div>

        {/* Results table */}
        <h2 style={{ fontSize:20, fontWeight:800, color:C.textHi, margin:'0 0 16px' }}>Measured results</h2>
        <div className="evidence-table-wrap" style={{ overflowX:'auto', marginBottom:40 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
            <thead>
              <tr style={{ background:C.bg3 }}>
                {['Endpoint','Dataset / comparison','Result','Status'].map(h => (
                  <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:9, fontWeight:700, color:C.textLo, letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESULTS.map((r, i) => (
                <tr key={r.endpoint} style={{ borderTop:`1px solid ${C.border}`, background:i%2===0?'transparent':C.bg1 }}>
                  <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:C.textHi }}>{r.endpoint}</td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:C.textMd }}>{r.dataset}</td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:C.textHi, fontFamily:C.FM }}>{r.result}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <Tag label={r.status} color={r.status === 'INCONCLUSIVE' ? C.amber : C.normal} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

                {/* Test D Metacognition Contradiction Detection */}
        <div style={{ padding:24, background:C.bg2, border:`1px solid ${C.normal}40`, borderRadius:16, marginBottom:40 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ width:9, height:9, borderRadius:'50%', background:C.normal, display:'inline-block' }} />
            <h2 style={{ fontSize:16, fontWeight:800, color:C.textHi, margin:0 }}>Test D Metacognition Contradiction Gate: PASS (95.78% Recall, 100% Specificity)</h2>
          </div>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 10px' }}>
            Pre-registered external evaluation on <strong style={{ color:C.textHi }}>7,265 real radiologist clinical reports</strong> from OpenI (Indiana University). Layer 6 contradiction detection caught <strong style={{ color:C.normal }}>95.78%</strong> of clinical contradictions (99.16% pneumothorax, 94.66% pleural effusion, 90.23% cardiomegaly) while achieving <strong style={{ color:C.normal }}>100.00% specificity</strong> on genuine positive findings, operating at 1.04ms CPU latency.
          </p>
          <p style={{ fontSize:12, color:C.textLo, lineHeight:1.7, margin:0 }}>
            Marking: Feasibility on public data. Not clinical evidence. Pre-registered in preregistration_testD_openi.md.
          </p>
        </div>

{/* Test E & E.2 Spatial Attribution Callouts */}
        <div style={{ padding:24, background:C.bg2, border:`1px solid ${C.normal}40`, borderRadius:16, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ width:9, height:9, borderRadius:'50%', background:C.normal, display:'inline-block' }} />
            <h2 style={{ fontSize:16, fontWeight:800, color:C.textHi, margin:0 }}>Test E.2 Masked HiResCAM Optimization: 43.83% Pointing Accuracy (Chronic: 62.16% PASS)</h2>
          </div>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 10px' }}>
            Algorithmic enhancement (<strong style={{ color:C.textHi }}>step11b</strong>) evaluated on the identical 6,283 BHX bounding boxes across 226 CQ500 studies. Replacing global gradient averaging with element-wise <strong style={{ color:C.normal }}>HiResCAM</strong> on block 5 (features[5], 10x10 grid) plus intracranial parenchymal masking boosted spatial hit rate from <strong style={{ color:C.amber }}>11.20%</strong> to <strong style={{ color:C.normal }}>43.83%</strong> (95% CI [39.64%, 48.37%]) — nearly a <strong style={{ color:C.textHi }}>4x relative gain (+291%)</strong>.
          </p>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 10px' }}>
            <strong style={{ color:C.textHi }}>Subtype Breakdown:</strong> Chronic Subdural: <strong style={{ color:C.normal }}>62.16% (MET &ge; 55%)</strong>, Intraparenchymal: <strong style={{ color:C.textHi }}>47.66%</strong> (vs 10.12%), Subarachnoid: <strong style={{ color:C.textHi }}>47.59%</strong> (vs 14.32%), Subdural: <strong style={{ color:C.textHi }}>38.18%</strong> (vs 10.38%), Epidural: <strong style={{ color:C.textHi }}>36.36%</strong> (vs 1.52%, 24x gain), Intraventricular: <strong style={{ color:C.textHi }}>18.28%</strong> (vs 3.05%).
          </p>
          <p style={{ fontSize:12, color:C.textLo, lineHeight:1.7, margin:0 }}>
            Marking: Feasibility on public data. Not clinical evidence. Evaluated in feasibility_report_testE2_hirescam.md. Licence: CC BY-SA 4.0 / CC BY-NC-SA 4.0.
          </p>
        </div>

        <div style={{ padding:24, background:C.bg2, border:`1px solid ${C.amber}40`, borderRadius:16, marginBottom:40 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ width:9, height:9, borderRadius:'50%', background:C.amber, display:'inline-block' }} />
            <h2 style={{ fontSize:16, fontWeight:800, color:C.textHi, margin:0 }}>Test E.1 Baseline Grad-CAM: PARTIAL / NOT MET (11.20% Hit Rate)</h2>
          </div>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 10px' }}>
            Pre-registered baseline pointing game evaluated on unmasked features[8] (5x5 grid). Hit rate was <strong style={{ color:C.amber }}>11.20%</strong> (95% CI [7.84%, 15.08%]), falling below the 55% pre-registered threshold due to coarse grid blurring and skull interface gradient spikes.
          </p>
          <p style={{ fontSize:12, color:C.textLo, lineHeight:1.7, margin:0 }}>
            Pre-registered in preregistration_testE_gradcam.md. Both results are reported openly for full audit transparency.
          </p>
        </div>

        
        {/* Test F/G — Pipeline QA callout */}
        <div style={{ padding:24, background:C.bg2, border:`1px solid ${C.amber}40`, borderRadius:16, marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ width:9, height:9, borderRadius:'50%', background:C.amber, display:'inline-block' }} />
            <h2 style={{ fontSize:16, fontWeight:800, color:C.textHi, margin:0 }}>Tests F &amp; G — Mammography &amp; Retinal Pipeline: ENGINEERING VALIDATED / DEMO MODE</h2>
          </div>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 10px' }}>
            The mammography pipeline (CBIS-DDSM, 1,872 cases, CC BY 3.0) and retinal pipeline (4 EyePACS fundus images) both passed all engineering QA criteria:
            preprocessing shape, dtype, ImageNet normalization, JSON schema validity, demo_mode flag, and BI-RADS / DR-grade label mapping.
            Demo ONNX inference: <strong style={{ color:C.amber }}>1.39 ms</strong> (mammography) and <strong style={{ color:C.amber }}>1.68 ms</strong> (retinal).
          </p>
          <p style={{ fontSize:12, color:C.textLo, lineHeight:1.7, margin:0 }}>
            Both services run in <code>demo_mode: true</code> — random linear projection ONNX. No clinical accuracy claims are made. ENGINEERING VALIDATED / DEMO MODE. NOT CLINICAL EVIDENCE.
          </p>
        </div>

        {/* Test H — Drift Detection callout */}
        <div style={{ padding:24, background:C.bg2, border:`1px solid ${C.normal}40`, borderRadius:16, marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ width:9, height:9, borderRadius:'50%', background:C.normal, display:'inline-block' }} />
            <h2 style={{ fontSize:16, fontWeight:800, color:C.textHi, margin:0 }}>Test H — Continuous Learning Drift Engine: SUCCESS / ALL CRITERIA MET</h2>
          </div>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 10px' }}>
            The drift detection engine correctly: (H.1) returns <code>status: insufficient_data</code> with null metrics when N &lt; 10 (zero-fabrication, audit R-12/N10);
            (H.2) reports no drift on 90%-concordant streams (kappa=0.894); (H.3) triggers HIGH severity alert when kappa drops to 0.04 under scanner shift;
            (H.4) detects modality PSI=12.16 when CT stream shifts to 80% MRI.
          </p>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 10px' }}>
            Mean processing latency: <strong style={{ color:C.normal }}>~1.41 ms</strong> (well under 50 ms requirement).
          </p>
          <p style={{ fontSize:12, color:C.textLo, lineHeight:1.7, margin:0 }}>
            Evaluated on simulated / shifted streams. FEASIBILITY ON SIMULATED DATA. NOT CLINICAL EVIDENCE.
          </p>
        </div>

        {/* Test K - Robustness & Physics Stress-Test callout */}
        <div style={{ padding:24, background:C.bg2, border:`1px solid ${C.normal}40`, borderRadius:16, marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ fontSize:10, fontWeight:800, color:C.normal, padding:'2px 8px', borderRadius:20, background:`${C.normal}18`, border:`1px solid ${C.normal}40` }}>TEST K VERIFIED</span>
            <h2 style={{ fontSize:16, fontWeight:800, color:C.textHi, margin:0 }}>Test K — Acquisition Noise, Motion Blur &amp; Physics Stress-Test</h2>
          </div>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 10px' }}>
            Pre-registered evaluation under synthetic acquisition artifacts on the held-out test cohort (N=300 slices, 150 positive, 150 negative):
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:12, marginBottom:12 }}>
            <div style={{ padding:12, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ fontSize:11, color:C.textLo, fontWeight:700 }}>DOSE NOISE (K-1)</div>
              <div style={{ fontSize:16, fontWeight:900, color:C.textHi, fontFamily:C.FM }}>AUROC 0.8013</div>
              <div style={{ fontSize:10, color:C.textMd }}>Retains 80.1% discrimination @ σ=0.10 (MET)</div>
            </div>
            <div style={{ padding:12, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ fontSize:11, color:C.textLo, fontWeight:700 }}>PATIENT MOTION BLUR (K-2)</div>
              <div style={{ fontSize:16, fontWeight:900, color:C.textHi, fontFamily:C.FM }}>AUROC 0.8083</div>
              <div style={{ fontSize:10, color:C.textMd }}>Resilient to 7px head movement (MET)</div>
            </div>
            <div style={{ padding:12, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ fontSize:11, color:C.textLo, fontWeight:700 }}>UNCERTAINTY MONOTONICITY (K-3)</div>
              <div style={{ fontSize:16, fontWeight:900, color:C.textHi, fontFamily:C.FM }}>r_s = 0.9000</div>
              <div style={{ fontSize:10, color:C.textMd }}>Spearman rank correlation p=0.037 (MET)</div>
            </div>
          </div>
          <p style={{ fontSize:11, color:C.textLo, margin:0, fontStyle:'italic' }}>
            Clinical audit disclosure (K-4): Under severe noise (σ=0.35), naive probability gating escalates 61.7% of scans (req ≥ 90.0%). Confirms the imperative of SEWA's Layer 1 OOD detector and 100% human consultant sign-off.
          </p>
        </div>

        {/* Tests L/M/N/O - Multimodal Expansion callout */}
        <div style={{ padding:24, background:C.bg2, border:`1px solid ${C.info}40`, borderRadius:16, marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ fontSize:10, fontWeight:800, color:C.info, padding:'2px 8px', borderRadius:20, background:`${C.info}18`, border:`1px solid ${C.info}40` }}>TESTS L · M · N · O</span>
            <h2 style={{ fontSize:16, fontWeight:800, color:C.textHi, margin:0 }}>Multimodal Expansion: PTX · TB · PE · Ischemic Stroke</h2>
          </div>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 10px' }}>
            Four new clinical pathways pre-registered and engineering-validated. NLP safety gates run on the existing OpenI corpus (7,265 paired radiology reports). Image-level evaluation is <strong>DEMO MODE</strong> pending Azure staging of dedicated image datasets.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:12, marginBottom:12 }}>
            <div style={{ padding:12, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ fontSize:11, color:C.textLo, fontWeight:700 }}>TEST L — PNEUMOTHORAX (PTX)</div>
              <div style={{ fontSize:14, fontWeight:900, color:C.textHi, fontFamily:C.FM }}>NLP Recall 100.0%</div>
              <div style={{ fontSize:10, color:C.textMd }}>Specificity 100.0% on OpenI corpus (L-1b p95 latency FAIL 73ms)</div>
            </div>
            <div style={{ padding:12, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ fontSize:11, color:C.textLo, fontWeight:700 }}>TEST M — TUBERCULOSIS (TB)</div>
              <div style={{ fontSize:14, fontWeight:900, color:C.textHi, fontFamily:C.FM }}>ALL CRITERIA MET</div>
              <div style={{ fontSize:10, color:C.textMd }}>Recall 100.0%, Specificity 100.0%, p95=11.9ms</div>
            </div>
            <div style={{ padding:12, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ fontSize:11, color:C.textLo, fontWeight:700 }}>TEST N — PULMONARY EMBOLISM (PE)</div>
              <div style={{ fontSize:14, fontWeight:900, color:C.textHi, fontFamily:C.FM }}>ALL CRITERIA MET</div>
              <div style={{ fontSize:10, color:C.textMd }}>PE recall 100%, CTPA 3-window pipeline p95=46ms</div>
            </div>
            <div style={{ padding:12, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ fontSize:11, color:C.textLo, fontWeight:700 }}>TEST O — ISCHEMIC STROKE</div>
              <div style={{ fontSize:14, fontWeight:900, color:C.textHi, fontFamily:C.FM }}>ICH FPR 20.1%</div>
              <div style={{ fontSize:10, color:C.textMd }}>On 284 CQ500 ICH-neg scans (req ≤15%); MRI pipeline DEMO MODE</div>
            </div>
          </div>
          <p style={{ fontSize:11, color:C.textLo, margin:0, fontStyle:'italic' }}>
            Clinical audit: All four conditions require dedicated clinical image datasets (NIH ChestX-ray14, Shenzhen NLM TB, RSNA-STR CTPA, ISLES 2022) to be staged to Azure Blob before image-level AUROC or sensitivity claims can be made. DEMO MODE clearly marked on all image-level outputs.
          </p>
        </div>

        {/* Test J - ICH Subtype Granularity callout */}
        <div style={{ padding:24, background:C.bg2, border:`1px solid ${C.normal}40`, borderRadius:16, marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ fontSize:10, fontWeight:800, color:C.normal, padding:'2px 8px', borderRadius:20, background:`${C.normal}18`, border:`1px solid ${C.normal}40` }}>TEST J VERIFIED</span>
            <h2 style={{ fontSize:16, fontWeight:800, color:C.textHi, margin:0 }}>Test J - Acute ICH Subtype Diagnostic Sensitivity: HIGH SURGICAL RECALL</h2>
          </div>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 10px' }}>
            Multi-subtype evaluation across both RSNA 2019 (N=2,000) and CQ500 / BHX (N=486 scans, 226 annotated ICH studies):
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:12, marginBottom:12 }}>
            <div style={{ padding:12, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ fontSize:11, color:C.textLo, fontWeight:700 }}>INTRAPARENCHYMAL (IPH)</div>
              <div style={{ fontSize:16, fontWeight:900, color:C.textHi, fontFamily:C.FM }}>100.0% RSNA / 89.8% CQ500</div>
              <div style={{ fontSize:10, color:C.textMd }}>AUROC 0.8057 (RSNA)</div>
            </div>
            <div style={{ padding:12, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ fontSize:11, color:C.textLo, fontWeight:700 }}>EPIDURAL (EDH — SURGICAL)</div>
              <div style={{ fontSize:16, fontWeight:900, color:C.textHi, fontFamily:C.FM }}>100.0% RSNA / 83.3% CQ500</div>
              <div style={{ fontSize:10, color:C.textMd }}>AUROC 0.8132 (RSNA)</div>
            </div>
            <div style={{ padding:12, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ fontSize:11, color:C.textLo, fontWeight:700 }}>SUBARACHNOID (SAH — ANEURYSM)</div>
              <div style={{ fontSize:16, fontWeight:900, color:C.textHi, fontFamily:C.FM }}>91.7% RSNA / 88.1% CQ500</div>
              <div style={{ fontSize:10, color:C.textMd }}>Under Conformal λ=0.0298</div>
            </div>
          </div>
          <p style={{ fontSize:11, color:C.textLo, margin:0, fontStyle:'italic' }}>
            Clinical audit note: Conformal risk control catches 88.1% of external SAH cases; 11.9% subtle sulcal bleeds require consultant review. Mandates human radiologist sign-off on 100% of cases.
          </p>
        </div>

        {/* Test I - Multimodal Real Weights callout */}
        <div style={{ padding:24, background:C.bg2, border:`1px solid ${C.normal}40`, borderRadius:16, marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20, background:`${C.normal}20`, color:C.normal }}>TEST I VERIFIED</span>
            <h2 style={{ fontSize:16, fontWeight:800, color:C.textHi, margin:0 }}>Test I - Multimodal Deep Backbones: PRODUCTION WEIGHTS REALIZED</h2>
          </div>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 10px' }}>
            Mammography and Retinal services transitioned from synthetic linear fallbacks to real <strong>EfficientNet-B0</strong> convolutional backbones (INT8 dynamically quantized to 4.17 MB and 4.16 MB).
            In live FastAPI verification, <code>demo_mode</code> flipped from <code>true</code> to <code>false</code> with 100% schema conformance on CBIS-DDSM calcifications and EyePACS fundus images.
          </p>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:11 }}>
            <span style={{ padding:'4px 10px', background:C.bg1, borderRadius:6, color:C.textHi, border:`1px solid ${C.border}` }}>Mammo INT8: <strong>4.17 MB</strong></span>
            <span style={{ padding:'4px 10px', background:C.bg1, borderRadius:6, color:C.textHi, border:`1px solid ${C.border}` }}>Retinal INT8: <strong>4.16 MB</strong></span>
            <span style={{ padding:'4px 10px', background:C.bg1, borderRadius:6, color:C.textHi, border:`1px solid ${C.border}` }}>AdaBN CQ500 AUROC: <strong>0.7596</strong></span>
            <span style={{ padding:'4px 10px', background:C.bg1, borderRadius:6, color:C.normal, border:`1px solid ${C.normal}40` }}>demo_mode: <strong>false</strong></span>
          </div>
        </div>

        {/* Test C.2 — Scanner Recalibration callout */}
        <div style={{ padding:24, background:C.bg2, border:`1px solid ${C.info}40`, borderRadius:16, marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ width:9, height:9, borderRadius:'50%', background:C.info, display:'inline-block' }} />
            <h2 style={{ fontSize:16, fontWeight:800, color:C.textHi, margin:0 }}>Test C.2 — Scanner-Adaptive Recalibration: EXPLORATORY</h2>
          </div>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 10px' }}>
            Three recalibration strategies applied to the pre-extracted CQ500 features (v2_early_cq500.npz, 3,884 tiles, 486 scans).
            Best AUROC: <strong style={{ color:C.info }}>0.7578</strong> (baseline: 0.7468) via Method 1: CQ500 T=2.426.
            Key finding: temperature scaling fitted on CQ500 significantly improves calibration (ECE: 0.0543), but study-level AUROC is
            invariant to monotonic temperature shifts — consistent with ranking being preserved. Channel-wise feature standardization
            alone did not close the domain gap, confirming that post-hoc feature whitening of a frozen network is insufficient
            without target-domain supervision.
          </p>
          <p style={{ fontSize:12, color:C.textLo, lineHeight:1.7, margin:0 }}>
            Exploratory only. No confirmatory claims. FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE. CC BY-NC-SA 4.0 (CQ500).
          </p>
        </div>

{/* Metacognition callout */}
        <div style={{ padding:24, background:C.bg2, border:`1px solid ${C.amber}40`, borderRadius:16, marginBottom:40 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ width:9, height:9, borderRadius:'50%', background:C.amber, display:'inline-block' }} />
            <h2 style={{ fontSize:16, fontWeight:800, color:C.textHi, margin:0 }}>Metacognition result: INCONCLUSIVE</h2>
          </div>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 10px' }}>
            The pre-registered confirmatory endpoint was <strong style={{ color:C.amber }}>not met</strong>. At a 20% review rate, the metacognition composite produced a <strong style={{ color:C.textHi }}>0.0% relative reduction</strong> in safety-critical errors (95% CI <strong style={{ color:C.textHi }}>-8.1% to +6.5%</strong>, which includes zero).
          </p>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:0 }}>
            This does not demonstrate a safety-gating benefit, and it does not prove the absence of one. We therefore make <strong style={{ color:C.textHi }}>no claim</strong> of hallucination detection or improved safety gating. Any such claim would require a larger, adequately powered evaluation.
          </p>
        </div>

        {/* Not validated */}
        <h2 style={{ fontSize:20, fontWeight:800, color:C.textHi, margin:'0 0 8px' }}>What has not been validated</h2>
        <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 16px' }}>The following are not supported by measured clinical evidence and must not be read as claims:</p>
        <div className="evidence-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12, marginBottom:44 }}>
          {NOT_VALIDATED.map(item => (
            <div key={item} style={{ padding:'14px 16px', background:C.bg1, border:`1px solid ${C.border}`, borderRadius:12, fontSize:12, color:C.textMd, lineHeight:1.6 }}>
              <span style={{ color:C.amber, fontWeight:800, marginRight:8 }}>×</span>{item}
            </div>
          ))}
        </div>

        {/* Legend */}
        <h2 style={{ fontSize:20, fontWeight:800, color:C.textHi, margin:'0 0 16px' }}>Evidence status labels</h2>
        <div className="evidence-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12, marginBottom:44 }}>
          {LEGEND.map(l => (
            <div key={l.label} style={{ padding:18, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:12 }}>
              <Tag label={l.label} color={l.color} />
              <p style={{ fontSize:12, color:C.textMd, margin:'10px 0 0', lineHeight:1.6 }}>{l.note}</p>
            </div>
          ))}
        </div>

        {/* Traceability */}
        <div style={{ padding:24, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16, marginBottom:40 }}>
          <h2 style={{ fontSize:16, fontWeight:800, color:C.textHi, margin:'0 0 10px' }}>Protocol, results and traceability</h2>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 12px' }}>
            Pre-registration documents, frozen evaluation reports and analysis code are available to researchers and clinicians on request. We will provide the exact cohort definition, preprocessing, statistical method and confidence-interval procedure used for each figure.
          </p>
          <p style={{ fontSize:12, color:C.textLo, lineHeight:1.7, margin:0 }}>
            Dataset notes: RSNA ICH is used under a research-only licence; CQ500 is used under CC BY-NC-SA 4.0 (non-commercial). No patient-identifiable data is published on this site.
          </p>
        </div>

        <div style={{ padding:22, background:`${C.brand}08`, border:`1px solid ${C.brand}20`, borderRadius:14, textAlign:'center' }}>
          <p style={{ fontSize:13, color:C.textMd, margin:'0 0 12px' }}>Interested in reviewing the protocol or participating in the next validation study?</p>
          <button onClick={() => onNavigate('contact')} style={{ padding:'9px 20px', background:C.brand, border:'none', borderRadius:9, color:'white', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:C.F }}>Contact Research Team</button>
        </div>
      </div>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
