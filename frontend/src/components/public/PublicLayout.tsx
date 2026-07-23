// SEWA XAI — components/public/PublicLayout.tsx
// Enterprise public site shell: sticky nav, mega-footer, cookie banner wiring
// Used by: Landing, Pricing, Solutions, About, Contact, Downloads, Cookies, Privacy, Terms

import React, { useState, useEffect } from 'react';
import { colors, typography } from '../../design-system/tokens';
import { useSettingsStore } from '../../store/settingsStore';

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'ar', label: 'AR', name: 'العربية' },
  { code: 'sw', label: 'SW', name: 'Kiswahili' },
  { code: 'yo', label: 'YO', name: 'Yorùbá' },
  { code: 'hi', label: 'HI', name: 'हिन्दी' },
  { code: 'pt', label: 'PT', name: 'Português' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'it', label: 'IT', name: 'Italiano' },
] as const;

const NAV_LINKS = [
  { label:'Solutions',  id:'solutions', children:[
    { label:'Triage AI',         id:'triage-ai',     desc:'ICH, PE, stroke in < 2s' },
    { label:'Uncertainty Engine',id:'uncertainty-ai', desc:'Monte Carlo Dropout confidence' },
    { label:'VLM Reports',       id:'vision-language-ai', desc:'AI-generated structured reports' },
    { label:'Explainability',    id:'explainable-ai',  desc:'Grad-CAM pixel attribution' },
    { label:'Specialized AI',    id:'specialized-ai', desc:'Pathology, mammography, retinal' },
  ]},
  { label:'Pricing', id:'pricing', children:null },
  { label:'Evidence', id:'clinical-evidence', children: [
    { label:'Clinical Evidence', id:'clinical-evidence', desc:'TRL 5 & regulatory progress' },
    { label:'AI Safety', id:'ai-safety', desc:'Safety & reliability engineering' },
    { label:'Research', id:'research', desc:'Research & development' },
    { label:'Regulatory', id:'regulatory', desc:'Regulatory timeline' },
  ] },
  { label:'Company', id:'about', children: [
    { label:'About Us', id:'about', desc:'Our story & team' },
    { label:'Governance', id:'governance', desc:'Clinical governance' },
    { label:'Publications', id:'publications', desc:'Research papers' },
  ] },
];

const FOOTER_LINKS = {
  Product: [
    { label:'Triage Engine',      id:'triage-ai' },
    { label:'Uncertainty AI',     id:'uncertainty-ai' },
    { label:'VLM Reporting',      id:'vision-language-ai' },
    { label:'Metacognition',      id:'metacognition-ai' },
    { label:'Explainable AI',     id:'explainable-ai' },
    { label:'Pathology AI',       id:'pathology-ai' },
    { label:'Mammography AI',     id:'mammography-ai' },
    { label:'Retinal AI',         id:'retinal-ai' },
    { label:'Enterprise API',     id:'api-docs' },
    { label:'Downloads',          id:'downloads' },
  ],
  Pricing: [
    { label:'Starter Clinic',     id:'pricing' },
    { label:'Hospital Pro',       id:'pricing' },
    { label:'Enterprise',         id:'pricing' },
    { label:'Africa Pricing',     id:'africa-pricing' },
  ],
  Evidence: [
    { label:'Clinical Evidence',  id:'clinical-evidence' },
    { label:'AI Safety',          id:'ai-safety' },
    { label:'Research Portal',    id:'research' },
    { label:'Regulatory Timeline',id:'regulatory' },
    { label:'Publications',       id:'publications' },
  ],
  Company: [
    { label:'About Us',           id:'about' },
    { label:'Governance',         id:'governance' },
    { label:'Careers',            id:'careers' },
    { label:'Press',              id:'press' },
    { label:'Contact',            id:'contact' },
    { label:'Status',             id:'status' },
  ],
  Legal: [
    { label:'Privacy Policy',     id:'privacy-policy' },
    { label:'Terms of Service',   id:'terms' },
    { label:'Cookie Policy',      id:'cookie-policy' },
    { label:'Security',           id:'security' },
    { label:'Accessibility',      id:'accessibility' },
  ],
};

export function PublicNav({ activePage, onNavigate }: { activePage: string; onNavigate: (page: string) => void }) {
  const [scrolled,   setScrolled]   = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [activeDD,   setActiveDD]   = useState<string|null>(null);
  const [langOpen,   setLangOpen]   = useState(false);
  const { lang, setLang } = useSettingsStore();
  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    const closeLang = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('button')) setLangOpen(false); };
    window.addEventListener('click', closeLang);
    return () => { window.removeEventListener('scroll', fn); window.removeEventListener('click', closeLang); };
  }, []);

  return (
    <nav style={{
      position:'fixed', top:0, left:0, right:0, zIndex:1000,
      background: scrolled ? 'rgba(8,22,15,0.95)' : 'rgba(5,15,12,0.6)',
      backdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${scrolled ? colors.bgBorder : 'transparent'}`,
      transition:'all 0.3s ease',
      fontFamily: typography.fontBase,
    }}>
      <style>{`
        @media (max-width: 1000px) {
          .nav-desktop { display: none !important; }
          .mobile-menu-btn-trigger { display: block !important; }
          .mobile-spacer { display: block !important; flex: 1; }
          .nav-cta { display: none !important; }
        }
        @media (max-width: 900px) {
          .footer-top { grid-template-columns: 1fr !important; }
          .footer-links { grid-template-columns: repeat(2, 1fr) !important; gap: 40px !important; }
        }
        @media (max-width: 600px) {
          .footer-links { grid-template-columns: 1fr !important; }
          .legal-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
      <div style={{ maxWidth:1280, margin:'0 auto', padding:'0 24px', display:'flex', alignItems:'center', height:64, gap:20 }}>

        {/* Logo */}
        <div onClick={() => onNavigate('landing')} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', flexShrink:0 }}>
          <div style={{ width:34, height:34, background:`linear-gradient(135deg,${colors.brand},${colors.brandDark})`, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', padding:4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display:'block' }}>
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span style={{ fontSize:17, fontWeight:800, color:colors.textHigh, letterSpacing:'-0.5px' }}>SEWA XAI</span>
        </div>

        {/* Mobile Spacer (pushes hamburger to right) */}
        <div className="mobile-spacer" style={{ display:'none' }} />

        {/* Desktop nav - centralized */}
        <div className="nav-desktop" style={{ display:'flex', alignItems:'center', gap:4, flex:1, justifyContent:'center' }}>
          {NAV_LINKS.map(link => (
            <div key={link.label} style={{ position:'relative' }}
              onMouseEnter={() => link.children && setActiveDD(link.label)}
              onMouseLeave={() => setActiveDD(null)}>
              <button onClick={() => !link.children && onNavigate(link.id)}
                style={{ padding:'6px 16px', background:'none', border:'none', color: activePage===link.id?colors.brand:colors.textMed,
                  fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:typography.fontBase, borderRadius:7,
                  display:'flex', alignItems:'center', gap:4,
                  transition:'all 0.2s',
                }}>
                {link.label}
                {link.children && <span style={{ fontSize:9, opacity:0.6 }}>▾</span>}
              </button>

              {link.children && activeDD === link.label && (
                <div style={{
                  position:'absolute', top:'100%', left:'50%', transform:'translateX(-50%)', minWidth:260,
                  background:colors.bg2, border:`1px solid ${colors.bgBorder}`,
                  borderRadius:12, padding:8, marginTop:8,
                  boxShadow:'0 20px 40px rgba(0,0,0,0.5)',
                }}>
                  {link.children.map(c => (
                    <button key={c.label} onClick={() => { onNavigate(c.id); setActiveDD(null); }}
                      style={{ display:'block', width:'100%', padding:'10px 12px', textAlign:'left',
                        background:'none', border:'none', borderRadius:8, cursor:'pointer', fontFamily:typography.fontBase }}>
                      <div style={{ fontSize:13, fontWeight:700, color:colors.textHigh }}>{c.label}</div>
                      {c.desc && <div style={{ fontSize:11, color:colors.textLow, marginTop:2, lineHeight:1.4 }}>{c.desc}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Language selector */}
        <div style={{ position:'relative', flexShrink:0 }}>
          <button onClick={() => setLangOpen(o => !o)}
            style={{ padding:'6px 10px', background:'none', border:`1px solid ${colors.bgBorder}`, borderRadius:7, color:colors.textMed, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:typography.fontBase, display:'flex', alignItems:'center', gap:4 }}>
            {currentLang.label}
            <span style={{ fontSize:9, opacity:0.6 }}>▾</span>
          </button>
          {langOpen && (
            <div style={{ position:'absolute', top:'100%', right:0, marginTop:6, background:colors.bg2, border:`1px solid ${colors.bgBorder}`, borderRadius:10, padding:4, boxShadow:'0 12px 24px rgba(0,0,0,0.4)', zIndex:100, minWidth:140 }}>
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); }}
                  style={{ display:'block', width:'100%', padding:'8px 12px', textAlign:'left', background: lang === l.code ? `${colors.brand}15` : 'none', border:'none', borderRadius:7, color: lang === l.code ? colors.brand : colors.textMed, fontSize:12, fontWeight: lang === l.code ? 700 : 500, cursor:'pointer', fontFamily:typography.fontBase }}>
                  <span style={{ marginRight:8 }}>{l.label}</span>
                  <span style={{ color: colors.textLow }}>{l.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CTA buttons */}
        <div className="nav-cta" style={{ display:'flex', gap:8, flexShrink:0, width:'auto', maxWidth:260, justifyContent:'flex-end' }}>
          <button onClick={() => onNavigate('login')} style={{ padding:'7px 16px', background:'none', border:`1px solid ${colors.bgBorder}`, borderRadius:8, color:colors.textMed, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:typography.fontBase }}>
            Sign In
          </button>
          <button onClick={() => onNavigate('register')} style={{ padding:'7px 16px', background:colors.bg1, border:`1px solid ${colors.brand}30`, borderRadius:8, color:colors.brand, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:typography.fontBase }}>
            Register
          </button>
          <button onClick={() => onNavigate('contact')} style={{ padding:'7px 18px', background:`linear-gradient(135deg,${colors.brand},${colors.brandDark})`, border:'none', borderRadius:8, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:typography.fontBase }}>
            Demo
          </button>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(m => !m)} style={{ display:'none', background:'none', border:'none', color:colors.textHigh, fontSize:24, cursor:'pointer', padding:4 }}
          className="mobile-menu-btn-trigger">
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div style={{ background:colors.bg1, borderTop:`1px solid ${colors.bgBorder}`, padding:'16px 24px 32px', maxHeight:'90vh', overflowY:'auto' }}>
          {NAV_LINKS.map(l => (
            <div key={l.label}>
              <button onClick={() => { if(!l.children) { onNavigate(l.id); setMenuOpen(false); } }}
                style={{ display:'block', width:'100%', padding:'14px 0', textAlign:'left', background:'none', border:'none', color:colors.textHigh, fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:typography.fontBase, borderBottom:`1px solid ${colors.bgBorder}` }}>
                {l.label} {l.children && '▾'}
              </button>
              {l.children && l.children.map(c => (
                <button key={c.id} onClick={() => { onNavigate(c.id); setMenuOpen(false); }}
                  style={{ display:'block', width:'100%', padding:'10px 16px', textAlign:'left', background:'none', border:'none', color:colors.textMed, fontSize:13, cursor:'pointer', fontFamily:typography.fontBase, borderBottom:`1px solid ${colors.bgBorder}40` }}>
                  {c.label}
                </button>
              ))}
            </div>
          ))}
          <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid ${colors.bgBorder}` }}>
            <div style={{ fontSize:11, color:colors.textLow, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Language</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => { setLang(l.code); setMenuOpen(false); }}
                  style={{ padding:'6px 12px', borderRadius:8, background: lang === l.code ? `${colors.brand}20` : colors.bg3, border:`1px solid ${lang === l.code ? colors.brand + '40' : colors.bgBorder}`, color: lang === l.code ? colors.brand : colors.textMed, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:typography.fontBase }}>
                  {l.label} {l.name}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            <button onClick={() => { onNavigate('login'); setMenuOpen(false); }} style={{ flex:1, padding:'12px 0', background:colors.bg3, border:`1px solid ${colors.bgBorder}`, borderRadius:10, color:colors.textMed, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:typography.fontBase }}>Sign In</button>
            <button onClick={() => { onNavigate('contact'); setMenuOpen(false); }} style={{ flex:1, padding:'12px 0', background:colors.brand, border:'none', borderRadius:10, color:'white', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:typography.fontBase }}>Request Demo</button>
          </div>
        </div>
      )}
    </nav>
  );
}

export function PublicFooter({ onNavigate }: { onNavigate: (page: string) => void }) {
  const pStyle: React.CSSProperties = { fontSize:13, color:colors.textLow, lineHeight:1.7, margin:'0 0 20px', fontFamily:typography.fontBase };

  return (
    <footer style={{ background:colors.bg0, borderTop:`1px solid ${colors.bgBorder}`, fontFamily:typography.fontBase, paddingBottom:40 }}>
      {/* Main footer grid */}
      <div style={{ maxWidth:1280, margin:'0 auto', padding:'80px 24px 40px' }}>
        <div className="footer-top" style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:64, marginBottom:64 }}>
          <div>
            <div onClick={() => onNavigate('landing')} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, cursor:'pointer' }}>
              <div style={{ width:34, height:34, background:`linear-gradient(135deg,${colors.brand},${colors.brandDark})`, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', padding:4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display:'block' }}>
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <span style={{ fontSize:18, fontWeight:800, color:colors.textHigh, letterSpacing:'-0.5px' }}>SEWA XAI</span>
            </div>
            <p style={pStyle}>
              Building the future of diagnostic intelligence. Engineering clinical AI to detect life-threatening conditions in seconds. (Currently in TRL 5 R&D validation).
            </p>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {['DCB0129','NHS INNOVATION'].map(b => (
                <span key={b} style={{ padding:'4px 10px', background:colors.bg2, border:`1px solid ${colors.bgBorder}`, borderRadius:20, fontSize:10, fontWeight:700, color:colors.brand, letterSpacing:'0.02em' }}>{b}</span>
              ))}
            </div>

            <div style={{ marginTop:32 }}>
              <div style={{ fontSize:11, color:colors.textLow, marginBottom:12, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>Developers</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[['Developers','developers'],['API Reference','api-docs'],['SDKs','api-docs'],['Uptime Status','status']].map(([lbl, id]) => (
                  <button key={lbl} onClick={() => onNavigate(id)} style={{ textAlign:'left', background:'none', border:'none', color:colors.textMed, fontSize:13, padding:0, cursor:'pointer', fontFamily:typography.fontBase }}>{lbl}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="footer-links" style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:32 }}>
            {Object.entries(FOOTER_LINKS).map(([title, links]) => (
              <div key={title}>
                <h4 style={{ fontSize:11, fontWeight:700, color:colors.textMed, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:20 }}>{title}</h4>
                {links.map(l => (
                  <button key={l.label} onClick={() => onNavigate(l.id)} style={{ display:'block', width:'100%', textAlign:'left', padding:'6px 0', background:'none', border:'none', color:colors.textLow, fontSize:13, cursor:'pointer', fontFamily:typography.fontBase, transition:'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = colors.brand} onMouseLeave={e => e.currentTarget.style.color = colors.textLow}>{l.label}</button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Global footprints */}
        <div style={{ padding:'40px 0', borderTop:`1px solid ${colors.bgBorder}`, borderBottom:`1px solid ${colors.bgBorder}`, marginBottom:40 }}>
           <div style={{ display:'flex', gap:40, flexWrap:'wrap', justifyContent:'space-between' }}>
             {[
               { region:'United Kingdom', addr:'Coventry, CV3 2FP' },
               { region:'European Union', addr:'Amsterdam, Netherlands' },
               { region:'West Africa', addr:'Lagos, Nigeria' },
               { region:'North America', addr:'Delaware, USA' },
             ].map(o => (
               <div key={o.region} style={{ minWidth:'140px' }}>
                 <div style={{ fontSize:12, fontWeight:700, color:colors.textHigh }}>{o.region}</div>
                 <div style={{ fontSize:12, color:colors.textLow, marginTop:2 }}>{o.addr}</div>
               </div>
             ))}
           </div>
        </div>

        {/* Copy bar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:24 }}>
          <div style={{ fontSize:12, color:colors.textLow }}>
            © {new Date().getFullYear()} SEWA XAI — a Storegrill Inc Ltd company. No. 14581073.
            <div style={{ marginTop:4, fontSize:10, color:colors.textLow, opacity:0.8 }}>UK Patent Pending: GB2609706.3 — Storegrill Inc Ltd (Company No. 14581073)</div>
          </div>
          <div style={{ display:'flex', gap:24 }}>
             {[['Privacy','privacy-policy'],['Terms','terms'],['Cookies','cookie-policy'],['Accessibility','accessibility']].map(([lbl, id]) => (
               <button key={lbl} onClick={() => onNavigate(id)} style={{ background:'none', border:'none', color:colors.textLow, fontSize:12, cursor:'pointer', fontFamily:typography.fontBase }}>{lbl}</button>
             ))}
          </div>
          <div style={{ fontSize:12, color:colors.textLow, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ color:colors.normal }}>●</span> Platform Status: Operational
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children, activePage, onNavigate }: { children: React.ReactNode; activePage: string; onNavigate: (page: string) => void }) {
  return (
    <div style={{ background: colors.bg0, minHeight: '100vh', display:'flex', flexDirection:'column' }}>
      <PublicNav activePage={activePage} onNavigate={onNavigate} />
      <main style={{ flex:1 }}>
        {children}
      </main>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
