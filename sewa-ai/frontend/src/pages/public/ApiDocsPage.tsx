// SEWA AI — ApiDocsPage.tsx
import React, { useState } from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandDk:'#2E6B5E',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",FM:"'IBM Plex Mono',monospace",
};

const SECTIONS = [
  'Introduction', 'Authentication', 'Triage API', 'VLM API', 'Webhooks', 'SDKs', 'Errors'
];

const ENDPOINTS = [
  { method:'POST', path:'/api/v1/triage/predict', desc:'Submit DICOM for AI pathology detection.' },
  { method:'GET', path:'/api/v1/scans/{id}', desc:'Retrieve scan status and AI results.' },
  { method:'POST', path:'/api/v1/vlm/report', desc:'Generate structured radiology report.' },
];

export function ApiDocsPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  const [active, setActive] = useState('Introduction');

  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 900px) {
          .docs-grid { grid-template-columns: 1fr !important; }
          .docs-sidebar { display: none !important; }
          .endpoint-row { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
        }
      `}</style>
      <PublicNav activePage="api-docs" onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ padding:'clamp(80px, 15vh, 110px) 24px 48px', borderBottom:`1px solid ${C.border}`, background:`linear-gradient(180deg, ${C.bg1}, ${C.bg0})` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'inline-flex', padding:'4px 12px', background:`${C.brand}14`, border:`1px solid ${C.brand}30`, borderRadius:20, marginBottom:16, fontSize:10, fontWeight:700, color:C.brand, letterSpacing:'0.1em', textTransform:'uppercase' }}>Developer Portal</div>
          <h1 style={{ fontSize:'clamp(32px, 8vw, 44px)', fontWeight:900, color:C.textHi, margin:'0 0 16px', letterSpacing:'-1.5px' }}>API Documentation</h1>
          <p style={{ fontSize:15, color:C.textMd, lineHeight:1.8, maxWidth:650 }}>Build on top of the world's most advanced clinical AI engines. Integrate triage, reporting, and uncertainty analytics directly into your PACS, EHR, or mobile app.</p>
        </div>
      </div>

      <div className="docs-grid" style={{ maxWidth:1100, margin:'0 auto', padding:'48px 24px 80px', display:'grid', gridTemplateColumns:'220px 1fr', gap:60 }}>
        {/* Sidebar */}
        <div className="docs-sidebar" style={{ position:'sticky', top:100, alignSelf:'start' }}>
           <div style={{ fontSize:10, fontWeight:700, color:C.textLo, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>Navigation</div>
           {SECTIONS.map(s => (
             <button key={s} onClick={() => setActive(s)} style={{
               display:'block', width:'100%', textAlign:'left', padding:'8px 12px', borderRadius:8, border:'none', cursor:'pointer',
               background:active===s?`${C.brand}14`:'none', color:active===s?C.brand:C.textLo, fontSize:12, fontWeight:active===s?600:400, marginBottom:4,
               fontFamily:C.F
             }}>{s}</button>
           ))}
        </div>

        {/* Content */}
        <div style={{ minWidth:0 }}>
          <section style={{ marginBottom:60 }}>
            <h2 style={{ fontSize:22, fontWeight:800, color:C.textHi, marginBottom:20 }}>{active}</h2>
            {active === 'Introduction' && (
              <>
                <p style={{ color:C.textMd, lineHeight:1.8, fontSize:14 }}>The SEWA AI API is a RESTful clinical intelligence interface. It allows for high-throughput DICOM processing, real-time triage alerts, and structured report generation using our proprietary Vision-Language Models.</p>
                <div style={{ marginTop:32 }}>
                   <div style={{ fontSize:12, fontWeight:700, color:C.textHi, marginBottom:12 }}>Base URLs</div>
                   <div style={{ padding:16, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:12, fontFamily:C.FM, fontSize:13 }}>
                      <div style={{ color:C.textLo, marginBottom:4 }}># Production</div>
                      <code style={{ color:C.brand }}>https://api.sewaxai.health/api/v1</code>
                      <div style={{ color:C.textLo, margin:'12px 0 4px' }}># Staging</div>
                      <code style={{ color:C.textMd }}>https://api.staging.sewaxai.health/api/v1</code>
                   </div>
                </div>
              </>
            )}

            {active === 'Authentication' && (
              <>
                <p style={{ color:C.textMd, lineHeight:1.8, fontSize:14 }}>All API requests must include an <code style={{ color:C.textHi, background:C.bg2, padding:'2px 6px', borderRadius:4 }}>X-API-KEY</code> header. You can generate keys in the SuperAdmin dashboard under Organization Settings.</p>
                <div style={{ marginTop:24, padding:20, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16 }}>
                  <div style={{ fontSize:11, color:C.textLo, marginBottom:12, fontWeight:700, textTransform:'uppercase' }}>Example Request</div>
                  <pre style={{ margin:0, fontSize:12, color:C.textHi, overflowX:'auto', fontFamily:C.FM }}>
                    {`curl -X GET "https://api.sewaxai.health/api/v1/health" \\
  -H "X-API-KEY: your_api_key_here" \\
  -H "Content-Type: application/json"`}
                  </pre>
                </div>
              </>
            )}

            {active === 'Triage API' && (
              <>
                <p style={{ color:C.textMd, lineHeight:1.8, fontSize:14 }}>Our primary endpoint for pathological detection. Supports asynchronous processing with webhook callbacks for CRITICAL findings.</p>
                <div style={{ display:'flex', flexDirection:'column', gap:12, marginTop:24 }}>
                  {ENDPOINTS.map(e => (
                    <div key={e.path} className="endpoint-row" style={{ padding:16, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:12, display:'flex', alignItems:'center', gap:16 }}>
                      <span style={{ padding:'4px 8px', background:e.method==='POST'?`${C.brand}20`:`${C.textMd}20`, color:e.method==='POST'?C.brand:C.textMd, borderRadius:6, fontSize:10, fontWeight:900, fontFamily:C.FM }}>{e.method}</span>
                      <code style={{ flex:1, fontSize:13, color:C.textHi, fontWeight:600 }}>{e.path}</code>
                      <span style={{ fontSize:12, color:C.textLo }}>{e.desc}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {active === 'SDKs' && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:16, marginTop:24 }}>
                {[
                  { lang:'Python', version:'v2.1.0', cmd:'pip install sewa-ai' },
                  { lang:'Node.js', version:'v1.4.2', cmd:'npm install @sewa-ai/sdk' },
                  { lang:'Go', version:'v0.8.0', cmd:'go get github.com/sewa-ai/go-sdk' },
                ].map(sdk => (
                  <div key={sdk.lang} style={{ padding:20, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16 }}>
                    <div style={{ fontSize:16, fontWeight:700, color:C.textHi, marginBottom:4 }}>{sdk.lang}</div>
                    <div style={{ fontSize:10, color:C.brand, marginBottom:16 }}>{sdk.version}</div>
                    <code style={{ fontSize:11, color:C.textMd, display:'block', background:C.bg3, padding:10, borderRadius:8 }}>{sdk.cmd}</code>
                  </div>
                ))}
              </div>
            )}

            {['VLM API', 'Webhooks', 'Errors'].includes(active) && (
              <div style={{ padding:40, textAlign:'center', background:C.bg2, borderRadius:20, border:`1px dashed ${C.border}` }}>
                <div style={{ fontSize:32, marginBottom:16 }}>🚧</div>
                <h3 style={{ fontSize:18, fontWeight:700, color:C.textHi, marginBottom:12 }}>Section Under Construction</h3>
                <p style={{ fontSize:14, color:C.textLo, maxWidth:400, margin:'0 auto' }}>We are currently migrating this documentation section to our new v2.4.1 schema. Check back in ~24 hours or contact support@sewaxai.health.</p>
              </div>
            )}
          </section>
        </div>
      </div>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
