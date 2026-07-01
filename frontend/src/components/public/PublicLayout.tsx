// SEWA XAI — components/public/PublicLayout.tsx
// Enterprise public site shell: sticky nav, mega-footer, cookie banner wiring
// Used by: Landing, Pricing, Solutions, About, Contact, Downloads, Cookies, Privacy, Terms

import React, { useState, useEffect } from 'react';

const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A',
  brand:'#408D7B', brandLt:'#52B09A', brandDk:'#2E6B5E',
  critical:'#E03535', normal:'#1DBF73', info:'#2A6EF2', purple:'#8B5CF6',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028', F:"'IBM Plex Sans',system-ui,sans-serif",
};

const NAV_LINKS = [
  { label:'Solutions',  id:'solutions', children:[
    { label:'Triage AI',         id:'triage-ai',     desc:'ICH, PE, stroke in < 2s' },
    { label:'Uncertainty Engine',id:'uncertainty-ai', desc:'Monte Carlo Dropout confidence' },
    { label:'VLM Reports',       id:'vision-language-ai', desc:'AI-generated structured reports' },
    { label:'Metacognition',     id:'metacognition-ai',desc:'AI governance & integrity layer' },
    { label:'Explainability',    id:'explainable-ai',  desc:'Grad-CAM pixel attribution' },
  ]},
  { label:'Research',   id:'research',   children:null },
  { label:'Compliance', id:'regulatory', children:null },
  { label:'Validation', id:'clinical-validation', children:null },
  { label:'Pricing',    id:'pricing',    children:null },
  { label:'API Docs',   id:'api-docs',   children:null },
];

const FOOTER_LINKS = {
  Product: [
    { label:'Triage Engine',      id:'triage-ai' },
    { label:'Uncertainty AI',     id:'uncertainty-ai' },
    { label:'VLM Reporting',      id:'vision-language-ai' },
    { label:'Metacognition',      id:'metacognition-ai' },
    { label:'Explainable AI',     id:'explainable-ai' },
    { label:'Enterprise API',     id:'api-docs' },
    { label:'Downloads',          id:'downloads' },
  ],
  Evidence: [
    { label:'Clinical Validation',id:'clinical-validation' },
    { label:'Research Portal',    id:'research' },
    { label:'Regulatory Summary', id:'regulatory' },
    { label:'Peer-Reviewed Papers',id:'research' },
    { label:'Algorithm Audit',    id:'regulatory' },
  ],
  Company: [
    { label:'About Us',           id:'about' },
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
  ],
};

export function PublicNav({ activePage, onNavigate }: { activePage: string; onNavigate: (page: string) => void }) {
  const [scrolled,   setScrolled]   = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [activeDD,   setActiveDD]   = useState<string|null>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav style={{
      position:'fixed', top:0, left:0, right:0, zIndex:1000,
      background: scrolled ? 'rgba(8,22,15,0.95)' : 'rgba(5,15,12,0.6)',
      backdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${scrolled ? C.border : 'transparent'}`,
      transition:'all 0.3s ease',
      fontFamily: C.F,
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
          <div style={{ width:34, height:34, background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', padding:4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display:'block' }}>
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span style={{ fontSize:17, fontWeight:800, color:C.textHi, letterSpacing:'-0.5px' }}>SEWA XAI</span>
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
                style={{ padding:'6px 16px', background:'none', border:'none', color: activePage===link.id?C.brand:C.textMd,
                  fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:C.F, borderRadius:7,
                  display:'flex', alignItems:'center', gap:4,
                  transition:'all 0.2s',
                }}>
                {link.label}
                {link.children && <span style={{ fontSize:9, opacity:0.6 }}>▾</span>}
              </button>

              {link.children && activeDD === link.label && (
                <div style={{
                  position:'absolute', top:'100%', left:'50%', transform:'translateX(-50%)', minWidth:260,
                  background:C.bg2, border:`1px solid ${C.border}`,
                  borderRadius:12, padding:8, marginTop:8,
                  boxShadow:'0 20px 40px rgba(0,0,0,0.5)',
                }}>
                  {link.children.map(c => (
                    <button key={c.label} onClick={() => { onNavigate(c.id); setActiveDD(null); }}
                      style={{ display:'block', width:'100%', padding:'10px 12px', textAlign:'left',
                        background:'none', border:'none', borderRadius:8, cursor:'pointer', fontFamily:C.F }}>
                      <div style={{ fontSize:13, fontWeight:700, color:C.textHi }}>{c.label}</div>
                      <div style={{ fontSize:11, color:C.textLo, marginTop:2, lineHeight:1.4 }}>{c.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="nav-cta" style={{ display:'flex', gap:8, flexShrink:0, width:'auto', maxWidth:260, justifyContent:'flex-end' }}>
          <button onClick={() => onNavigate('login')} style={{ padding:'7px 16px', background:'none', border:`1px solid ${C.border}`, borderRadius:8, color:C.textMd, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:C.F }}>
            Sign In
          </button>
          <button onClick={() => onNavigate('register')} style={{ padding:'7px 16px', background:C.bg1, border:`1px solid ${C.brand}30`, borderRadius:8, color:C.brand, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:C.F }}>
            Register
          </button>
          <button onClick={() => onNavigate('contact')} style={{ padding:'7px 18px', background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, border:'none', borderRadius:8, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:C.F }}>
            Demo
          </button>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(m => !m)} style={{ display:'none', background:'none', border:'none', color:C.textHi, fontSize:24, cursor:'pointer', padding:4 }}
          className="mobile-menu-btn-trigger">
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div style={{ background:C.bg1, borderTop:`1px solid ${C.border}`, padding:'16px 24px 32px', maxHeight:'90vh', overflowY:'auto' }}>
          {NAV_LINKS.map(l => (
            <div key={l.label}>
              <button onClick={() => { if(!l.children) { onNavigate(l.id); setMenuOpen(false); } }}
                style={{ display:'block', width:'100%', padding:'14px 0', textAlign:'left', background:'none', border:'none', color:C.textHi, fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:C.F, borderBottom:`1px solid ${C.border}` }}>
                {l.label} {l.children && '▾'}
              </button>
              {l.children && l.children.map(c => (
                <button key={c.id} onClick={() => { onNavigate(c.id); setMenuOpen(false); }}
                  style={{ display:'block', width:'100%', padding:'10px 16px', textAlign:'left', background:'none', border:'none', color:C.textMd, fontSize:13, cursor:'pointer', fontFamily:C.F, borderBottom:`1px solid ${C.border}40` }}>
                  {c.label}
                </button>
              ))}
            </div>
          ))}
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={() => { onNavigate('login'); setMenuOpen(false); }} style={{ flex:1, padding:'12px 0', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:10, color:C.textMd, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:C.F }}>Sign In</button>
            <button onClick={() => { onNavigate('contact'); setMenuOpen(false); }} style={{ flex:1, padding:'12px 0', background:C.brand, border:'none', borderRadius:10, color:'white', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:C.F }}>Request Demo</button>
          </div>
        </div>
      )}
    </nav>
  );
}

export function PublicFooter({ onNavigate }: { onNavigate: (page: string) => void }) {
  const pStyle: React.CSSProperties = { fontSize:13, color:C.textLo, lineHeight:1.7, margin:'0 0 20px', fontFamily:C.F };

  return (
    <footer style={{ background:C.bg0, borderTop:`1px solid ${C.border}`, fontFamily:C.F, paddingBottom:40 }}>
      {/* Main footer grid */}
      <div style={{ maxWidth:1280, margin:'0 auto', padding:'80px 24px 40px' }}>
        <div className="footer-top" style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:64, marginBottom:64 }}>
          <div>
            <div onClick={() => onNavigate('landing')} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, cursor:'pointer' }}>
              <div style={{ width:34, height:34, background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', padding:4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display:'block' }}>
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <span style={{ fontSize:18, fontWeight:800, color:C.textHi, letterSpacing:'-0.5px' }}>SEWA XAI</span>
            </div>
            <p style={pStyle}>
              Empowering clinicians with diagnostic intelligence. Deployed worldwide to detect life-threatening conditions in seconds with peer-reviewed accuracy and military-grade security.
            </p>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {['NHS DSPT','UK GDPR','HIPAA','EU AI ACT'].map(b => (
                <span key={b} style={{ padding:'4px 10px', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:20, fontSize:10, fontWeight:700, color:C.brand, letterSpacing:'0.02em' }}>{b}</span>
              ))}
            </div>

            <div style={{ marginTop:32 }}>
              <div style={{ fontSize:11, color:C.textLo, marginBottom:12, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>Developers</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[['Developers','developers'],['API Reference','api-docs'],['SDKs','api-docs'],['Uptime Status','status']].map(([lbl, id]) => (
                  <button key={lbl} onClick={() => onNavigate(id)} style={{ textAlign:'left', background:'none', border:'none', color:C.textMd, fontSize:13, padding:0, cursor:'pointer', fontFamily:C.F }}>{lbl}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="footer-links" style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:32 }}>
            {Object.entries(FOOTER_LINKS).map(([title, links]) => (
              <div key={title}>
                <h4 style={{ fontSize:11, fontWeight:700, color:C.textMd, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:20 }}>{title}</h4>
                {links.map(l => (
                  <button key={l.label} onClick={() => onNavigate(l.id)} style={{ display:'block', width:'100%', textAlign:'left', padding:'6px 0', background:'none', border:'none', color:C.textLo, fontSize:13, cursor:'pointer', fontFamily:C.F, transition:'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = C.brand} onMouseLeave={e => e.currentTarget.style.color = C.textLo}>{l.label}</button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Global footprints */}
        <div style={{ padding:'40px 0', borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, marginBottom:40 }}>
           <div style={{ display:'flex', gap:40, flexWrap:'wrap', justifyContent:'space-between' }}>
             {[
               { region:'United Kingdom', addr:'Coventry, CV3 2FP' },
               { region:'European Union', addr:'Amsterdam, Netherlands' },
               { region:'West Africa', addr:'Lagos, Nigeria' },
               { region:'North America', addr:'Delaware, USA' },
             ].map(o => (
               <div key={o.region} style={{ minWidth:'140px' }}>
                 <div style={{ fontSize:12, fontWeight:700, color:C.textHi }}>{o.region}</div>
                 <div style={{ fontSize:12, color:C.textLo, marginTop:2 }}>{o.addr}</div>
               </div>
             ))}
           </div>
        </div>

        {/* Copy bar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:24 }}>
          <div style={{ fontSize:12, color:C.textLo }}>
            © {new Date().getFullYear()} SEWA XAI — a Storegrill Inc Ltd company. No. 14581073.
            <div style={{ marginTop:4, fontSize:10, color:C.textLo, opacity:0.8 }}>UK Patent Pending: GB2609706.3 — Storegrill Inc Ltd (Company No. 14581073)</div>
          </div>
          <div style={{ display:'flex', gap:24 }}>
             {[['Privacy','privacy-policy'],['Terms','terms'],['Cookies','cookie-policy'],['Accessibility','accessibility']].map(([lbl, id]) => (
               <button key={lbl} onClick={() => onNavigate(id)} style={{ background:'none', border:'none', color:C.textLo, fontSize:12, cursor:'pointer', fontFamily:C.F }}>{lbl}</button>
             ))}
          </div>
          <div style={{ fontSize:12, color:C.textLo, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ color:C.normal }}>●</span> Platform Status: Operational
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children, activePage, onNavigate }: { children: React.ReactNode; activePage: string; onNavigate: (page: string) => void }) {
  return (
    <div style={{ background: C.bg0, minHeight: '100vh', display:'flex', flexDirection:'column' }}>
      <PublicNav activePage={activePage} onNavigate={onNavigate} />
      <main style={{ flex:1 }}>
        {children}
      </main>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
