// SEWA XAI — BlogPage.tsx
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.
import React, { useState } from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { colors, typography } from '../../design-system/tokens';
const C = colors; const T = typography;
import publishedData from '../../content/generated/published-posts.json';
const POSTS: any[] = (publishedData && publishedData.posts) || [];
const pTag = (p: any): string => (p && p.tags && p.tags[0]) || '';
const pDate = (p: any): string => (p && (p.publishDate || p.date)) || '';
const ALL_TAGS: string[] = ['All', ...Array.from(new Set(POSTS.flatMap(p => (p && p.tags) || [])))];
const TAG_COLORS: Record<string,string> = { Engineering:C.brand, NHS:C.info, Regulatory:C.urgent, Africa:C.normal, Clinical:C.info, Market:C.brand, Vision:C.brandDark, Positioning:C.brand, Education:C.brand, Pathway:C.brandDark, Partnerships:C.brandDark };
const card = (x: React.CSSProperties = {}): React.CSSProperties => ({ background:C.bg2, border:`1px solid ${C.bgBorder}`, borderRadius:14, overflow:'hidden', ...x });

export function BlogPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  const [tag, setTag] = useState('All');
  const [selected, setSelected] = useState<any>(null);
  const filtered = tag === 'All' ? POSTS : POSTS.filter(p => (p.tags || []).includes(tag));
  const imgUrl = (cover: string) => cover ? `/${'blog/' + cover}` : undefined;
  return (
    <PublicLayout activePage="blog" onNavigate={onNavigate}>
      <section style={{ background:`linear-gradient(135deg,${C.bg1},${C.bg2})`, borderBottom:`1px solid ${C.bgBorder}`, padding:'52px clamp(16px,5vw,80px) 44px' }}>
        <div style={{ maxWidth:760, margin:'0 auto' }}>
          <h1 style={{ fontSize:'clamp(26px,4vw,40px)', fontWeight:900, color:C.textHigh, fontFamily:T.fontBase, margin:'0 0 12px' }}>Clinical AI Insights</h1>
          <p style={{ fontSize:15, color:C.textMed, lineHeight:1.75, margin:0 }}>Research, engineering deep-dives, NHS policy, and clinical AI perspectives from the SEWA XAI team.</p>
        </div>
      </section>
      {selected ? (
        <div style={{ maxWidth:760, margin:'0 auto', padding:'40px clamp(16px,5vw,48px) 80px' }}>
          <button onClick={()=>setSelected(null)} style={{ fontSize:13, color:C.brand, background:'none', border:'none', cursor:'pointer', fontWeight:600, fontFamily:T.fontBase, marginBottom:20 }}>← Back to all posts</button>
          {selected.cover && imgUrl(selected.cover) && (
            <img src={imgUrl(selected.cover)} alt={selected.title} style={{ width:'100%', borderRadius:14, marginBottom:24, objectFit:'cover', aspectRatio:'16/9' }} />
          )}
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
            <span style={{ padding:'2px 8px', borderRadius:10, fontSize:10, fontWeight:700, background:`${TAG_COLORS[pTag(selected)]||C.brand}18`, color:TAG_COLORS[pTag(selected)]||C.brand, border:`1px solid ${TAG_COLORS[pTag(selected)]||C.brand}30` }}>{pTag(selected)}</span>
            <span style={{ fontSize:11, color:C.textLow }}>{pDate(selected)} · {selected.readTime}</span>
          </div>
          <h1 style={{ fontSize:'clamp(22px,3vw,32px)', fontWeight:800, color:C.textHigh, fontFamily:T.fontBase, margin:'0 0 16px', lineHeight:1.2 }}>{selected.title}</h1>
          <p style={{ fontSize:15, color:C.textMed, lineHeight:1.7, margin:'0 0 24px' }}>{selected.excerpt}</p>
          <div style={{ borderTop:`1px solid ${C.bgBorder}`, paddingTop:24 }}>
            <div style={{ fontSize:13, color:C.textMed, lineHeight:1.8 }} dangerouslySetInnerHTML={{ __html: selected.content || '' }} />
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:32, paddingTop:20, borderTop:`1px solid ${C.bgBorder}` }}>
            <span style={{ fontSize:12, color:C.textLow }}>By {selected.author}</span>
            {selected.cta && <a href="#cta" style={{ fontSize:12, color:C.brand, fontWeight:600, fontFamily:T.fontBase, textDecoration:'none' }}>{selected.cta}</a>}
          </div>
          <div style={{ marginTop:40, textAlign:'center', fontSize:11, color:C.textLow, fontFamily:T.fontBase }}>© 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.</div>
        </div>
      ) : (
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'40px clamp(16px,5vw,48px) 80px' }}>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:32 }}>
            {ALL_TAGS.map(t => (
              <button key={t} onClick={()=>setTag(t)} style={{ padding:'6px 16px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:T.fontBase, border:`1px solid ${tag===t?C.brand:C.bgBorder}`, background:tag===t?`${C.brand}18`:'none', color:tag===t?C.brand:C.textMed }}>{t}</button>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:20 }}>
            {filtered.map(post => (
              <article key={post.id} style={card({ padding:0, cursor:'pointer' })} onClick={()=>setSelected(post)}>
                {post.cover && imgUrl(post.cover) && (
                  <img src={imgUrl(post.cover)} alt={post.title} style={{ width:'100%', aspectRatio:'16/9', objectFit:'cover', borderTopLeftRadius:14, borderTopRightRadius:14 }} />
                )}
                <div style={{ padding:'20px 24px' }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
                    <span style={{ padding:'2px 8px', borderRadius:10, fontSize:10, fontWeight:700, background:`${TAG_COLORS[pTag(post)]||C.brand}18`, color:TAG_COLORS[pTag(post)]||C.brand, border:`1px solid ${TAG_COLORS[pTag(post)]||C.brand}30` }}>{pTag(post)}</span>
                    <span style={{ fontSize:11, color:C.textLow }}>{pDate(post)} · {post.readTime}</span>
                  </div>
                  <h2 style={{ fontSize:15, fontWeight:800, color:C.textHigh, fontFamily:T.fontBase, margin:'0 0 10px', lineHeight:1.4 }}>{post.title}</h2>
                  <p style={{ fontSize:13, color:C.textMed, lineHeight:1.7, margin:'0 0 16px' }}>{post.excerpt}</p>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:12, color:C.textLow }}>By {post.author}</span>
                    <span style={{ fontSize:12, color:C.brand, fontWeight:600, fontFamily:T.fontBase }}>Read more →</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div style={{ marginTop:40, textAlign:'center', fontSize:11, color:C.textLow, fontFamily:T.fontBase }}>© 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.</div>
        </div>
      )}
    </PublicLayout>
  );
}