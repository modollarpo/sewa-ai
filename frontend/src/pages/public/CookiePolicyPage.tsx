// SEWA XAI — pages/public/CookiePolicyPage.tsx
// GDPR Article 13 compliant cookie policy with interactive consent manager
// Covers: strictly necessary, functional, analytics, marketing cookies

import React, { useState } from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A',
  brand:'#408D7B', brandLt:'#52B09A', brandDk:'#2E6B5E',
  critical:'#E03535', normal:'#1DBF73', normalBg:'#0A1F14', info:'#2A6EF2', purple:'#8B5CF6',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028', F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

const COOKIE_CATEGORIES = [
  {
    id: 'strictly_necessary',
    name: 'Strictly Necessary',
    icon: '🔒',
    required: true,
    enabled: true,
    description: 'These cookies are essential for the SEWA XAI platform to function. They enable core features like authentication, session management, and security. They cannot be disabled.',
    lawfulBasis: 'Legitimate interest / contractual necessity',
    cookies: [
      { name:'sewa_session',     domain:'app.sewaxai.health',  duration:'24 hours',    purpose:'User authentication session token (JWT)' },
      { name:'sewa_csrf',        domain:'app.sewaxai.health',  duration:'Session',     purpose:'Cross-site request forgery protection' },
      { name:'sewa_mfa_state',   domain:'app.sewaxai.health',  duration:'5 minutes',   purpose:'MFA verification state during login' },
      { name:'sewa_refresh',     domain:'app.sewaxai.health',  duration:'7 days',      purpose:'JWT refresh token for session continuity (HttpOnly)' },
      { name:'sewa_tenant',      domain:'app.sewaxai.health',  duration:'Session',     purpose:'Current hospital/tenant context for multi-tenancy routing' },
      { name:'sewa_region',      domain:'app.sewaxai.health',  duration:'1 year',      purpose:'Geographic region preference (UK/EU/US/Africa) for data residency' },
      { name:'cookie_consent',   domain:'sewaxai.health',      duration:'1 year',      purpose:'Records your cookie consent preferences' },
    ],
  },
  {
    id: 'functional',
    name: 'Functional',
    icon: '⚙️',
    required: false,
    enabled: true,
    description: 'These cookies enhance your experience by remembering your preferences, settings, and choices. Disabling them may reduce functionality.',
    lawfulBasis: 'Consent (GDPR Art. 6(1)(a))',
    cookies: [
      { name:'sewa_lang',        domain:'sewaxai.health',      duration:'1 year',      purpose:'User interface language preference (en/fr/sw/ha/yo/pt/ar/hi)' },
      { name:'sewa_theme',       domain:'app.sewaxai.health',  duration:'1 year',      purpose:'UI theme preference (dark/light clinical mode)' },
      { name:'sewa_worklist_cols',domain:'app.sewaxai.health', duration:'1 year',      purpose:'Radiologist worklist column configuration' },
      { name:'sewa_viewer_prefs',domain:'app.sewaxai.health',  duration:'1 year',      purpose:'DICOM viewer window/level, zoom, overlay preferences' },
      { name:'sewa_notif_prefs', domain:'app.sewaxai.health',  duration:'1 year',      purpose:'Notification channel preferences (push/email/WhatsApp)' },
      { name:'sewa_dashboard',   domain:'app.sewaxai.health',  duration:'6 months',    purpose:'Dashboard layout and widget configuration' },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics & Performance',
    icon: '📊',
    required: false,
    enabled: false,
    description: 'These cookies help us understand how clinicians and administrators use SEWA XAI so we can improve the platform. All data is anonymised and aggregated.',
    lawfulBasis: 'Consent (GDPR Art. 6(1)(a))',
    cookies: [
      { name:'_ga',              domain:'.sewaxai.health',     duration:'2 years',     purpose:'Google Analytics — distinguishes unique users (anonymised IP)' },
      { name:'_ga_*',            domain:'.sewaxai.health',     duration:'2 years',     purpose:'Google Analytics 4 session state' },
      { name:'sewa_perf',        domain:'app.sewaxai.health',  duration:'30 days',     purpose:'SEWA internal performance metrics — page load, AI inference latency' },
      { name:'_hjid',            domain:'app.sewaxai.health',  duration:'1 year',      purpose:'Hotjar — user behaviour analytics (anonymised, no PHI)' },
      { name:'_hjSession*',      domain:'app.sewaxai.health',  duration:'30 minutes',  purpose:'Hotjar — session recording (clinical pages excluded)' },
      { name:'sentry_id',        domain:'app.sewaxai.health',  duration:'1 year',      purpose:'Sentry error tracking — anonymous session ID for bug reports' },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    icon: '📣',
    required: false,
    enabled: false,
    description: 'These cookies are used to show relevant advertising and measure campaign effectiveness on our public marketing website only. They are never set within the clinical application.',
    lawfulBasis: 'Consent (GDPR Art. 6(1)(a))',
    cookies: [
      { name:'_fbp',             domain:'.sewaxai.health',     duration:'3 months',    purpose:'Facebook Pixel — marketing site only, not clinical app' },
      { name:'_gcl_au',          domain:'.sewaxai.health',     duration:'3 months',    purpose:'Google Ads conversion tracking — marketing site only' },
      { name:'li_fat_id',        domain:'.sewaxai.health',     duration:'30 days',     purpose:'LinkedIn Insight Tag — B2B campaign measurement' },
      { name:'hubspotutk',       domain:'.sewaxai.health',     duration:'13 months',   purpose:'HubSpot — visitor identification for CRM (public pages only)' },
    ],
  },
];

const THIRD_PARTIES = [
  { name:'Google Analytics',  purpose:'Web analytics',           policy:'https://policies.google.com/privacy',     dpa:'✅' },
  { name:'Sentry',            purpose:'Error monitoring',         policy:'https://sentry.io/privacy/',              dpa:'✅' },
  { name:'Hotjar',            purpose:'Behaviour analytics',      policy:'https://www.hotjar.com/legal/policies/privacy/', dpa:'✅' },
  { name:'HubSpot',           purpose:'CRM / marketing',          policy:'https://legal.hubspot.com/privacy-policy',dpa:'✅' },
  { name:'Stripe',            purpose:'Payment processing',       policy:'https://stripe.com/gb/privacy',           dpa:'✅' },
  { name:'Twilio',            purpose:'WhatsApp notifications',   policy:'https://www.twilio.com/en-us/legal/privacy', dpa:'✅' },
  { name:'Firebase (Google)', purpose:'Push notifications (FCM)', policy:'https://firebase.google.com/support/privacy',dpa:'✅' },
  { name:'Daily.co',          purpose:'Telehealth video',         policy:'https://www.daily.co/privacy',            dpa:'✅' },
];

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      style={{
        width:44, height:24, borderRadius:12, border:'none', cursor:disabled?'not-allowed':'pointer',
        background: checked ? C.brand : C.bg3,
        position:'relative', transition:'background 0.25s', flexShrink:0,
        boxShadow:`inset 0 0 0 1px ${checked?C.brandDk:C.border}`,
        opacity: disabled ? 0.5 : 1,
      }}>
      <div style={{
        width:18, height:18, borderRadius:9, background:'white',
        position:'absolute', top:3, left: checked ? 23 : 3,
        transition:'left 0.25s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)',
      }}/>
    </button>
  );
}

export function CookiePolicyPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [prefs, setPrefs] = useState<Record<string,boolean>>({
    strictly_necessary: true, functional: true, analytics: false, marketing: false,
  });
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState<string|null>('strictly_necessary');

  const savePrefs = (acceptAll = false) => {
    const newPrefs = acceptAll
      ? { strictly_necessary:true, functional:true, analytics:true, marketing:true }
      : prefs;
    setPrefs(newPrefs);
    localStorage.setItem('sewa_cookie_prefs', JSON.stringify({ ...newPrefs, timestamp: Date.now() }));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const rejectAll = () => {
    const newPrefs = { strictly_necessary:true, functional:false, analytics:false, marketing:false };
    setPrefs(newPrefs);
    localStorage.setItem('sewa_cookie_prefs', JSON.stringify({ ...newPrefs, timestamp: Date.now() }));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const h2Style: React.CSSProperties = { fontSize:22, fontWeight:800, color:C.textHi, margin:'0 0 12px', fontFamily:C.F };
  const h3Style: React.CSSProperties = { fontSize:15, fontWeight:700, color:C.textHi, margin:'0 0 8px', fontFamily:C.F };
  const pStyle:  React.CSSProperties = { fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 16px', fontFamily:C.F };

  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 900px) {
          .meta-grid, .control-grid, .legal-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <PublicNav activePage="cookies" onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ background:`linear-gradient(180deg,${C.bg1} 0%,${C.bg0} 100%)`, borderBottom:`1px solid ${C.border}`, padding:'clamp(80px, 15vh, 120px) 24px 56px' }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'4px 12px', background:`${C.brand}14`, border:`1px solid ${C.brand}30`, borderRadius:20, marginBottom:20 }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.brand, letterSpacing:'0.08em', textTransform:'uppercase' }}>Legal</span>
          </div>
          <h1 style={{ fontSize:'clamp(32px, 8vw, 40px)', fontWeight:800, color:C.textHi, margin:'0 0 16px', lineHeight:1.15, letterSpacing:'-1px', fontFamily:C.F }}>
            Cookie Policy
          </h1>
          <p style={{ ...pStyle, fontSize:15, margin:0 }}>
            SEWA XAI uses cookies and similar technologies to provide, protect, and improve our clinical platform. This policy explains what cookies we use, why, and how you can control them.
          </p>
          <div className="meta-grid" style={{ display:'flex', gap:16, marginTop:24, flexWrap:'wrap' }}>
            {[
              { label:'Last Updated', value:'12 March 2026' },
              { label:'Version',      value:'2.4' },
              { label:'Regulation',   value:'GDPR Art. 5, 6, 7 & ePrivacy' },
            ].map(m => (
              <div key={m.label} style={{ padding:'8px 16px', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:9 }}>
                <div style={{ fontSize:9, color:C.textLo, letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:700 }}>{m.label}</div>
                <div style={{ fontSize:13, color:C.textHi, fontWeight:600, marginTop:2 }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:800, margin:'0 auto', padding:'48px 24px 80px' }}>

        {/* Quick consent manager */}
        <div style={{ background:C.bg2, border:`1px solid ${C.brand}40`, borderRadius:16, padding:24, marginBottom:48 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
            <div>
              <h2 style={{ ...h2Style, fontSize:17, margin:'0 0 6px' }}>🍪 Manage Your Cookie Preferences</h2>
              {saved && <span style={{ fontSize:12, color:C.normal, fontWeight:600 }}>✓ Preferences saved</span>}
            </div>
          </div>

          {COOKIE_CATEGORIES.map(cat => (
            <div key={cat.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ flex:1, paddingRight:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:C.textHi }}>{cat.name}</span>
                  {cat.required && <span style={{ fontSize:9, color:C.brand, fontWeight:700, textTransform:'uppercase' }}>Required</span>}
                </div>
              </div>
              <Toggle
                checked={cat.required ? true : (prefs[cat.id] ?? cat.enabled)}
                onChange={(v) => setPrefs(p => ({ ...p, [cat.id]: v }))}
                disabled={cat.required}
              />
            </div>
          ))}

          <div style={{ display:'flex', gap:12, marginTop:24, flexWrap:'wrap' }}>
            <button onClick={() => savePrefs(true)} style={{ padding:'11px 24px', background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, border:'none', borderRadius:9, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:C.F }}>
              Accept All
            </button>
            <button onClick={() => savePrefs(false)} style={{ padding:'11px 24px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:9, color:C.textHi, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:C.F }}>
              Save My Choices
            </button>
          </div>
        </div>

        {/* Cookie detail list */}
        <section style={{ marginBottom:48 }}>
          {COOKIE_CATEGORIES.map(cat => (
            <div key={cat.id} style={{ marginBottom:16, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:12, padding:24 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <span style={{ fontSize:24 }}>{cat.icon}</span>
                <h3 style={{ ...h3Style, marginBottom:0 }}>{cat.name}</h3>
              </div>
              <p style={{ ...pStyle, fontSize:12, lineHeight:1.7 }}>{cat.description}</p>
            </div>
          ))}
        </section>

        {/* Control grid */}
        <section style={{ marginBottom:48 }}>
          <h2 style={h2Style}>4. How to Control Cookies</h2>
          <div className="control-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              { title:'In SEWA XAI', desc:'Use the preference panel at the top of this page.' },
              { title:'Browser Settings', desc:'Most browsers allow you to block or delete cookies.' },
              { title:'Google Analytics', desc:'Install the Google Analytics Opt-out Browser Add-on.' },
              { title:'Industry Tools', desc:'Use the ICO, Your Online Choices, or DAA portals.' },
            ].map(item => (
              <div key={item.title} style={{ padding:16, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10 }}>
                <h4 style={{ fontSize:13, fontWeight:700, color:C.textHi, margin:'0 0 8px' }}>{item.title}</h4>
                <p style={{ fontSize:12, color:C.textLo, margin:0, lineHeight:1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* GDPR rights */}
        <section style={{ marginBottom:40 }}>
          <h2 style={h2Style}>5. Your Rights Under GDPR</h2>
          <ul style={{ paddingLeft:20, color:C.textMd, fontSize:13, lineHeight:2 }}>
            <li>Withdraw consent at any time</li>
            <li>Access a copy of data held about you</li>
            <li>Erasure of personal data</li>
            <li>Object to processing based on legitimate interests</li>
          </ul>
        </section>

        <section>
          <h2 style={h2Style}>6. Contact DPO</h2>
          <div className="legal-footer-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, padding:20, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:12 }}>
            <div>
              <div style={{ fontSize:10, color:C.textLo, fontWeight:700, textTransform:'uppercase' }}>Email</div>
              <div style={{ fontSize:13, color:C.textHi }}>dpo@sewaxai.health</div>
            </div>
            <div>
              <div style={{ fontSize:10, color:C.textLo, fontWeight:700, textTransform:'uppercase' }}>Postal</div>
              <div style={{ fontSize:13, color:C.textHi }}>SEWA XAI — a Storegrill Inc Ltd company, London</div>
            </div>
          </div>
        </section>
      </div>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}

