// SEWA AI — PrivacyPolicyPage.tsx
import React, { useState } from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandDk:'#2E6B5E',info:'#2A6EF2',normal:'#1DBF73',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",
};

const SECTIONS = [
  { id:'controller', title:'1. Who We Are (Data Controller)' },
  { id:'data',       title:'2. Personal Data We Process' },
  { id:'lawful',     title:'3. Lawful Basis for Processing' },
  { id:'special',    title:'4. Special Category (Health) Data' },
  { id:'sharing',    title:'5. Data Sharing & Processors' },
  { id:'transfers',  title:'6. International Transfers' },
  { id:'retention',  title:'7. Retention Schedule' },
  { id:'rights',     title:'8. Your Rights Under GDPR' },
  { id:'automated',  title:'9. Automated Decision-Making' },
  { id:'security',   title:'10. Security Measures' },
  { id:'children',   title:'11. Children' },
  { id:'changes',    title:'12. Changes to This Policy' },
  { id:'contact',    title:'13. Contact & Complaints' },
];

const LAWFUL_BASIS = [
  { purpose:'User authentication and session management',             basis:'Contractual necessity (Art. 6(1)(b))',     data:'Email, session tokens, device ID' },
  { purpose:'AI-assisted diagnostic triage and reporting',            basis:'Contractual necessity + Legitimate interest', data:'DICOM images, AI results, clinical annotations' },
  { purpose:'Critical finding push notifications and alerts',         basis:'Legitimate interest (Art. 6(1)(f))',       data:'FCM token, phone number, email' },
  { purpose:'Appointment booking and calendar management',            basis:'Contractual necessity (Art. 6(1)(b))',     data:'Name, email, schedule, clinical context' },
  { purpose:'WhatsApp clinical notifications',                        basis:'Explicit consent (Art. 6(1)(a))',          data:'WhatsApp phone number' },
  { purpose:'Payment processing and billing',                         basis:'Contractual necessity (Art. 6(1)(b))',     data:'Name, email, payment token (no card data stored)' },
  { purpose:'HIPAA/NHS DSPT compliance audit logging',                basis:'Legal obligation (Art. 6(1)(c))',          data:'User actions, timestamps, IP address' },
  { purpose:'Federated learning model improvement',                   basis:'Explicit consent + Pseudonymisation',      data:'Anonymised model gradients (no patient data transmitted)' },
  { purpose:'Platform analytics and performance monitoring',          basis:'Legitimate interest / Consent (optional)',  data:'Anonymised usage metrics' },
  { purpose:'Marketing and sales communications (public website)',     basis:'Consent (Art. 6(1)(a))',                   data:'Email, name, organisation (enquiry form)' },
];

const RETENTION = [
  { category:'Clinical imaging (DICOM files)',              period:'7 years (UK NHS requirement)',        basis:'NHS Records Management Code 2021' },
  { category:'AI results and reports',                      period:'7 years',                             basis:'Medical record retention law' },
  { category:'Authentication logs',                         period:'2 years',                             basis:'HIPAA / NHS DSPT audit requirements' },
  { category:'Billing and payment records',                 period:'7 years',                             basis:'UK Companies Act / HMRC requirements' },
  { category:'Consent records (GDPR)',                      period:'Duration of consent + 3 years',       basis:'Accountability principle (Art. 5(2))' },
  { category:'Appointment records',                         period:'7 years',                             basis:'NHS clinical record requirements' },
  { category:'Marketing enquiry data',                      period:'2 years from last contact',           basis:'Legitimate interest + consent' },
  { category:'Support correspondence',                      period:'3 years',                             basis:'Legitimate interest' },
  { category:'Anonymised analytics',                        period:'Indefinite (no personal data)',        basis:'N/A — anonymised' },
];

const RIGHTS = [
  { right:'Access (Art. 15)',           desc:'Request a copy of all personal data we hold about you within 30 days. Submit via dpo@sewaxai.health.' },
  { right:'Rectification (Art. 16)',    desc:'Correct inaccurate personal data. Update most data directly in your account settings.' },
  { right:'Erasure (Art. 17)',          desc:'Request deletion of data where no legal retention obligation applies. Clinical records may be subject to mandatory retention.' },
  { right:'Restriction (Art. 18)',      desc:'Request we restrict processing of your data while a dispute is resolved.' },
  { right:'Portability (Art. 20)',      desc:'Receive your personal data in a machine-readable format (JSON/CSV) for transfer to another service.' },
  { right:'Object (Art. 21)',           desc:'Object to processing based on legitimate interests. We will cease unless compelling grounds exist.' },
  { right:'Withdraw consent (Art. 7)',  desc:'Withdraw consent for consent-based processing at any time via your account or dpo@sewaxai.health. Withdrawal does not affect prior processing.' },
  { right:'Lodge a complaint',          desc:'Complain to the Information Commissioner\'s Office (ICO) at ico.org.uk or call 0303 123 1113.' },
];export function PrivacyPolicyPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  const [activeSection, setActiveSection] = useState('controller');

  const h2: React.CSSProperties = { fontSize:20, fontWeight:800, color:C.textHi, margin:'0 0 16px', fontFamily:C.F };
  const p: React.CSSProperties  = { fontSize:13, color:C.textMd, lineHeight:1.9, margin:'0 0 16px', fontFamily:C.F };

  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 900px) {
          .legal-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .toc-sidebar { position: static !important; margin-bottom: 40px; border-bottom: 1px solid ${C.border}; padding-bottom: 24px; }
          .info-row, .security-grid, .contact-split { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .hero-btns { flex-direction: column !important; }
          .hero-btns > button, .hero-btns > div { width: 100% !important; box-sizing: border-box; }
        }
      `}</style>
      <PublicNav activePage="privacy" onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ background:`linear-gradient(180deg,${C.bg1},${C.bg0})`, padding:'clamp(80px, 12vh, 110px) 24px 48px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 14px', background:`${C.brand}14`, border:`1px solid ${C.brand}30`, borderRadius:20, marginBottom:20 }}>
            <span style={{ fontSize:10, fontWeight:700, color:C.brand, letterSpacing:'0.1em', textTransform:'uppercase' }}>Legal</span>
          </div>
          <h1 style={{ fontSize:'clamp(32px, 8vw, 40px)', fontWeight:900, color:C.textHi, margin:'0 0 14px', letterSpacing:'-1.5px', fontFamily:C.F }}>Privacy Policy</h1>
          <p style={{ ...p, fontSize:15, margin:'0 0 20px' }}>
            SEWA AI is committed to protecting the privacy of patients, clinicians, and all users of our platform. This policy explains how we collect, use, and protect personal data in compliance with UK GDPR, EU GDPR, and HIPAA.
          </p>
          <div className="hero-btns" style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {[['Last Updated','12 March 2026'],['Version','3.1'],['Effective From','1 January 2026'],['ICO Reg.','ZA000000']].map(([l,v]) => (
              <div key={l} style={{ padding:'8px 14px', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:9 }}>
                <div style={{ fontSize:9, color:C.textLo, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>{l}</div>
                <div style={{ fontSize:12, color:C.textHi, fontWeight:600, marginTop:2 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="legal-grid" style={{ maxWidth:1100, margin:'0 auto', padding:'48px 24px 80px', display:'grid', gridTemplateColumns:'220px 1fr', gap:40 }}>

        {/* Sidebar TOC */}
        <div className="toc-sidebar" style={{ position:'sticky', top:80, alignSelf:'start' }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.textLo, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>Contents</div>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => { setActiveSection(s.id); document.getElementById(s.id)?.scrollIntoView({ behavior:'smooth' }); }}
              style={{ display:'block', width:'100%', textAlign:'left', padding:'7px 10px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:C.F,
                background:activeSection===s.id?`${C.brand}14`:'none', color:activeSection===s.id?C.brand:C.textLo, fontSize:11, fontWeight:activeSection===s.id?600:400,
              }}>{s.title}</button>
          ))}
        </div>

        {/* Content */}
        <div>
          {/* 1 */}
          <section id="controller" style={{ marginBottom:48 }}>
            <h2 style={h2}>1. Who We Are (Data Controller)</h2>
            <p style={p}>SEWA AI — a Storegrill Inc Ltd company ("SEWA AI", "we", "us") is the data controller for personal data processed through the SEWA AI platform, website (sewaxai.health), and mobile applications. We are registered with the Information Commissioner's Office (ICO) under registration number ZA000000.</p>
            <div style={{ padding:16, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:12 }}>
              {[['Legal name','SEWA AI — a Storegrill Inc Ltd company'],['18 Hampshire Close, Binley, Coventry, CV3 2FP, United Kingdom'],['Registration No. 14581073 (England & Wales)'],['DPO Email','dpo@sewaxai.health'],['ICO Registration','ZA000000'],['EU Representative','SEWA AI BV, Amsterdam, Netherlands (Art. 27 GDPR)']].map(([l,v]) => (
                <div className="info-row" key={l} style={{ display:'flex', gap:16, padding:'7px 0', borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:11, color:C.textLo, width:180, flexShrink:0 }}>{l}</span>
                  <span style={{ fontSize:11, color:C.textHi }}>{v}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 2 */}
          <section id="data" style={{ marginBottom:48 }}>
            <h2 style={h2}>2. Personal Data We Process</h2>
            <p style={p}>We process different categories of personal data depending on your role:</p>
            {[
              { role:'Clinicians (radiologists, doctors, technicians)', data:['Name, email, professional registration number','Authentication credentials (hashed passwords, MFA secrets)','Session and login activity logs','Clinical annotations and report authorship','FCM push tokens, WhatsApp number (optional)','Notification preferences'] },
              { role:'Patients', data:['Name, date of birth, NHS/patient ID number','Contact details (email, phone — for report notifications)','DICOM imaging studies and associated metadata','AI-generated triage results and reports','Appointment records and consent records','Messaging with care team'] },
              { role:'Administrators', data:['Name, email, role, organisational affiliation','Platform usage and audit logs','Billing and payment contact details'] },
              { role:'Marketing/Website Visitors', data:['Name and email (enquiry form — consent-based)','Cookie analytics data (consent-based only)','IP address (anonymised for analytics)'] },
            ].map(item => (
              <div key={item.role} style={{ marginBottom:16, padding:16, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:12 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.textHi, marginBottom:8 }}>{item.role}</div>
                {item.data.map(d => <div key={d} style={{ fontSize:12, color:C.textMd, padding:'3px 0', display:'flex', gap:8 }}><span style={{ color:C.brand, fontSize:10 }}>•</span>{d}</div>)}
              </div>
            ))}
          </section>

          {/* 3 */}
          <section id="lawful" style={{ marginBottom:48 }}>
            <h2 style={h2}>3. Lawful Basis for Processing</h2>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead>
                  <tr style={{ background:C.bg3 }}>
                    {['Processing Purpose','Lawful Basis','Data Categories'].map(h => (
                      <th key={h} style={{ padding:'9px 12px', textAlign:'left', color:C.textLo, fontWeight:700, fontSize:9, letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LAWFUL_BASIS.map((r,i) => (
                    <tr key={i} style={{ borderTop:`1px solid ${C.border}`, background:i%2===0?'transparent':C.bg1 }}>
                      <td style={{ padding:'9px 12px', color:C.textHi }}>{r.purpose}</td>
                      <td style={{ padding:'9px 12px', color:C.brand, fontWeight:600 }}>{r.basis}</td>
                      <td style={{ padding:'9px 12px', color:C.textLo }}>{r.data}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4 */}
          <section id="special" style={{ marginBottom:48, padding:20, background:`${C.info}08`, border:`1px solid ${C.info}20`, borderRadius:14 }}>
            <h2 style={{ ...h2, color:C.info }}>4. Special Category (Health) Data</h2>
            <p style={p}>DICOM medical imaging and AI diagnostic results constitute special category data under GDPR Article 9. We process this data on the basis of: <strong style={{ color:C.textHi }}>Article 9(2)(h)</strong> — medical diagnosis and provision of health care — and, for research purposes, <strong style={{ color:C.textHi }}>Article 9(2)(j)</strong> with appropriate pseudonymisation. All health data is encrypted at rest (AES-256) and in transit (TLS 1.3). Access is restricted by role-based access controls enforced at the database level. No patient health data is ever transmitted to third-party analytics or advertising services.</p>
          </section>

          {/* 7 Retention */}
          <section id="retention" style={{ marginBottom:48 }}>
            <h2 style={h2}>7. Retention Schedule</h2>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead>
                  <tr style={{ background:C.bg3 }}>
                    {['Data Category','Retention Period','Legal Basis'].map(h => <th key={h} style={{ padding:'9px 12px', textAlign:'left', color:C.textLo, fontWeight:700, fontSize:9, letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {RETENTION.map((r,i) => (
                    <tr key={i} style={{ borderTop:`1px solid ${C.border}`, background:i%2===0?'transparent':C.bg1 }}>
                      <td style={{ padding:'9px 12px', color:C.textHi }}>{r.category}</td>
                      <td style={{ padding:'9px 12px', color:C.brand, fontWeight:600 }}>{r.period}</td>
                      <td style={{ padding:'9px 12px', color:C.textLo }}>{r.basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 8 Rights */}
          <section id="rights" style={{ marginBottom:48 }}>
            <h2 style={h2}>8. Your Rights Under GDPR</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {RIGHTS.map(r => (
                <div key={r.right} style={{ padding:16, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:12 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.brand, marginBottom:6 }}>{r.right}</div>
                  <p style={{ ...p, margin:0, fontSize:12 }}>{r.desc}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop:16, padding:14, background:C.bg3, borderRadius:10, fontSize:12, color:C.textMd }}>
              To exercise any right, email <a href="mailto:dpo@sewaxai.health" style={{ color:C.brand }}>dpo@sewaxai.health</a>. We will respond within 30 days (Art. 12(3)). We may request identity verification before processing your request.
            </div>
          </section>

          {/* 9 Automated */}
          <section id="automated" style={{ marginBottom:48 }}>
            <h2 style={h2}>9. Automated Decision-Making</h2>
            <p style={p}>SEWA AI's triage engine produces automated AI results. However, per our regulatory commitments and clinical design, <strong style={{ color:C.textHi }}>no automated decision produces a legal or similarly significant effect on a patient without human review</strong>. All AI outputs are clearly labelled as clinical decision support, require a qualified clinician to review and sign, and include explainability data (Grad-CAM, SHAP) to enable informed human oversight. This design satisfies GDPR Article 22 and EU AI Act Article 14 (human oversight of high-risk AI).</p>
          </section>

          {/* 10 Security */}
          <section id="security" style={{ marginBottom:48 }}>
            <h2 style={h2}>10. Security Measures</h2>
            <div className="security-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                'AES-256 encryption at rest for all patient data',
                'TLS 1.3 for all data in transit',
                'End-to-end encrypted mobile storage',
                'Role-based access control (RBAC) enforced at DB level',
                'MFA enforced for all clinical accounts',
                'Automatic session expiry and remote wipe',
                'Jailbreak/root detection on mobile apps',
                'ISO 27001 certified infrastructure',
                'SOC 2 Type II (annual audit)',
                'Penetration testing (quarterly, third-party)',
                'Blockchain audit log (tamper-evident)',
                'Federated learning (no raw patient data transmitted)',
              ].map(m => (
                <div key={m} style={{ display:'flex', gap:8, padding:'8px 12px', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:9, fontSize:12, color:C.textMd }}>
                  <span style={{ color:C.normal, flexShrink:0 }}>🔒</span>{m}
                </div>
              ))}
            </div>
          </section>

          {/* 13 Contact */}
          <section id="contact" style={{ marginBottom:0, padding:24, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:14 }}>
            <h2 style={{ ...h2, fontSize:16 }}>13. Contact & Complaints</h2>
            <p style={{ ...p, fontSize:12, margin:'0 0 16px' }}>For any privacy questions, data subject requests, or concerns, contact our Data Protection Officer:</p>
            <div className="contact-split" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['DPO Email','dpo@sewaxai.health'],['Postal','SEWA AI — a Storegrill Inc Ltd company, Coventry CV3 2FP'],['ICO (UK)','ico.org.uk · 0303 123 1113'],['CNIL (EU)','cnil.fr (French supervisory authority)']].map(([l,v]) => (
                <div key={l} style={{ padding:'9px 12px', background:C.bg3, borderRadius:8 }}>
                  <div style={{ fontSize:9, color:C.textLo, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>{l}</div>
                  <div style={{ fontSize:12, color:C.textHi, marginTop:3 }}>{v}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}

