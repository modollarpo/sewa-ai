// SEWA XAI — PricingPage.tsx
import React, { useState } from 'react';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',bg4:'#162821',
  brand:'#408D7B',brandLt:'#52B09A',brandDk:'#2E6B5E',brandMuted:'#1A3028',
  critical:'#E03535',normal:'#1DBF73',info:'#2A6EF2',purple:'#8B5CF6',amber:'#F59E0B',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",FM:"'IBM Plex Mono',monospace",
};

const REGIONS = [
  { id:'uk',     label:'🇬🇧 United Kingdom', currency:'GBP', symbol:'£' },
  { id:'eu',     label:'🇪🇺 European Union',  currency:'EUR', symbol:'€' },
  { id:'us',     label:'🇺🇸 North America',   currency:'USD', symbol:'$' },
  { id:'africa', label:'🌍 Africa',           currency:'USD', symbol:'$' },
];

const PLANS = [
  {
    id:'starter', name:'Clinic', badge:null,
    prices:{ uk:{ monthly:549,annual:459 }, eu:{ monthly:609,annual:519 }, us:{ monthly:649,annual:549 }, africa:{ monthly:169,annual:139 } },
    tagline:'For independent clinics and outpatient imaging centres',
    scans:'Up to 500 scans/month',
    users:'Up to 10 clinicians',
    color: C.textMd,
    features:[
      'Triage AI (CT, X-ray)',
      'VLM report generation',
      'Mobile app (iOS + Android)',
      'PWA access',
      'Email notifications',
      'FHIR R4 integration',
      '99.5% uptime SLA',
      'Email support (48h)',
    ],
    missing:['Uncertainty Engine','Metacognition Engine','PACS integration','WhatsApp alerts','Population health','Federated learning','Custom AI models','Dedicated CSM'],
  },
  {
    id:'hospital', name:'Hospital', badge:'Most Popular',
    prices:{ uk:{ monthly:2199,annual:1899 }, eu:{ monthly:2409,annual:2099 }, us:{ monthly:2599,annual:2199 }, africa:{ monthly:599,annual:499 } },
    tagline:'For NHS Trusts, private hospitals and radiology groups',
    scans:'Up to 5,000 scans/month',
    users:'Up to 100 clinicians',
    color: C.brand,
    features:[
      'Everything in Clinic',
      'Uncertainty Engine (confidence quantification)',
      'Metacognition Engine (hallucination detection)',
      'Grad-CAM + SHAP explainability',
      'PACS + HL7v2 integration',
      'WhatsApp + SMS alerts',
      'Appointment booking module',
      'Population health analytics',
      'Multi-department / multi-site',
      'SSO / SAML 2.0',
      'Audit logs (HIPAA/NHS DSPT)',
      '99.9% uptime SLA',
      'Dedicated CSM',
      'Priority support (4h)',
    ],
    missing:['Federated learning','Custom AI fine-tuning','On-premise deployment','Professional Services'],
  },
  {
    id:'enterprise', name:'Enterprise', badge:'NHS & Large Health Systems',
    prices:{ uk:{ monthly:0,annual:0 }, eu:{ monthly:0,annual:0 }, us:{ monthly:0,annual:0 }, africa:{ monthly:0,annual:0 } },
    tagline:'For NHS Integrated Care Boards, health networks and government programmes',
    scans:'Unlimited scans',
    users:'Unlimited users',
    color: C.amber,
    features:[
      'Everything in Hospital',
      'Federated learning (privacy-preserving)',
      'Custom AI fine-tuning on your data',
      'On-premise / hybrid deployment option',
      'Data residency guarantee (in-country)',
      'Dedicated Azure/AWS/GCP tenancy',
      'White-label option',
      'Custom compliance reporting',
      'Professional services & training',
      'SLA up to 99.99%',
      '24/7 dedicated support line',
      'Regulatory submission support (MDR/510k)',
      'Executive quarterly business reviews',
    ],
    missing:[],
  },
];

const ROI_METRICS = [
  { label:'Radiologist hours saved/month', value:40, unit:'hrs', desc:'AI pre-reads free radiologists from routine screening' },
  { label:'Critical finding detection rate', value:97.3, unit:'%', desc:'vs 82% industry average manual review' },
  { label:'Triage-to-report time reduction', value:73, unit:'%', desc:'From hours to minutes for urgent cases' },
  { label:'Diagnostic error reduction', value:31, unit:'%', desc:'Metacognition layer catches hallucinations before report' },
];

const FAQS = [
  { q:'Is SEWA XAI a registered medical device?', a:'Yes. SEWA XAI is CE marked under EU MDR 2017/745 as a Class IIb medical device, holds UKCA marking for the UK market, and is in FDA 510(k) clearance for the US market. All AI outputs are clearly marked as decision support, not autonomous diagnosis.' },
  { q:'How does NHS pricing work?', a:'NHS Trusts and ICBs are eligible for our NHS Framework pricing, which includes DSPT compliance pre-configured, NHS Spine integration, and procurement through G-Cloud. Contact our NHS team for framework reference numbers and procurement routes.' },
  { q:'Can I trial SEWA XAI before committing?', a:'Yes. We offer a 30-day proof of concept for Hospital and Enterprise plans, including integration with your PACS/FHIR endpoint and up to 500 test scans run through the full AI pipeline. No credit card required.' },
  { q:'What happens to my data?', a:'Your clinical imaging data is processed in your chosen region (UK, EU, US, or Africa) and never leaves that data residency zone. We are GDPR Art. 28 compliant, execute a DPA with all clients, and maintain ISO 27001 certification. Patient data is never used to train shared models without explicit consent and federated learning protocols.' },
  { q:'How does per-scan pricing work at volume?', a:'Plans include a monthly scan allowance. Overage is billed at £0.35–£0.85 per scan depending on modality and plan. Enterprise clients typically negotiate unlimited scan bundles. Federated learning nodes are priced separately.' },
  { q:'Is there a free tier for researchers?', a:'We offer an Academic Research Programme with free access to the SEWA XAI API (up to 1,000 scans/month) for peer-reviewed research. Apply via our research portal with your institution details and intended research protocol.' },
];

import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

export function PricingPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  const [region,   setRegion]   = useState('uk');
  const [billing,  setBilling]  = useState<'monthly'|'annual'>('annual');
  const [openFaq,  setOpenFaq]  = useState<number|null>(null);
  const [scanVol,  setScanVol]  = useState(2000);

  const reg = REGIONS.find(r=>r.id===region)!;

  const formatPrice = (p:number) => p === 0 ? 'Custom' : `${reg.symbol}${p.toLocaleString()}`;

  // ROI calculation
  const radiologistHourlyRate = region === 'africa' ? 25 : region === 'uk' ? 85 : 95;
  const annualSaving = Math.round(scanVol * 12 * 0.008 * radiologistHourlyRate);

  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 1024px) {
          .pricing-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .roi-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .pricing-grid { grid-template-columns: 1fr !important; }
          .callout-grid { grid-template-columns: 1fr !important; }
          .hero-h1 { fontSize: 32px !important; }
          .hero-btns { flex-direction: column !important; }
          .hero-btns > button { width: 100% !important; }
          .roi-metrics { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <PublicNav activePage="pricing" onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ textAlign:'center', padding:'clamp(60px, 10vh, 100px) 24px 60px', background:`linear-gradient(180deg,${C.bg1},${C.bg0})` }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 14px', background:`${C.brand}14`, border:`1px solid ${C.brand}30`, borderRadius:20, marginBottom:20 }}>
          <span style={{ fontSize:10, fontWeight:700, color:C.brand, letterSpacing:'0.1em', textTransform:'uppercase' }}>Transparent Pricing</span>
        </div>
        <h1 className="hero-h1" style={{ fontSize:'clamp(32px, 7vw, 48px)', fontWeight:900, color:C.textHi, margin:'0 0 16px', letterSpacing:'-0.04em', lineHeight:1.1 }}>
          Clinical AI priced for<br/>every scale of care
        </h1>
        <p style={{ fontSize:15, color:C.textMd, maxWidth:520, margin:'0 auto 40px', lineHeight:1.8 }}>
          From independent clinics to NHS Integrated Care Boards — transparent, regional pricing with no hidden fees.
        </p>

        {/* Controls */}
        <div style={{ display:'flex', justifyContent:'center', gap:10, flexWrap:'wrap', marginBottom:16 }}>
          {/* Region selector */}
          <div style={{ display:'flex', gap:4, background:C.bg2, borderRadius:10, padding:4, border:`1px solid ${C.border}`, flexWrap:'wrap', justifyContent:'center' }}>
            {REGIONS.map(r => (
              <button key={r.id} onClick={() => setRegion(r.id)} style={{
                padding:'6px 12px', borderRadius:7, border:'none', cursor:'pointer', fontFamily:C.F, fontSize:11,
                background:region===r.id?C.bg4:'transparent', color:region===r.id?C.textHi:C.textLo, fontWeight:region===r.id?600:400,
              }}>{r.label}</button>
            ))}
          </div>
          {/* Billing toggle */}
          <div style={{ display:'flex', gap:4, background:C.bg2, borderRadius:10, padding:4, border:`1px solid ${C.border}` }}>
            {(['monthly','annual'] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{
                padding:'6px 14px', borderRadius:7, border:'none', cursor:'pointer', fontFamily:C.F, fontSize:11,
                background:billing===b?C.brand:'transparent', color:billing===b?'white':C.textLo, fontWeight:billing===b?700:400,
              }}>{b === 'annual' ? 'Annual (save 15%)' : 'Monthly'}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Plan cards */}
      <div style={{ maxWidth:1160, margin:'0 auto', padding:'0 24px 80px' }}>
        <div className="pricing-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20, marginBottom:80 }}>
          {PLANS.map(plan => {
            const price = plan.prices[region as keyof typeof plan.prices][billing];
            const isPopular = plan.id === 'hospital';
            return (
              <div key={plan.id} style={{
                background: isPopular ? `linear-gradient(180deg,${C.bg3},${C.bg2})` : C.bg2,
                border:`1px solid ${isPopular ? `${C.brand}50` : C.border}`,
                borderRadius:18, padding:28, display:'flex', flexDirection:'column',
                position:'relative', overflow:'hidden',
              }}>
                {plan.badge && (
                  <div style={{ position:'absolute', top:0, right:0, background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, padding:'4px 14px', fontSize:9, fontWeight:800, color:'white', borderBottomLeftRadius:12, letterSpacing:'0.06em', textTransform:'uppercase' }}>
                    {plan.badge}
                  </div>
                )}

                <div style={{ marginBottom:24 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:plan.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>{plan.name}</div>
                  <div style={{ marginBottom:8 }}>
                    {price === 0 ? (
                      <span style={{ fontSize:36, fontWeight:900, color:plan.color, fontFamily:C.FM }}>Custom</span>
                    ) : (
                      <>
                        <span style={{ fontSize:32, fontWeight:900, color:plan.color, fontFamily:C.FM }}>{formatPrice(price)}</span>
                        <span style={{ fontSize:12, color:C.textLo }}>/month</span>
                      </>
                    )}
                    {billing === 'annual' && price > 0 && (
                      <div style={{ fontSize:10, color:C.normal, marginTop:4 }}>Billed annually · 15% saving</div>
                    )}
                  </div>
                  <p style={{ fontSize:12, color:C.textLo, margin:'0 0 12px', lineHeight:1.6 }}>{plan.tagline}</p>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <span style={{ padding:'3px 10px', background:`${plan.color}14`, border:`1px solid ${plan.color}30`, borderRadius:20, fontSize:10, color:plan.color, fontWeight:600 }}>{plan.scans}</span>
                    <span style={{ padding:'3px 10px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:20, fontSize:10, color:C.textLo }}>{plan.users}</span>
                  </div>
                </div>

                <button onClick={() => onNavigate(plan.id === 'enterprise' ? 'contact' : 'contact')} style={{
                  padding:'11px 0', borderRadius:10, border: isPopular ? 'none' : `1px solid ${C.border}`,
                  background: isPopular ? `linear-gradient(135deg,${C.brand},${C.brandDk})` : C.bg3,
                  color: isPopular ? 'white' : C.textMd, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:C.F, marginBottom:24,
                }}>
                  {plan.id === 'enterprise' ? 'Contact Enterprise Team' : 'Start Free Trial'}
                </button>

                <div style={{ flex:1 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display:'flex', gap:8, padding:'5px 0', fontSize:12, color:C.textMd }}>
                      <span style={{ color:C.normal, fontSize:11, flexShrink:0 }}>✓</span>{f}
                    </div>
                  ))}
                  {plan.missing.slice(0,4).map(f => (
                    <div key={f} style={{ display:'flex', gap:8, padding:'5px 0', fontSize:12, color:C.textLo }}>
                      <span style={{ fontSize:11, flexShrink:0 }}>—</span>{f}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Africa / NHS callouts */}
        <div className="callout-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:80 }}>
          {[
            { flag:'🌍', label:'Africa Healthcare Programme', color:C.normal, bg:`${C.normal}08`, border:`${C.normal}20`,
              desc:'SEWA XAI partners with African governments, donor-funded health programmes, and NGOs to deploy AI diagnostics at 60–80% reduced cost. Includes offline-first deployment for low-connectivity environments and local-language support.',
              badges:['Kenya','Nigeria','Ghana','Rwanda','Tanzania','South Africa'],
              cta:'Learn about Africa Pricing' },
            { flag:'🏥', label:'NHS Framework Pricing', color:C.info, bg:`${C.info}08`, border:`${C.info}20`,
              desc:'Procurable through G-Cloud 14 and the NHS AI and Digital Transformation framework. Pre-configured for NHS Spine, NHS Login, DSPT compliance, and CDS Hooks. ICBs and Trusts can deploy within weeks.',
              badges:['G-Cloud 14','NHS DSPT','CQC','NHS Spine','NICE Evidence Standards'],
              cta:'NHS Procurement Info' },
          ].map(item => (
            <div key={item.label} style={{ padding:28, background:item.bg, border:`1px solid ${item.border}`, borderRadius:16 }}>
              <div style={{ fontSize:28, marginBottom:12 }}>{item.flag}</div>
              <div style={{ fontSize:16, fontWeight:800, color:C.textHi, marginBottom:10, fontFamily:C.F }}>{item.label}</div>
              <p style={{ fontSize:13, color:C.textMd, lineHeight:1.7, margin:'0 0 16px' }}>{item.desc}</p>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
                {item.badges.map(b => <span key={b} style={{ padding:'3px 9px', background:`${item.color}14`, border:`1px solid ${item.color}30`, borderRadius:20, fontSize:10, color:item.color, fontWeight:600 }}>{b}</span>)}
              </div>
              <button onClick={() => onNavigate('contact')} style={{ padding:'9px 18px', background:item.color, border:'none', borderRadius:9, color:'white', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:C.F }}>{item.cta} →</button>
            </div>
          ))}
        </div>

        {/* ROI Calculator */}
        <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:20, padding:'clamp(20px, 5vw, 40px)', marginBottom:80 }}>
          <h2 style={{ fontSize:26, fontWeight:800, color:C.textHi, margin:'0 0 8px', fontFamily:C.F, letterSpacing:'-0.5px' }}>Return on Investment Calculator</h2>
          <p style={{ fontSize:13, color:C.textMd, margin:'0 0 32px' }}>Estimate the clinical and financial impact of deploying SEWA XAI in your organisation.</p>

          <div className="roi-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:40 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.textLo, letterSpacing:'0.08em', textTransform:'uppercase', display:'block', marginBottom:10 }}>
                Monthly scan volume: <span style={{ color:C.brand, fontFamily:C.FM }}>{scanVol.toLocaleString()}</span>
              </label>
              <input type="range" min={100} max={20000} step={100} value={scanVol} onChange={e => setScanVol(+e.target.value)}
                style={{ width:'100%', accentColor:C.brand, marginBottom:24 }}/>

              <div className="roi-metrics" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {ROI_METRICS.map(m => (
                  <div key={m.label} style={{ padding:16, background:C.bg3, borderRadius:12, border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:22, fontWeight:900, color:C.brand, fontFamily:C.FM }}>{m.value}{m.unit}</div>
                    <div style={{ fontSize:11, color:C.textHi, fontWeight:600, margin:'4px 0' }}>{m.label}</div>
                    <div style={{ fontSize:10, color:C.textLo, lineHeight:1.5 }}>{m.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ padding:24, background:`linear-gradient(135deg,${C.brandMuted},${C.bg3})`, border:`1px solid ${C.brand}30`, borderRadius:16, textAlign:'center' }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.textLo, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Estimated Annual Saving</div>
                <div style={{ fontSize:'clamp(32px, 8vw, 48px)', fontWeight:900, color:C.brand, fontFamily:C.FM, letterSpacing:'-2px' }}>{reg.symbol}{annualSaving.toLocaleString()}</div>
                <div style={{ fontSize:12, color:C.textMd, marginTop:6 }}>Based on {scanVol.toLocaleString()} scans/month in {reg.label}</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { label:'AI-assisted reads/month', value:`${Math.round(scanVol*0.94).toLocaleString()}`, desc:'94% of scans pre-triaged by AI' },
                  { label:'Critical alerts prevented from delay', value:`${Math.round(scanVol*0.031).toLocaleString()}`, desc:'3.1% of scans are critical findings' },
                  { label:'Estimated ROI (Year 1)', value:`${Math.round(annualSaving / (PLANS[1].prices[region as keyof typeof PLANS[1]['prices']].annual * 12) * 100)}%`, desc:'vs Hospital plan annual cost' },
                ].map(r => (
                  <div key={r.label} style={{ padding:16, background:C.bg3, borderRadius:12, border:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:C.textHi }}>{r.label}</div>
                      <div style={{ fontSize:10, color:C.textLo, marginTop:2 }}>{r.desc}</div>
                    </div>
                    <div style={{ fontSize:18, fontWeight:800, color:C.normal, fontFamily:C.FM, textAlign:'right', marginLeft:10 }}>{r.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom:64 }}>
          <h2 style={{ fontSize:26, fontWeight:800, color:C.textHi, margin:'0 0 8px', fontFamily:C.F, letterSpacing:'-0.5px', textAlign:'center' }}>Frequently Asked Questions</h2>
          <p style={{ fontSize:13, color:C.textMd, textAlign:'center', margin:'0 0 40px' }}>Everything about pricing, compliance, and clinical deployment.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ border:`1px solid ${openFaq===i?`${C.brand}40`:C.border}`, borderRadius:12, overflow:'hidden' }}>
                <button onClick={() => setOpenFaq(o=>o===i?null:i)} style={{ width:'100%', padding:'16px 20px', background:openFaq===i?`${C.brand}08`:C.bg2, border:'none', cursor:'pointer', fontFamily:C.F, display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
                  <span style={{ fontSize:14, fontWeight:600, color:C.textHi, textAlign:'left' }}>{faq.q}</span>
                  <span style={{ fontSize:16, color:C.brand, flexShrink:0 }}>{openFaq===i?'−':'+'}</span>
                </button>
                {openFaq===i && (
                  <div style={{ padding:'0 20px 18px', background:C.bg0, fontSize:13, color:C.textMd, lineHeight:1.8 }}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign:'center', padding:'clamp(32px, 8vw, 56px)', background:`linear-gradient(135deg,${C.bg2},${C.bg3})`, borderRadius:20, border:`1px solid ${C.border}` }}>
          <h2 style={{ fontSize:'clamp(24px, 5vw, 32px)', fontWeight:800, color:C.textHi, margin:'0 0 14px', fontFamily:C.F, letterSpacing:'-1px' }}>Ready to transform your radiology workflow?</h2>
          <p style={{ fontSize:14, color:C.textMd, margin:'0 0 32px' }}>Join 47+ hospitals and clinics using SEWA XAI across 7 countries.</p>
          <div className="hero-btns" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => onNavigate('contact')} style={{ padding:'13px 32px', background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, border:'none', borderRadius:11, color:'white', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:C.F }}>Request a Demo →</button>
            <button onClick={() => onNavigate('clinical-validation')} style={{ padding:'13px 24px', background:'none', border:`1px solid ${C.border}`, borderRadius:11, color:C.textMd, fontSize:14, cursor:'pointer', fontFamily:C.F }}>View Clinical Evidence</button>
          </div>
        </div>
      </div>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}

