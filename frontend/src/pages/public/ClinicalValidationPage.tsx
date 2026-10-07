// SEWA XAI — ClinicalValidationPage.tsx
// Honest validation-status page: the repository is pre-clinical (TRL 5).
// The previous version of this page displayed fabricated metrics, datasets
// and publications (audit E-13). This rewrite reports measured status only.
import React, { useState } from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandDk:'#2E6B5E',brandLt:'#52B09A',
  normal:'#1DBF73',info:'#2A6EF2',critical:'#E03535',amber:'#F59E0B',purple:'#8B5CF6',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",FM:"'IBM Plex Mono',monospace",
};

const STATUS = [
  { label:'Development stage',        value:'Pre-clinical (TRL 5)', color:C.info },
  { label:'Clinical datasets in repo',value:'None',                  color:C.amber },
  { label:'Peer-reviewed publications',value:'None yet',             color:C.amber },
  { label:'Independent validation',   value:'Planned next milestone', color:C.normal },
  { label:'Live hospital deployments',value:'0',                     color:C.amber },
];

const TARGETS = [
  { component:'Triage Engine',       target:'Latency < 2s on CPU (ONNX Runtime)', measured:'Latency measurable; AUC not measured' },
  { component:'Uncertainty Engine',  target:'Epistemic + aleatoric UQ via MC-Dropout', measured:'Implemented; OOD rate not measured' },
  { component:'Metacognition Engine', target:'Layer-wise reliability checks + human-review gate', measured:'Harness runs; catch rate not validated' },
  { component:'Calibration (ECE)',   target:'Prediction-outcome pairs per clinician adjudication', measured:'Pipeline implemented; ECE unmeasured' },
];

const COMMITMENTS = [
  'No model-performance figures (AUC, sensitivity, ECE, catch rate) are claimed until an evaluation dataset is onboarded and independently reviewed.',
  'Model cards and statistical analysis (TRIPOD) will be published alongside the first measured results.',
  'Any future quantitative claims will link to the producing code, dataset, and evaluation output in this repository.',
];

export function ClinicalValidationPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  const [tab, setTab] = useState<'status'|'benchmarks'|'transparency'>('status');

  const Tag = ({ label, color }: { label:string; color:string }) => (
    <span style={{ padding:'2px 8px', background:`${color}14`, border:`1px solid ${color}30`, borderRadius:20, fontSize:9, fontWeight:700, color, fontFamily:C.F }}>{label}</span>
  );

  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 900px) {
          .stats-bar-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 40px !important; }
          .metrics-table-wrapper { overflow-x: auto !important; }
          .datasets-table-wrapper { overflow-x: auto !important; }
        }
        @media (max-width: 600px) {
          .stats-bar-grid { grid-template-columns: 1fr !important; }
          .hero-btns { flex-direction: column !important; }
          .hero-btns > button { width: 100% !important; }
        }
      `}</style>
      <PublicNav activePage="clinical-validation" onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ padding:'110px 24px 70px', background:`linear-gradient(180deg,${C.bg1},${C.bg0})`, textAlign:'center' }}>
        <div style={{ maxWidth:760, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:20 }}>
            <Tag label="Pre-clinical — TRL 5" color={C.info} />
            <Tag label="Transparency by design" color={C.brand} />
          </div>
          <h1 style={{ fontSize:50, fontWeight:900, color:C.textHi, margin:'20px 0 18px', letterSpacing:'-2px', lineHeight:1.1 }}>
            Validation status:<br/>honest and measured
          </h1>
          <p style={{ fontSize:15, color:C.textMd, lineHeight:1.8, maxWidth:540, margin:'0 auto' }}>
            SEWA XAI is in pre-clinical engineering development. This page reports only what this repository can substantiate.
            No model-performance metrics are claimed until an evaluation dataset is onboarded and independently reviewed.
          </p>
        </div>
      </div>

      {/* Status bar */}
      <div style={{ background:C.bg1, borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}>
        <div className="stats-bar-grid" style={{ maxWidth:1100, margin:'0 auto', padding:'24px', display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:24 }}>
          {STATUS.map(s => (
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:16, fontWeight:900, color:s.color, fontFamily:C.FM }}>{s.value}</div>
              <div style={{ fontSize:11, color:C.textLo, marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'56px 24px 80px' }}>

        {/* Tab nav */}
        <div style={{ display:'flex', gap:4, background:C.bg2, borderRadius:12, padding:4, border:`1px solid ${C.border}`, marginBottom:40, width:'fit-content' }}>
          {([['status','Validation Status'],['benchmarks','Engineering Benchmarks'],['transparency','Transparency']] as const).map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding:'8px 20px', borderRadius:9, border:'none', cursor:'pointer', fontFamily:C.F, fontSize:13,
              background:tab===id?C.brand:'transparent', color:tab===id?'white':C.textLo, fontWeight:tab===id?700:400,
            }}>{label}</button>
          ))}
        </div>

        {/* Status */}
        {tab === 'status' && (
          <div>
            <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, marginBottom:28 }}>
              The 4-engine pipeline (Triage → Uncertainty → VLM → Metacognition) is implemented and running in this repository.
              The safety harnesses, calibration pipeline, and human-review gate are wired end-to-end. What is missing is a
              clinical evaluation dataset and an independent review — without them, no performance figure can be reported.
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:16 }}>
              {[
                { title:'Implemented today', items:['4-engine pipeline with contract-clean HTTP payloads','Metacognition audit trail (MetacognitionAuditLog)','Calibration prediction-outcome recording','Sign-off gate for human-review cases','CI safety-gate harnesses (benchmark + validation)'] },
                { title:'Not yet measured', items:['AUC / sensitivity / specificity','Hallucination catch rate','Expected Calibration Error (ECE)','OOD detection rate','Any count of "scans processed"'] },
                { title:'Next milestones', items:['Onboard an evaluation dataset (public + partner)','Run independent validation per TRIPOD','Publish model cards and statistical analysis','Pilot deployments with live clinicians'] },
              ].map(block => (
                <div key={block.title} style={{ padding:24, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:C.textHi, margin:'0 0 12px' }}>{block.title}</h3>
                  <ul style={{ margin:0, paddingLeft:18, color:C.textMd, fontSize:12, lineHeight:2 }}>
                    {block.items.map(i => <li key={i}>{i}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Benchmarks */}
        {tab === 'benchmarks' && (
          <div>
            <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, marginBottom:28 }}>
              Engineering benchmarks are targets for the components under development. They are not measured clinical results.
            </p>
            <div className="metrics-table-wrapper" style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:C.bg3 }}>
                    {['Component','Engineering target','Measured status'].map(h => (
                      <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:9, fontWeight:700, color:C.textLo, letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TARGETS.map((t, i) => (
                    <tr key={t.component} style={{ borderTop:`1px solid ${C.border}`, background:i%2===0?'transparent':C.bg1 }}>
                      <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:C.textHi }}>{t.component}</td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:C.textMd }}>{t.target}</td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:C.textLo }}>{t.measured}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transparency */}
        {tab === 'transparency' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {COMMITMENTS.map((c, i) => (
              <div key={c} style={{ padding:22, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:14, fontSize:13, color:C.textMd, lineHeight:1.7 }}>
                <span style={{ color:C.brand, fontWeight:800, fontFamily:C.FM, marginRight:10 }}>{i + 1}.</span>{c}
              </div>
            ))}
            <div style={{ padding:20, background:`${C.brand}08`, border:`1px solid ${C.brand}20`, borderRadius:14, textAlign:'center' }}>
              <p style={{ fontSize:13, color:C.textMd, margin:'0 0 12px' }}>Interested in participating in the upcoming independent validation study?</p>
              <button onClick={() => onNavigate('contact')} style={{ padding:'9px 20px', background:C.brand, border:'none', borderRadius:9, color:'white', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:C.F }}>Contact Research Team</button>
            </div>
          </div>
        )}
      </div>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}