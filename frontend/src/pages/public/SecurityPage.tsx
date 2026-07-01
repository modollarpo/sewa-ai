// SEWA XAI — SecurityPage.tsx
import React from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandDk:'#2E6B5E',normal:'#1DBF73',info:'#2A6EF2',critical:'#E03535',amber:'#F59E0B',purple:'#8B5CF6',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",FM:"'IBM Plex Mono',monospace",
};

const CERTS = [
  { name:'ISO 27001',     desc:'Information Security Management System — certified annually by BSI Group.', status:'Certified', icon:'🏅', color:C.normal },
  { name:'SOC 2 Type II', desc:'Annual audit of security, availability, processing integrity, confidentiality, and privacy controls.', status:'Certified', icon:'🔐', color:C.normal },
  { name:'ISO 13485',     desc:'Quality Management System for medical devices.', status:'Certified', icon:'🏥', color:C.normal },
  { name:'CE Mark (MDR)', desc:'EU Medical Device Regulation 2017/745, Class IIb. Notified body: BSI Healthcare.', status:'Certified', icon:'🇪🇺', color:C.normal },
  { name:'UKCA Mark',     desc:'UK Conformity Assessed — equivalent to CE mark for UK market.', status:'Certified', icon:'🇬🇧', color:C.normal },
  { name:'FDA 510(k)',    desc:'US Food & Drug Administration clearance for ICH, PE, and pneumothorax detection.', status:'Cleared', icon:'🇺🇸', color:C.normal },
  { name:'NHS DSPT',      desc:'NHS Data Security and Protection Toolkit — Standards Met for all NHS deployments.', status:'Standards Met', icon:'💙', color:C.normal },
  { name:'Cyber Essentials Plus', desc:'UK NCSC Cyber Essentials Plus certification.', status:'Certified', icon:'🛡️', color:C.normal },
];

const CONTROLS = [
  { category:'Encryption', icon:'🔐', items:[
    { label:'Data at rest',      value:'AES-256-GCM (Azure Key Vault / AWS KMS / GCP KMS managed keys)' },
    { label:'Data in transit',   value:'TLS 1.3 — TLS 1.2 minimum (TLS 1.0/1.1 disabled)' },
    { label:'Database',          value:'PostgreSQL TDE + column-level encryption for PHI fields' },
    { label:'Mobile storage',    value:'iOS Data Protection (FileProtectionComplete) + Android Keystore' },
    { label:'Key rotation',      value:'90-day automatic rotation via cloud KMS' },
    { label:'Certificate pinning',value:'Enabled on all mobile apps — MITM resistant' },
  ]},
  { category:'Access Control', icon:'🔑', items:[
    { label:'Authentication',    value:'JWT (15min expiry) + Refresh tokens (7d, HttpOnly, SameSite=Strict)' },
    { label:'MFA',               value:'TOTP (RFC 6238) enforced for all clinical accounts' },
    { label:'Biometrics',        value:'Face ID / Touch ID / Fingerprint via device secure enclave' },
    { label:'RBAC',              value:'6 roles, enforced at API and database levels' },
    { label:'Session management',value:'Automatic timeout, concurrent session limits, remote revocation' },
    { label:'Jailbreak/root',    value:'Detected and access blocked on mobile apps' },
  ]},
  { category:'Infrastructure', icon:'☁️', items:[
    { label:'Cloud providers',   value:'Azure (primary) · AWS · GCP — multi-cloud redundancy' },
    { label:'Network',           value:'Private VNet/VPC, WAF, DDoS protection, private endpoints' },
    { label:'Container security',value:'Kubernetes RBAC, Pod Security Standards (restricted), Trivy scanning' },
    { label:'Secrets management',value:'Azure Key Vault / AWS Secrets Manager / GCP Secret Manager' },
    { label:'Audit logging',     value:'Tamper-evident blockchain audit log (Merkle tree)' },
    { label:'Backups',           value:'Automated daily, geo-redundant, 90-day retention, tested quarterly' },
  ]},
  { category:'Application', icon:'💻', items:[
    { label:'OWASP Top 10',      value:'Mitigated — quarterly pen test validates controls' },
    { label:'CSP headers',       value:'Content-Security-Policy, X-Frame-Options, HSTS enforced' },
    { label:'SQL injection',     value:'Prisma ORM parameterised queries only — no raw SQL from user input' },
    { label:'Rate limiting',     value:'Per-IP and per-user rate limits on all endpoints' },
    { label:'Dependency scanning',value:'Dependabot + Trivy in CI/CD pipeline — critical CVEs block deployment' },
    { label:'SAST/DAST',         value:'GitHub CodeQL (static) + OWASP ZAP (dynamic) in CI pipeline' },
  ]},
];

const INCIDENT = [
  { step:1, title:'Detect',    desc:'Automated alerts via Prometheus, Sentry, and Azure Defender. On-call engineer paged in <5 minutes.',       icon:'🔍', time:'<5 min' },
  { step:2, title:'Classify',  desc:'Severity classified (P1–P4). P1/P2 trigger war-room protocol with engineering, legal, and clinical leads.', icon:'⚠️', time:'<15 min' },
  { step:3, title:'Contain',   desc:'Immediate containment: block access, isolate systems, preserve forensic evidence.',                          icon:'🚧', time:'<1 hour' },
  { step:4, title:'Eradicate', desc:'Root cause analysis, patch, and validated remediation.',                                                      icon:'🔧', time:'<4 hours' },
  { step:5, title:'Notify',    desc:'GDPR Art. 33: ICO notified within 72 hours if personal data breach. Customers notified promptly.',           icon:'📢', time:'<72 hours' },
  { step:6, title:'Review',    desc:'Post-incident report with root cause, timeline, and remediation published internally. Lessons embedded.',    icon:'📝', time:'<7 days' },
];

export function SecurityPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 1024px) {
          .sec-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
          .sec-grid-2 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .sec-grid-4 { grid-template-columns: 1fr !important; }
          .sec-grid-6 { grid-template-columns: repeat(2, 1fr) !important; }
          .hero-h1 { fontSize: 36px !important; }
          .pen-test-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
        @media (max-width: 480px) {
          .sec-grid-6 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .hero-btns { flex-direction: column !important; }
          .hero-btns > button, .hero-btns > a { width: 100% !important; box-sizing: border-box; text-align: center; }
        }
      `}</style>
      <PublicNav activePage="security" onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ padding:'clamp(80px, 15vh, 120px) 24px 70px', background:`linear-gradient(180deg,${C.bg1},${C.bg0})`, textAlign:'center' }}>
        <div style={{ maxWidth:700, margin:'0 auto' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 14px', background:`${C.normal}14`, border:`1px solid ${C.normal}30`, borderRadius:20, marginBottom:24 }}>
            <span style={{ fontSize:10, fontWeight:700, color:C.normal, letterSpacing:'0.1em', textTransform:'uppercase' }}>Enterprise Security</span>
          </div>
          <h1 className="hero-h1" style={{ fontSize:'clamp(32px, 7vw, 50px)', fontWeight:900, color:C.textHi, margin:'0 0 20px', letterSpacing:'-0.04em', lineHeight:1.1 }}>
            Clinical-grade security,<br/>built from the ground up
          </h1>
          <p style={{ fontSize:15, color:C.textMd, lineHeight:1.8, maxWidth:540, margin:'0 auto' }}>
            SEWA XAI processes sensitive patient imaging data. Every architectural decision, every line of code, and every deployment is reviewed through a security-first lens.
          </p>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px 80px' }}>

        {/* Certifications */}
        <section style={{ marginBottom:80 }}>
          <h2 style={{ fontSize:28, fontWeight:800, color:C.textHi, margin:'0 0 36px', textAlign:'center', letterSpacing:'-0.5px', fontFamily:C.F }}>Certifications & Compliance</h2>
          <div className="sec-grid-4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            {CERTS.map(cert => (
              <div key={cert.name} style={{ padding:20, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:14 }}>
                <div style={{ fontSize:28, marginBottom:10 }}>{cert.icon}</div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <div style={{ fontSize:14, fontWeight:800, color:C.textHi }}>{cert.name}</div>
                  <span style={{ padding:'2px 8px', background:`${cert.color}14`, border:`1px solid ${cert.color}30`, borderRadius:20, fontSize:9, fontWeight:700, color:cert.color }}>{cert.status}</span>
                </div>
                <p style={{ fontSize:11, color:C.textLo, margin:0, lineHeight:1.6 }}>{cert.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Technical controls */}
        <section style={{ marginBottom:80 }}>
          <h2 style={{ fontSize:28, fontWeight:800, color:C.textHi, margin:'0 0 36px', textAlign:'center', letterSpacing:'-0.5px', fontFamily:C.F }}>Technical Security Controls</h2>
          <div className="sec-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {CONTROLS.map(cat => (
              <div key={cat.category} style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden' }}>
                <div style={{ padding:'16px 20px', background:C.bg3, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:20 }}>{cat.icon}</span>
                  <span style={{ fontSize:15, fontWeight:800, color:C.textHi }}>{cat.category}</span>
                </div>
                <div style={{ padding:16 }}>
                  {cat.items.map(item => (
                    <div key={item.label} style={{ display:'flex', gap:12, padding:'7px 0', borderBottom:`1px solid ${C.border}` }}>
                      <span style={{ fontSize:11, color:C.textLo, width:'clamp(100px, 15vw, 130px)', flexShrink:0, paddingTop:1 }}>{item.label}</span>
                      <span style={{ fontSize:11, color:C.textMd, lineHeight:1.5 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Penetration testing */}
        <section style={{ marginBottom:80, padding:'clamp(20px, 5vw, 40px)', background:`${C.purple}06`, border:`1px solid ${C.purple}20`, borderRadius:20 }}>
          <div className="pen-test-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32, alignItems:'start' }}>
            <div>
              <h2 style={{ fontSize:24, fontWeight:800, color:C.textHi, margin:'0 0 16px', fontFamily:C.F }}>Independent Penetration Testing</h2>
              <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 20px' }}>SEWA XAI undergoes independent penetration testing quarterly, conducted by certified specialists (CHECK, CREST, OSCP). Tests cover web application, API, mobile, and infrastructure attack surfaces.</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { label:'Frequency',  value:'Quarterly (web/API) + Annual (infrastructure)' },
                  { label:'Standard',   value:'OWASP Web Security Testing Guide v4.2' },
                  { label:'Scope',      value:'Web app, REST API, mobile apps, Kubernetes, cloud config' },
                  { label:'Last test',  value:'January 2026 — No critical or high findings' },
                  { label:'Reports',    value:'Available to Enterprise customers under NDA' },
                ].map(r => (
                  <div key={r.label} style={{ display:'flex', gap:12, padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:11, color:C.textLo, width:100, flexShrink:0 }}>{r.label}</span>
                    <span style={{ fontSize:11, color:C.textHi }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ fontSize:16, fontWeight:700, color:C.textHi, margin:'0 0 16px', fontFamily:C.F }}>🐛 Bug Bounty Programme</h3>
              <p style={{ fontSize:13, color:C.textMd, lineHeight:1.8, margin:'0 0 16px' }}>We operate a responsible disclosure programme. Security researchers who identify valid vulnerabilities are eligible for recognition and financial rewards.</p>
              {[
                { sev:'Critical (RCE, auth bypass)', award:'£2,000–£10,000', color:C.critical },
                { sev:'High (IDOR, XSS, SSRF)',      award:'£500–£2,000',  color:C.amber },
                { sev:'Medium (CSRF, info disclosure)',award:'£100–£500',   color:C.normal },
                { sev:'Low / Informational',          award:'Recognition',  color:C.info },
              ].map(row => (
                <div key={row.sev} style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', borderBottom:`1px solid ${C.border}`, fontSize:12 }}>
                  <span style={{ color:C.textMd, marginRight:10 }}>{row.sev}</span>
                  <span style={{ color:row.color, fontWeight:700, textAlign:'right' }}>{row.award}</span>
                </div>
              ))}
              <a href="mailto:security@sewaxai.health" style={{ display:'block', marginTop:16, padding:'10px 0', textAlign:'center', background:`${C.purple}14`, border:`1px solid ${C.purple}30`, borderRadius:9, color:C.purple, fontWeight:700, fontSize:12, textDecoration:'none', fontFamily:C.F }}>
                Report a vulnerability →
              </a>
            </div>
          </div>
        </section>

        {/* Incident response */}
        <section style={{ marginBottom:48 }}>
          <h2 style={{ fontSize:28, fontWeight:800, color:C.textHi, margin:'0 0 36px', textAlign:'center', letterSpacing:'-0.5px', fontFamily:C.F }}>Incident Response</h2>
          <div className="sec-grid-6" style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12 }}>
            {INCIDENT.map(step => (
              <div key={step.step} style={{ padding:20, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:14, textAlign:'center' }}>
                <div style={{ fontSize:24, marginBottom:8 }}>{step.icon}</div>
                <div style={{ fontSize:11, fontWeight:800, color:C.brand, fontFamily:C.FM, marginBottom:4 }}>{step.time}</div>
                <div style={{ fontSize:13, fontWeight:700, color:C.textHi, marginBottom:8 }}>{step.title}</div>
                <p style={{ fontSize:10, color:C.textLo, margin:0, lineHeight:1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Security contact CTA */}
        <div style={{ textAlign:'center', padding:'clamp(20px, 5vw, 40px)', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:20 }}>
          <h2 style={{ fontSize:22, fontWeight:800, color:C.textHi, margin:'0 0 12px', fontFamily:C.F }}>Security questions or concerns?</h2>
          <p style={{ fontSize:13, color:C.textMd, margin:'0 0 24px' }}>Our security team responds to all enquiries within 4 hours.</p>
          <div className="hero-btns" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <a href="mailto:security@sewaxai.health" style={{ padding:'11px 24px', background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, border:'none', borderRadius:10, color:'white', fontWeight:700, fontSize:13, textDecoration:'none', fontFamily:C.F }}>security@sewaxai.health</a>
            <button onClick={() => onNavigate('contact')} style={{ padding:'11px 22px', background:'none', border:`1px solid ${C.border}`, borderRadius:10, color:C.textMd, fontSize:13, cursor:'pointer', fontFamily:C.F }}>Request Documentation</button>
          </div>
        </div>
      </div>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}

