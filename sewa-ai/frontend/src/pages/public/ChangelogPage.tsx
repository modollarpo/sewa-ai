// SEWA AI — ChangelogPage.tsx
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import React from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
const C = { bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', brand:'#408D7B', brandLt:'#52B09A', textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055', border:'#1B3028', F:"'IBM Plex Sans',system-ui,sans-serif", FM:"'IBM Plex Mono',monospace" };

const RELEASES = [
  { version:'v2.4.1', date:'April 2026', type:'patch', changes:[
    { cat:'fix',     text:'Stripe webhook now activates tenant plan immediately on payment_intent.succeeded' },
    { cat:'fix',     text:'ACR image pull secret created automatically during AKS deployment (no Docker Desktop required)' },
    { cat:'fix',     text:'FHIR service no-op guard: blank FHIR_BASE_URL returns null instead of throwing' },
    { cat:'improve', text:'FX rates now fetched live from Frankfurter API (ECB data) with Redis cache + fallback' },
    { cat:'improve', text:'Invoice PDFs generated and emailed on every successful payment' },
    { cat:'improve', text:'Request correlation ID (X-Request-ID) added to all API responses' },
  ]},
  { version:'v2.4.0', date:'March 2026', type:'minor', changes:[
    { cat:'feature', text:'Clinical Demo Modal: interactive 4-engine pipeline animation on landing page' },
    { cat:'feature', text:'Scan quota enforcement middleware: monthly limits, overage billing, trial hard-block' },
    { cat:'feature', text:'M-Pesa STK Push for Kenya and Tanzania deployments' },
    { cat:'feature', text:'FHIR Azure Health Data Services provisioning script (setup-azure-fhir.sh)' },
    { cat:'feature', text:'Flutterwave webhook activates tenant plan on charge.completed' },
    { cat:'improve', text:'HAPI FHIR JPA Server added to docker-compose for local development' },
    { cat:'improve', text:'nginx.conf: HSTS, CSP, Permissions-Policy security headers' },
  ]},
  { version:'v2.3.0', date:'February 2026', type:'minor', changes:[
    { cat:'feature', text:'Edge deployment: offline INT8 ONNX model + SQLite + GSM SMS fallback for Africa' },
    { cat:'feature', text:'Merkle-chained tamper-evident audit log with chain verification endpoint' },
    { cat:'feature', text:'WhatsApp Business integration: OTP, opt-in, scan alerts via Twilio' },
    { cat:'feature', text:'Stroke Code activation: LVO/ICH/AIS/SAH/CVST with <30s door-to-alert' },
    { cat:'improve', text:'Multi-region payments: Stripe + Paystack + Flutterwave + M-Pesa routing' },
  ]},
  { version:'v2.2.0', date:'January 2026', type:'minor', changes:[
    { cat:'feature', text:'Metacognition Engine: Advanced hallucination detection and safe-to-alert gate' },
    { cat:'feature', text:'Federated Learning: differential-privacy FL with Flower framework' },
    { cat:'feature', text:'Population Health Dashboard: k-anonymity disease surveillance' },
    { cat:'feature', text:'Patient Portal mobile app: 7-tab navigation, consent management' },
  ]},
];

const CAT_STYLES = {
  feature: { bg:'rgba(64,141,123,0.15)', color:'#52B09A', label:'NEW' },
  improve: { bg:'rgba(42,110,242,0.12)', color:'#2A6EF2', label:'IMPROVED' },
  fix:     { bg:'rgba(29,191,115,0.10)', color:'#1DBF73', label:'FIX' },
  security:{ bg:'rgba(224,53,53,0.12)',  color:'#FF8080', label:'SECURITY' },
};

const TYPE_COLORS = { minor:'#408D7B', patch:'#1DBF73', major:'#F59E0B' };

export function ChangelogPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  return (
    <PublicLayout activePage="changelog" onNavigate={onNavigate}>
      <section style={{ background:`linear-gradient(135deg,${C.bg0},${C.bg1})`, padding:'52px clamp(16px,5vw,80px) 44px', borderBottom:`1px solid ${C.border}` }}>
        <h1 style={{ fontSize:'clamp(26px,4vw,40px)', fontWeight:900, color:C.textHi, fontFamily:C.F, margin:'0 0 12px' }}>Changelog</h1>
        <p style={{ fontSize:15, color:C.textMd, margin:0 }}>Every change to SEWA AI — clinical-grade transparency.</p>
      </section>
      <div style={{ maxWidth:800, margin:'0 auto', padding:'40px clamp(16px,5vw,48px) 80px' }}>
        {RELEASES.map((r, ri) => (
          <div key={r.version} style={{ display:'flex', gap:24, marginBottom:40, opacity: ri > 0 ? 0.85 : 1 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0 }}>
              <div style={{ width:12, height:12, borderRadius:'50%', background:TYPE_COLORS[r.type as keyof typeof TYPE_COLORS] || '#408D7B', boxShadow:`0 0 8px ${TYPE_COLORS[r.type as keyof typeof TYPE_COLORS] || '#408D7B'}` }} />
              {ri < RELEASES.length - 1 && <div style={{ width:1, flex:1, background:C.border }} />}
            </div>
            <div style={{ flex:1, paddingBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, flexWrap:'wrap' }}>
                <span style={{ fontSize:18, fontWeight:900, color:C.textHi, fontFamily:C.FM }}>{r.version}</span>
                <span style={{ fontSize:11, color:C.textLo, fontFamily:C.F }}>{r.date}</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {r.changes.map((c, ci) => {
                  const cs = CAT_STYLES[c.cat as keyof typeof CAT_STYLES] || CAT_STYLES.improve;
                  return (
                    <div key={ci} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:8, background:cs.bg, color:cs.color, whiteSpace:'nowrap', marginTop:2, fontFamily:C.F }}>{cs.label}</span>
                      <span style={{ fontSize:13, color:C.textMd, lineHeight:1.65, fontFamily:C.F }}>{c.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
        <p style={{ fontSize:11, color:C.textLo, textAlign:'center', marginTop:32 }}>
          © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.
        </p>
      </div>
    </PublicLayout>
  );
}
