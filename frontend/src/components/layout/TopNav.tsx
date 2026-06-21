// SEWA AI — frontend/src/components/layout/TopNav.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTranslation } from '../../i18n/I18nContext';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

const C = {
  bg:       '#08160F', border: '#1B3028', brand: '#408D7B', brandLt: '#52B09A',
  textHi:   '#D0ECE6', textMd: '#6FA898', textLo: '#3A6055',
  critical: '#E03535', urgent: '#E08A20', bg2: '#0C1D17', bg3: '#111F1A',
};

const REGIONS = [
  { key:'uk', label:'🇬🇧 United Kingdom', currency:'GBP', compliance:'NHS DSPT', timezone:'Europe/London', server:'London (uksouth)' },
  { key:'eu', label:'🇪🇺 European Union',  currency:'EUR', compliance:'MDR',      timezone:'Europe/Paris',  server:'Frankfurt (germanywestcentral)' },
  { key:'us', label:'🇺🇸 North America',   currency:'USD', compliance:'HIPAA',    timezone:'America/New_York', server:'East US 2' },
  { key:'ng', label:'🇳🇬 Nigeria',         currency:'NGN', compliance:'NDPR',     timezone:'Africa/Lagos',  server:'South Africa North' },
  { key:'ke', label:'🇰🇪 Kenya',           currency:'KES', compliance:'DPA 2019', timezone:'Africa/Nairobi',server:'South Africa North' },
  { key:'za', label:'🇿🇦 South Africa',    currency:'ZAR', compliance:'POPIA',    timezone:'Africa/Johannesburg', server:'South Africa North' },
  { key:'gh', label:'🇬🇭 Ghana',           currency:'GHS', compliance:'DPA 2012', timezone:'Africa/Accra',  server:'South Africa North' },
  { key:'in', label:'🇮🇳 India',           currency:'INR', compliance:'DPDP',     timezone:'Asia/Kolkata',  server:'Central India' },
];
const LANGS = [
  { key:'en', label:'EN', supported: true  },
  { key:'fr', label:'FR', supported: true  },
  { key:'yo', label:'YO', supported: true  },
  { key:'sw', label:'SW', supported: true  },
  { key:'ar', label:'AR', supported: true  },
  { key:'hi', label:'HI', supported: true  },
  { key:'de', label:'DE', supported: false },
  { key:'es', label:'ES', supported: false },
  { key:'pt', label:'PT', supported: false },
];
const ROLE_LABELS: Record<string,string> = {
  radiologist:'Radiologist', doctor:'Physician', admin:'Hospital Admin',
  superadmin:'Super Admin', patient:'Patient', technician:'Technician',
};
const ROLE_COLORS: Record<string,string> = {
  radiologist: C.brand, doctor: '#2A6EF2', admin: '#8B5CF6',
  superadmin: '#E03535', patient: '#1DBF73', technician: C.urgent,
};

interface Props {
  user: { firstName:string; lastName:string; email:string; role:string; tenantName?:string };
  unreadCount: number;
  onNotifClick(): void;
  onProfileClick(): void;
}

function Dropdown({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{ cursor:'pointer' }}>{trigger}</div>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 8px)', right:0, zIndex:200,
          background:C.bg2, border:`1px solid ${C.border}`, borderRadius:'12px',
          boxShadow:'0 8px 32px rgba(0,0,0,0.6)', minWidth:'180px',
          animation:'dropIn 150ms ease',
          overflow:'hidden',
        }}>
          <style>{`@keyframes dropIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:none; } }`}</style>
          {children}
        </div>
      )}
    </div>
  );
}

export function TopNav({ user, unreadCount, onNotifClick, onProfileClick }: Omit<Props, 'region'|'lang'|'onRegionChange'|'onLangChange'>) {
  const { logout } = useAuthStore();
  const { lang, region, setLang, setRegion } = useSettingsStore();
  const { t } = useTranslation();
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }));
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })), 1000);
    const r = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', r);
    return () => { clearInterval(t); window.removeEventListener('resize', r); };
  }, []);

  const { data: billingRes } = useQuery({
    queryKey: ['billing-status'],
    queryFn: () => apiClient.get('/payments/status'),
    enabled: !!user,
    refetchInterval: 300000, // 5 min
  });

  const billing = billingRes?.data;
  const usagePct = billing?.quota?.monthly ? Math.round((billing.quota.used / billing.quota.monthly) * 100) : 0;
  const isNearLimit = usagePct > 80;

  const currentRegion = REGIONS.find(r => r.key === region) ?? REGIONS[0];
  const roleColor = ROLE_COLORS[user.role] ?? C.brand;

  const navBtn: React.CSSProperties = {
    display:'flex', alignItems:'center', gap:'6px',
    padding:'5px 10px', borderRadius:'8px',
    background:'transparent', border:`1px solid ${C.border}`,
    color:C.textMd, fontSize:'11px', fontFamily:"'IBM Plex Sans', system-ui, sans-serif",
    cursor:'pointer', transition:'all 150ms ease', whiteSpace:'nowrap',
  };

  return (
    <header style={{
      position:'sticky', top:0, zIndex:200,
      display:'flex', alignItems:'center', height:'52px',
      padding:'0 20px', gap:'12px',
      background:C.bg,
      borderBottom:`1px solid ${C.border}`,
      backdropFilter:'blur(12px)',
    }}>
      {/* Logo & Toggle */}
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginRight:'8px', flexShrink:0 }}>
        {isMobile && (
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background:'none', border:'none', color:C.textHi, cursor:'pointer', padding:4 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{
            width:'30px', height:'30px', borderRadius:'8px',
            background:`linear-gradient(135deg, ${C.brand}, #2E6B5E)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:`0 0 12px ${C.brand}40`,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div style={{ display: isMobile ? 'none' : 'block' }}>
            <div style={{ fontSize:'13px', fontWeight:'700', color:C.textHi, letterSpacing:'-0.02em', fontFamily:"'IBM Plex Sans', system-ui, sans-serif", lineHeight:1 }}>SEWA AI</div>
            <div style={{ fontSize:'9px', color:C.textLo, fontFamily:"'IBM Plex Mono', monospace", letterSpacing:'0.08em' }}>
              {user.tenantName || 'Clinical Platform'}
            </div>
          </div>
        </div>
      </div>

      <div style={{ width:'1px', height:'28px', background:C.border, flexShrink:0, display: isMobile ? 'none' : 'block' }} />

      {!isMobile && (
        <>
          <div style={{
            display:'flex', alignItems:'center', gap:'6px',
            padding:'3px 10px', borderRadius:'20px',
            background:`${roleColor}14`, border:`1px solid ${roleColor}30`,
            flexShrink:0,
          }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:roleColor, boxShadow:`0 0 6px ${roleColor}` }} />
            <span style={{ fontSize:'11px', fontWeight:'600', color:roleColor, fontFamily:"'IBM Plex Sans', system-ui, sans-serif", letterSpacing:'0.02em' }}>
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>

          {billing?.quota && (
            <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'0 14px', borderRight:`1px solid ${C.border}`, borderLeft:`1px solid ${C.border}`, height:'32px' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                <div style={{ display:'flex', justifyContent:'space-between', width:100 }}>
                  <span style={{ fontSize:9, color:C.textLo, fontWeight:700 }}>AI USAGE</span>
                  <span style={{ fontSize:9, color:isNearLimit ? C.critical : C.textMd, fontWeight:800 }}>{usagePct}%</span>
                </div>
                <div style={{ width:100, height:3, background:C.bg3, borderRadius:2, overflow:'hidden' }}>
                  <div style={{ 
                    width:`${usagePct}%`, height:'100%', 
                    background: isNearLimit ? C.critical : C.brand,
                    transition:'width 1s ease'
                  }} />
                </div>
              </div>
              <div style={{ fontSize:9, color:C.textLo, maxWidth:80, lineHeight:1.1 }}>
                {billing.quota.used} / {billing.quota.monthly || '∞'} scans
              </div>
            </div>
          )}

          <div style={{ flex:1 }} />

          <div style={{
            fontFamily:"'IBM Plex Mono', monospace", fontSize:'12px',
            color:C.textMd, letterSpacing:'0.04em', flexShrink:0, marginRight: '12px'
          }}>
            {clock}
          </div>

          <Dropdown trigger={
            <button style={navBtn}>
              <span style={{ fontSize:'13px' }}>{currentRegion.label.split(' ')[0]}</span>
              <span>{currentRegion.key.toUpperCase()}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
          }>
            <div style={{ padding:'8px' }}>
              <div style={{ fontSize:'10px', color:C.textLo, padding:'4px 8px', letterSpacing:'0.06em', fontFamily:"'IBM Plex Sans', system-ui, sans-serif" }}>REGION / DATA RESIDENCY</div>
              {REGIONS.map(r => (
                <button key={r.key} onClick={() => setRegion(r.key)} style={{
                  width:'100%', textAlign:'left', padding:'7px 10px',
                  background: r.key === region ? `${C.brand}18` : 'transparent',
                  border:'none', borderRadius:'8px', cursor:'pointer', display:'flex',
                  alignItems:'center', gap:'8px', color:C.textHi,
                  fontSize:'12px', fontFamily:"'IBM Plex Sans', system-ui, sans-serif",
                }}>
                  <span style={{ fontSize:'14px' }}>{r.label.split(' ')[0]}</span>
                  <div style={{ flex:1 }}>
                    <div>{r.label.slice(2).trim()}</div>
                    <div style={{ fontSize:'10px', color:C.textLo }}>{r.compliance} · {r.currency}</div>
                    <div style={{ fontSize:'9px', color:C.textMd, opacity:0.7, marginTop:2, fontFamily:"'IBM Plex Mono', monospace" }}>{r.server}</div>
                  </div>
                  {r.key === region && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>}
                </button>
              ))}
            </div>
          </Dropdown>

          <Dropdown trigger={
            <button style={navBtn}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              {lang.toUpperCase()}
            </button>
          }>
            <div style={{ padding:'8px', width:'180px' }}>
              <div style={{ fontSize:'10px', color:C.textLo, padding:'4px 8px 6px', letterSpacing:'0.06em', fontFamily:"'IBM Plex Sans', system-ui, sans-serif" }}>INTERFACE LANGUAGE</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                {LANGS.map(l => (
                  <button key={l.key} onClick={() => setLang(l.key)} title={!l.supported ? 'Coming soon — displays in English' : undefined} style={{
                    padding:'5px 8px', borderRadius:'6px',
                    background: l.key === lang ? C.brand : C.bg3,
                    color: l.key === lang ? 'white' : l.supported ? C.textMd : C.textLo,
                    border: l.supported ? 'none' : `1px dashed ${C.border}`,
                    cursor:'pointer', fontSize:'11px', fontWeight:'600',
                    fontFamily:"'IBM Plex Sans', system-ui, sans-serif",
                    opacity: l.supported ? 1 : 0.55,
                    position: 'relative',
                  }}>
                    {l.label}
                    {!l.supported && <span style={{ fontSize:'7px', color: C.textLo, display:'block', lineHeight:1 }}>EN</span>}
                  </button>
                ))}
              </div>
              <div style={{ fontSize:'9px', color:C.textLo, padding:'8px 8px 2px', lineHeight:1.4, fontFamily:"'IBM Plex Sans', system-ui, sans-serif", borderTop:`1px solid ${C.border}`, marginTop:6 }}>
                Dashed = English fallback. Full translations available for EN, FR, YO, SW, AR, HI.
              </div>
            </div>
          </Dropdown>
        </>
      )}

      {isMobile && <div style={{ flex:1 }} />}

      <button onClick={onNotifClick} style={{
        position:'relative', width:'34px', height:'34px', borderRadius:'8px',
        background:unreadCount > 0 ? `${C.critical}14` : C.bg3,
        border:`1px solid ${unreadCount > 0 ? `${C.critical}40` : C.border}`,
        display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
        color: unreadCount > 0 ? C.critical : C.textMd, flexShrink:0,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <div style={{
            position:'absolute', top:'-4px', right:'-4px',
            width:'16px', height:'16px', borderRadius:'50%',
            background:C.critical, color:'white', fontSize:'9px', fontWeight:'700',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:`0 0 8px ${C.critical}80`,
            fontFamily:"'IBM Plex Mono', monospace",
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      <Dropdown trigger={
        <div style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', padding:'4px 8px', borderRadius:'8px', border:`1px solid ${C.border}` }}>
          <div style={{
            width:'28px', height:'28px', borderRadius:'50%',
            background:`linear-gradient(135deg, ${roleColor}40, ${roleColor}80)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'11px', fontWeight:'700', color:'white',
          }}>
            {user.firstName[0]}{user.lastName[0]}
          </div>
          {!isMobile && (
            <div style={{ display:'flex', flexDirection:'column' }}>
              <span style={{ fontSize:'12px', fontWeight:'600', color:C.textHi, fontFamily:"'IBM Plex Sans', system-ui, sans-serif", lineHeight:1.2 }}>
                {t('welcome')} {user.firstName}
              </span>
              <span style={{ fontSize:'10px', color:C.textLo, fontFamily:"'IBM Plex Sans', system-ui, sans-serif" }}>
                {user.email}
              </span>
            </div>
          )}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.textLo} strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      }>
        <div style={{ padding:'8px' }}>
          <div style={{ padding:'10px 12px 8px', borderBottom:`1px solid ${C.border}`, marginBottom:'4px' }}>
            <div style={{ fontSize:'13px', fontWeight:'600', color:C.textHi, fontFamily:"'IBM Plex Sans', system-ui, sans-serif" }}>{user.firstName} {user.lastName}</div>
            <div style={{ fontSize:'11px', color:C.textLo, fontFamily:"'IBM Plex Sans', system-ui, sans-serif", marginTop:'2px' }}>{user.email}</div>
          </div>
          {[
            { icon:'👤', label:'Profile Settings', action: onProfileClick },
            { icon:'🔒', label:'Security & MFA', action: onProfileClick },
            { icon:'🔔', label:'Notification Prefs', action: onProfileClick },
            { icon:'📋', label:'Audit Log', action: onProfileClick },
          ].map(item => (
            <button key={item.label} onClick={item.action} style={{
              width:'100%', textAlign:'left', padding:'7px 12px',
              background:'transparent', border:'none', borderRadius:'8px',
              cursor:'pointer', display:'flex', alignItems:'center', gap:'8px',
              color:C.textMd, fontSize:'12px', fontFamily:"'IBM Plex Sans', system-ui, sans-serif",
            }}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
          <div style={{ borderTop:`1px solid ${C.border}`, marginTop:'4px', paddingTop:'4px' }}>
            <button onClick={logout} style={{
              width:'100%', textAlign:'left', padding:'7px 12px',
              background:'transparent', border:'none', borderRadius:'8px',
              cursor:'pointer', display:'flex', alignItems:'center', gap:'8px',
              color:'#E03535', fontSize:'12px', fontFamily:"'IBM Plex Sans', system-ui, sans-serif",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </button>
          </div>
        </div>
      </Dropdown>

      {/* Mobile Drawer */}
      {isMobile && mobileMenuOpen && (
        <>
          <div onClick={() => setMobileMenuOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:299 }} />
          <div style={{
            position:'fixed', top:0, left:0, bottom:0, width:'280px',
            background:C.bg2, borderRight:`1px solid ${C.border}`, zIndex:300,
            padding:'20px', display:'flex', flexDirection:'column', gap:'20px',
            animation:'slideIn 300ms ease'
          }}>
            <style>{`@keyframes slideIn { from { transform:translateX(-100%); } to { transform:none; } }`}</style>
            <div style={{ fontSize:'18px', fontWeight:'700', color:C.textHi }}>SEWA AI</div>
            
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <div style={{ fontSize:'10px', color:C.textLo, letterSpacing:'0.06em' }}>REGION</div>
              <button style={navBtn}>{currentRegion.label}</button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <div style={{ fontSize:'10px', color:C.textLo, letterSpacing:'0.06em' }}>LANGUAGE</div>
              <button style={navBtn}>{LANGS.find(l=>l.key===lang)?.label || 'English'}</button>
            </div>

            <div style={{ flex:1 }} />
            <div style={{ fontSize:'11px', color:C.textLo, fontFamily:"'IBM Plex Mono', monospace" }}>{clock}</div>
          </div>
        </>
      )}
    </header>
  );
}
