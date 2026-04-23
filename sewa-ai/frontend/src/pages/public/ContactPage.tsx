// SEWA AI — ContactPage.tsx
import React, { useState } from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandDk:'#2E6B5E',
  normal:'#1DBF73',info:'#2A6EF2',critical:'#E03535',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",
};

const REGIONS_CONTACT = [
  { region:'🇬🇧 United Kingdom', email:'uk@sewaxai.health', phone:'+44 20 7946 0000', team:'NHS & UK Enterprise', hours:'Mon–Fri 08:00–18:00 GMT' },
  { region:'🇪🇺 European Union', email:'eu@sewaxai.health',  phone:'+31 20 000 0000',  team:'EU MDR & Clinical Team',hours:'Mon–Fri 09:00–18:00 CET' },
  { region:'🇺🇸 North America',  email:'us@sewaxai.health',  phone:'+1 212 000 0000',  team:'US Sales & FDA',        hours:'Mon–Fri 09:00–18:00 EST' },
  { region:'🌍 Africa',          email:'africa@sewaxai.health',phone:'+234 1 000 0000',team:'Africa Programme',      hours:'Mon–Fri 08:00–17:00 WAT' },
];

const INQUIRY_TYPES = [
  'Product Demo Request',
  'NHS / Government Procurement',
  'Africa Healthcare Programme',
  'Clinical Validation & Research',
  'Technical Integration (FHIR/PACS)',
  'Compliance & Regulatory',
  'Investor Relations',
  'Press & Media',
  'Support',
  'General Enquiry',
];

const ORG_SIZES = ['1–10 clinicians','11–50 clinicians','51–200 clinicians','201–1,000 clinicians','1,000+ clinicians / ICB / Government'];

const inp: React.CSSProperties = {
  width:'100%', padding:'10px 14px', background:'#0C1D17',
  border:'1px solid #1B3028', borderRadius:9, color:'#D0ECE6',
  fontSize:13, fontFamily:"'IBM Plex Sans',system-ui,sans-serif",
  boxSizing:'border-box', outline:'none',
};

export function ContactPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', org:'', role:'', region:'uk', size:'', type:'Product Demo Request', message:'', consent:false });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.firstName || !form.email || !form.org || !form.consent) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1200)); // simulate API call
    setSubmitted(true);
    setSubmitting(false);
  };

  const lbl: React.CSSProperties = { fontSize:11, fontWeight:700, color:C.textLo, letterSpacing:'0.06em', textTransform:'uppercase', display:'block', marginBottom:6, fontFamily:C.F };

  if (submitted) return (
    <div style={{ background:C.bg0, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:C.F, padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:480 }}>
        <div style={{ width:72, height:72, background:`${C.normal}14`, border:`2px solid ${C.normal}40`, borderRadius:36, display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 24px' }}>✅</div>
        <h2 style={{ fontSize:26, fontWeight:800, color:C.textHi, margin:'0 0 14px', fontFamily:C.F }}>Message received!</h2>
        <p style={{ fontSize:14, color:C.textMd, lineHeight:1.8, margin:'0 0 28px' }}>
          Thank you, <strong style={{ color:C.textHi }}>{form.firstName}</strong>. Our team will reach out to <strong style={{ color:C.brand }}>{form.email}</strong> within 1 business day. For urgent clinical enquiries, call your regional number directly.
        </p>
        <button onClick={() => onNavigate('landing')} style={{ padding:'11px 24px', background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, border:'none', borderRadius:9, color:'white', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:C.F }}>Back to Home</button>
      </div>
    </div>
  );

  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 900px) {
          .contact-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 600px) {
          .name-row, .meta-row { grid-template-columns: 1fr !important; }
          .hero-h1 { fontSize: 32px !important; }
          .hero-btns { flex-direction: column !important; }
          .hero-btns > button { width: 100% !important; }
          .response-time { font-size: 20px !important; }
        }
      `}</style>
      <PublicNav activePage="contact" onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ padding:'clamp(80px, 15vh, 120px) 24px 60px', background:`linear-gradient(180deg,${C.bg1},${C.bg0})` }}>
        <div style={{ maxWidth:640, margin:'0 auto', textAlign:'center' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 14px', background:`${C.brand}14`, border:`1px solid ${C.brand}30`, borderRadius:20, marginBottom:20 }}>
            <span style={{ fontSize:10, fontWeight:700, color:C.brand, letterSpacing:'0.1em', textTransform:'uppercase' }}>Talk to us</span>
          </div>
          <h1 className="hero-h1" style={{ fontSize:'clamp(32px, 8vw, 48px)', fontWeight:900, color:C.textHi, margin:'0 0 18px', letterSpacing:'-0.04em', lineHeight:1.1 }}>Get in touch</h1>
          <p style={{ fontSize:15, color:C.textMd, lineHeight:1.8, margin:0 }}>
            Whether you're an NHS Trust, a hospital in Nigeria, or a research institution — we'd love to hear from you. Average response time: <strong style={{ color:C.textHi }}>less than 4 hours</strong>.
          </p>
        </div>
      </div>

      <div className="contact-grid" style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 80px', display:'grid', gridTemplateColumns:'1fr 380px', gap:40 }}>

        {/* Form */}
        <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:20, padding: 'clamp(20px, 5vw, 40px)' }}>
          <h2 style={{ fontSize:20, fontWeight:800, color:C.textHi, margin:'0 0 6px', fontFamily:C.F }}>Send us a message</h2>
          <p style={{ fontSize:12, color:C.textLo, margin:'0 0 32px' }}>Fields marked * are required.</p>

          {/* Inquiry type */}
          <div style={{ marginBottom:24 }}>
            <label style={lbl}>Enquiry type *</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {INQUIRY_TYPES.map(t => (
                <button key={t} onClick={() => set('type', t)} style={{
                  padding:'6px 14px', borderRadius:20, border:`1px solid ${form.type===t?`${C.brand}60`:C.border}`,
                  background:form.type===t?`${C.brand}14`:'none', color:form.type===t?C.brand:C.textLo,
                  fontSize:11, fontWeight:form.type===t?700:400, cursor:'pointer', fontFamily:C.F,
                }}>{t}</button>
              ))}
            </div>
          </div>

          {/* Name row */}
          <div className="name-row" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
            {[['firstName','First name *'],['lastName','Last name']].map(([k,l]) => (
              <div key={k}>
                <label style={lbl}>{l}</label>
                <input value={(form as any)[k]} onChange={e => set(k, e.target.value)} style={inp} placeholder={k==='firstName'?'Sarah':'Chen'}/>
              </div>
            ))}
          </div>

          {/* Email */}
          <div style={{ marginBottom:16 }}>
            <label style={lbl}>Work email *</label>
            <input type="email" value={form.email} onChange={e => set('email',e.target.value)} style={inp} placeholder="sarah.chen@royallondon.nhs.uk"/>
          </div>

          {/* Org + Role */}
          <div className="meta-row" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
            <div>
              <label style={lbl}>Organisation *</label>
              <input value={form.org} onChange={e => set('org',e.target.value)} style={inp} placeholder="Royal London Hospital"/>
            </div>
            <div>
              <label style={lbl}>Your role</label>
              <input value={form.role} onChange={e => set('role',e.target.value)} style={inp} placeholder="Chief Radiologist"/>
            </div>
          </div>

          {/* Region + Size */}
          <div className="meta-row" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
            <div>
              <label style={lbl}>Region</label>
              <select value={form.region} onChange={e => set('region',e.target.value)} style={inp}>
                {[['uk','🇬🇧 United Kingdom'],['eu','🇪🇺 European Union'],['us','🇺🇸 North America'],['africa','🌍 Africa'],['other','Other']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Organisation size</label>
              <select value={form.size} onChange={e => set('size',e.target.value)} style={inp}>
                <option value="">Select...</option>
                {ORG_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Message */}
          <div style={{ marginBottom:20 }}>
            <label style={lbl}>Message</label>
            <textarea value={form.message} onChange={e => set('message',e.target.value)} rows={4} style={{ ...inp, resize:'vertical' as const }} placeholder="Tell us about your use case..."/>
          </div>

          {/* Consent */}
          <label style={{ display:'flex', gap:10, alignItems:'flex-start', cursor:'pointer', marginBottom:24 }}>
            <input type="checkbox" checked={form.consent} onChange={e => set('consent',e.target.checked)} style={{ marginTop:3, accentColor:C.brand, width:14, height:14, flexShrink:0 }}/>
            <span style={{ fontSize:11, color:C.textLo, lineHeight:1.6 }}>
              I agree to SEWA AI contacting me. I have read the <button onClick={() => onNavigate('privacy-policy')} style={{ color:C.brand, background:'none', border:'none', cursor:'pointer', fontSize:11, fontFamily:C.F, textDecoration:'underline' }}>Privacy Policy</button>. *
            </span>
          </label>

          <button onClick={handleSubmit} disabled={submitting || !form.firstName || !form.email || !form.org || !form.consent}
            style={{ width:'100%', padding:'13px 0', background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, border:'none', borderRadius:10, color:'white', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:C.F, opacity:(!form.firstName||!form.email||!form.org||!form.consent)?0.5:1 }}>
            {submitting ? 'Sending…' : 'Send Message →'}
          </button>
        </div>

        {/* Sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Response time */}
          <div style={{ padding:28, background:`${C.normal}08`, border:`1px solid ${C.normal}20`, borderRadius:16 }}>
            <div className="response-time" style={{ fontSize:28, fontWeight:900, color:C.normal, fontFamily:"'IBM Plex Mono',monospace", marginBottom:4 }}>{'< 4h'}</div>
            <div style={{ fontSize:13, fontWeight:700, color:C.textHi, marginBottom:4 }}>Average response time</div>
            <div style={{ fontSize:11, color:C.textLo, lineHeight:1.6 }}>Our clinical sales and support team operates across UK, EU, US and Africa time zones.</div>
          </div>

          {/* Regional contacts */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16 }}>
            {REGIONS_CONTACT.map(r => (
              <div key={r.region} style={{ padding:20, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:14 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.textHi, marginBottom:4 }}>{r.region}</div>
                <div style={{ fontSize:11, color:C.textLo, marginBottom:8 }}>{r.team} · {r.hours}</div>
                <a href={`mailto:${r.email}`} style={{ display:'block', fontSize:12, color:C.brand, textDecoration:'none', marginBottom:2 }}>✉️ {r.email}</a>
                <a href={`tel:${r.phone.replace(/ /g,'')}`} style={{ fontSize:12, color:C.textMd, textDecoration:'none' }}>📞 {r.phone}</a>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}

