// SEWA XAI — Africa Pricing Page
import React, { useState } from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A', bg4:'#162821',
  brand:'#408D7B', brandLt:'#52B09A', brandDk:'#2E6B5E', brandMuted:'#1A3028',
  critical:'#E03535', normal:'#1DBF73', info:'#2A6EF2', purple:'#8B5CF6', amber:'#F59E0B',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028', F:"'IBM Plex Sans',system-ui,sans-serif", FM:"'IBM Plex Mono',monospace",
};

const AFRICA_COUNTRIES = [
  { id:'ng', name:'Nigeria', currency:'NGN', symbol:'₦', rate:1500 },
  { id:'ke', name:'Kenya', currency:'KES', symbol:'KSh', rate:130 },
  { id:'gh', name:'Ghana', currency:'GHS', symbol:'GHS', rate:12 },
  { id:'za', name:'South Africa', currency:'ZAR', symbol:'R', rate:18 },
  { id:'tz', name:'Tanzania', currency:'TZS', symbol:'TSh', rate:2500 },
  { id:'rw', name:'Rwanda', currency:'RWF', symbol:'RWF', rate:1300 },
];

const PLANS = [
  {
    id:'starter', name:'Clinic Starter', badge:'Annual Only',
    basePrice:{ monthly:169, annual:139 },
    tagline:'For independent clinics and outpatient imaging centers',
    scans:'Up to 500 AI scans/month',
    users:'Up to 10 clinicians',
    color: C.textMd,
    features:[
      'Triage AI (CT, X-ray)',
      'VLM diagnostic report generation',
      'Clinical Decision Support (CDS) alerts',
      'Secure mobile app (iOS & Android)',
      'Web-based DICOM viewer (PWA)',
      'FHIR R4 compliant APIs',
      '99.5% guaranteed uptime SLA',
      '48-hour clinical support response',
      'Local language support (English, Swahili, Yoruba)',
    ],
  },
  {
    id:'hospital', name:'Hospital Pro', badge:'Most Popular',
    basePrice:{ monthly:599, annual:499 },
    tagline:'For hospitals and radiology groups',
    scans:'Up to 5,000 AI scans/month',
    users:'Up to 100 clinicians',
    color: C.brand,
    features:[
      'Everything in Clinic Starter',
      'Uncertainty Engine (confidence quantification)',
      'Metacognition Engine (hallucination detection)',
      'Grad-CAM & SHAP visual explainability',
      'Native PACS & HL7v2 integration',
      'Automated referral routing',
      'WhatsApp & SMS critical alerts',
      'Multi-department / multi-site support',
      'Audit logs (HIPAA & WHO compliant)',
      '99.9% guaranteed uptime SLA',
      'Priority 4-hour technical support',
      'Dedicated Customer Success Manager',
      'Offline-first deployment option',
    ],
  },
  {
    id:'enterprise', name:'Government / Enterprise', badge:'60-80% Discount',
    basePrice:{ monthly:1499, annual:1299 },
    tagline:'For Ministries of Health, NHIS, and national programs',
    scans:'Unlimited scans',
    users:'Unlimited users',
    color: C.amber,
    features:[
      'Everything in Hospital Pro',
      'Federated learning (privacy-preserving AI)',
      'Custom Vision-Language Model fine-tuning on local datasets',
      'On-premise & hybrid edge deployment',
      'Data residency guarantees (in-country execution)',
      'Dedicated single-tenant infrastructure',
      'White-label portal & bespoke integrations',
      'Regulatory submission support',
      '24/7 dedicated clinical engineering support',
      '99.99% critical infrastructure SLA',
      'Training and capacity building for local staff',
    ],
  },
];

export function AfricaPricingPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  const [country, setCountry] = useState(AFRICA_COUNTRIES[0]);
  const [billing, setBilling] = useState<'monthly'|'annual'>('annual');

  const formatPrice = (basePrice: number) => {
    const localPrice = basePrice * country.rate;
    return `${country.symbol}${localPrice.toLocaleString()}`;
  };

  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 1024px) {
          .pricing-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <PublicNav activePage="pricing" onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ textAlign:'center', padding:'clamp(60px, 10vh, 100px) 24px 60px', background:`linear-gradient(180deg,${C.bg1},${C.bg0})` }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 14px', background:`${C.brand}14`, border:`1px solid ${C.brand}30`, borderRadius:20, marginBottom:20 }}>
          <span style={{ fontSize:10, fontWeight:700, color:C.brand, letterSpacing:'0.1em', textTransform:'uppercase' }}>AFRICA HEALTHCARE PROGRAM</span>
        </div>
        <h1 className="hero-h1" style={{ fontSize:'clamp(32px, 7vw, 48px)', fontWeight:900, color:C.textHi, margin:'0 0 16px', letterSpacing:'-0.04em', lineHeight:1.1 }}>
          AI Diagnostics for African Healthcare
        </h1>
        <p style={{ fontSize:15, color:C.textMd, maxWidth:600, margin:'0 auto 40px', lineHeight:1.8 }}>
          60-80% discounted pricing for African governments, donor-funded programs, and NGOs. Local currency support, offline-first deployment, and local language capabilities.
        </p>

        {/* Controls */}
        <div style={{ display:'flex', justifyContent:'center', gap:10, flexWrap:'wrap', marginBottom:16 }}>
          {/* Country selector */}
          <div style={{ display:'flex', gap:4, background:C.bg2, borderRadius:10, padding:4, border:`1px solid ${C.border}`, flexWrap:'wrap', justifyContent:'center' }}>
            {AFRICA_COUNTRIES.map(c => (
              <button key={c.id} onClick={() => setCountry(c)} style={{
                padding:'6px 12px', borderRadius:7, border:'none', cursor:'pointer', fontFamily:C.F, fontSize:11,
                background:country.id===c.id?C.bg4:'transparent', color:country.id===c.id?C.textHi:C.textLo, fontWeight:country.id===c.id?600:400,
              }}>🇺🇳 {c.name}</button>
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
            const planBilling = plan.id === 'starter' ? 'annual' : billing;
            const basePrice = plan.basePrice[planBilling];
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
                    {plan.id === 'enterprise' ? (
                      <>
                        <span style={{ fontSize:32, fontWeight:900, color:plan.color, fontFamily:C.FM }}>{formatPrice(basePrice)}</span>
                        <span style={{ fontSize:12, color:C.textLo }}>/month</span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize:32, fontWeight:900, color:plan.color, fontFamily:C.FM }}>{formatPrice(basePrice)}</span>
                        <span style={{ fontSize:12, color:C.textLo }}>/month</span>
                      </>
                    )}
                    {((plan.id === 'starter') || (billing === 'annual')) && (
                      <div style={{ fontSize:10, color:plan.id === 'starter' ? plan.color : C.normal, marginTop:4 }}>
                        {plan.id === 'starter' ? 'Annual-only plan · 15% saving vs monthly' : 'Billed annually · 15% saving'}
                      </div>
                    )}
                    <div style={{ fontSize:10, color:C.textLo, marginTop:4 }}>
                      ≈ ${basePrice} USD / month
                    </div>
                  </div>
                  <p style={{ fontSize:12, color:C.textLo, margin:'0 0 12px', lineHeight:1.6 }}>{plan.tagline}</p>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <span style={{ padding:'3px 10px', background:`${plan.color}14`, border:`1px solid ${plan.color}30`, borderRadius:20, fontSize:10, color:plan.color, fontWeight:600 }}>{plan.scans}</span>
                    <span style={{ padding:'3px 10px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:20, fontSize:10, color:C.textLo }}>{plan.users}</span>
                  </div>
                </div>

                <button onClick={() => {
                  if (plan.id === 'enterprise') {
                    onNavigate('contact');
                  } else {
                    const planBilling = plan.id === 'starter' ? 'annual' : billing;
                    window.location.href = `/register?plan=${plan.id}&interval=${planBilling}&region=africa&country=${country.id}`;
                  }
                }} style={{
                  padding:'11px 0', borderRadius:10, border: isPopular ? 'none' : `1px solid ${C.border}`,
                  background: isPopular ? `linear-gradient(135deg,${C.brand},${C.brandDk})` : C.bg3,
                  color: isPopular ? 'white' : C.textMd, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:C.F, marginBottom:24,
                }}>
                  {plan.id === 'enterprise' ? 'Contact Africa Program Team' : 'Start Free Trial'}
                </button>

                <div style={{ flex:1 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display:'flex', gap:8, padding:'5px 0', fontSize:12, color:C.textMd }}>
                      <span style={{ color:C.normal, fontSize:11, flexShrink:0 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div style={{ textAlign:'center', padding:'clamp(32px, 8vw, 56px)', background:`linear-gradient(135deg,${C.bg2},${C.bg3})`, borderRadius:20, border:`1px solid ${C.border}` }}>
          <h2 style={{ fontSize:'clamp(24px, 5vw, 32px)', fontWeight:800, color:C.textHi, margin:'0 0 14px', fontFamily:C.F, letterSpacing:'-1px' }}>Ready to Bring AI to Your Healthcare Facility?</h2>
          <p style={{ fontSize:14, color:C.textMd, margin:'0 0 32px' }}>Contact our Africa program team for a tailored demo and pricing package.</p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => onNavigate('contact')} style={{ padding:'13px 32px', background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, border:'none', borderRadius:11, color:'white', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:C.F }}>Contact Africa Team →</button>
          </div>
        </div>
      </div>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
