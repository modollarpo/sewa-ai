// SEWA XAI — PressPage.tsx
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.
import React from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
const C = { bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', brand:'#408D7B', brandLight:'#52B09A', textHigh:'#D0ECE6', textMed:'#6FA898', textLow:'#3A6055', border:'#1B3028', F:"'IBM Plex Sans',system-ui,sans-serif" };
const RELEASES = [
  { date:'March 2026', headline:'SEWA XAI Opens £1.5M Seed Round to Accelerate AI-Assisted Radiology Across NHS and Africa', body:`Storegrill Inc Ltd today announced the opening of its seed round as SEWA XAI works towards its first hospital deployments. Deployment counts are published once sites are live.` },
  { date:'February 2026', headline:'SEWA XAI Announces Proof-of-Concept Plans at Royal London Hospital', body:`SEWA XAI is working with Royal London Hospital on a proof-of-concept for its ICH triage pipeline. No clinical results have been published yet; performance figures will be released with the study.` },
  { date:'January 2026', headline:'SEWA XAI Engaging with the NHS Innovation Service', body:`SEWA XAI is supported by the NHS Innovation Service (INN-2604-0064-2) and is progressing through the regulatory pathways required before full commercial deployment.` },
  { date:'December 2025', headline:'SEWA XAI in Pilot Discussions with LUTH Nigeria and Kenyatta National Hospital', body:`SEWA XAI's offline-first edge deployment is in pilot discussions with LUTH Nigeria and Kenyatta National Hospital, Kenya, targeting AI-assisted radiology for hospitals with limited connectivity.` },
];
const COVERAGE = [
  { outlet:'No third-party media coverage published yet', headline:'All press material on this page is drafted by SEWA XAI. Outlet coverage will be listed here once independently published.', date:'' },
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
        <p style={{ fontSize:11, color:C.textLow, marginTop:40, textAlign:'center' }}>© 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.</p>
      </div>
    </PublicLayout>
  );
}

