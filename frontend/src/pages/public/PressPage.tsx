// SEWA AI — PressPage.tsx
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.
import React from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
const C = { bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', brand:'#408D7B', brandLight:'#52B09A', textHigh:'#D0ECE6', textMed:'#6FA898', textLow:'#3A6055', border:'#1B3028', F:"'IBM Plex Sans',system-ui,sans-serif" };
const RELEASES = [
  { date:'March 2026', headline:'SEWA AI Opens £1.5M Seed Round to Accelerate AI-Assisted Radiology Across NHS and Africa', body:`Storegrill Inc Ltd today announced the opening of its seed round as SEWA AI expands to 47 hospital deployments across 7 countries.` },
  { date:'February 2026', headline:'SEWA AI Completes Proof of Concept at Royal London Hospital, Reducing ICH Alert Time from Hours to Seconds', body:`SEWA AI successfully completed a 3,400-case pilot at Royal London Hospital, achieving a median door-to-alert time of 1.84 seconds with zero adverse events.` },
  { date:'January 2026', headline:'SEWA AI Accepted into NHS Innovation Accelerator Programme 2026 Cohort', body:`NHS England announced SEWA AI as one of 24 innovations selected for the NHS Innovation Accelerator 2026 cohort.` },
  { date:'December 2025', headline:'SEWA AI Deploys at LUTH Nigeria and Kenyatta National Hospital', body:`SEWA AI's offline-first edge deployment is now operational at LUTH Nigeria and Kenyatta National Hospital, Kenya, providing AI-assisted radiology to hospitals with limited connectivity.` },
];
const COVERAGE = [
  { outlet:'Health Tech World', headline:'The clinical AI tackling the NHS radiology crisis', date:'Feb 2026' },
  { outlet:'The BMJ', headline:'AI hallucination detection: how SEWA AI catches its own errors', date:'Jan 2026' },
  { outlet:'MedCity News', headline:'African hospitals get AI radiology — even without internet', date:'Dec 2025' },
];
export function PressPage({ onNavigate }:{ onNavigate:(p:string)=>void }) {
  return (
    <PublicLayout activePage="press" onNavigate={onNavigate}>
      <section style={{ background:`linear-gradient(135deg,${C.bg0},${C.bg1})`, padding:'52px clamp(16px,5vw,80px) 44px', borderBottom:`1px solid ${C.border}` }}>
        <h1 style={{ fontSize:'clamp(26px,4vw,40px)', fontWeight:900, color:C.textHigh, fontFamily:C.F, margin:'0 0 12px' }}>Press & Media</h1>
        <p style={{ fontSize:15, color:C.textMed, lineHeight:1.75, margin:0 }}>Press enquiries: <a href="mailto:info@sewaxai.health" style={{ color:C.brandLight }}>info@sewaxai.health</a></p>
      </section>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'40px clamp(16px,5vw,48px) 80px' }}>
        <h2 style={{ fontSize:20, fontWeight:800, color:C.textHigh, fontFamily:C.F, marginBottom:20 }}>Press Releases</h2>
        <div style={{ display:'flex', flexDirection:'column', gap:16, marginBottom:48 }}>
          {RELEASES.map((r,i)=>(
            <div key={i} style={{ background:C.bg1, borderRadius:14, padding:24, border:`1px solid ${C.border}` }}>
              <span style={{ fontSize:11, color:C.textLow, marginBottom:8, display:'block' }}>{r.date}</span>
              <h3 style={{ fontSize:16, fontWeight:800, color:C.textHigh, fontFamily:C.F, margin:'0 0 10px' }}>{r.headline}</h3>
              <p style={{ fontSize:13, color:C.textMed, lineHeight:1.7, margin:0 }}>{r.body}</p>
            </div>
          ))}
        </div>
        <h2 style={{ fontSize:20, fontWeight:800, color:C.textHigh, fontFamily:C.F, marginBottom:20 }}>Media Coverage</h2>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {COVERAGE.map((c,i)=>(
            <div key={i} style={{ background:C.bg1, borderRadius:12, padding:'16px 20px', border:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <span style={{ fontSize:11, fontWeight:700, color:C.brandLight, marginRight:12 }}>{c.outlet}</span>
                <span style={{ fontSize:13, color:C.textHigh }}>{c.headline}</span>
              </div>
              <span style={{ fontSize:11, color:C.textLow, flexShrink:0, marginLeft:16 }}>{c.date}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize:11, color:C.textLow, marginTop:40, textAlign:'center' }}>© 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.</p>
      </div>
    </PublicLayout>
  );
}

