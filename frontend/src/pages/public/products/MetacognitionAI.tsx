// SEWA XAI — MetacognitionAI.tsx
// Dedicated landing page for the Metacognition Engine
import React from 'react';
import { PublicNav, PublicFooter } from '../../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandDk:'#2E6B5E',brandLt:'#52B09A',
  purple:'#8B5CF6',normal:'#1DBF73',info:'#2A6EF2',critical:'#E03535',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",FM:"'IBM Plex Mono',monospace",
};

const Tag = ({ label, color }: { label:string; color:string }) => (
  <span style={{ padding:'4px 12px', background:`${color}14`, border:`1px solid ${color}30`, borderRadius:20, fontSize:12, color, fontWeight:700, letterSpacing:'0.05em' }}>
    {label}
  </span>
);

export function MetacognitionAI({ onNavigate }: { onNavigate:(p:string)=>void }) {
  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 600px) {
          .hero-btns { flex-direction: column !important; }
          .hero-btns > button { width: 100% !important; }
          .feat-grid { grid-template-columns: 1fr !important; }
          .logic-flow { flex-direction: column !important; }
          .logic-flow > span { transform: rotate(90deg) !important; margin: 10px 0 !important; }
        }
      `}</style>
      <PublicNav activePage="solutions" onNavigate={onNavigate} />

      {/* Hero */}
      <section style={{ padding:'clamp(80px, 15vh, 120px) 24px 80px', textAlign:'center', background:`radial-gradient(circle at top, ${C.purple}08 0%, transparent 70%)` }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <Tag label="ENGINE 03: METACOGNITION" color={C.purple} />
          <h1 style={{ fontSize:'clamp(32px, 8vw, 56px)', fontWeight:900, color:C.textHi, margin:'24px 0 20px', letterSpacing:'-2px', lineHeight:1.1 }}>
            The AI that checks<br/>
            <span style={{ color:C.purple }}>every other AI.</span>
          </h1>
          <p style={{ fontSize:'clamp(15px, 2.5vw, 18px)', color:C.textMd, lineHeight:1.7, margin:'0 0 40px' }}>
            Our Metacognition Engine acts as the 'Auditor-in-Chief'. It evaluates the consistency and clinical feasibility of every AI result, identifying hallucinations and logical errors before they reach the radiologist's screen.
          </p>
          <div className="hero-btns" style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button onClick={() => onNavigate('contact')} style={{ padding:'14px 32px', background:C.purple, border:'none', borderRadius:12, color:'white', fontWeight:700, cursor:'pointer' }}>Activate AI Governance →</button>
            <button onClick={() => onNavigate('clinical-validation')} style={{ padding:'14px 32px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:12, color:C.textMd, cursor:'pointer' }}>Clinical Safety Data</button>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="feat-grid" style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px 80px', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:24 }}>
        {[
          { icon:'🛡️', title:'Hallucination Detection', desc:'Flags anatomical findings that are physiologically impossible or logically inconsistent.' },
          { icon:'📏', title:'Rule-Based Verification', desc:'Verifies AI findings against 200+ established clinical guidelines and anatomical rules.' },
          { icon:'🔄', title:'Cross-Model Consistency', desc:'Compares outputs from multiple AI versions to identify variance and contradictions.' },
          { icon:'📉', title:'False Alert Reduction', desc:'Blocks low-confidence or illogical flags, reducing clinician alarm fatigue by 28%.' },
          { icon:'📜', title:'Prior Scan Comparison', desc:'Checks if AI findings contradict or fail to account for changes in prior patient studies.' },
          { icon:'✅', title:'CIS Scoring', desc:'Assigns a Confidence Integrity Score (CIS) to every case based on 12 safety metrics.' },
        ].map(f => (
          <div key={f.title} style={{ padding:32, background:C.bg2, borderRadius:20, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:32, marginBottom:16 }}>{f.icon}</div>
            <h3 style={{ fontSize:18, fontWeight:700, color:C.textHi, marginBottom:12 }}>{f.title}</h3>
            <p style={{ fontSize:14, color:C.textMd, lineHeight:1.6, margin:0 }}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Logic Example */}
      <section style={{ background:C.bg1, padding:'80px 24px', borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:900, margin:'0 auto', textAlign:'center' }}>
          <h2 style={{ fontSize:32, fontWeight:800, color:C.textHi, marginBottom:40 }}>How it catches errors</h2>
          <div className="logic-flow" style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:20 }}>
            <div style={{ flex:'1 1 240px', padding:20, background:C.bg2, borderRadius:12, border:`1px solid ${C.border}`, textAlign:'left' }}>
              <div style={{ fontSize:10, color:C.textLo, marginBottom:8, fontFamily:C.FM }}>AI ENGINE OUTPUT</div>
              <div style={{ fontSize:13, color:C.critical, fontWeight:600 }}>"Pathology: ICH (Intracranial Haemorrhage)"</div>
              <div style={{ fontSize:12, color:C.textMd }}>Location: Lung Field</div>
            </div>
            <span style={{ fontSize:20, color:C.textLo }}>→</span>
            <div style={{ flex:'1 1 240px', padding:20, background:C.bg3, borderRadius:12, border:`1px solid ${C.purple}40`, textAlign:'left', boxShadow:`0 0 20px ${C.purple}20` }}>
              <div style={{ fontSize:10, color:C.purple, marginBottom:8, fontFamily:C.FM, fontWeight:700 }}>METACOGNITION RULE #422</div>
              <div style={{ fontSize:12, color:C.textHi }}>"ICH cannot occur in Lung Field. Check anatomical alignment."</div>
            </div>
            <span style={{ fontSize:20, color:C.textLo }}>→</span>
            <div style={{ flex:'1 1 240px', padding:20, background:C.bg1, borderRadius:12, border:`1px solid ${C.critical}`, textAlign:'left' }}>
              <div style={{ fontSize:10, color:C.critical, marginBottom:8, fontFamily:C.FM }}>RESULT</div>
              <div style={{ fontSize:13, color:C.textHi, fontWeight:700 }}>FLAGGED & BLOCKED</div>
              <div style={{ fontSize:11, color:C.textLo }}>Prevented false hospital alert.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Research Section */}
      <section style={{ padding:'80px 24px', maxWidth:1000, margin:'0 auto' }}>
        <h2 style={{ fontSize:24, fontWeight:800, color:C.textHi, marginBottom:32, textAlign:'center' }}>Key Research & Citations</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:20 }}>
          {[
            {
              title: "CheXNet: Radiologist-Level Pneumonia Detection on Chest X-Rays with Deep Learning",
              authors: "Rajpurkar, P., et al. (2017)",
              journal: "Stanford Machine Learning Group",
              doi: "10.48550/arXiv.1711.05225",
              link: "https://arxiv.org/abs/1711.05225"
            },
            {
              title: "Automatically Correcting Large Language Models: Survey and Taxonomy",
              authors: "Pan, L., et al. (2023)",
              journal: "arXiv preprint - AI Safety & Logic Verification",
              doi: "10.48550/arXiv.2310.01798",
              link: "https://arxiv.org/abs/2310.01798"
            }
          ].map(paper => (
            <div key={paper.doi} style={{ padding:24, background:C.bg2, borderRadius:16, border:`1px solid ${C.border}` }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:C.textHi, marginBottom:8, lineHeight:1.4 }}>{paper.title}</h3>
              <div style={{ fontSize:12, color:C.purple, marginBottom:4, fontWeight:600 }}>{paper.authors}</div>
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
