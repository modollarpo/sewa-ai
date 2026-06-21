// SEWA AI — CareersPage.tsx
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.
import React, { useState } from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
const C = { bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', brand:'#408D7B', brandLight:'#52B09A', textHigh:'#D0ECE6', textMed:'#6FA898', textLow:'#3A6055', border:'#1B3028', F:"'IBM Plex Sans',system-ui,sans-serif" };
const ROLES = [
  { id:1, title:'Senior ML Engineer — Triage Models', dept:'Engineering', location:'Remote · UK/EU', type:'Full-time', priority:true, salary:'£85–110K', desc:'Lead development of SEWA AI\'s EfficientNet-B4 triage engine. PyTorch, medical imaging, production ML systems.' },
  { id:2, title:'VP Clinical Affairs', dept:'Regulatory', location:'London · Hybrid', type:'Full-time', priority:true, salary:'£90–120K', desc:'Lead clinical validation strategy, regulatory submissions (FDA, NICE HTA, EU MDR), and NHS Trust relationships.' },
  { id:3, title:'Clinical Sales Manager — NHS', dept:'Commercial', location:'London · Field', type:'Full-time', priority:true, salary:'£70–90K + OTE', desc:'Own NHS Trust pipeline. G-Cloud 14 procurement expertise. Radiologist clinical champion development.' },
  { id:4, title:'ML Engineer — VLM / NLP', dept:'Engineering', location:'Remote · UK/EU', type:'Full-time', priority:false, salary:'£75–100K', desc:'Build and improve the VLM report generator. Fine-tune Llama-3 with clinical LoRA adaptors.' },
  { id:5, title:'Africa Programme Lead', dept:'Operations', location:'Lagos or Nairobi', type:'Full-time', priority:true, salary:'Competitive', desc:'Lead SEWA AI\'s Africa deployment programme. LUTH Nigeria and KNH Kenya anchor sites. Edge deployment.' },
  { id:6, title:'Backend Engineer — FHIR/HL7', dept:'Engineering', location:'Remote', type:'Full-time', priority:false, salary:'£75–95K', desc:'Build and maintain FHIR R4, HL7v2, and DICOM integration layer. TypeScript, Node.js, Prisma.' },
];
const DEPTS = ['All',...[...new Set(ROLES.map(r=>r.dept))]];
export function CareersPage({ onNavigate }:{ onNavigate:(p:string)=>void }) {
  const [dept, setDept] = useState('All');
  const filtered = dept==='All' ? ROLES : ROLES.filter(r=>r.dept===dept);
  return (
    <PublicLayout activePage="careers" onNavigate={onNavigate}>
      <section style={{ background:`linear-gradient(135deg,${C.bg0},${C.bg1})`, padding:'52px clamp(16px,5vw,80px) 44px', borderBottom:`1px solid ${C.border}` }}>
        <h1 style={{ fontSize:'clamp(26px,4vw,40px)', fontWeight:900, color:C.textHigh, fontFamily:C.F, margin:'0 0 12px' }}>Join SEWA AI</h1>
        <p style={{ fontSize:15, color:C.textMed, maxWidth:560, lineHeight:1.75, margin:0 }}>Build the AI that saves lives in NHS hospitals and African clinics. Remote-first, mission-driven, equity for everyone.</p>
      </section>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'40px clamp(16px,5vw,48px) 80px' }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:32 }}>
          {DEPTS.map(d=>(
            <button key={d} onClick={()=>setDept(d)} style={{ padding:'6px 16px', borderRadius:20, border:`1px solid ${dept===d?C.brand:C.border}`, background:dept===d?`${C.brand}18`:'transparent', color:dept===d?C.brandLight:C.textMed, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:C.F }}>{d}</button>
          ))}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {filtered.map(role=>(
            <div key={role.id} style={{ background:C.bg1, borderRadius:14, padding:24, border:`1px solid ${role.priority?C.brand+'40':C.border}`, display:'flex', gap:20, alignItems:'flex-start' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
                  <h3 style={{ fontSize:17, fontWeight:800, color:C.textHigh, fontFamily:C.F, margin:0 }}>{role.title}</h3>
                  {role.priority&&<span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:`${C.brand}20`, color:C.brandLight, border:`1px solid ${C.brand}40` }}>PRIORITY</span>}
                </div>
                <div style={{ display:'flex', gap:16, marginBottom:12, flexWrap:'wrap' }}>
                  {[role.dept, role.location, role.type, role.salary].map(t=>(
                    <span key={t} style={{ fontSize:12, color:C.textMed }}>• {t}</span>
                  ))}
                </div>
                <p style={{ fontSize:13, color:C.textMed, lineHeight:1.7, margin:0 }}>{role.desc}</p>
              </div>
              <a href={`mailto:info@sewaxai.health?subject=Application: ${role.title}`} style={{ padding:'10px 20px', background:C.brand, color:'#fff', borderRadius:10, textDecoration:'none', fontSize:13, fontWeight:700, flexShrink:0 }}>Apply →</a>
            </div>
          ))}
        </div>
        <p style={{ fontSize:11, color:C.textLow, marginTop:40, textAlign:'center' }}>© 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.</p>
      </div>
    </PublicLayout>
  );
}

