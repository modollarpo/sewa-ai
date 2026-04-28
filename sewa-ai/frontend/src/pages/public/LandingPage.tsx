// SEWA AI — LandingPage.tsx
// Clinical, enterprise public landing page — NHS-ready, global healthcare AI platform
import React, { useState, useEffect } from 'react';
import { ClinicalDemoModal } from '../../components/public/ClinicalDemoModal';

const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A',
  brand:'#408D7B', brandLt:'#52B09A', brandDk:'#2E6B5E',
  critical:'#E03535', normal:'#1DBF73', normalBg:'rgba(29,191,115,0.1)', info:'#2A6EF2',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028',
  F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

const FEATURES = [
  { id:'triage-ai',          icon:'⚡', title:'Triage in Seconds', desc:'EfficientNet-B4 deep learning detects ICH, PE, pneumothorax, TB and stroke with AUC > 0.95 in under 2 seconds.', tag:'Triage Engine' },
  { id:'uncertainty-ai',     icon:'🎯', title:'Uncertainty Engine', desc:'Stochastic Monte Carlo dropout with multi-pass uncertainty quantification computes epistemic and aleatoric uncertainty. Flags low-confidence scans for human review.', tag:'Safety' },
  { id:'metacognition-ai',   icon:'🧠', title:'Metacognition AI', desc:'Advanced multi-layer self-evaluation detects hallucinations before reports reach clinicians. Confidence integrity score per result.', tag:'Quality Assurance' },
  { id:'vision-language-ai', icon:'📋', title:'VLM Report Generator', desc:'Vision-Language Model generates structured, editable radiology reports in seconds — with clinical findings, impression, and recommendations.', tag:'Reporting' },
  { id:'explainable-ai',     icon:'🔒', title:'Explainable AI', desc:'Grad-CAM pixel attribution show exactly what the AI detected and why — pixel by pixel.', tag:'Explainability' },
  { id:'downloads',          icon:'🌍', title:'Global Deployment', desc:'Multi-region on Azure (UK, EU, US, Africa). Data residency, compliance, and billing adapted per region automatically.', tag:'Infrastructure' },
];

const STATS = [
  { value:'>0.95', label:'AUC-ROC on ICH detection', icon:'🎯' },
  { value:'<2s',  label:'Median triage inference time', icon:'⚡' },
  { value:'7+',   label:'Global deployment regions', icon:'🌍' },
  { value:'99.9%',label:'Platform uptime SLA', icon:'✅' },
];

const COMPLIANCE = [
  { label:'NHS DSPT', flag:'🇬🇧', desc:'UK Digital' },
  { label:'GDPR', flag:'🇪🇺', desc:'EU Privacy' },
  { label:'HIPAA', flag:'🇺🇸', desc:'US Health' },
  { label:'MDR IIb', flag:'🔬', desc:'EU Medical' },
  { label:'EU AI Act', flag:'🤖', desc:'High-Risk AI' },
  { label:'FDA 510(k)', flag:'💊', desc:'US Device' },
  { label:'ISO 13485', flag:'🏭', desc:'Quality Mgmt' },
  { label:'NDPR', flag:'🇳🇬', desc:'Nigeria' },
];

import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

export function LandingPage({ onLogin, onNavigate }: { onLogin:()=>void, onNavigate:(p:string)=>void }) {
  const [demoEmail, setDemoEmail] = useState('');
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoFocus, setDemoFocus] = useState(false);
  const [counter, setCounter] = useState(0);
  const [showDemo, setShowDemo] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 400);
    window.addEventListener('scroll', h);
    const target = 18340;
    const step = Math.ceil(target / 60);
    const interval = setInterval(() => {
      setCounter(c => { if (c >= target) { clearInterval(interval); return target; } return Math.min(target, c+step); });
    }, 30);
    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', h);
    };
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div style={{ background:C.bg0, color:C.textHi, fontFamily:C.F, minHeight:'100vh' }}>
      <style>{`
        @media (max-width: 768px) {
          .grid-3 { grid-template-columns: 1fr !important; }
          .grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
          .hero-stats { gap: 16px !important; }
          .compliance-row { padding: 24px 20px !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .hero-btns { flex-direction: column !important; }
          .hero-btns > button { width: 100% !important; }
        }
        @media (max-width: 480px) {
          .grid-4 { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr !important; }
        }
        @keyframes bounce-in {
          from { opacity: 0; transform: scale(0.3) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      
      <PublicNav activePage="landing" onNavigate={onNavigate} />

      {/* HERO */}
      <section style={{ minHeight:'90vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'120px 20px 80px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
          <div style={{ position:'absolute', top:'10%', left:'5%', width:300, height:300, borderRadius:'50%', background:`radial-gradient(circle,${C.brand}08,transparent)` }}/>
          <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.04 }} viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
            <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#408D7B" strokeWidth="0.5"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>

        <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:20, background:`${C.brand}14`, border:`1px solid ${C.brand}40`, marginBottom:24, fontSize:12, color:C.brand, fontWeight:600 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:C.brand, boxShadow:`0 0 8px ${C.brand}`, animation:'livePulse 1.5s infinite' }}/>
          {counter.toLocaleString()} scans processed today
        </div>

        <h1 style={{ margin:'0 0 20px', fontSize:'clamp(34px, 7vw, 64px)', fontWeight:900, lineHeight:1, letterSpacing:'-0.04em', maxWidth:900 }}>
          From Hours to Seconds:<br/>
          <span style={{ background:`linear-gradient(135deg,${C.brand},${C.brandLt})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            Diagnostic Intelligence
          </span>
          {' '}at Scale
        </h1>

        <p style={{ fontSize:'clamp(16px, 2.5vw, 20px)', color:C.textMd, maxWidth:680, lineHeight:1.6, margin:'0 0 40px' }}>
          NHS-certified clinical AI detecting critical findings in under 2 seconds. Uncertainty quantification, autonomous VLM reporting, and pixel-level explainability.
        </p>

        <div className="hero-btns" style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center', marginBottom:60 }}>
          <button onClick={onLogin} style={{ padding:'16px 32px', background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, border:'none', borderRadius:14, color:'white', fontSize:16, fontWeight:700, cursor:'pointer', fontFamily:C.F, boxShadow:`0 8px 32px ${C.brand}50` }}>
            Sign In →
          </button>
          <button onClick={() => onNavigate('register')} style={{ padding:'16px 32px', background:C.bg2, border:`1px solid ${C.brand}60`, borderRadius:14, color:C.brand, fontSize:16, fontWeight:700, cursor:'pointer', fontFamily:C.F }}>
            Join Platform
          </button>
          <button onClick={() => setShowDemo(true)} style={{ padding:'16px 32px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:14, color:C.textMd, fontSize:16, cursor:'pointer', fontFamily:C.F }}>
            ▶ Watch Demo
          </button>
        </div>

        {/* Stats strip */}
        <div className="hero-stats" style={{ display:'flex', gap:'clamp(16px, 4vw, 48px)', flexWrap:'wrap', justifyContent:'center' }}>
          {STATS.map(s=>(
            <div key={s.label} style={{ textAlign:'center', minWidth:'clamp(100px, 20vw, 140px)' }}>
              <div style={{ fontSize:'clamp(24px, 5vw, 32px)', fontWeight:900, color:C.brand, fontFamily:C.FM, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:11, color:C.textLo, marginTop:6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMPLIANCE STRIP */}
      <div className="compliance-row" style={{ padding:'24px 50px', background:C.bg1, borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <span style={{ fontSize:12, color:C.textLo, marginRight:8, letterSpacing:'0.06em', textTransform:'uppercase', fontWeight:700 }}>Security & Compliance</span>
          {COMPLIANCE.map(c=>(
            <div key={c.label} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20, background:C.bg2, border:`1px solid ${C.border}`, fontSize:12, color:C.textMd }}>
              <span>{c.flag}</span><span style={{ fontWeight:700 }}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section style={{ padding:'100px 5%', maxWidth:1300, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:64 }}>
          <div style={{ fontSize:12, color:C.brand, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:12 }}>Deep Learning Stack</div>
          <h2 style={{ margin:0, fontSize:'clamp(28px,4.5vw,42px)', fontWeight:900, letterSpacing:'-0.03em', lineHeight:1.1 }}>
            Enterprise-grade clinical intelligence
          </h2>
        </div>

        <div className="grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:20 }}>
          {FEATURES.map(f=>(
            <div key={f.title} onClick={() => onNavigate(f.id)} 
              style={{ padding:32, background:C.bg2, borderRadius:20, border:`1px solid ${C.border}`, transition:'all 200ms', cursor:'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.brand; e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <span style={{ fontSize:36 }}>{f.icon}</span>
                <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:`${C.brand}14`, color:C.brand, border:`1px solid ${C.brand}30` }}>{f.tag}</span>
              </div>
              <h3 style={{ margin:'0 0 10px', fontSize:18, fontWeight:800, color:C.textHi }}>{f.title}</h3>
              <p style={{ margin:0, fontSize:14, color:C.textMd, lineHeight:1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* REGIONS */}
      <section style={{ padding:'80px 5%', background:C.bg1, borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <h2 style={{ margin:0, fontSize:32, fontWeight:900, letterSpacing:'-0.03em' }}>Global Presence</h2>
            <p style={{ margin:'12px 0 0', fontSize:15, color:C.textMd }}>Ensuring localized data residency and clinical oversight</p>
          </div>
          <div className="grid-4" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:16 }}>
            {[
              { flag:'🇬🇧', region:'United Kingdom', details:'NHS DSPT · GDPR · UK South', payment:'Stripe GBP', scans:'4.8K/day' },
              { flag:'🇪🇺', region:'European Union', details:'MDR IIb · EU AI Act · West Europe', payment:'Stripe EUR', scans:'3.6K/day' },
              { flag:'🇺🇸', region:'North America', details:'HIPAA · FDA 510(k) · AWS US-East', payment:'Stripe USD', scans:'6.2K/day' },
              { flag:'🇳🇬', region:'Nigeria', details:'NDPR · ISO 13485 · SA North', payment:'Paystack NGN', scans:'2.1K/day' },
              { flag:'🇰🇪', region:'Kenya', details:'DPA 2019 · Azure SA North', payment:'M-Pesa KES', scans:'1.3K/day' },
              { flag:'🇿🇦', region:'South Africa', details:'POPIA · Azure SA North', payment:'Paystack ZAR', scans:'0.8K/day' },
              { flag:'🇬🇭', region:'Ghana', details:'DPA 2012 · Cloud GHS', payment:'Flutterwave GHS', scans:'0.4K/day' },
              { flag:'🇮🇳', region:'India', details:'DPDP 2023 · Central India', payment:'Stripe INR', scans:'Coming 2026' },
            ].map(r=>(
              <div key={r.region} style={{ padding:20, background:C.bg2, borderRadius:16, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:32, marginBottom:12 }}>{r.flag}</div>
                <div style={{ fontSize:15, fontWeight:800, color:C.textHi, marginBottom:6 }}>{r.region}</div>
                <div style={{ fontSize:11, color:C.textLo, lineHeight:1.5 }}>{r.details}</div>
                <div style={{ marginTop:10, fontSize:11, color:C.brand, fontWeight:600 }}>{r.payment}</div>
                <div style={{ fontSize:11, color:C.textMd, marginTop:4 }}>{r.scans}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO REQUEST */}
      <section style={{ padding:'100px 5%', textAlign:'center' }}>
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          <h2 style={{ margin:'0 0 16px', fontSize:'clamp(24px, 4vw, 38px)', fontWeight:900, letterSpacing:'-0.03em' }}>
            Transform your clinical workflow
          </h2>
          <p style={{ margin:'0 0 40px', fontSize:15, color:C.textMd, lineHeight:1.7 }}>
            Schedule a session with our clinical engineers to see the SEWA AI platform in action within your existing medical imaging ecosystem.
          </p>
          {!demoSubmitted ? (
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
              <input
                type="email" value={demoEmail} onChange={e=>setDemoEmail(e.target.value)}
                placeholder="Work email address"
                onFocus={()=>setDemoFocus(true)} onBlur={()=>setDemoFocus(false)}
                style={{ flex:'1 1 300px', maxWidth:400, height:52, padding:'0 20px', background:C.bg2, border:`1px solid ${demoFocus?C.brand:C.border}`, borderRadius:14, color:C.textHi, fontSize:15, fontFamily:C.F, outline:'none' }}
              />
              <button
                onClick={async ()=>{
                  if(!demoEmail) return;
                  setDemoSubmitted(true);
                  try {
                    await fetch('/api/v1/onboarding/lead', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: demoEmail, source: 'landing_demo' })
                    });
                  } catch (e) { console.error('Demo lead capture failed'); }
                }}
                style={{ padding:'0 32px', height:52, background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, border:'none', borderRadius:14, color:'white', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:C.F, boxShadow:`0 4px 16px ${C.brand}40`, whiteSpace:'nowrap' }}>
                Book Demo Now
              </button>
            </div>
          ) : (
            <div style={{ padding:24, background:C.normalBg, borderRadius:16, border:`1px solid ${C.normal}30` }}>
              <div style={{ fontSize:16, fontWeight:800, color:C.normal, marginBottom:8 }}>✓ Submission successful</div>
              <div style={{ fontSize:14, color:C.textMd }}>We've received your request. A clinical coordinator will be in touch shortly.</div>
            </div>
          )}
        </div>
      </section>

      <PublicFooter onNavigate={onNavigate} />

      {/* Back to Top Button */}
      {scrolled && (
        <button 
          onClick={scrollToTop}
          style={{
            position:'fixed', bottom:30, right:30, width:48, height:48, borderRadius:'50%',
            background:`${C.bg2}D0`, border:`1px solid ${C.border}`, color:C.textHi,
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
            zIndex:90, backdropFilter:'blur(8px)', boxShadow:'0 8px 24px rgba(0,0,0,0.3)',
            animation: 'bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 15l-6-6-6 6"/></svg>
        </button>
      )}

      {showDemo && <ClinicalDemoModal onClose={() => setShowDemo(false)} />}
    </div>
  );
}


