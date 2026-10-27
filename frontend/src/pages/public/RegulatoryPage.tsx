// SEWA XAI — RegulatoryPage.tsx
// Compliance, Security, and Clinical Safety documentation
import React from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandDk:'#2E6B5E',brandLt:'#52B09A',
  normal:'#1DBF73',info:'#2A6EF2',critical:'#E03535',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",FM:"'IBM Plex Mono',monospace",
};

export function RegulatoryPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 600px) {
          .hero-btns { flex-direction: column !important; }
          .hero-btns > button { width: 100% !important; }
          .compliance-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <PublicNav activePage="compliance" onNavigate={onNavigate} />

      {/* Hero */}
      <section style={{ padding:'clamp(80px, 15vh, 120px) 24px 80px', textAlign:'center', background:`linear-gradient(180deg,${C.bg1},${C.bg0})` }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <h1 style={{ fontSize:'clamp(32px, 8vw, 56px)', fontWeight:900, color:C.textHi, margin:'0 0 20px', letterSpacing:'-2px', lineHeight:1.1 }}>
            Enterprise-grade safety.<br/>
            <span style={{ color:C.brand }}>Clinical-grade trust.</span>
          </h1>
          <p style={{ fontSize:'clamp(15px, 2.5vw, 18px)', color:C.textMd, lineHeight:1.7, margin:'0 0 40px' }}>
            SEWA XAI is designed against clinical and data-security standards. We are pre-clinical: the items below are aligned-with, in preparation, or planned unless a certification is explicitly stated.
          </p>
        </div>
      </section>

      {/* Compliance Grid */}
      <section className="compliance-grid" style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 80px', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:24 }}>
        {[
          { t:'NHS DTAC & DSPT', d:'Aligned with UK NHS Digital Technology Assessment Criteria and Data Security & Protection Toolkit requirements (assessment in preparation).', icon:'🇬🇧' },
          { t:'GDPR & DPA 2018', d:'Designed around GDPR and DPA 2018 requirements; a Data Processing Agreement is available with clients.', icon:'🇪🇺' },
          { t:'HIPAA', d:'HIPAA-aligned controls (in preparation). No certification is claimed.', icon:'🇺🇸' },
          { t:'ISO 13485:2016', d:'Quality Management System designed around ISO 13485 requirements (certification planned).', icon:'🔬' },
          { t:'EU MDR Class IIb', d:'EU MDR Class IIb regulatory pathway planned. No certification or CE mark is claimed.', icon:'🩺' },
          { t:'Cyber Essentials Plus', d:'Cyber Essentials Plus is planned; the organisation is not yet certified.', icon:'🛡️' },
        ].map(item => (
          <div key={item.t} style={{ padding:32, background:C.bg2, borderRadius:20, border:`1px solid ${C.border}` }}>
             <div style={{ fontSize:32, marginBottom:16 }}>{item.icon}</div>
             <h3 style={{ fontSize:16, fontWeight:700, color:C.textHi, marginBottom:12 }}>{item.t}</h3>
             <p style={{ fontSize:13, color:C.textMd, lineHeight:1.6, margin:0 }}>{item.d}</p>
          </div>
        ))}
      </section>

      {/* Clinical Safety Block */}
      <section style={{ background:C.bg1, padding:'80px 24px', borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <h2 style={{ fontSize:32, fontWeight:800, color:C.textHi, marginBottom:32 }}>DCB0129 Clinical Safety</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div style={{ padding:24, background:C.bg2, borderRadius:16, border:`1px solid ${C.border}` }}>
               <h3 style={{ fontSize:16, fontWeight:700, color:C.brand, marginBottom:12 }}>Hazard Log & Mitigation</h3>
               <p style={{ fontSize:14, color:C.textMd, lineHeight:1.7 }}>
                 A Clinical Safety Officer (CSO) role and hazard-log process are being established as part of DCB0129 alignment (in preparation). Uncertainty and metacognition components are intended as safety interlocks; their clinical benefit has not yet been demonstrated.
               </p>
            </div>
             <div style={{ padding:24, background:C.bg2, borderRadius:16, border:`1px solid ${C.border}` }}>
                <h3 style={{ fontSize:16, fontWeight:700, color:C.brand, marginBottom:12 }}>Bias Monitoring</h3>
                <p style={{ fontSize:14, color:C.textMd, lineHeight:1.7 }}>
                  Drift-monitoring code is implemented but reports <em>insufficient data</em> below the configured sample thresholds. No demographic performance or equity claim is made; the current evaluation uses public RSNA and CQ500 data only.
                </p>
             </div>
          </div>
          <div style={{ marginTop:48, padding:24, background:`${C.brand}08`, border:`1px solid ${C.brand}30`, borderRadius:16, textAlign:'center' }}>
            <p style={{ fontSize:13, color:C.textHi, fontWeight:600, lineHeight:1.6, margin:0 }}>
              The SEWA XAI multi-engine architecture, metacognition safety layer, federated learning subsystem, and sovereign deployment architecture are the sole invention of <strong style={{ color:C.brand }}>Dolapo Ariyo</strong>, protected by UK Provisional Patent Application (UKIPO, March 2026).
            </p>
          </div>
        </div>
      </section>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
