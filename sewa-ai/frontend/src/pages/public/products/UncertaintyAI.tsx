// SEWA AI — UncertaintyAI.tsx
// Dedicated landing page for the Uncertainty Engine (Port 8002)
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

export function UncertaintyAI({ onNavigate }: { onNavigate:(p:string)=>void }) {
  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 600px) {
          .hero-btns { flex-direction: column !important; }
          .hero-btns > button { width: 100% !important; }
          .stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <PublicNav activePage="solutions" onNavigate={onNavigate} />

      {/* Hero */}
      <section style={{ padding:'clamp(80px, 15vh, 120px) 24px 80px', textAlign:'center', background:`radial-gradient(circle at top, ${C.amber}08 0%, transparent 70%)` }}>
        <div style={{ maxWidth:850, margin:'0 auto' }}>
          <Tag label="ENGINE 02: UNCERTAINTY" color={C.amber} />
          <h1 style={{ fontSize:'clamp(32px, 8vw, 56px)', fontWeight:900, color:C.textHi, margin:'24px 0 20px', letterSpacing:'-2.5px', lineHeight:1.1 }}>
            Confidence, quantified.<br/>
            <span style={{ color:C.amber }}>No more black boxes.</span>
          </h1>
          <p style={{ fontSize:'clamp(15px, 2.5vw, 18px)', color:C.textMd, lineHeight:1.7, margin:'0 0 40px' }}>
            Most AI clinical systems output a prediction with 100% confidence even when wrong. SEWA AI uses Monte Carlo Dropout to quantify uncertainty, flagging borderline cases for human oversight before they reach the report.
          </p>
          <div className="hero-btns" style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button onClick={() => onNavigate('contact')} style={{ padding:'14px 32px', background:C.urgent, border:'none', borderRadius:12, color:'white', fontWeight:700, cursor:'pointer' }}>Integrate Uncertainty Safety →</button>
            <button onClick={() => onNavigate('whitepaper')} style={{ padding:'14px 32px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:12, color:C.textMd, cursor:'pointer' }}>Read the Whitepaper</button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-grid" style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 80px', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:20 }}>
        {[
          { label:'Uncertainty Method', value:'MC-Dropout', desc:'20 Stochastic passes' },
          { label:'OOD Detection', value:'89.1%', desc:'Out-of-distribution cases' },
          { label:'Calibration Score', value:'<0.04', desc:'Expected Calibration Error' },
          { label:'Risk Reduction', value:'31%', desc:'Fewer false classifications' },
        ].map(s => (
          <div key={s.label} style={{ padding:24, background:C.bg2, borderRadius:16, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:32, fontWeight:900, color:C.urgent, fontFamily:C.FM }}>{s.value}</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.textHi, margin:'8px 0 4px' }}>{s.label}</div>
            <div style={{ fontSize:12, color:C.textLo }}>{s.desc}</div>
          </div>
        ))}
      </section>

      {/* Epistemic vs Aleatoric */}
      <section style={{ padding:'80px 24px', background:C.bg1, borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:1000, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:40 }}>
          <div>
            <h2 style={{ fontSize:32, fontWeight:800, color:C.textHi, marginBottom:20 }}>Two types of doubt.</h2>
            <p style={{ color:C.textMd, lineHeight:1.8, fontSize:15 }}>
              Standard clinical AI fails because it cannot distinguish between poor data and model limitations. We quantify both to provide a total risk score for every scan.
            </p>
            <div style={{ marginTop:32, display:'flex', flexDirection:'column', gap:20 }}>
              <div style={{ padding:20, background:C.bg3, borderRadius:12, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:15, fontWeight:700, color:C.urgent, marginBottom:8 }}>Epistemic (Model Uncertainty)</div>
                <div style={{ fontSize:13, color:C.textMd }}>Flags when the scan represents a pathology or anatomy the model hasn't been trained on sufficiently.</div>
              </div>
              <div style={{ padding:20, background:C.bg3, borderRadius:12, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:15, fontWeight:700, color:C.info, marginBottom:8 }}>Aleatoric (Data Uncertainty)</div>
                <div style={{ fontSize:13, color:C.textMd }}>Flags when the scan quality is low (motion artefact, noise, metal hardware) regardless of the model's knowledge.</div>
              </div>
            </div>
          </div>
          <div style={{ background:C.bg3, borderRadius:20, border:`1px solid ${C.border}`, padding:32, display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:11, color:C.textLo, marginBottom:8, fontFamily:C.FM }}>PROBABILITY DENSITY FUNCTION</div>
              <div style={{ height:120, background:C.bg1, borderRadius:8, position:'relative', border:`1px solid ${C.border}`, overflow:'hidden' }}>
                 {/* Simulated Bell Curve */}
                 <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
                   <path d="M 0,40 Q 25,40 50,5 Q 75,40 100,40" fill="none" stroke={C.urgent} strokeWidth="1" />
                   <rect x="45" y="0" width="10" height="40" fill={C.urgent} opacity="0.1" />
                 </svg>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:10, color:C.textLo }}>
                <span>0.0 (Uncertain)</span>
                <span>0.5 (Neutral)</span>
                <span>1.0 (Certain)</span>
              </div>
            </div>
            <p style={{ color:C.textMd, fontSize:13, lineHeight:1.6, fontStyle:'italic' }}>
              "By evaluating the variance across 20 stochastic forward passes, we identify the 'grey areas' of clinical diagnosis that other AI systems hide."
            </p>
          </div>
        </div>
      </section>

      {/* Research Section */}
      <section style={{ padding:'80px 24px', maxWidth:1000, margin:'0 auto' }}>
        <h2 style={{ fontSize:24, fontWeight:800, color:C.textHi, marginBottom:32, textAlign:'center' }}>Key Research & Citations</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:20 }}>
          {[
            {
              title: "Dropout as a Bayesian Approximation: Representing Model Uncertainty in Deep Learning",
              authors: "Gal, Y., & Ghahramani, Z. (2016)",
              journal: "International Conference on Machine Learning (ICML)",
              doi: "10.48550/arXiv.1506.02142",
              link: "https://arxiv.org/abs/1506.02142"
            },
            {
              title: "What Uncertainties Do We Need in Bayesian Deep Learning for Computer Vision?",
              authors: "Kendall, A., & Gal, Y. (2017)",
              journal: "Advances in Neural Information Processing Systems (NeurIPS)",
              doi: "10.48550/arXiv.1703.04977",
              link: "https://arxiv.org/abs/1703.04977"
            }
          ].map(paper => (
            <div key={paper.doi} style={{ padding:24, background:C.bg2, borderRadius:16, border:`1px solid ${C.border}` }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:C.textHi, marginBottom:8, lineHeight:1.4 }}>{paper.title}</h3>
              <div style={{ fontSize:12, color:C.amber, marginBottom:4, fontWeight:600 }}>{paper.authors}</div>
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
