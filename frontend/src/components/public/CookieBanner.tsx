// SEWA XAI — components/public/CookieBanner.tsx
// GDPR/PECR compliant cookie consent banner
// Shows on first visit, remembers choices, links to full Cookie Policy

import React, { useState, useEffect } from 'react';

import { dashboardColors as C } from '../../design-system/tokens';

interface CookiePrefs {
  strictly_necessary: boolean;
  functional:  boolean;
  analytics:   boolean;
  marketing:   boolean;
  timestamp:   number;
  version:     string;
}

const CURRENT_VERSION = '2.4';

export function CookieBanner({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [visible,  setVisible]  = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prefs,    setPrefs]    = useState({ functional:true, analytics:false, marketing:false });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sewa_cookie_prefs');
      if (!stored) { setVisible(true); return; }
      const parsed: CookiePrefs = JSON.parse(stored);
      // Re-show if policy version changed
      if (parsed.version !== CURRENT_VERSION) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const save = (all: boolean, none: boolean = false) => {
    const consent: CookiePrefs = {
      strictly_necessary: true,
      functional:  none ? false : (all ? true : prefs.functional),
      analytics:   none ? false : (all ? true : prefs.analytics),
      marketing:   none ? false : (all ? true : prefs.marketing),
      timestamp:   Date.now(),
      version:     CURRENT_VERSION,
    };
    localStorage.setItem('sewa_cookie_prefs', JSON.stringify(consent));
    setVisible(false);

    // Fire GTM/GA consent update if applicable
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('consent', 'update', {
        analytics_storage:    consent.analytics  ? 'granted' : 'denied',
        ad_storage:           consent.marketing  ? 'granted' : 'denied',
        functionality_storage:consent.functional ? 'granted' : 'denied',
      });
    }
  };

  if (!visible) return null;

  return (
    <div style={{
      position:'fixed', bottom:0, left:0, right:0, zIndex:9999,
      padding:'0 16px 16px', pointerEvents:'none',
    }}>
      <div style={{
        maxWidth:900, margin:'0 auto',
        background:'rgba(8,22,15,0.97)', backdropFilter:'blur(24px)',
        border:`1px solid ${C.border}`,
        borderRadius:16, overflow:'hidden', pointerEvents:'all',
        boxShadow:'0 -4px 40px rgba(0,0,0,0.6)',
      }}>
        {/* Main bar */}
        <div style={{ padding:'18px 24px', display:'flex', alignItems:'flex-start', gap:20, flexWrap:'wrap' }}>
          <div style={{ fontSize:22, flexShrink:0, marginTop:2 }}>🍪</div>
          <div style={{ flex:1, minWidth:260 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.textHi, marginBottom:6, fontFamily:C.F }}>
              SEWA XAI uses cookies
            </div>
            <p style={{ fontSize:12, color:C.textLo, margin:0, lineHeight:1.7, fontFamily:C.F }}>
              We use strictly necessary cookies to run the clinical platform, plus optional cookies for analytics and functionality improvements.
              No cookies from the clinical application contain patient health data.
              {' '}<button onClick={() => onNavigate('cookie-policy')} style={{ color:C.brand, background:'none', border:'none', cursor:'pointer', fontSize:12, fontFamily:C.F, textDecoration:'underline' }}>
                Cookie Policy
              </button>
            </p>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0, alignItems:'center', flexWrap:'wrap' }}>
            <button onClick={() => setExpanded(e => !e)} style={{ padding:'7px 14px', background:'none', border:`1px solid ${C.border}`, borderRadius:8, color:C.textMd, fontSize:12, cursor:'pointer', fontFamily:C.F }}>
              Customise
            </button>
            <button onClick={() => save(false, true)} style={{ padding:'7px 14px', background:'none', border:`1px solid ${C.border}`, borderRadius:8, color:C.textLo, fontSize:12, cursor:'pointer', fontFamily:C.F }}>
              Reject All
            </button>
            <button onClick={() => save(true)} style={{ padding:'8px 20px', background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, border:'none', borderRadius:8, color:'white', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:C.F }}>
              Accept All
            </button>
          </div>
        </div>

        {/* Expanded granular controls */}
        {expanded && (
          <div style={{ borderTop:`1px solid ${C.border}`, padding:'16px 24px', background:C.bg2 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:16 }}>
              {[
                { id:'strictly_necessary', label:'Strictly Necessary', required:true,  desc:'Login, security, session' },
                { id:'functional',         label:'Functional',         required:false, desc:'Language, theme, preferences' },
                { id:'analytics',          label:'Analytics',          required:false, desc:'Anonymous platform improvements' },
                { id:'marketing',          label:'Marketing',          required:false, desc:'Relevant content (public site only)' },
              ].map(cat => (
                <label key={cat.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:C.bg3, borderRadius:9, border:`1px solid ${C.border}`, cursor: cat.required ? 'not-allowed' : 'pointer' }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:C.textHi, fontFamily:C.F }}>{cat.label}</div>
                    <div style={{ fontSize:10, color:C.textLo, marginTop:2, fontFamily:C.F }}>{cat.desc}</div>
                  </div>
                  <div onClick={(e) => { if (cat.required) return; e.preventDefault(); setPrefs(p => ({ ...p, [cat.id]: !p[cat.id as keyof typeof p] })); }}
                    style={{
                      width:36, height:20, borderRadius:10, flexShrink:0,
                      background: (cat.required || prefs[cat.id as keyof typeof prefs]) ? C.brand : C.bg3,
                      border:`1px solid ${C.border}`, position:'relative', marginLeft:12,
                      transition:'background 0.2s', opacity: cat.required ? 0.5 : 1,
                      cursor: cat.required ? 'not-allowed' : 'pointer',
                    }}>
                    <div style={{
                      width:14, height:14, borderRadius:7, background:'white',
                      position:'absolute', top:2,
                      left: (cat.required || prefs[cat.id as keyof typeof prefs]) ? 18 : 2,
                      transition:'left 0.2s', boxShadow:'0 1px 2px rgba(0,0,0,0.3)',
                    }}/>
                  </div>
                </label>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button onClick={() => save(false)} style={{ padding:'8px 20px', background:C.brand, border:'none', borderRadius:8, color:'white', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:C.F }}>
                Save My Choices
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
