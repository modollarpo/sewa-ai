// SEWA XAI — ExplainableAI.tsx
// Dedicated landing page for Explainability (XAI) features
import React from 'react';
import { PublicNav, PublicFooter } from '../../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandDk:'#2E6B5E',brandLt:'#52B09A',
  normal:'#1DBF73',normalBg:'#0A1F14',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",FM:"'IBM Plex Mono',monospace",
};

export function ExplainableAI({ onNavigate }: { onNavigate:(p:string)=>void }) {
  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 900px) {
          .xai-methods-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .hero-btns { flex-direction: column !important; }
          .hero-btns > button { width: 100% !important; }
          .feat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <PublicNav activePage="solutions" onNavigate={onNavigate} />

      {/* Hero */}
      <section style={{ padding:'clamp(80px, 15vh, 120px) 24px 80px', textAlign:'center', background:`radial-gradient(circle at top, ${C.normal}08 0%, transparent 70%)` }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <span style={{ padding:'4px 12px', background:`${C.normal}14`, border:`1px solid ${C.normal}30`, borderRadius:20, fontSize:12, color:C.normal, fontWeight:700, letterSpacing:'0.05em' }}>
            ENGINE 05: EXPLAINABILITY (XAI)
          </span>
          <h1 style={{ fontSize:'clamp(32px, 8vw, 56px)', fontWeight:900, color:C.textHi, margin:'24px 0 20px', letterSpacing:'-2px', lineHeight:1.1 }}>
            No more "Black Box".<br/>
            <span style={{ color:C.normal }}>See what the AI sees.</span>
          </h1>
          <p style={{ fontSize:'clamp(15px, 2.5vw, 18px)', color:C.textMd, lineHeight:1.7, margin:'0 0 40px' }}>
            Trust is built on transparency. SEWA XAI provides pixel-level heatmaps and feature attribution for every diagnosis, ensuring clinicians can verify exactly which anatomical regions drove the AI's conclusion.
          </p>
          <div className="hero-btns" style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button onClick={() => onNavigate('contact')} style={{ padding:'14px 32px', background:C.normal, border:'none', borderRadius:12, color:'white', fontWeight:700, cursor:'pointer' }}>Adopt Explainable AI →</button>
            <button onClick={() => onNavigate('docs')} style={{ padding:'14px 32px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:12, color:C.textMd, cursor:'pointer' }}>Technical Docs</button>
          </div>
        </div>
      </section>

      {/* XAI Methods */}
      <section className="xai-methods-grid" style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 80px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:40, alignItems:'center' }}>
        <div style={{ background:C.bg2, padding:40, borderRadius:24, border:`1px solid ${C.border}`, position:'relative', minHeight:300, display:'flex', alignItems:'center', justifyContent:'center' }}>
           {/* Gradient Heatmap Placeholder */}
           <div style={{ width:'70%', aspectRatio:'1/1', background:`radial-gradient(circle at 70% 30%, ${C.normal}40 0%, ${C.brand}10 40%, transparent 70%)`, borderRadius:'50%', border:`2px dashed ${C.normal}30`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ padding:'8px 16px', background:C.bg1, border:`1px solid ${C.normal}`, borderRadius:8, fontSize:12, color:C.normal, fontWeight:700, fontFamily:C.FM }}>GRAD-CAM ACTIVATION</div>
           </div>
        </div>
        <div>
          <h2 style={{ fontSize:32, fontWeight:800, color:C.textHi, marginBottom:24 }}>Visual Evidence.</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
            <div>
              <h3 style={{ fontSize:18, fontWeight:700, color:C.textHi, marginBottom:8 }}>Grad-CAM Heatmaps</h3>
              <p style={{ fontSize:14, color:C.textMd, lineHeight:1.6, margin:0 }}>We project the gradients of the target concept into the final convolutional layer to produce a localization map highlighting the important regions in the image for predicting the concept.</p>
            </div>
            <div>
              <h3 style={{ fontSize:18, fontWeight:700, color:C.textHi, marginBottom:8 }}>SHAP Feature Attribution</h3>
              <p style={{ fontSize:14, color:C.textMd, lineHeight:1.6, margin:0 }}>Understand how non-image features (patient age, symptoms, prior history) weighted into the final decision using game-theoretic SHAP values.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison section */}
      <section style={{ background:C.bg1, padding:'80px 24px', borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:1000, margin:'0 auto', textAlign:'center' }}>
          <h2 style={{ fontSize:32, fontWeight:800, color:C.textHi, marginBottom:20 }}>Clinical Trust Journey</h2>
          <p style={{ color:C.textMd, marginBottom:48 }}>How XAI transforms the diagnostic experience for the clinician.</p>
          <div className="feat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:24 }}>
            {[
              { t:'1. Alert', d:'AI flags a critical finding in the worklist.', icon:'🔔' },
              { t:'2. Inspect', d:'Radiologist opens the Grad-CAM overlay to see the region of interest.', icon:'🔍' },
              { t:'3. Verify', d:'SHAP values explain clinical context weighting.', icon:'⚖️' },
              { t:'4. Decide', d:'Clinician signs off with 47% higher confidence.', icon:'✍️' },
            ].map(step => (
              <div key={step.t} style={{ padding:24, background:C.bg2, borderRadius:16, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:24, marginBottom:16 }}>{step.icon}</div>
                <h3 style={{ fontSize:16, fontWeight:700, color:C.textHi, marginBottom:8 }}>{step.t}</h3>
                <p style={{ fontSize:13, color:C.textMd, margin:0, lineHeight:1.5 }}>{step.d}</p>
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
              title: "Grad-CAM: Visual Explanations from Deep Networks via Gradient-based Localization",
              authors: "Selvaraju, R. R., et al. (2017)",
              journal: "IEEE International Conference on Computer Vision (ICCV)",
              doi: "10.1109/ICCV.2017.74",
              link: "https://arxiv.org/abs/1610.02391"
            },
            {
              title: "A Unified Approach to Interpreting Model Predictions (SHAP)",
              authors: "Lundberg, S. M., & Lee, S. I. (2017)",
              journal: "Advances in Neural Information Processing Systems (NeurIPS)",
              doi: "10.48550/arXiv.1705.07874",
              link: "https://arxiv.org/abs/1705.07874"
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
