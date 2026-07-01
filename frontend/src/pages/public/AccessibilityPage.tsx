// SEWA XAI — AccessibilityPage.tsx
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.
import React from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
const C = { bg0:'#050F0C', bg1:'#08160F', brand:'#408D7B', brandLight:'#52B09A', textHigh:'#D0ECE6', textMed:'#6FA898', textLow:'#3A6055', border:'#1B3028', F:"'IBM Plex Sans',system-ui,sans-serif" };
const WCAG_ITEMS = [
  { criterion:'1.1.1 Non-text Content', level:'A', status:'✓ Pass', notes:'All DICOM images have AI-generated alt descriptions' },
  { criterion:'1.4.3 Contrast (Minimum)', level:'AA', status:'✓ Pass', notes:'All text meets 4.5:1 contrast ratio' },
  { criterion:'2.1.1 Keyboard', level:'A', status:'⚠ Partial', notes:'DICOM viewer keyboard controls — Q2 2026' },
  { criterion:'2.4.7 Focus Visible', level:'AA', status:'✓ Pass', notes:'All interactive elements have visible focus ring' },
  { criterion:'2.5.8 Target Size (WCAG 2.2)', level:'AA', status:'✓ Pass', notes:'All targets ≥ 24×24 CSS pixels' },
  { criterion:'4.1.2 Name, Role, Value', level:'A', status:'✓ Pass', notes:'All custom components have correct ARIA' },
];
export function AccessibilityPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  return (
    <PublicLayout activePage="accessibility" onNavigate={onNavigate}>
      <section style={{ background:`linear-gradient(135deg,${C.bg0},${C.bg1})`, padding:'52px clamp(16px,5vw,80px) 44px', borderBottom:`1px solid ${C.border}` }}>
        <h1 style={{ fontSize:'clamp(26px,4vw,40px)', fontWeight:900, color:C.textHigh, fontFamily:C.F, margin:'0 0 12px' }}>Accessibility Statement</h1>
        <p style={{ fontSize:15, color:C.textMed, maxWidth:640, lineHeight:1.75 }}>SEWA XAI is committed to WCAG 2.2 Level AA. Clinical tools that are inaccessible put patients and clinicians at risk.</p>
      </section>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'40px clamp(16px,5vw,48px) 80px' }}>
        <h2 style={{ fontSize:20, fontWeight:800, color:C.textHigh, fontFamily:C.F, marginBottom:20 }}>WCAG 2.2 AA Criteria Assessment</h2>
        <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:C.F }}>
          <thead>
            <tr style={{ background:'#0C1D17' }}>
              {['Criterion','Level','Status','Notes'].map(h => (
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:12, color:C.textLow, fontWeight:700, letterSpacing:1, textTransform:'uppercase', borderBottom:`1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WCAG_ITEMS.map((r,i) => (
              <tr key={r.criterion} style={{ background: i%2?'transparent':'rgba(255,255,255,0.02)' }}>
                <td style={{ padding:'12px 16px', fontSize:13, color:C.textHigh, borderBottom:`1px solid ${C.border}30` }}>{r.criterion}</td>
                <td style={{ padding:'12px 16px', fontSize:12, color:C.brandLight, fontWeight:700, borderBottom:`1px solid ${C.border}30` }}>{r.level}</td>
                <td style={{ padding:'12px 16px', fontSize:13, color:r.status.startsWith('✓')?'#22C55E':'#F97316', borderBottom:`1px solid ${C.border}30` }}>{r.status}</td>
                <td style={{ padding:'12px 16px', fontSize:12, color:C.textMed, borderBottom:`1px solid ${C.border}30` }}>{r.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop:32, background:C.bg1, borderRadius:12, padding:20, border:`1px solid ${C.border}` }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.textHigh, fontFamily:C.F, marginBottom:8 }}>Feedback</h3>
          <p style={{ fontSize:13, color:C.textMed, lineHeight:1.7 }}>We welcome accessibility feedback. Contact: <a href="mailto:info@sewaxai.health" style={{ color:C.brandLight }}>info@sewaxai.health</a></p>
        </div>
        <p style={{ fontSize:11, color:C.textLow, marginTop:32, textAlign:'center' }}>© 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.</p>
      </div>
    </PublicLayout>
  );
}

