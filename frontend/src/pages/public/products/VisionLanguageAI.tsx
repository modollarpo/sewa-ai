// SEWA AI — VisionLanguageAI.tsx
// Dedicated landing page for the VLM Report Generator (Port 8001)
import React from 'react';
import { PublicNav, PublicFooter } from '../../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandDk:'#2E6B5E',brandLt:'#52B09A',
  info:'#2A6EF2',normal:'#1DBF73',critical:'#E03535',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",FM:"'IBM Plex Mono',monospace",
};

const Tag = ({ label, color }: { label:string; color:string }) => (
  <span style={{ padding:'4px 12px', background:`${color}14`, border:`1px solid ${color}30`, borderRadius:20, fontSize:12, color, fontWeight:700, letterSpacing:'0.05em' }}>
    {label}
  </span>
);

export function VisionLanguageAI({ onNavigate }: { onNavigate:(p:string)=>void }) {
  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 900px) {
          .vlm-split-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .hero-btns { flex-direction: column !important; }
          .hero-btns > button { width: 100% !important; }
          .feat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <PublicNav activePage="solutions" onNavigate={onNavigate} />

      {/* Hero */}
      <section style={{ padding:'clamp(80px, 15vh, 120px) 24px 80px', textAlign:'center', background:`radial-gradient(circle at top, ${C.info}08 0%, transparent 70%)` }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <Tag label="ENGINE 04: VISION-LANGUAGE MODEL (VLM)" color={C.info} />
          <h1 style={{ fontSize:'clamp(32px, 8vw, 56px)', fontWeight:900, color:C.textHi, margin:'24px 0 20px', letterSpacing:'-2px', lineHeight:1.1 }}>
            Read the image.<br/>
            <span style={{ color:C.info }}>Write the report.</span>
          </h1>
          <p style={{ fontSize:'clamp(15px, 2.5vw, 18px)', color:C.textMd, lineHeight:1.7, margin:'0 0 40px' }}>
            Our Clinical VLM goes beyond classification. It understands anatomical context and generates structured, editable radiology reports in seconds. Reduce reporting burnout and improve consistency across the department.
          </p>
          <div className="hero-btns" style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button onClick={() => onNavigate('contact')} style={{ padding:'14px 32px', background:C.info, border:'none', borderRadius:12, color:'white', fontWeight:700, cursor:'pointer' }}>Automate Radiology Reports →</button>
            <button onClick={() => onNavigate('pricing')} style={{ padding:'14px 32px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:12, color:C.textMd, cursor:'pointer' }}>Plan Pricing</button>
          </div>
        </div>
      </section>

      {/* Split view: Image + Report */}
      <section style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 80px' }}>
        <div className="vlm-split-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2, background:C.border, border:`1px solid ${C.border}`, borderRadius:24, overflow:'hidden', boxShadow:'0 32px 64px rgba(0,0,0,0.5)' }}>
          {/* Left: Simulated DICOM */}
          <div style={{ background:'#000', padding:40, textAlign:'center', position:'relative' }}>
            <div style={{ fontSize:11, color:C.textLo, position:'absolute', top:20, left:20, fontFamily:C.FM }}>DICOM INPUT: CT_HEAD_0041</div>
            <div style={{ width:'100%', aspectRatio:'1/1', border:`1px solid ${C.bg2}`, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
               <div style={{ width:'80%', height:'80%', border:`1px solid ${C.bg3}`, borderRadius:'50%' }} />
               <div style={{ position:'absolute', width:60, height:40, background:C.info, opacity:0.1, borderRadius:'50%', filter:'blur(20px)', left:'60%', top:'30%' }} />
            </div>
            <div style={{ marginTop:20, fontSize:12, color:C.textHi, fontFamily:C.FM }}>[ AI ANALYSIS COMPLETE ]</div>
          </div>
          {/* Right: Generated Report */}
          <div style={{ background:C.bg1, padding:40 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
               <div style={{ fontSize:11, color:C.info, fontWeight:700, letterSpacing:'0.05em' }}>GENERATED RADIOLOGY REPORT</div>
               <div style={{ fontSize:10, color:C.textLo }}>LATENCY: 4.8s</div>
            </div>
            <div style={{ color:C.textHi, fontSize:13, lineHeight:1.8, fontFamily:C.F }}>
              <p style={{ margin:'0 0 12px' }}><strong>FINDINGS:</strong></p>
              <p style={{ margin:'0 0 12px' }}>There is a hyperdense focus measuring 12mm in the right basal ganglia, consistent with acute intracranial haemorrhage. No significant midline shift (approx 1.2mm). Ventricular system is unremarkable for age.</p>
              <p style={{ margin:'0 0 12px' }}><strong>IMPRESSION:</strong></p>
              <p style={{ margin:'0 0 20px', color:C.info, fontWeight:600 }}>1. Acute right basal ganglia haemorrhage.<br/>2. No signs of hydrocephalus.</p>
              <button style={{ width:'100%', padding:12, background:`${C.info}14`, border:`1px solid ${C.info}40`, borderRadius:10, color:C.info, fontWeight:700, fontSize:12, cursor:'pointer' }}>
                Insert into RIS/PACS →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section style={{ background:C.bg1, padding:'80px 24px', borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:1000, margin:'0 auto' }}>
          <h2 style={{ fontSize:32, fontWeight:800, color:C.textHi, marginBottom:48, textAlign:'center' }}>VLM Capabilities</h2>
          <div className="feat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:32 }}>
            {[
              { t:'Multi-Modal Reasoning', d:'Combines pixel data with EHR history, lab results, and prior reports for holistic diagnosis.' },
              { t:'Structured Formatting', d:'Generates reports follows NHS, ACR, or local departmental templates automatically.' },
              { t:'Laterality Awareness', d:'Precisely identifies left/right and anatomical segments with sub-centimeter accuracy.' },
              { t:'Clinical Coding', d:'Suggests ICD-10 and SNOMED CT codes based on the findings section.' },
            ].map(cap => (
              <div key={cap.t} style={{ padding:24, background:C.bg2, borderRadius:16, border:`1px solid ${C.border}` }}>
                <h3 style={{ fontSize:18, fontWeight:700, color:C.textHi, marginBottom:12 }}>{cap.t}</h3>
                <p style={{ fontSize:14, color:C.textMd, lineHeight:1.6, margin:0 }}>{cap.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Research Section */}
      <section style={{ padding:'80px 24px', maxWidth:1000, margin:'0 auto' }}>
        <h2 style={{ fontSize:24, fontWeight:800, color:C.textHi, marginBottom:32, textAlign:'center' }}>Key Research & Citations</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:20 }}>
          {[
            {
              title: "BLIP-2: Bootstrapping Language-Image Pre-training with Frozen Image Encoders",
              authors: "Li, J., et al. (2023)",
              journal: "International Conference on Machine Learning (ICML)",
              doi: "10.48550/arXiv.2301.12597",
              link: "https://arxiv.org/abs/2301.12597"
            },
            {
              title: "Foundation models for generalist medical artificial intelligence",
              authors: "Moor, M., et al. (2023)",
              journal: "Nature",
              doi: "10.1038/s41586-023-05881-4",
              link: "https://www.nature.com/articles/s41586-023-05881-4"
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
