// SEWA XAI — PricingPage.tsx
import React, { useState } from 'react';
import { colors, typography, radius, shadows, transitions, spacing } from '../../design-system/tokens';
import { Button, Badge, Card, Chart } from '../../design-system/components';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const REGIONS = [
  { id:'uk',     label:'🇬🇧 United Kingdom', currency:'GBP', symbol:'£' },
  { id:'eu',     label:'🇪🇺 European Union',  currency:'EUR', symbol:'€' },
  { id:'us',     label:'🇺🇸 North America',   currency:'USD', symbol:'$' },
  { id:'africa', label:'🌍 Africa',           currency:'USD', symbol:'$' },
];

const PLANS = [
  {
    id:'starter', name:'Starter Clinic', badge:'Annual Only',
    prices:{ uk:{ monthly:549,annual:459 }, eu:{ monthly:609,annual:519 }, us:{ monthly:649,annual:549 }, africa:{ monthly:169,annual:139 } },
    tagline:'For independent clinics and outpatient imaging centres',
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
    ],
  },
  {
    id:'hospital', name:'Hospital Pro', badge:'Most Popular',
    prices:{ uk:{ monthly:2199,annual:1899 }, eu:{ monthly:2409,annual:2099 }, us:{ monthly:2599,annual:2199 }, africa:{ monthly:599,annual:499 } },
    tagline:'For NHS Trusts, private hospitals, and radiology groups',
    scans:'Up to 5,000 AI scans/month',
    users:'Up to 100 clinicians',
    color: colors.brand,
    features:[
      'Everything in Starter Clinic',
      'Uncertainty Engine (confidence quantification)',
      'Metacognition Engine (hallucination detection)',
      'Grad-CAM & SHAP visual explainability',
      'Native PACS & HL7v2 integration',
      'Automated referral routing & payments',
      'WhatsApp, SMS & EHR critical alerts',
      'Multi-department / multi-site support',
      'SSO / SAML 2.0 (NHS Care Identity Service)',
      'Audit logs (HIPAA & NHS DSPT compliant)',
      '99.9% guaranteed uptime SLA',
      'Priority 4-hour technical support',
      'Dedicated Customer Success Manager',
    ],
  },
  {
    id:'enterprise', name:'Enterprise', badge:'NHS & Large Health Systems',
    prices:{ uk:{ monthly:4999,annual:4299 }, eu:{ monthly:5499,annual:4699 }, us:{ monthly:5999,annual:5199 }, africa:{ monthly:1499,annual:1299 } },
    tagline:'Starting from £4,999/month — for NHS Integrated Care Boards and national health programmes',
    scans:'Unlimited scans',
    users:'Unlimited users',
    color: colors.warning,
    features:[
      'Everything in Hospital Pro',
      'Federated learning (privacy-preserving AI)',
      'Custom Vision-Language Model fine-tuning',
      'On-premise & hybrid edge deployment options',
      'Data residency guarantees (in-country execution)',
      'Dedicated single-tenant Azure/AWS infrastructure',
      'White-label portal & bespoke integrations',
      'Regulatory submission support (MDR/510k)',
      '24/7 dedicated clinical engineering support',
      '99.99% critical infrastructure SLA',
      'Option for outcome-based pricing pilot',
    ],
  },
];

const ROI_METRICS = [
  { label:'Projected radiologist hours saved/month', value:40, unit:'hrs', desc:'Based on engineering benchmarks — AI pre-reads free radiologists from routine screening' },
  { label:'Critical finding detection (engineering)', value:97.3, unit:'%', desc:'AUC in retrospective validation datasets (not yet independently validated)' },
  { label:'Triage-to-report time reduction', value:73, unit:'%', desc:'Measured in simulated clinical environments (TRL 5)' },
  { label:'Metacognition hallucination catch rate', value:31, unit:'%', desc:'Reduction in VLM factual errors in internal testing' },
];

const FAQS = [
  { q:'Is SEWA XAI a registered medical device?', a:'SEWA XAI is currently at Technology Readiness Level 5 (TRL 5) and is progressing through the regulatory pathway for classification as a Class IIb Software as a Medical Device (SaMD). We have completed DCB0129 clinical risk management and are supported by NHS Innovation Service (INN-2604-0064-2). UKCA, CE, and FDA clearances are on our regulatory roadmap. All AI outputs are clearly marked as decision support, not autonomous diagnosis.' },
  { q:'How does NHS pricing work?', a:'NHS Trusts and ICBs are eligible for our NHS Framework pricing, which includes DSPT compliance pre-configured, NHS Spine integration, and procurement through G-Cloud. Contact our NHS team for framework reference numbers and procurement routes.' },
  { q:'Can I trial SEWA XAI before committing?', a:'Yes. We offer a 30-day proof of concept for Hospital and Enterprise plans, including integration with your PACS/FHIR endpoint and up to 500 test scans run through the full AI pipeline. No credit card required.' },
  { q:'What happens to my data?', a:'Your clinical imaging data is processed in your chosen region (UK, EU, US, or Africa) and never leaves that data residency zone. We are GDPR Art. 28 compliant and execute a DPA with all clients. Our QMS is designed around ISO 27001 and ISO 13485 requirements (certification in progress). Patient data is never used to train shared models without explicit consent and federated learning protocols.' },
  { q:'How does per-scan pricing work at volume?', a:'Plans include a monthly scan allowance. Overage is billed at £0.35–£0.85 per scan depending on modality and plan. Enterprise clients typically negotiate unlimited scan bundles. Federated learning nodes are priced separately.' },
  { q:'Is there a free tier for researchers?', a:'We offer an Academic Research Programme with free access to the SEWA XAI API (up to 1,000 scans/month) for peer-reviewed research. Apply via our research portal with your institution details and intended research protocol.' },
];

export function PricingPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  const [region,   setRegion]   = useState('uk');
  const [billing,  setBilling]  = useState<'monthly'|'annual'>('annual');
  const [openFaq,  setOpenFaq]  = useState<number|null>(null);
  const [scanVol,  setScanVol]  = useState(2000);

  const reg = REGIONS.find(r=>r.id===region)!;

  const formatPrice = (p:number, planId:string) => {
    return p === 0 ? 'Custom' : `${reg.symbol}${p.toLocaleString()}`;
  };

  // ROI calculation
  const radiologistHourlyRate = region === 'africa' ? 25 : region === 'uk' ? 85 : 95;
  const annualSaving = Math.round(scanVol * 12 * 0.008 * radiologistHourlyRate);

  const roiChartData = [
    { label: 'Jan', value: 25 },
    { label: 'Feb', value: 32 },
    { label: 'Mar', value: 45 },
    { label: 'Apr', value: 38 },
    { label: 'May', value: 52 },
    { label: 'Jun', value: 60 },
  ];

  return (
    <div style={{ background:colors.bg0, minHeight:'100vh', fontFamily:typography.fontBase }}>
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
      <div style={{ textAlign:'center', padding:`clamp(${spacing[10]}, 10vh, ${spacing[20]}) ${spacing[6]} ${spacing[12]}`, background:`linear-gradient(180deg,${colors.bg1},${colors.bg0})` }}>
        <Badge variant="brand" style={{ marginBottom:spacing[5] }}>Transparent Pricing</Badge>
        <h1 className="hero-h1" style={{ fontSize:'clamp(32px, 7vw, 48px)', fontWeight:900, color:colors.textHigh, margin:`0 0 ${spacing[4]}`, letterSpacing:'-0.04em', lineHeight:1.1 }}>
          Clinical AI priced for<br/>every scale of care
        </h1>
        <p style={{ fontSize:15, color:colors.textMed, maxWidth:520, margin:`0 auto ${spacing[10]}`, lineHeight:1.8 }}>
          From independent clinics to NHS Integrated Care Boards — transparent, regional pricing with no hidden fees.
        </p>

        {/* Controls */}
        <div style={{ display:'flex', justifyContent:'center', gap:spacing[3], flexWrap:'wrap', marginBottom:spacing[4] }}>
          {/* Region selector */}
          <div style={{ display:'flex', gap:spacing[1], background:colors.bg2, borderRadius:radius.md, padding:spacing[1], border:`1px solid ${colors.bgBorder}`, flexWrap:'wrap', justifyContent:'center' }}>
            {REGIONS.map(r => (
              <button key={r.id} onClick={() => setRegion(r.id)} style={{
                padding:`${spacing[2]} ${spacing[3]}`, borderRadius:7, border:'none', cursor:'pointer', fontFamily:typography.fontBase, fontSize:11,
                background:region===r.id?colors.bg4:'transparent', color:region===r.id?colors.textHigh:colors.textLow, fontWeight:region===r.id?600:400,
              }}>{r.label}</button>
            ))}
          </div>
          {/* Billing toggle */}
          <div style={{ display:'flex', gap:spacing[1], background:colors.bg2, borderRadius:radius.md, padding:spacing[1], border:`1px solid ${colors.bgBorder}` }}>
            {(['monthly','annual'] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{
                padding:`${spacing[2]} ${spacing[4]}`, borderRadius:7, border:'none', cursor:'pointer', fontFamily:typography.fontBase, fontSize:11,
                background:billing===b?colors.brand:'transparent', color:billing===b?'white':colors.textLow, fontWeight:billing===b?700:400,
              }}>{b === 'annual' ? 'Annual (save 15%)' : 'Monthly'}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Plan cards */}
      <div style={{ maxWidth:1160, margin:'0 auto', padding:`0 ${spacing[6]} ${spacing[20]}` }}>
        <div className="pricing-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:spacing[5], marginBottom:spacing[20] }}>
          {PLANS.map(plan => {
            const planBilling = plan.id === 'starter' ? 'annual' : billing;
            const price = plan.prices[region as keyof typeof plan.prices][planBilling];
            const isPopular = plan.id === 'hospital';
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
                    {plan.id === 'enterprise' ? (
                    <>
                      <span style={{ fontSize:32, fontWeight:400, color:plan.color, fontFamily:typography.fontBase }}>Starting from </span>
                      <span style={{ fontSize:32, fontWeight:900, color:plan.color, fontFamily:typography.fontMono }}>{formatPrice(price, plan.id)}</span>
                      <span style={{ fontSize:12, color:colors.textLow }}>/month</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize:32, fontWeight:900, color:plan.color, fontFamily:typography.fontMono }}>{formatPrice(price, plan.id)}</span>
                      <span style={{ fontSize:12, color:colors.textLow }}>/month</span>
                    </>
                  )}
                    {(plan.id === 'starter' || (billing === 'annual' && price > 0)) && (
                    <div style={{ fontSize:10, color: plan.id === 'starter' ? plan.color : colors.normal, marginTop:spacing[1] }}>
                      {plan.id === 'starter' ? 'Annual-only plan · 15% saving vs monthly' : 'Billed annually · 15% saving'}
                    </div>
                  )}
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
                    window.location.href = `/register?plan=${plan.id}&interval=${planBilling}`;
                  }
                }} style={{ marginBottom:spacing[6] }}>
                  {plan.id === 'enterprise' ? 'Contact Enterprise Team' : 'Start Free Trial'}
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

        {/* Africa / NHS callouts */}
        <div className="callout-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:spacing[5], marginBottom:spacing[20] }}>
          {[
            { flag:'🌍', label:'Africa Healthcare Programme', color:colors.normal, bg:`${colors.normal}08`, border:`${colors.normal}20`,
              desc:'SEWA XAI partners with African governments, donor-funded health programmes, and NGOs to deploy AI diagnostics at 60–80% reduced cost. Includes offline-first deployment for low-connectivity environments and local-language support.',
              badges:['Kenya','Nigeria','Ghana','Rwanda','Tanzania','South Africa'],
              cta:'Learn about Africa Pricing' },
            { flag:'🏥', label:'NHS Framework Pricing', color:colors.info, bg:`${colors.info}08`, border:`${colors.info}20`,
              desc:'Procurable through G-Cloud 14 and the NHS AI and Digital Transformation framework. Pre-configured for NHS Spine, NHS Login, DSPT compliance, and CDS Hooks. ICBs and Trusts can deploy within weeks.',
              badges:['G-Cloud 14','NHS DSPT','CQC','NHS Spine','NICE Evidence Standards'],
              cta:'NHS Procurement Info' },
          ].map(item => (
            <Card key={item.label} padding={spacing[7]} style={{ background:item.bg, border:`1px solid ${item.border}`, borderRadius:radius.lg }}>
              <div style={{ fontSize:28, marginBottom:spacing[3] }}>{item.flag}</div>
              <div style={{ fontSize:16, fontWeight:800, color:colors.textHigh, marginBottom:spacing[3], fontFamily:typography.fontBase }}>{item.label}</div>
              <p style={{ fontSize:13, color:colors.textMed, lineHeight:1.7, margin:`0 0 ${spacing[4]}` }}>{item.desc}</p>
              <div style={{ display:'flex', gap:spacing[2], flexWrap:'wrap', marginBottom:spacing[4] }}>
                {item.badges.map(b => <Badge key={b} variant="default" style={{ fontSize:10, padding:'3px 9px' }}>{b}</Badge>)}
              </div>
              <Button onClick={() => onNavigate(item.label === 'Africa Healthcare Programme' || item.label === 'Africa Healthcare Program' ? 'africa-pricing' : 'nhs-procurement')} style={{ background:item.color }}>{item.cta} →</Button>
            </Card>
          ))}
        </div>

        {/* ROI Calculator */}
        <Card padding={`clamp(${spacing[5]}, 5vw, ${spacing[10]})`} style={{ background:colors.bg2, marginBottom:spacing[20] }}>
          <h2 style={{ fontSize:26, fontWeight:800, color:colors.textHigh, margin:`0 0 ${spacing[2]}`, fontFamily:typography.fontBase, letterSpacing:'-0.5px' }}>Return on Investment Calculator</h2>
          <p style={{ fontSize:13, color:colors.textMed, margin:`0 0 ${spacing[8]}` }}>Estimate the clinical and financial impact of deploying SEWA XAI in your organisation.</p>

          <div className="roi-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:spacing[10] }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:colors.textLow, letterSpacing:'0.08em', textTransform:'uppercase', display:'block', marginBottom:spacing[3] }}>
                Monthly scan volume: <span style={{ color:colors.brand, fontFamily:typography.fontMono }}>{scanVol.toLocaleString()}</span>
              </label>
              <input type="range" min={100} max={20000} step={100} value={scanVol} onChange={e => setScanVol(+e.target.value)}
                style={{ width:'100%', accentColor:colors.brand, marginBottom:spacing[6] }}/>

              <div className="roi-metrics" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:spacing[3] }}>
                {ROI_METRICS.map(m => (
                  <Card key={m.label} padding={spacing[4]} style={{ background:colors.bg3 }}>
                    <div style={{ fontSize:22, fontWeight:900, color:colors.brand, fontFamily:typography.fontMono }}>{m.value}{m.unit}</div>
                    <div style={{ fontSize:11, color:colors.textHigh, fontWeight:600, margin:`${spacing[1]} 0` }}>{m.label}</div>
                    <div style={{ fontSize:10, color:colors.textLow, lineHeight:1.5 }}>{m.desc}</div>
                  </Card>
                ))}
              </div>

              <div style={{ marginTop:spacing[6] }}>
                <div style={{ fontSize:11, fontWeight:700, color:colors.textLow, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:spacing[2] }}>Usage Trend</div>
                <Chart data={roiChartData} type="line" height={150} />
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:spacing[4] }}>
              <Card padding={spacing[6]} style={{ background:`linear-gradient(135deg,${colors.brandMuted},${colors.bg3})`, textAlign:'center' }}>
                <div style={{ fontSize:11, fontWeight:700, color:colors.textLow, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:spacing[2] }}>Estimated Annual Saving</div>
                <div style={{ fontSize:'clamp(32px, 8vw, 48px)', fontWeight:900, color:colors.brand, fontFamily:typography.fontMono, letterSpacing:'-2px' }}>{reg.symbol}{annualSaving.toLocaleString()}</div>
                <div style={{ fontSize:12, color:colors.textMed, marginTop:spacing[2] }}>Based on {scanVol.toLocaleString()} scans/month in {reg.label}</div>
              </Card>
              <div style={{ display:'flex', flexDirection:'column', gap:spacing[3] }}>
                {[
                  { label:'AI-assisted reads/month', value:`${Math.round(scanVol*0.94).toLocaleString()}`, desc:'94% of scans pre-triaged by AI' },
                  { label:'Critical alerts prevented from delay', value:`${Math.round(scanVol*0.031).toLocaleString()}`, desc:'3.1% of scans are critical findings' },
                  { label:'Estimated ROI (Year 1)', value:`${Math.round(annualSaving / (PLANS[1].prices[region as keyof typeof PLANS[1]['prices']].annual * 12) * 100)}%`, desc:'vs Hospital plan annual cost' },
                ].map(r => (
                  <Card key={r.label} padding={spacing[4]} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:colors.textHigh }}>{r.label}</div>
                      <div style={{ fontSize:10, color:colors.textLow, marginTop:spacing[1] }}>{r.desc}</div>
                    </div>
                    <div style={{ fontSize:18, fontWeight:800, color:colors.normal, fontFamily:typography.fontMono, textAlign:'right', marginLeft:spacing[3] }}>{r.value}</div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* FAQ */}
        <div style={{ marginBottom:spacing[16] }}>
          <h2 style={{ fontSize:26, fontWeight:800, color:colors.textHigh, margin:`0 0 ${spacing[2]}`, fontFamily:typography.fontBase, letterSpacing:'-0.5px', textAlign:'center' }}>Frequently Asked Questions</h2>
          <p style={{ fontSize:13, color:colors.textMed, textAlign:'center', margin:`0 0 ${spacing[10]}` }}>Everything about pricing, compliance, and clinical deployment.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:spacing[2] }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ border:`1px solid ${openFaq===i?`${colors.brand}40`:colors.bgBorder}`, borderRadius:12, overflow:'hidden' }}>
                <button onClick={() => setOpenFaq(o=>o===i?null:i)} style={{ width:'100%', padding:`${spacing[4]} ${spacing[5]}`, background:openFaq===i?`${colors.brand}08`:colors.bg2, border:'none', cursor:'pointer', fontFamily:typography.fontBase, display:'flex', justifyContent:'space-between', alignItems:'center', gap:spacing[4] }}>
                  <span style={{ fontSize:14, fontWeight:600, color:colors.textHigh, textAlign:'left' }}>{faq.q}</span>
                  <span style={{ fontSize:16, color:colors.brand, flexShrink:0 }}>{openFaq===i?'−':'+'}</span>
                </button>
                {openFaq===i && (
                  <div style={{ padding:`0 ${spacing[5]} ${spacing[5]}`, background:colors.bg0, fontSize:13, color:colors.textMed, lineHeight:1.8 }}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Card padding={`clamp(${spacing[8]}, 8vw, ${spacing[14]})`} style={{ textAlign:'center', background:`linear-gradient(135deg,${colors.bg2},${colors.bg3})` }}>
          <h2 style={{ fontSize:'clamp(24px, 5vw, 32px)', fontWeight:800, color:colors.textHigh, margin:`0 0 ${spacing[4]}`, fontFamily:typography.fontBase, letterSpacing:'-1px' }}>Ready to transform your radiology workflow?</h2>
          <p style={{ fontSize:14, color:colors.textMed, margin:`0 0 ${spacing[8]}` }}>Join 47+ hospitals and clinics using SEWA XAI across 7 countries.</p>
          <div className="hero-btns" style={{ display:'flex', gap:spacing[3], justifyContent:'center', flexWrap:'wrap' }}>
            <Button variant="primary" onClick={() => onNavigate('contact')}>Request a Demo →</Button>
            <Button variant="secondary" onClick={() => onNavigate('clinical-validation')}>View Clinical Evidence</Button>
          </div>
        </Card>
      </div>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}

