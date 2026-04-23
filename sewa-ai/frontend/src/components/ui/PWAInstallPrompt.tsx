// SEWA AI — PWAInstallPrompt.tsx
// Shows an install-to-home-screen prompt for clinical staff on mobile.
// Handles Chrome/Edge beforeinstallprompt and iOS detection.
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import React, { useState, useEffect } from 'react';

const C = {
  bg1:'#08160F', brand:'#408D7B', brandLt:'#52B09A',
  textHi:'#D0ECE6', textMd:'#6FA898', border:'#1B3028',
  F:"'IBM Plex Sans',system-ui,sans-serif",
};

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // iOS detection
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/.test(ua.toLowerCase());
    const standalone = (navigator as any).standalone;
    if (ios && !standalone) {
      setIsIOS(true);
      // Show iOS prompt after 10s if not dismissed
      const dismissed = sessionStorage.getItem('sewa-pwa-ios-dismissed');
      if (!dismissed) setTimeout(() => setVisible(true), 10000);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      const dismissed = sessionStorage.getItem('sewa-pwa-dismissed');
      if (!dismissed) setTimeout(() => setVisible(true), 5000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(isIOS ? 'sewa-pwa-ios-dismissed' : 'sewa-pwa-dismissed', '1');
  };

  const install = async () => {
    if (prompt) {
      await prompt.prompt();
      const result = await prompt.userChoice;
      if (result.outcome === 'accepted') setVisible(false);
    }
  };

  return (
    <div style={{ position:'fixed', bottom:16, left:16, right:16, maxWidth:420, margin:'0 auto', background:C.bg1, borderRadius:16, padding:'16px 20px', border:`1px solid ${C.brand}60`, boxShadow:'0 16px 48px rgba(0,0,0,0.6)', zIndex:8000, display:'flex', gap:14, alignItems:'center' }}>
      <div style={{ fontSize:28, flexShrink:0 }}>📲</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.textHi, fontFamily:C.F, marginBottom:2 }}>
          Install SEWA AI
        </div>
        <div style={{ fontSize:12, color:C.textMd, fontFamily:C.F, lineHeight:1.5 }}>
          {isIOS
            ? 'Tap the Share button then "Add to Home Screen" for faster clinical access'
            : 'Install for offline access, faster alerts, and full-screen clinical view'}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
        {!isIOS && (
          <button onClick={install} style={{ padding:'7px 14px', background:C.brand, border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:C.F }}>
            Install
          </button>
        )}
        <button onClick={dismiss} style={{ padding:'7px 14px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, color:C.textMd, fontSize:12, cursor:'pointer', fontFamily:C.F }}>
          Later
        </button>
      </div>
    </div>
  );
}
