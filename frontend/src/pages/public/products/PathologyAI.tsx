// SEWA XAI — PathologyAI.tsx
// Dedicated landing page for the Digital Pathology Engine
import React from 'react';
import { PublicNav, PublicFooter } from '../../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandDk:'#2E6B5E',brandLt:'#52B09A',
  urgent:'#E08A20',amber:'#F59E0B',normal:'#1DBF73',info:'#2A6EF2',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",FM:"'IBM Plex Mono',monospace",
};

const Tag = ({ label, color }: { label:string; color:string }) => (
  <span style={{ padding:'4px 12px', background:`${color}14`, border:`1px solid ${color}30`, borderRadius:20, fontSize:12, color, fontWeight:700, letterSpacing:'0.05em' }}>
    {label}
  </span>
);

export function PathologyAI({ onNavigate }: { onNavigate:(p:string)=>void }) {
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
      <section style={{ padding:'clamp(80px, 15vh, 120px) 24px 80px', textAlign:'center', background:`radial-gradient(circle at top, ${C.info}08 0%, transparent 70%)` }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <Tag label="ENGINE 06: PATHOLOGY" color={C.info} />
          <h1 style={{ fontSize:'clamp(32px, 8vw, 56px)', fontWeight:900, color:C.textHi, margin:'24px 0 20px', letterSpacing:'-2px', lineHeight:1.1 }}>
            Digital pathology, <span style={{ color:C.info }}>CPU-optimized.</span><br/>
            Results in <span style={{ color:C.normal }}>under 2 seconds.</span>
          </h1>
          <p style={{ fontSize:'clamp(15px, 2.5vw, 18px)', color:C.textMd, lineHeight:1.7, margin:'0 0 40px' }}>
            Our Digital Pathology Engine analyzes H&E-stained tissue slides using Macenko SVD-based stain normalization to reduce batch effects, providing high-accuracy patch-level carcinoma detection on standard CPU hardware.
          </p>
          <div className="hero-btns" style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button onClick={() => onNavigate('contact')} style={{ padding:'14px 32px', background:C.info, border:'none', borderRadius:12, color:'white', fontWeight:700, cursor:'pointer' }}>Deploy Digital Pathology →</button>
            <button onClick={() => onNavigate('clinical-validation')} style={{ padding:'14px 32px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:12, color:C.textMd, cursor:'pointer' }}>View Clinical Data</button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-grid" style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 80px', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:20 }}>
        {[
          { label:'Tile Analysis', value:'< 1.8s', desc:'Per 224×224 tile' },
          { label:'Stain Normalisation', value:'Macenko', desc:'SVD-based batch effect reduction' },
          { label:'Tissue Types', value:'8+', desc:'Prostate, Breast, Lung, etc.' },
          { label:'Ki67 Estimate', value:'Built-in', desc:'Proliferation index estimate' },
        ].map(s => (
          <div key={s.label} style={{ padding:24, background:C.bg2, borderRadius:16, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:32, fontWeight:900, color:C.info, fontFamily:C.FM }}>{s.value}</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.textHi, margin:'8px 0 4px' }}>{s.label}</div>
            <div style={{ fontSize:12, color:C.textLo }}>{s.desc}</div>
          </div>
        ))}
      </section>

      {/* Conditions */}
      <section style={{ background:C.bg1, padding:'80px 24px', borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:1000, margin:'0 auto' }}>
          <h2 style={{ fontSize:32, fontWeight:800, color:C.textHi, marginBottom:40, textAlign:'center' }}>Conditions Detected</h2>
          <div className="feat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:16 }}>
            {[
              { t:'Malignant', p:['Invasive Carcinoma','Adenocarcinoma','High-Grade Dysplasia','Malignancy'] },
              { t:'Infectious', p:['Tuberculosis Granuloma','Inflammatory Infiltrate'] },
              { t:'Other', p:['Necrosis','Normal Tissue'] },
            ].map(cat => (
              <div key={cat.t} style={{ padding:24, background:C.bg3, borderRadius:16, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.info, marginBottom:16, textTransform:'uppercase' }}>{cat.t}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {cat.p.map(p => (
                    <div key={p} style={{ fontSize:13, color:C.textMd, display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:C.info }}/> {p}
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
        <h2 style={{ fontSize:32, fontWeight:800, color:C.textHi, marginBottom:40, textAlign:'center' }}>The Digital Pathology Pipeline</h2>
        <div style={{ position:'relative', display:'flex', flexDirection:'column', gap:40 }}>
          <div style={{ position:'absolute', left:20, top:0, bottom:0, width:1, background:`linear-gradient(180deg, ${C.info}, transparent)` }}/>
          {[
            { t:'Tile Ingest', d:'Load tile from storage URL or base64 payload (SVS, TIFF, JPEG supported).' },
            { t:'Stain Normalisation', d:'Macenko SVD-based H&E stain normalisation to reduce batch effects.' },
            { t:'Patch Classification', d:'ONNX INT8 EfficientNet-B0 patch-level carcinoma detection.' },
            { t:'Metrics Estimation', d:'Ki67 proliferation index estimate from staining intensity; Gleason grade for prostate tissue.' },
            { t:'MDT Alert', d:'Urgent findings trigger MDT review within 24 hours.' },
          ].map((step, i) => (
            <div key={i} style={{ paddingLeft:60, position:'relative' }}>
              <div style={{ position:'absolute', left:10, top:0, width:20, height:20, borderRadius:'50%', background:C.bg0, border:`3px solid ${C.info}`, zIndex:1 }}/>
              <h3 style={{ fontSize:18, fontWeight:700, color:C.textHi, margin:'0 0 8px' }}>{step.t}</h3>
              <p style={{ fontSize:14, color:C.textMd, margin:0 }}>{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Research Section */}
      <section style={{ padding:'80px 24px', maxWidth:1000, margin:'0 auto' }}>
        <h2 style={{ fontSize:24, fontWeight:800, color:C.textHi, marginBottom:32, textAlign:'center' }}>Key Research & Citations</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:20 }}>
          {[
            {
              title: "A method for normalizing histology slides for quantitative analysis",
              authors: "Macenko, M., et al. (2009)",
              journal: "IEEE International Symposium on Biomedical Imaging (ISBI)",
              doi: "10.1109/ISBI.2009.5193250",
              link: "https://ieeexplore.ieee.org/document/5193250"
            },
            {
              title: "The Cancer Genome Atlas (TCGA): an immeasurable source of knowledge",
              authors: "Tomczak, K., Czerwińska, P., & Wiznerowicz, M. (2015)",
              journal: "Contemporary Oncology",
              doi: "10.5114/wo.2015.47136",
              link: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4375005/"
            }
          ].map(paper => (
            <div key={paper.doi} style={{ padding:24, background:C.bg2, borderRadius:16, border:`1px solid ${C.border}` }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:C.textHi, marginBottom:8, lineHeight:1.4 }}>{paper.title}</h3>
              <div style={{ fontSize:12, color:C.info, marginBottom:4, fontWeight:600 }}>{paper.authors}</div>
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