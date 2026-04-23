// SEWA AI — BlogPage.tsx
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.
import React, { useState } from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { colors, typography } from '../../design-system/tokens';
const C = colors; const T = typography;
const POSTS = [
  { id:1, date:'March 2026', tag:'Engineering', author:'Dolapo Ariyo', readTime:'8 min',
    title:`Why 96.2% sensitivity isn't enough — the case for uncertainty quantification in medical AI`,
    excerpt:`Most clinical AI platforms report accuracy metrics. None tell you when they're uncertain. Here's why that matters for patient safety, and how SEWA AI\'s Uncertainty Engine changes the equation.` },
  { id:2, date:'February 2026', tag:'NHS', author:'Dr. Adesewa Dairo', readTime:'6 min',
    title:`G-Cloud 14 for clinical AI: what every NHS procurement team needs to know`,
    excerpt:`NHS Trusts can deploy SEWA AI in under 5 business days without competitive tender. Here's exactly how G-Cloud 14 procurement works for medical AI platforms.` },
  { id:3, date:'February 2026', tag:'Regulatory', author:'Dolapo Ariyo', readTime:'10 min',
    title:`EU AI Act Article 14: the human oversight requirement that will reshape clinical AI in 2026`,
    excerpt:`EU AI Act enforcement begins August 2026. Article 14 requires human oversight for High-Risk AI — and most clinical AI vendors aren't compliant. SEWA AI was built for it.` },
  { id:4, date:'January 2026', tag:'Africa', author:'Dolapo Ariyo', readTime:'7 min',
    title:`Building clinical AI for no internet: the engineering behind SEWA AI\'s edge deployment`,
    excerpt:`70% of African hospitals can't rely on consistent internet. Our Go DICOM service runs on under 20MB RAM, works completely offline, and syncs to the cloud when connectivity resumes.` },
  { id:5, date:'December 2025', tag:'Engineering', author:'Dolapo Ariyo', readTime:'5 min',
    title:`What is metacognition in AI? How SEWA AI catches its own hallucinations`,
    excerpt:`Large language models hallucinate. Clinical AI hallucinations can harm patients. The Metacognition Engine catches 96.3% of hallucinations before they reach clinicians.` },
  { id:6, date:'November 2025', tag:'Africa', author:'Dr. Adesewa Dairo', readTime:'9 min',
    title:`1 radiologist per 275,000 people: the African radiology crisis that AI can actually solve`,
    excerpt:`In Nigeria, there is one radiologist per 275,000 people. The WHO recommends one per 50,000. This is not a shortage — it is an absence.` },
];
const TAGS = ['All','Engineering','NHS','Regulatory','Africa'];
const TAG_COLORS: Record<string,string> = { Engineering:C.brand, NHS:C.info, Regulatory:C.urgent, Africa:C.normal };
export function BlogPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  const [tag, setTag] = useState('All');
  const filtered = tag === 'All' ? POSTS : POSTS.filter(p => p.tag === tag);
  const card = (x: React.CSSProperties = {}): React.CSSProperties => ({ background:C.bg2, border:`1px solid ${C.bgBorder}`, borderRadius:14, ...x });
  return (
    <PublicLayout activePage="blog" onNavigate={onNavigate}>
      <section style={{ background:`linear-gradient(135deg,${C.bg1},${C.bg2})`, borderBottom:`1px solid ${C.bgBorder}`, padding:'52px clamp(16px,5vw,80px) 44px' }}>
        <div style={{ maxWidth:760, margin:'0 auto' }}>
          <h1 style={{ fontSize:'clamp(26px,4vw,40px)', fontWeight:900, color:C.textHigh, fontFamily:T.fontBase, margin:'0 0 12px' }}>Clinical AI Insights</h1>
          <p style={{ fontSize:15, color:C.textMed, lineHeight:1.75, margin:0 }}>Research, engineering deep-dives, NHS policy, and clinical AI perspectives from the SEWA AI team.</p>
        </div>
      </section>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'40px clamp(16px,5vw,48px) 80px' }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:32 }}>
          {TAGS.map(t => (
            <button key={t} onClick={()=>setTag(t)} style={{ padding:'6px 16px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:T.fontBase, border:`1px solid ${tag===t?C.brand:C.bgBorder}`, background:tag===t?`${C.brand}18`:'none', color:tag===t?C.brand:C.textMed }}>{t}</button>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:20 }}>
          {filtered.map(post => (
            <article key={post.id} style={card({ padding:'24px' })}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
                <span style={{ padding:'2px 8px', borderRadius:10, fontSize:10, fontWeight:700, background:`${TAG_COLORS[post.tag]||C.brand}18`, color:TAG_COLORS[post.tag]||C.brand, border:`1px solid ${TAG_COLORS[post.tag]||C.brand}30` }}>{post.tag}</span>
                <span style={{ fontSize:11, color:C.textLow }}>{post.date} · {post.readTime}</span>
              </div>
              <h2 style={{ fontSize:15, fontWeight:800, color:C.textHigh, fontFamily:T.fontBase, margin:'0 0 10px', lineHeight:1.4 }}>{post.title}</h2>
              <p style={{ fontSize:13, color:C.textMed, lineHeight:1.7, margin:'0 0 16px' }}>{post.excerpt}</p>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:C.textLow }}>By {post.author}</span>
                <button style={{ fontSize:12, color:C.brand, background:'none', border:'none', cursor:'pointer', fontWeight:600, fontFamily:T.fontBase }}>Read more →</button>
              </div>
            </article>
          ))}
        </div>
        <div style={{ marginTop:40, textAlign:'center', fontSize:11, color:C.textLow, fontFamily:T.fontBase }}>© 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.</div>
      </div>
    </PublicLayout>
  );
}

