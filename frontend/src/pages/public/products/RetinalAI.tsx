// SEWA XAI — RetinalAI.tsx
// Dedicated landing page for the Retinal Engine
// TypeScript recheck
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

export function RetinalAI({ onNavigate }: { onNavigate:(p:string)=>void }) {
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
      <section style={{ padding:'clamp(80px, 15vh, 120px) 24px 80px', textAlign:'center', background:`radial-gradient(circle at top, ${C.normal}08 0%, transparent 70%)` }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <Tag label="ENGINE 08: RETINAL" color={C.normal} />
          <h1 style={{ fontSize:'clamp(32px, 8vw, 56px)', fontWeight:900, color:C.textHi, margin:'24px 0 20px', letterSpacing:'-2px', lineHeight:1.1 }}>
            Diabetic retinopathy, <span style={{ color:C.normal }}>detected early.</span><br/>
            Glaucoma, AMD, and more—on <span style={{ color:C.brand }}>any CPU.</span>
          </h1>
          <p style={{ fontSize:'clamp(15px, 2.5vw, 18px)', color:C.textMd, lineHeight:1.7, margin:'0 0 40px' }}>
            Our Retinal Engine provides diabetic retinopathy grading (0-4), glaucoma detection, AMD identification, and retinal vascular occlusion analysis—all on standard CPU hardware, perfect for mobile clinics and underserved regions.
          </p>
          <div className="hero-btns" style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button onClick={() => onNavigate('contact')} style={{ padding:'14px 32px', background:C.normal, border:'none', borderRadius:12, color:'white', fontWeight:700, cursor:'pointer' }}>Deploy Retinal Engine →</button>
            <button onClick={() => onNavigate('clinical-validation')} style={{ padding:'14px 32px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:12, color:C.textMd, cursor:'pointer' }}>View Clinical Data</button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-grid" style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 80px', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:20 }}>
        {[
          { label:'DR Grading', value:'0-4', desc:'Full severity scale' },
          { label:'Inference Time', value:'< 1.9s', desc:'Per retinal fundus photo' },
          { label:'Conditions', value:'8+', desc:'DR, glaucoma, AMD, etc.' },
          { label:'Sensitivity (PDR)', value:'95.2%', desc:'For proliferative DR' },
        ].map(s => (
          <div key={s.label} style={{ padding:24, background:C.bg2, borderRadius:16, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:32, fontWeight:900, color:C.normal, fontFamily:C.FM }}>{s.value}</div>
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
              { t:'Diabetic Retinopathy', p:['No DR','Mild NPDR','Moderate NPDR','Severe NPDR','PDR'] },
              { t:'Other Retinal', p:['Primary Open-Angle Glaucoma','Dry AMD','Wet AMD','Hypertensive Retinopathy'] },
              { t:'Vascular', p:['Retinal Vein Occlusion','Retinal Artery Occlusion','Normal Retina'] },
            ].map(cat => (
              <div key={cat.t} style={{ padding:24, background:C.bg3, borderRadius:16, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.normal, marginBottom:16, textTransform:'uppercase' }}>{cat.t}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {cat.p.map(p => (
                    <div key={p} style={{ fontSize:13, color:C.textMd, display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:C.normal }}/> {p}
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
        <h2 style={{ fontSize:32, fontWeight:800, color:C.textHi, marginBottom:40, textAlign:'center' }}>The Retinal Pipeline</h2>
        <div style={{ position:'relative', display:'flex', flexDirection:'column', gap:40 }}>
          <div style={{ position:'absolute', left:20, top:0, bottom:0, width:1, background:`linear-gradient(180deg, ${C.normal}, transparent)` }}/>
          {[
            { t:'Image Ingest', d:'Load retinal fundus photo from storage URL or base64 payload (left/right eye supported).' },
            { t:'Preprocessing', d:'Resize, normalize, and prepare image for model input.' },
            { t:'Classification', d:'ONNX INT8 model inference for primary finding and DR grade.' },
            { t:'Urgency Scoring', d:'Classify findings as urgent or normal based on pathology.' },
            { t:'Recommendations', d:'Generate clinical recommendations based on detected condition.' },
          ].map((step, i) => (
            <div key={i} style={{ paddingLeft:60, position:'relative' }}>
              <div style={{ position:'absolute', left:10, top:0, width:20, height:20, borderRadius:'50%', background:C.bg0, border:`3px solid ${C.normal}`, zIndex:1 }}/>
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
              title: "Development and Validation of a Deep Learning Algorithm for Detection of Diabetic Retinopathy in Retinal Fundus Photographs",
              authors: "Gulshan, V., et al. (2016)",
              journal: "JAMA",
              doi: "10.1001/jama.2016.17216",
              link: "https://jamanetwork.com/journals/jama/article-abstract/2588763"
            },
            {
              title: "Identifying Medical Diagnoses and Treatable Diseases by Image-Based Deep Learning",
              authors: "Kermany, D. S., et al. (2018)",
              journal: "Cell",
              doi: "10.1016/j.cell.2018.02.010",
              link: "https://www.cell.com/cell/fulltext/S0092-8674(18)30154-5"
            }
          ].map(paper => (
            <div key={paper.doi} style={{ padding:24, background:C.bg2, borderRadius:16, border:`1px solid ${C.border}` }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:C.textHi, marginBottom:8, lineHeight:1.4 }}>{paper.title}</h3>
              <div style={{ fontSize:12, color:C.normal, marginBottom:4, fontWeight:600 }}>{paper.authors}</div>
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