// SEWA XAI — AboutPage.tsx
import React from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandDk:'#2E6B5E',brandLt:'#52B09A',
  critical:'#E03535',normal:'#1DBF73',info:'#2A6EF2',purple:'#8B5CF6',amber:'#F59E0B',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",FM:"'IBM Plex Mono',monospace",
};

const STATS = [
  { value:'47+',   label:'Hospitals deployed',     icon:'🏥' },
  { value:'7',     label:'Countries',               icon:'🌍' },
  { value:'2.1M+', label:'Scans processed',         icon:'🔬' },
  { value:'99.9%', label:'Platform uptime',          icon:'✅' },
  { value:'<2s',   label:'Median triage time',       icon:'⚡' },
  { value:'31%',   label:'Reduction in diagnostic errors', icon:'🎯' },
];

const TEAM = [
  { name:'Dr. Adesewa Dairo', role:'CEO & Co-founder', bg:'Trained radiologist (Oxford). Former NHS consultant. 15 years in clinical AI.', region:'🇬🇧 London' },
  { name:'Dolapo Ariyo', role:'CTO & Co-founder', bg:'Sole inventor of the 4-Engine Safety Architecture. ML Research Lead at UCL & DeepMind. PhD Computer Vision.', region:'🇬🇧 London' },
  { name:'Dr. Chioma Nwosu', role:'Chief Medical Officer', bg:'Consultant radiologist, LUTH Nigeria. Led national teleradiology programme. WHO AI Advisory Panel.', region:'🇳🇬 Lagos' },
  { name:'Fatima Al-Hassan', role:'Chief Compliance Officer', bg:'Former Head of Digital Regulation, MHRA. GDPR / MDR expert. Built compliance frameworks for 3 MedTech unicorns.', region:'🇬🇧 London' },
  { name:'Lars Eriksson', role:'VP Engineering', bg:'Previously Staff Engineer at Philips HealthSuite. Built FHIR R4 infrastructure processing 40M records/day.', region:'🇳🇱 Amsterdam' },
  { name:'Dr. Priya Sharma', role:'Head of Clinical Validation', bg:'Clinical research lead with 200+ peer-reviewed publications. Ran RCTs at Kings College Hospital and AIIMS Delhi.', region:'🇮🇳 / 🇬🇧' },
];

const TIMELINE = [
  { year:'2019', title:'Founded', desc:'SEWA XAI founded in London by Dr. Adesewa Dairo and Dolapo Ariyo with £500K seed funding from NHS Innovation.' },
  { year:'2020', title:'First NHS deployment', desc:'Deployed at Royal London Hospital for ICH triage during COVID-19 surge. Processed 12,000 emergency head CTs.' },
  { year:'2021', title:'Series A · £4.2M', desc:'Raised £4.2M from Longitude Capital and Wellcome Trust. Expanded to 8 NHS Trusts. Launched Africa programme.' },
  { year:'2022', title:'CE Mark (MDR IIb)', desc:'Achieved CE marking under EU MDR 2017/745 as a Class IIb medical device. UKCA marking for UK. Deployed in Kenya and Nigeria.' },
  { year:'2023', title:'Series B · £18M', desc:'Led by Google Ventures and NHS England. Launched multi-cloud (Azure + AWS). 30+ hospital deployments across 5 countries.' },
  { year:'2024', title:'FDA 510(k) Clearance', desc:'Received FDA 510(k) clearance for ICH, PE, and pneumothorax detection. Launched North America operations from New York.' },
  { year:'2025', title:'Global Scale', desc:'47 hospital deployments. Federated learning network with 12 nodes. 2.1M scans processed. Named by TIME as one of 100 Most Influential AI Companies.' },
  { year:'2026', title:'Enterprise Platform v4', desc:'Launched multi-cloud storage, WhatsApp integration, appointment booking, and iOS/Android apps v4. 7 countries, 100+ clinicians daily active.' },
];

const VALUES = [
  { icon:'❤️', title:'Patient first', desc:'Every engineering decision starts with one question: does this improve patient outcomes? Not revenue, not features — patients.' },
  { icon:'🔬', title:'Evidence-based', desc:'No marketing claims without peer-reviewed evidence. All clinical metrics are externally validated and published.' },
  { icon:'🌍', title:'Global equity', desc:'World-class diagnostic AI should not be a privilege of wealthy health systems. We price for Africa, build for Africa.' },
  { icon:'🔒', title:'Privacy by design', desc:'Patient data is never an asset. We built federated learning specifically so patient data never needs to leave your hospital.' },
  { icon:'🤝', title:'Clinician partnership', desc:'We do not replace radiologists. We give them superpowers. Every feature is co-designed with active clinicians.' },
  { icon:'📖', title:'Open science', desc:'We publish our validation datasets, model cards, and clinical evidence openly. Our science is our competitive advantage.' },
];

export function AboutPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 1024px) {
          .stats-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .team-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .values-grid { grid-template-columns: 1fr !important; }
          .team-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .hero-h1 { fontSize: 36px !important; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr !important; }
          .mission-block { padding: 32px 20px !important; }
        }
        @media (max-width: 600px) {
          .hero-btns { flex-direction: column !important; }
          .hero-btns > button { width: 100% !important; }
        }
      `}</style>
      <PublicNav activePage="about" onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ padding:'clamp(80px, 15vh, 110px) 24px 80px', background:`linear-gradient(180deg,${C.bg1},${C.bg0})` }}>
        <div style={{ maxWidth:800, margin:'0 auto', textAlign:'center' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 14px', background:`${C.brand}14`, border:`1px solid ${C.brand}30`, borderRadius:20, marginBottom:24 }}>
            <span style={{ fontSize:10, fontWeight:700, color:C.brand, letterSpacing:'0.1em', textTransform:'uppercase' }}>Our Story</span>
          </div>
          <h1 className="hero-h1" style={{ fontSize:'clamp(32px, 8vw, 52px)', fontWeight:900, color:C.textHi, margin:'0 0 24px', letterSpacing:'-0.04em', lineHeight:1.1 }}>
            We started in an<br/>NHS emergency room
          </h1>
          <p style={{ fontSize:'clamp(15px, 2.5vw, 17px)', color:C.textMd, lineHeight:1.8, margin:'0 0 32px' }}>
            SEWA XAI was born from a problem Dr. Adesewa Dairo saw every day as an NHS radiologist: critical conditions were being delayed by overloaded worklists and radiologist shortages.
          </p>
          <div className="hero-btns" style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => onNavigate('contact')} style={{ padding:'12px 28px', background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, border:'none', borderRadius:10, color:'white', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:C.F }}>Join the Mission →</button>
            <button onClick={() => onNavigate('solutions')} style={{ padding:'12px 22px', background:'none', border:`1px solid ${C.border}`, borderRadius:10, color:C.textMd, fontSize:14, cursor:'pointer', fontFamily:C.F }}>Explore Solutions</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px 80px' }}>

        {/* Stats */}
        <div className="stats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:80 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ padding:20, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:14, textAlign:'center' }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontSize:22, fontWeight:900, color:C.brand, fontFamily:C.FM }}>{s.value}</div>
              <div style={{ fontSize:10, color:C.textLo, marginTop:4, lineHeight:1.4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Mission */}
        <div className="mission-block" style={{ padding:48, background:`linear-gradient(135deg,${C.bg2},${C.bg3})`, border:`1px solid ${C.border}`, borderRadius:20, marginBottom:80, textAlign:'center' }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.brand, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:16 }}>Our Mission</div>
          <blockquote style={{ fontSize:'clamp(18px, 4vw, 24px)', fontWeight:800, color:C.textHi, lineHeight:1.4, margin:'0 0 20px', letterSpacing:'-0.5px', fontFamily:C.F }}>
            "From Hours to Seconds: Autonomous Diagnostic Intelligence for Global Healthcare."
          </blockquote>
        </div>

        {/* Values */}
        <div style={{ marginBottom:80 }}>
          <h2 style={{ fontSize:28, fontWeight:800, color:C.textHi, margin:'0 0 32px', letterSpacing:'-0.02em', fontFamily:C.F, textAlign:'center' }}>What we stand for</h2>
          <div className="values-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
            {VALUES.map(v => (
              <div key={v.title} style={{ padding:24, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16 }}>
                <div style={{ fontSize:28, marginBottom:12 }}>{v.icon}</div>
                <h3 style={{ fontSize:15, fontWeight:700, color:C.textHi, margin:'0 0 8px', fontFamily:C.F }}>{v.title}</h3>
                <p style={{ fontSize:13, color:C.textLo, margin:0, lineHeight:1.7 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div style={{ marginBottom:80 }}>
          <h2 style={{ fontSize:28, fontWeight:800, color:C.textHi, margin:'0 0 32px', letterSpacing:'-0.02em', textAlign:'center', fontFamily:C.F }}>Leadership team</h2>
          <div className="team-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
            {TEAM.map(t => (
              <div key={t.name} style={{ padding:24, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16 }}>
                <div style={{ width:52, height:52, background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, color:'white', marginBottom:14 }}>
                  {t.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
                </div>
                <div style={{ fontSize:15, fontWeight:700, color:C.textHi, marginBottom:2 }}>{t.name}</div>
                <div style={{ fontSize:11, color:C.brand, fontWeight:600, marginBottom:8 }}>{t.role}</div>
                <p style={{ fontSize:12, color:C.textLo, margin:'0 0 10px', lineHeight:1.6 }}>{t.bg}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:80, padding:'clamp(20px, 5vw, 40px)', background:`${C.brand}08`, border:`1px solid ${C.brand}30`, borderRadius:20, textAlign:'center' }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.brand, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:16 }}>Intellectual Property</div>
          <p style={{ fontSize:'clamp(13px, 2.5vw, 15px)', color:C.textHi, fontWeight:600, lineHeight:1.8, margin:'0 auto', maxWidth:700 }}>
            The SEWA XAI 4-Engine Safety Architecture, metacognition layer, and sovereign deployment models are protected by <strong style={{ color:C.brand }}>UK Patent Pending: GB2609706.3</strong> — Storegrill Inc Ltd (Company No. 14581073).
          </p>
        </div>

      </div>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}

