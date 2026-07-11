// SEWA XAI — Africa Pricing Page
import React, { useState } from 'react';
import { colors, typography, spacing, radius, transitions } from '../../design-system/tokens';
import { Button, Badge, Card } from '../../design-system/components';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

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
    color: colors.textMed,
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
    color: colors.brand,
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
    id:'enterprise', name:'Government / Enterprise', badge:'Local Pricing',
    basePrice:{ monthly:1499, annual:1299 },
    tagline:'For Ministries of Health, NHIS, and national programs',
    scans:'Unlimited scans',
    users:'Unlimited users',
    color: colors.warning,
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
    <div style={{ background:colors.bg0, minHeight:'100vh', fontFamily:typography.fontBase }}>
      <style>{`
        @media (max-width: 1024px) {
          .africa-pricing-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .africa-pricing-grid { grid-template-columns: 1fr !important; }
          .africa-hero-btns { flex-direction: column !important; }
          .africa-hero-btns > button { width: 100% !important; }
        }
      `}</style>
      <PublicNav activePage="pricing" onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ textAlign:'center', padding:`clamp(${spacing[10]}, 10vh, ${spacing[20]}) ${spacing[6]} ${spacing[12]}`, background:`linear-gradient(180deg,${colors.bg1},${colors.bg0})` }}>
        <Badge variant="brand" style={{ marginBottom:spacing[5] }}>AFRICA HEALTHCARE PROGRAM</Badge>
        <h1 style={{ fontSize:'clamp(28px, 7vw, 48px)', fontWeight:900, color:colors.textHigh, margin:`0 0 ${spacing[4]}`, letterSpacing:'-0.04em', lineHeight:1.1 }}>
          AI Diagnostics for African Healthcare
        </h1>
        <p style={{ fontSize:'clamp(14px, 2.5vw, 15px)', color:colors.textMed, maxWidth:600, margin:`0 auto ${spacing[8]}`, lineHeight:1.8 }}>
          Purpose-built pricing for African healthcare systems. Local currency support, offline-first deployment, and local language capabilities.
        </p>

        {/* Controls */}
        <div style={{ display:'flex', justifyContent:'center', gap:spacing[3], flexWrap:'wrap', marginBottom:spacing[4] }}>
          {/* Country selector */}
          <div style={{ display:'flex', gap:spacing[1], background:colors.bg2, borderRadius:radius.md, padding:spacing[1], border:`1px solid ${colors.bgBorder}`, flexWrap:'wrap', justifyContent:'center' }}>
            {AFRICA_COUNTRIES.map(c => (
              <button key={c.id} onClick={() => setCountry(c)} style={{
                padding:`${spacing[2]} ${spacing[3]}`, borderRadius:7, border:'none', cursor:'pointer', fontFamily:typography.fontBase, fontSize:11,
                background:country.id===c.id?colors.bg4:'transparent', color:country.id===c.id?colors.textHigh:colors.textLow, fontWeight:country.id===c.id?600:400,
                transition:`all ${transitions.fast}`,
              }}>{c.name}</button>
            ))}
          </div>
          {/* Billing toggle */}
          <div style={{ display:'flex', gap:spacing[1], background:colors.bg2, borderRadius:radius.md, padding:spacing[1], border:`1px solid ${colors.bgBorder}` }}>
            {(['monthly','annual'] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{
                padding:`${spacing[2]} ${spacing[4]}`, borderRadius:7, border:'none', cursor:'pointer', fontFamily:typography.fontBase, fontSize:11,
                background:billing===b?colors.brand:'transparent', color:billing===b?'white':colors.textLow, fontWeight:billing===b?700:400,
                transition:`all ${transitions.fast}`,
              }}>{b === 'annual' ? 'Annual (save 15%)' : 'Monthly'}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Plan cards */}
      <div style={{ maxWidth:1160, margin:'0 auto', padding:`0 ${spacing[6]} ${spacing[20]}` }}>
        <div className="africa-pricing-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:spacing[5], marginBottom:spacing[20] }}>
          {PLANS.map(plan => {
            const planBilling = plan.id === 'starter' ? 'annual' : billing;
            const basePrice = plan.basePrice[planBilling];
            const isPopular = plan.id === 'hospital';
            const isAnnualOnly = plan.id === 'starter';
            return (
              <Card key={plan.id} padding={spacing[7]} hoverable={isPopular} style={{
                background: isPopular ? `linear-gradient(180deg,${colors.bg3},${colors.bg2})` : colors.bg2,
                border:`1px solid ${isPopular ? `${colors.brand}50` : colors.bgBorder}`,
                borderRadius:18, display:'flex', flexDirection:'column',
                position:'relative', overflow:'hidden',
              }}>
                {plan.badge && (
                  <div style={{ position:'absolute', top:0, right:0, background:`linear-gradient(135deg,${colors.brand},${colors.brandDark})`, padding:`${spacing[1]} ${spacing[4]}`, fontSize:9, fontWeight:800, color:'white', borderBottomLeftRadius:12, letterSpacing:'0.06em', textTransform:'uppercase' }}>
                    {plan.badge}
                  </div>
                )}

                <div style={{ marginBottom:spacing[6] }}>
                  <div style={{ fontSize:11, fontWeight:700, color:plan.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:spacing[2] }}>{plan.name}</div>
                  <div style={{ marginBottom:spacing[2] }}>
                    <span style={{ fontSize:32, fontWeight:900, color:plan.color, fontFamily:typography.fontMono }}>{formatPrice(basePrice)}</span>
                    <span style={{ fontSize:12, color:colors.textLow }}>/month</span>
                    {isAnnualOnly && (
                      <div style={{ fontSize:10, color:plan.color, marginTop:spacing[1] }}>
                        Annual-only plan · 15% saving vs monthly
                      </div>
                    )}
                    {!isAnnualOnly && billing === 'annual' && basePrice > 0 && (
                      <div style={{ fontSize:10, color:colors.normal, marginTop:spacing[1] }}>
                        Billed annually · 15% saving
                      </div>
                    )}
                    <div style={{ fontSize:10, color:colors.textLow, marginTop:spacing[1] }}>
                      ≈ ${basePrice} USD / month
                    </div>
                  </div>
                  <p style={{ fontSize:12, color:colors.textLow, margin:`0 0 ${spacing[3]}`, lineHeight:1.6 }}>{plan.tagline}</p>
                  <div style={{ display:'flex', gap:spacing[2], flexWrap:'wrap' }}>
                    <Badge style={{ fontSize:10, padding:'3px 10px' }}>{plan.scans}</Badge>
                    <Badge variant="default" style={{ fontSize:10, padding:'3px 10px' }}>{plan.users}</Badge>
                  </div>
                </div>

                <Button variant={isPopular ? 'primary' : 'secondary'} fullWidth onClick={() => {
                  if (plan.id === 'enterprise') {
                    onNavigate('contact');
                  } else {
                    const planBilling = plan.id === 'starter' ? 'annual' : billing;
                    window.location.href = `/register?plan=${plan.id}&interval=${planBilling}&region=africa&country=${country.id}`;
                  }
                }} style={{ marginBottom:spacing[6] }}>
                  {plan.id === 'enterprise' ? 'Contact Africa Program Team' : 'Start Free Trial'}
                </Button>

                <div style={{ flex:1 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display:'flex', gap:spacing[2], padding:`${spacing[1]} 0`, fontSize:12, color:colors.textMed }}>
                      <span style={{ color:colors.normal, fontSize:11, flexShrink:0 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        {/* CTA */}
        <Card padding={`clamp(${spacing[8]}, 8vw, ${spacing[14]})`} style={{ textAlign:'center', background:`linear-gradient(135deg,${colors.bg2},${colors.bg3})` }}>
          <h2 style={{ fontSize:'clamp(24px, 5vw, 32px)', fontWeight:800, color:colors.textHigh, margin:`0 0 ${spacing[4]}`, fontFamily:typography.fontBase, letterSpacing:'-1px' }}>Ready to Bring AI to Your Healthcare Facility?</h2>
          <p style={{ fontSize:14, color:colors.textMed, margin:`0 0 ${spacing[8]}` }}>Contact our Africa program team for a tailored demo and pricing package.</p>
          <div className="africa-hero-btns" style={{ display:'flex', gap:spacing[3], justifyContent:'center', flexWrap:'wrap' }}>
            <Button variant="primary" onClick={() => onNavigate('contact')}>Contact Africa Team →</Button>
          </div>
        </Card>
      </div>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
