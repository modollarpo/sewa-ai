// SEWA XAI — ClinicalValidationPage.tsx
// Compact validation-status page. Canonical evidence detail lives in ClinicalEvidencePage.
// Marking: FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
import React from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',normal:'#1DBF73',info:'#2A6EF2',amber:'#F59E0B',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",FM:"'IBM Plex Mono',monospace",
};

const STATUS = [
  { label:'Development stage',        value:'Pre-clinical (TRL 5)',   color:C.info },
  { label:'Internal ICH AUROC',       value:'0.807 (RSNA)',           color:C.normal },
  { label:'External ICH AUROC',       value:'0.7468 (CQ500)',         color:C.normal },
  { label:'Contradiction Recall (D)', value:'95.78% (OpenI)',         color:C.normal },
  { label:'Contradiction Specificity',value:'100.00% (OpenI)',        color:C.normal },
  { label:'Metacognition CT review',  value:'Inconclusive (Test C)',  color:C.amber },
  { label:'Baseline Pointing (E.1)',  value:'11.20% (Grad-CAM)',      color:C.amber },
  { label:'Enhanced Pointing (E.2)',  value:'43.83% (HiResCAM)',      color:C.normal },
  { label:'Mammography Weights (I)', value:'PROD INT8 (demo: false)', color:C.normal },
  { label:'Retinal Weights (I)',      value:'PROD INT8 (demo: false)', color:C.normal },
  { label:'AdaBN CQ500 AUROC',       value:'0.7596 (Zero-Label)',  color:C.normal },
  { label:'ICH Subtypes (Test J)',    value:'IPH 100% / EDH 100% / SDH 94%', color:C.normal },
  { label:'Noise & Blur (Test K)',    value:'K1-K3 MET / K4 PARTIAL', color:C.normal },
  { label:'PTX NLP Gate (Test L)',     value:'Recall 100% / Demo Mode', color:C.amber },
  { label:'TB NLP Gate (Test M)',      value:'ALL MET / Demo Mode',     color:C.normal },
  { label:'PE NLP Gate (Test N)',      value:'ALL MET / Demo Mode',     color:C.normal },
  { label:'Stroke Audit (Test O)',     value:'FPR 20.1% / Demo Mode',   color:C.amber },
  { label:'Conformal Risk Gate',      value:'FNR ≤ 5% (λ=0.0298)',    color:C.normal },
  { label:'Prospective Protocol',     value:'SEWA-SHADOW-1 v2.0',     color:C.normal },
  { label:'NHS Deployment',          value:'4-Step Pathway (DCB0129)', color:C.normal },
  { label:'Drift Engine (Test H)',    value:'ALL 4 CRITERIA PASS',  color:C.normal },
  { label:'CQ500 Recalib (C.2)',      value:'AUROC 0.7578 (exploratory)', color:C.info },
];

export function ClinicalValidationPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`@media (max-width: 700px) { .stats-bar-grid { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
      <PublicNav activePage="clinical-validation" onNavigate={onNavigate} />

      <div style={{ padding:'110px 24px 70px', background:`linear-gradient(180deg,${C.bg1},${C.bg0})`, textAlign:'center' }}>
        <div style={{ maxWidth:760, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:20, flexWrap:'wrap' }}>
            <span style={{ padding:'2px 8px', background:`${C.info}14`, border:`1px solid ${C.info}30`, borderRadius:20, fontSize:9, fontWeight:700, color:C.info }}>Pre-clinical — TRL 5</span>
            <span style={{ padding:'2px 8px', background:`${C.amber}14`, border:`1px solid ${C.amber}30`, borderRadius:20, fontSize:9, fontWeight:700, color:C.amber }}>Research use only</span>
          </div>
          <h1 style={{ fontSize:'clamp(32px, 7vw, 50px)', fontWeight:900, color:C.textHi, margin:'20px 0 18px', letterSpacing:'-2px', lineHeight:1.1 }}>
            Validation status
          </h1>
          <p style={{ fontSize:15, color:C.textMd, lineHeight:1.8, maxWidth:560, margin:'0 auto' }}>
            Measured results only. Feasibility on public data — not clinical evidence. No regulatory clearance, deployment or customer is claimed.
          </p>
        </div>
      </div>

      <div style={{ background:C.bg1, borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}>
        <div className="stats-bar-grid" style={{ maxWidth:1100, margin:'0 auto', padding:'24px', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:24 }}>
          {STATUS.map(s => (
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:15, fontWeight:900, color:s.color, fontFamily:C.FM }}>{s.value}</div>
              <div style={{ fontSize:11, color:C.textLo, marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:820, margin:'0 auto', padding:'56px 24px 80px' }}>
        {/* SEWA-SHADOW-1 Prospective Protocol Callout */}
        <div style={{ padding:24, background:C.bg2, border:`1px solid ${C.brandLt}60`, borderRadius:16, marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ fontSize:10, fontWeight:800, color:C.brandLt, padding:'2px 8px', borderRadius:20, background:`${C.brandLt}18`, border:`1px solid ${C.brandLt}40` }}>TRANSITION TO PROSPECTIVE VALIDATION</span>
            <h2 style={{ fontSize:16, fontWeight:800, color:C.textHi, margin:0 }}>SEWA-SHADOW-1 Master Protocol (v2.0) &amp; 4-Step NHS Deployment</h2>
          </div>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 12px' }}>
            Having concluded 15 frozen pre-registered tests (Tests A through O) across retrospective public benchmark data, the platform transition to live prospective shadow-mode evaluation is codified in protocol <code>SEWA-CLIN-PROT-001</code>:
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:10, marginBottom:12 }}>
            <div style={{ padding:10, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ fontSize:10, color:C.textLo, fontWeight:700 }}>TIER 1 (PRIMARY)</div>
              <div style={{ fontSize:14, fontWeight:900, color:C.textHi }}>1,200 Head CTs</div>
              <div style={{ fontSize:10, color:C.textMd }}>Powered &gt;90% for AUROC ≥0.80 &amp; FNR ≤5%</div>
            </div>
            <div style={{ padding:10, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ fontSize:10, color:C.textLo, fontWeight:700 }}>STEP 1 GOVERNANCE</div>
              <div style={{ fontSize:14, fontWeight:900, color:C.textHi }}>Caldicott &amp; DPIA</div>
              <div style={{ fontSize:10, color:C.textMd }}>S251 waiver &amp; edge de-id gateway ready</div>
            </div>
            <div style={{ padding:10, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ fontSize:10, color:C.textLo, fontWeight:700 }}>STEP 2 SAFETY</div>
              <div style={{ fontSize:14, fontWeight:900, color:C.textHi }}>DCB0129 / DCB0160</div>
              <div style={{ fontSize:10, color:C.textMd }}>Hazard log &amp; Trust deployment pack signed</div>
            </div>
            <div style={{ padding:10, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ fontSize:10, color:C.textLo, fontWeight:700 }}>STEP 3 &amp; 4 HIWM</div>
              <div style={{ fontSize:14, fontWeight:900, color:C.textHi }}>SBRI &amp; AdaBN SOP</div>
              <div style={{ fontSize:10, color:C.textMd }}>NICE Tier C &amp; scanner calibration ready</div>
            </div>
          </div>
          <p style={{ fontSize:11, color:C.textLo, margin:0, fontStyle:'italic' }}>
            Strictly non-interventional: zero clinical display or alert delivery to treating clinicians. 100% consultant radiologist sign-off maintained.
          </p>
        </div>

        <div style={{ padding:24, background:C.bg2, border:`1px solid ${C.amber}40`, borderRadius:16, marginBottom:24 }}>
          <h2 style={{ fontSize:16, fontWeight:800, color:C.textHi, margin:'0 0 10px' }}>Metacognition: INCONCLUSIVE</h2>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:0 }}>
            The pre-registered confirmatory endpoint was not met. At a 20% review rate, the metacognition composite produced a 0.0% relative reduction in safety-critical errors (95% CI -8.1% to +6.5%). We make no hallucination-detection or safety-gating claim.
          </p>
        </div>
        <div style={{ padding:24, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16, marginBottom:28 }}>
          <h2 style={{ fontSize:16, fontWeight:800, color:C.textHi, margin:'0 0 10px' }}>Scope</h2>
          <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:0 }}>
            Only ICH triage on non-contrast head CT has been evaluated. Pulmonary embolism, pneumothorax, tuberculosis, stroke, MRI/X-ray, VLM report generation and federated learning are planned or research-stage and have no validated clinical performance result.
          </p>
        </div>
        <div style={{ textAlign:'center' }}>
          <button onClick={() => onNavigate('clinical-evidence')} style={{ padding:'11px 24px', background:C.brand, border:'none', borderRadius:10, color:'white', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:C.F }}>
            Read the full Validation &amp; Evidence →
          </button>
        </div>
      </div>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
