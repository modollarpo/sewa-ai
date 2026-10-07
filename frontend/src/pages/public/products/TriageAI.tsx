// SEWA XAI — TriageAI.tsx
// Dedicated landing page for the Triage Engine (Port 8000)
import React from 'react';
import { PublicNav, PublicFooter } from '../../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandDk:'#2E6B5E',brandLt:'#52B09A',
  critical:'#E03535',normal:'#1DBF73',info:'#2A6EF2',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",FM:"'IBM Plex Mono',monospace",
};

const Tag = ({ label, color }: { label:string; color:string }) => (
  <span style={{ padding:'4px 12px', background:`${color}14`, border:`1px solid ${color}30`, borderRadius:20, fontSize:12, color, fontWeight:700, letterSpacing:'0.05em' }}>
    {label}
  </span>
);

export function TriageAI({ onNavigate }: { onNavigate:(p:string)=>void }) {
  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 600px) {
          .hero-btns { flex-direction: column !important; }
          .hero-btns > button { width: 100% !important; }
          .stats-grid { grid-template-columns: 1fr !important; }
          .feat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <PublicNav activePage="solutions" onNavigate={onNavigate} />

      {/* Hero */}
      <section style={{ padding:'clamp(80px, 15vh, 120px) 24px 80px', textAlign:'center', background:`radial-gradient(circle at top, ${C.critical}08 0%, transparent 70%)` }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <Tag label="ENGINE 01: TRIAGE" color={C.critical} />
          <h1 style={{ fontSize:'clamp(32px, 8vw, 56px)', fontWeight:900, color:C.textHi, margin:'24px 0 20px', letterSpacing:'-2px', lineHeight:1.1 }}>
            Wait time: <span style={{ color:C.critical }}>0 seconds.</span><br/>
            Accuracy: <span style={{ color:C.normal }}>under clinical validation.</span>
          </h1>
          <p style={{ fontSize:'clamp(15px, 2.5vw, 18px)', color:C.textMd, lineHeight:1.7, margin:'0 0 40px' }}>
            Our Triage Engine is the first line of defence in the clinical worklist. It analyzes scans the moment they leave the PACS, identifying critical pathologies like ICH and LVO before a human ever sees the case.
          </p>
          <div className="hero-btns" style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button onClick={() => onNavigate('contact')} style={{ padding:'14px 32px', background:C.critical, border:'none', borderRadius:12, color:'white', fontWeight:700, cursor:'pointer' }}>Deploy Triage Engine →</button>
            <button onClick={() => onNavigate('clinical-validation')} style={{ padding:'14px 32px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:12, color:C.textMd, cursor:'pointer' }}>View Clinical Data</button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-grid" style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 80px', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:20 }}>
        {[
          { label:'Inference Time', value:'< 2.4s', desc:'Engineered latency target' },
          { label:'Sensitivity (PE)', value:'Under evaluation', desc:'No published clinical validation yet' },
          { label:'False Positives', value:'Under evaluation', desc:'No published clinical validation yet' },
          { label:'Priority Classes', value:'14', desc:'STAT-level pathologies' },
        ].map(s => (
          <div key={s.label} style={{ padding:24, background:C.bg2, borderRadius:16, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:32, fontWeight:900, color:C.critical, fontFamily:C.FM }}>{s.value}</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.textHi, margin:'8px 0 4px' }}>{s.label}</div>
            <div style={{ fontSize:12, color:C.textLo }}>{s.desc}</div>
          </div>
        ))}
      </section>

      {/* Pathologies */}
      <section style={{ background:C.bg1, padding:'80px 24px', borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:1000, margin:'0 auto' }}>
          <h2 style={{ fontSize:32, fontWeight:800, color:C.textHi, marginBottom:40, textAlign:'center' }}>Pathologies Detected</h2>
          <div className="feat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:16 }}>
            {[
              { t:'Cerebrovascular', p:['Intracranial Haemorrhage (ICH)','Large Vessel Occlusion (LVO)','Ischaemic Stroke'] },
              { t:'Thoracic', p:['Pulmonary Embolism (PE)','Pneumothorax','Pneumonia','Aortic Dissection'] },
              { t:'Trauma', p:['Rib Fractures','Spinal Cord Compression','Internal Bleeding'] },
              { t:'Abdominal', p:['Appendicitis','Bowel Obstruction','Renal Calculi'] },
            ].map(cat => (
              <div key={cat.t} style={{ padding:24, background:C.bg3, borderRadius:16, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.critical, marginBottom:16, textTransform:'uppercase' }}>{cat.t}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {cat.p.map(p => (
                    <div key={p} style={{ fontSize:13, color:C.textMd, display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:C.critical }}/> {p}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section style={{ maxWidth:1000, margin:'80px auto', padding:'0 24px' }}>
        <h2 style={{ fontSize:32, fontWeight:800, color:C.textHi, marginBottom:40, textAlign:'center' }}>The Triage Pipeline</h2>
        <div style={{ position:'relative', display:'flex', flexDirection:'column', gap:40 }}>
          <div style={{ position:'absolute', left:20, top:0, bottom:0, width:1, background:`linear-gradient(180deg, ${C.critical}, transparent)` }}/>
          {[
            { t:'DICOM Ingest', d:'Zero-latency stream from PACS via WADO-RS.' },
            { t:'Preprocessing', d:'Normalisation, pixel-spacing alignment, and noise reduction.' },
            { t:'Ensemble Analysis', d:'Dual-stage ONNX model analysis for primary findings.' },
            { t:'Priority Scoring', d:'Pathology-specific clinical weighting for worklist sorting.' },
            { t:'STAT Delivery', d:'Push notifications to clinician mobile via WhatsApp/FCM.' },
          ].map((step, i) => (
            <div key={i} style={{ paddingLeft:60, position:'relative' }}>
              <div style={{ position:'absolute', left:10, top:0, width:20, height:20, borderRadius:'50%', background:C.bg0, border:`3px solid ${C.critical}`, zIndex:1 }}/>
              <h3 style={{ fontSize:18, fontWeight:700, color:C.textHi, margin:'0 0 8px' }}>{step.t}</h3>
              <p style={{ fontSize:14, color:C.textMd, margin:0 }}>{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Research Section */}
      <section style={{ padding:'80px 24px', maxWidth:1000, margin:'0 auto' }}>
        <h2 style={{ fontSize:24, fontWeight:800, color:C.textHi, marginBottom:8, textAlign:'center' }}>Key Research & Citations</h2>
        <p style={{ fontSize:12, color:C.textLo, textAlign:'center', marginBottom:32 }}>References below are published literature on AI-assisted CT triage — they are not SEWA XAI study results. SEWA XAI has no published clinical validation yet.</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:20 }}>
          {[
            {
              title: "Deep learning algorithms for detection of critical findings in head CT scans: a retrospective study",
              authors: "Chilamkurthy, S., et al. (2018)",
              journal: "The Lancet",
              doi: "10.1016/S0140-6736(18)30168-1",
              link: "https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(18)30168-1/fulltext"
            },
            {
              title: "Impact of Artificial Intelligence on Radiologist Efficiency and Diagnostic Yield",
              authors: "Langlotz, C. P. (2019)",
              journal: "Radiology: Artificial Intelligence",
              doi: "10.1148/ryai.2019190031",
              link: "https://pubs.rsna.org/doi/10.1148/ryai.2019190031"
            }
          ].map(paper => (
            <div key={paper.doi} style={{ padding:24, background:C.bg2, borderRadius:16, border:`1px solid ${C.border}` }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:C.textHi, marginBottom:8, lineHeight:1.4 }}>{paper.title}</h3>
              <div style={{ fontSize:12, color:C.critical, marginBottom:4, fontWeight:600 }}>{paper.authors}</div>
              <div style={{ fontSize:11, color:C.textLo, marginBottom:16 }}>{paper.journal}</div>
              <a href={paper.link} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:C.textHi, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:6 }}>
                DOI: {paper.doi} ↗
              </a>
            </div>
          ))}
        </div>
      </section>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
