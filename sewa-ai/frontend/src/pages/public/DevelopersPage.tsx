// SEWA AI — DevelopersPage.tsx
// API documentation and integration guide
import React from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandDk:'#2E6B5E',brandLt:'#52B09A',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",FM:"'IBM Plex Mono',monospace",
};

export function DevelopersPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 800px) {
          .dev-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .hero-title { font-size: 36px !important; }
        }
      `}</style>
      <PublicNav activePage="solutions" onNavigate={onNavigate} />

      {/* Hero */}
      <section style={{ padding:'120px 24px 80px', background:`linear-gradient(180deg,${C.bg1},${C.bg0})` }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <h1 className="hero-title" style={{ fontSize:56, fontWeight:900, color:C.textHi, margin:'0 0 20px', letterSpacing:'-2px', lineHeight:1.1 }}>
            Built for interoperability.
          </h1>
          <p style={{ fontSize:18, color:C.textMd, lineHeight:1.7, margin:'0 0 40px' }}>
            SEWA AI was built using standard protocols (DICOM, HL7, FHIR) to ensure seamless integration into any hospital ecosystem. Access our microservices via a unified REST API or standard hospital gateways.
          </p>
        </div>
      </section>

      {/* API Overview */}
      <section className="dev-grid" style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 80px', display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:40 }}>
        <div>
           <h2 style={{ fontSize:32, fontWeight:800, color:C.textHi, marginBottom:24 }}>Unified Engine API</h2>
           <div style={{ display:'flex', flexDirection:'column', gap:16, marginBottom:32 }}>
              {[
                { port:'8000', name:'Triage Engine', type:'REST / WebSocket' },
                { port:'8001', name:'VLM Engine', type:'REST / gRPC' },
                { port:'8002', name:'Uncertainty Engine', type:'REST' },
                { port:'8003', name:'Metacognition', type:'Internal Sync' },
                { port:'8004', name:'Explainability', type:'Static JSON/Heatmap' },
              ].map(e => (
                <div key={e.port} style={{ padding:'12px 16px', background:C.bg2, borderRadius:10, border:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                   <div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.textHi }}>{e.name}</div>
                      <div style={{ fontSize:11, color:C.textLo }}>{e.type}</div>
                   </div>
                   <div style={{ fontSize:12, color:C.brand, fontFamily:C.FM, fontWeight:700 }}>PORT {e.port}</div>
                </div>
              ))}
           </div>
           <button onClick={() => onNavigate('contact')} style={{ padding:'12px 24px', background:C.brand, border:'none', borderRadius:10, color:'white', fontWeight:700, cursor:'pointer' }}>Request API Keys</button>
        </div>

        <div style={{ background:'#020806', borderRadius:20, border:`1px solid ${C.border}`, padding:32, overflow:'hidden' }}>
           <div style={{ display:'flex', gap:8, marginBottom:20 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#FF5F56' }}/>
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#FFBD2E' }}/>
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#27C93F' }}/>
           </div>
           <pre style={{ margin:0, fontSize:12, color:'#8CD0D3', fontFamily:C.FM, lineHeight:1.6 }}>
{`# Analyze scan for critical findings
POST /v1/triage/analyze
Content-Type: application/json
Authorization: Bearer <API_KEY>

{
  "scu_id": "CT_HEAD_0041",
  "priority": "STAT",
  "enable_xai": true
}

# Receive real-time response
{
  "id": "res_84920",
  "findings": ["ICH_DETECTED"],
  "probability": 0.984,
  "uncertainty": 0.02,
  "execution_time_ms": 1420
}`}
           </pre>
        </div>
      </section>

      {/* Protocols */}
      <section style={{ background:C.bg1, padding:'80px 24px', borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:1000, margin:'0 auto', textAlign:'center' }}>
          <h2 style={{ fontSize:32, fontWeight:800, color:C.textHi, marginBottom:40 }}>Clinical Protocols Supported</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:20 }}>
            {[
              { t:'DICOM / PACS', d:'C-STORE, C-FIND, and WADO-RS for image retrieval and archival.' },
              { t:'HL7 v2 / v3', d:'Standard ADT and ORM messages for hospital systems.' },
              { t:'FHIR R4', d:'Resources for Observations, Reports, and Patients.' },
              { t:'SSO / OAuth2', d:'Identity integration with Azure AD and local LDAP.' },
            ].map(p => (
              <div key={p.t} style={{ padding:24, background:C.bg3, borderRadius:16, border:`1px solid ${C.border}` }}>
                <h3 style={{ fontSize:15, fontWeight:700, color:C.textHi, marginBottom:10 }}>{p.t}</h3>
                <p style={{ fontSize:12, color:C.textMd, margin:0, lineHeight:1.6 }}>{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
