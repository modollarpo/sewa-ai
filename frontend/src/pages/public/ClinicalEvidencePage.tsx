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
  { endpoint:'Safety reduction at 20% review', dataset:'Pre-registered metacognition composite vs baseline', result:'0.0% (95% CI -8.1% to +6.5%)', status:'INCONCLUSIVE' },
];

const NOT_VALIDATED = [
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
