// SEWA AI — SitemapPage.tsx
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.
import React from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
const C = { bg0:'#050F0C', bg1:'#08160F', brand:'#408D7B', brandLight:'#52B09A', textHigh:'#D0ECE6', textMed:'#6FA898', textLow:'#3A6055', border:'#1B3028', F:"'IBM Plex Sans',system-ui,sans-serif" };
const SECTIONS = [
  { title:'Product', links:[['landing','Home'],['solutions','Solutions'],['pricing','Pricing'],['downloads','Downloads']].map(([p,l])=>({page:p,label:l})) },
  { title:'Clinical', links:[['clinical-validation','Clinical Validation'],['whitepaper','Technical Whitepaper'],['security','Security']].map(([p,l])=>({page:p,label:l})) },
  { title:'Company', links:[['about','About'],['careers','Careers'],['press','Press'],['contact','Contact']].map(([p,l])=>({page:p,label:l})) },
  { title:'Legal', links:[['privacy-policy','Privacy Policy'],['terms','Terms'],['cookie-policy','Cookie Policy'],['accessibility','Accessibility']].map(([p,l])=>({page:p,label:l})) },
];
export function SitemapPage({ onNavigate }:{ onNavigate:(p:string)=>void }) {
  return (
    <PublicLayout activePage="sitemap" onNavigate={onNavigate}>
      <section style={{ background:`linear-gradient(135deg,${C.bg0},${C.bg1})`, padding:'52px clamp(16px,5vw,80px) 44px', borderBottom:`1px solid ${C.border}` }}>
        <h1 style={{ fontSize:'clamp(26px,4vw,40px)', fontWeight:900, color:C.textHigh, fontFamily:C.F, margin:0 }}>Site Map</h1>
      </section>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'40px clamp(16px,5vw,48px) 80px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:24 }}>
          {SECTIONS.map(sec=>(
            <div key={sec.title}>
              <h3 style={{ fontSize:12, fontWeight:700, color:C.textLow, letterSpacing:1.5, textTransform:'uppercase', marginBottom:12, fontFamily:C.F }}>{sec.title}</h3>
              <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:8 }}>
                {sec.links.map(l=>(
                  <li key={l.page}>
                    <button onClick={()=>onNavigate(l.page)} style={{ background:'none', border:'none', color:C.textHigh, fontSize:14, cursor:'pointer', fontFamily:C.F, padding:0, textDecoration:'underline', textDecorationColor:C.border }}>
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p style={{ fontSize:11, color:C.textLow, marginTop:40, textAlign:'center' }}>© 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.</p>
      </div>
    </PublicLayout>
  );
}

