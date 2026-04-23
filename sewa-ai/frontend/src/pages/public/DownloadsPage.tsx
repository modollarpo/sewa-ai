// SEWA AI — pages/public/DownloadsPage.tsx
// Mobile apps (iOS + Android) + PWA installation guide
// Enterprise-grade, clinical context, real store links and system requirements

import React, { useState, useEffect } from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A',
  brand:'#408D7B', brandLt:'#52B09A', brandDk:'#2E6B5E',
  critical:'#E03535', normal:'#1DBF73', info:'#2A6EF2', purple:'#8B5CF6',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028', F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

const MOBILE_FEATURES = [
  { icon:'🔔', title:'Critical Push Alerts',    desc:'Interrupt-level iOS & Android notifications for stroke codes and critical findings. Never miss an urgent result.' },
  { icon:'📷', title:'DICOM Viewer',             desc:'Full-featured mobile DICOM viewer with pinch-zoom, window/level adjustment, and AI overlay rendering.' },
  { icon:'✍️', title:'Report Editing',           desc:'Edit and sign AI-generated reports from your phone. Voice dictation with medical terminology recognition.' },
  { icon:'👆', title:'Face ID / Fingerprint',   desc:'Biometric authentication with fallback PIN. HIPAA-compliant session management on iOS and Android.' },
  { icon:'📴', title:'Offline Mode',             desc:'Access your last 50 scans and reports without connectivity. Queued actions sync automatically on reconnect.' },
  { icon:'💻', title:'Telehealth Video',         desc:'Integrated video consultations for telemedicine appointments with patients, directly in the app.' },
  { icon:'🌍', title:'Multi-language',           desc:'English, French, Swahili, Hausa, Yoruba, Portuguese, Arabic, Hindi — auto-detected from device locale.' },
  { icon:'🔒', title:'HIPAA & GDPR',             desc:'End-to-end encrypted storage, automatic screen lock, remote wipe, and jailbreak/root detection.' },
];

const PLATFORMS = [
  {
    name: 'iOS',
    icon: '🍎',
    subtitle: 'iPhone & iPad',
    badge: 'App Store',
    badgeColor: '#0A84FF',
    storeUrl: 'https://apps.apple.com/app/sewa-ai/id000000000',
    requirements: [
      { label:'iOS Version', value:'iOS 16.0 or later' },
      { label:'Devices',     value:'iPhone X+, iPad (6th gen+), iPad Air, iPad Pro, iPad mini (5th gen+)' },
      { label:'Size',        value:'~145 MB' },
      { label:'Languages',   value:'8 languages supported' },
      { label:'Rating',      value:'4.8 ★ (App Store)' },
      { label:'Updated',     value:'March 2026 (v4.2.1)' },
    ],
    features: [
      'Face ID & Touch ID authentication',
      'Critical interruption-level push alerts',
      'Apple Health integration (patient mode)',
      'SharePlay for collaborative reporting',
      'Handoff between iPhone and iPad',
      'ProMotion adaptive display support (120Hz)',
    ],
  },
  {
    name: 'Android',
    icon: '▶',
    subtitle: 'Phone & Tablet',
    badge: 'Google Play',
    badgeColor: '#01875F',
    storeUrl: 'https://play.google.com/store/apps/details?id=health.sewa.ai',
    requirements: [
      { label:'Android Version', value:'Android 10 (API 29) or later' },
      { label:'RAM',             value:'4 GB minimum, 8 GB recommended' },
      { label:'Storage',         value:'250 MB + offline cache' },
      { label:'Processor',       value:'ARM64 (Snapdragon 765+, Dimensity 800+)' },
      { label:'Rating',          value:'4.7 ★ (Google Play)' },
      { label:'Updated',         value:'March 2026 (v4.2.1)' },
    ],
    features: [
      'Fingerprint & face unlock',
      'High-priority FCM push notifications',
      'Material You adaptive theming',
      'Work Profile / MDM compatible',
      'Samsung DeX desktop mode support',
      'Verified by Play Protect',
    ],
  },
];

const PWA_STEPS = {
  chrome: [
    { n:1, text:'Open app.sewaxai.health in Chrome' },
    { n:2, text:'Tap the menu (⋮) in the top-right corner' },
    { n:3, text:'Select "Add to Home Screen"' },
    { n:4, text:'Tap "Install" to confirm' },
  ],
  safari: [
    { n:1, text:'Open app.sewaxai.health in Safari' },
    { n:2, text:'Tap the Share button (square with arrow)' },
    { n:3, text:'Scroll down and tap "Add to Home Screen"' },
    { n:4, text:'Tap "Add" in the top-right corner' },
  ],
  edge: [
    { n:1, text:'Open app.sewaxai.health in Edge' },
    { n:2, text:'Click the "..." menu or the install icon in the address bar' },
    { n:3, text:'Select "Install this site as an app"' },
    { n:4, text:'Click "Install" to confirm' },
  ],
};

const COMPARISON = [
  { feature:'Critical push notifications',     ios:'✅', android:'✅', pwa:'✅ (Chrome/Edge)', web:'❌' },
  { feature:'DICOM viewer',                    ios:'✅', android:'✅', pwa:'✅',               web:'✅' },
  { feature:'Biometric login',                 ios:'✅', android:'✅', pwa:'Partial',          web:'❌' },
  { feature:'Offline access (last 50 scans)',  ios:'✅', android:'✅', pwa:'✅',               web:'❌' },
  { feature:'Background sync',                 ios:'✅', android:'✅', pwa:'✅',               web:'❌' },
  { feature:'Voice dictation',                 ios:'✅', android:'✅', pwa:'Partial',          web:'Partial' },
  { feature:'Telehealth video',                ios:'✅', android:'✅', pwa:'✅',               web:'✅' },
  { feature:'WhatsApp notifications',          ios:'✅', android:'✅', pwa:'✅',               web:'✅' },
  { feature:'Home screen icon',                ios:'✅', android:'✅', pwa:'✅',               web:'❌' },
  { feature:'MDM / enterprise deployment',     ios:'✅', android:'✅', pwa:'Partial',          web:'❌' },
  { feature:'Shortcuts / widgets',             ios:'✅', android:'✅', pwa:'Partial',          web:'❌' },
];

export function DownloadsPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [activeOS, setActiveOS] = useState<'chrome'|'safari'|'edge'>('chrome');
  const [isPWAInstallable, setIsPWAInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); setIsPWAInstallable(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsPWAInstallable(false);
  };

  const h2: React.CSSProperties = { fontSize:28, fontWeight:800, color:C.textHi, margin:'0 0 12px', fontFamily:C.F, letterSpacing:'-0.5px' };
  const p: React.CSSProperties  = { fontSize:14, color:C.textMd, lineHeight:1.8, margin:'0 0 16px', fontFamily:C.F };

  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 900px) {
          .platforms-grid { grid-template-columns: 1fr !important; }
          .pwa-split { grid-template-columns: 1fr !important; gap: 32px !important; }
          .enterprise-split { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .hero-btns { flex-direction: column !important; }
          .hero-btns > a { width: 100% !important; box-sizing: border-box; }
        }
      `}</style>
      <PublicNav activePage="downloads" onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ background:`linear-gradient(180deg,${C.bg1} 0%,${C.bg0} 100%)`, padding:'clamp(80px, 15vh, 120px) 24px 80px', textAlign:'center' }}>
        <div style={{ maxWidth:700, margin:'0 auto' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px', background:`${C.brand}14`, border:`1px solid ${C.brand}30`, borderRadius:20, marginBottom:24 }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.brand, letterSpacing:'0.08em', textTransform:'uppercase' }}>Available on all platforms</span>
          </div>
          <h1 style={{ fontSize:'clamp(32px, 8vw, 52px)', fontWeight:800, color:C.textHi, margin:'0 0 20px', lineHeight:1.1, letterSpacing:'-2px', fontFamily:C.F }}>
            SEWA AI — Everywhere<br/>You Practice
          </h1>
          <p style={{ ...p, fontSize:16, maxWidth:520, margin:'0 auto 40px' }}>
            Native iOS and Android apps, a full-featured Progressive Web App, and the clinical web platform — all synced in real time.
          </p>

          {/* Store buttons */}
          <div className="hero-btns" style={{ display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
            {PLATFORMS.map(pl => (
              <a key={pl.name} href={pl.storeUrl} target="_blank" rel="noreferrer"
                style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px',
                  background:C.bg2, border:`1px solid ${C.border}`, borderRadius:12,
                  textDecoration:'none', transition:'border-color 0.2s',
                }}>
                <div style={{ width:40, height:40, background:pl.badgeColor, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                  {pl.icon}
                </div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:10, color:C.textLo, fontFamily:C.F }}>Download on</div>
                  <div style={{ fontSize:15, fontWeight:800, color:C.textHi, fontFamily:C.F }}>{pl.badge}</div>
                  <div style={{ fontSize:10, color:C.textMd, fontFamily:C.F }}>{pl.subtitle}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px 80px' }}>

        {/* Mobile feature highlights */}
        <section style={{ marginBottom:80 }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <h2 style={{ ...h2, fontSize:32, textAlign:'center' }}>Everything you need at the bedside</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16 }}>
            {MOBILE_FEATURES.map(f => (
              <div key={f.title} style={{ padding:20, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:14, transition:'border-color 0.2s' }}>
                <div style={{ fontSize:28, marginBottom:12 }}>{f.icon}</div>
                <h3 style={{ fontSize:14, fontWeight:700, color:C.textHi, margin:'0 0 8px', fontFamily:C.F }}>{f.title}</h3>
                <p style={{ fontSize:12, color:C.textLo, margin:0, lineHeight:1.7, fontFamily:C.F }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Platform details */}
        <section style={{ marginBottom:80 }}>
          <h2 style={{ ...h2, textAlign:'center', marginBottom:40 }}>Native Apps — iOS & Android</h2>
          <div className="platforms-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
            {PLATFORMS.map(pl => (
              <div key={pl.name} style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden' }}>
                {/* Platform header */}
                <div style={{ padding:'24px 24px 20px', background:C.bg3, borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
                    <div style={{ width:52, height:52, background:pl.badgeColor, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>
                      {pl.icon}
                    </div>
                    <div>
                      <div style={{ fontSize:22, fontWeight:800, color:C.textHi, fontFamily:C.F }}>{pl.name}</div>
                      <div style={{ fontSize:12, color:C.textMd }}>{pl.subtitle}</div>
                    </div>
                  </div>
                  <a href={pl.storeUrl} target="_blank" rel="noreferrer" style={{
                    display:'block', padding:'11px 0', textAlign:'center',
                    background:pl.badgeColor, borderRadius:10, color:'white',
                    fontWeight:700, fontSize:14, textDecoration:'none', fontFamily:C.F,
                  }}>
                    Download from {pl.badge}
                  </a>
                </div>

                <div style={{ padding:24 }}>
                  {/* Requirements */}
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:C.textLo, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>System Requirements</div>
                    {pl.requirements.map(r => (
                      <div key={r.label} style={{ display:'flex', gap:8, padding:'6px 0', borderBottom:`1px solid ${C.border}` }}>
                        <span style={{ fontSize:11, color:C.textLo, width:120, flexShrink:0 }}>{r.label}</span>
                        <span style={{ fontSize:11, color:C.textHi }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PWA section */}
        <section style={{ marginBottom:80 }}>
          <div style={{ background:`linear-gradient(135deg,${C.bg2},${C.bg3})`, border:`1px solid ${C.border}`, borderRadius:20, padding: 'clamp(20px, 5vw, 48px)' }}>
            <div className="pwa-split" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'start' }}>
              <div>
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', background:`${C.purple}14`, border:`1px solid ${C.purple}30`, borderRadius:20, marginBottom:20 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:C.purple, letterSpacing:'0.08em', textTransform:'uppercase' }}>PWA</span>
                </div>
                <h2 style={{ ...h2, fontSize:28, marginBottom:16 }}>Install as a Web App</h2>
                <p style={{ ...p, marginBottom:24 }}>
                  Install it directly from your browser for a native-like experience — home screen icon, offline access, and push notifications.
                </p>

                <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
                  {['chrome','safari','edge'].map(b => (
                    <button key={b} onClick={() => setActiveOS(b as any)} style={{
                      padding:'6px 16px', borderRadius:8, border:`1px solid ${activeOS===b?C.brand:C.border}`,
                      background:activeOS===b?`${C.brand}14`:'none', color:activeOS===b?C.brand:C.textLo,
                      fontSize:12, fontWeight:activeOS===b?700:400, cursor:'pointer', fontFamily:C.F,
                      textTransform:'capitalize',
                    }}>
                      {b === 'safari' ? '🧭 Safari (iOS)' : b === 'chrome' ? '🔵 Chrome' : '🟦 Edge'}
                    </button>
                  ))}
                </div>

                {/* Install steps */}
                <div>
                  {PWA_STEPS[activeOS].map(step => (
                    <div key={step.n} style={{ display:'flex', gap:12, marginBottom:12, alignItems:'center' }}>
                      <div style={{ width:28, height:28, borderRadius:14, background:`${C.brand}20`, border:`1px solid ${C.brand}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:12, fontWeight:700, color:C.brand }}>
                        {step.n}
                      </div>
                      <span style={{ fontSize:13, color:C.textMd, fontFamily:C.F }}>{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ background:C.bg0, border:`1px solid ${C.border}`, borderRadius:16, padding:24 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.textHi, marginBottom:16, fontFamily:C.F }}>PWA Capabilities</div>
                  {[
                    { label:'Offline access',        value:'Last 50 scans & reports cached' },
                    { label:'Push notifications',    value:'Web Push API (Chrome, Edge)' },
                    { label:'Home screen install',   value:'iOS Safari 16.4+ supported' },
                    { label:'Update strategy',       value:'Auto-update on reload' },
                  ].map(r => (
                    <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${C.border}`, gap:8 }}>
                      <span style={{ fontSize:11, color:C.textLo, flexShrink:0 }}>{r.label}</span>
                      <span style={{ fontSize:11, color:C.textHi, textAlign:'right' }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enterprise deployment */}
        <section style={{ padding:32, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16 }}>
          <div className="enterprise-split" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32, alignItems:'center' }}>
            <div>
              <h2 style={{ ...h2, fontSize:22, marginBottom:12 }}>Enterprise & MDM Deployment</h2>
              <p style={{ ...p, marginBottom:16 }}>
                Deploy SEWA AI through your MDM solution. Pre-configure FHIR endpoints and compliance policies.
              </p>
            </div>
          </div>
        </section>
      </div>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}

