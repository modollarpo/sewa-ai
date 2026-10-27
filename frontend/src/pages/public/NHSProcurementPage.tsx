// SEWA XAI — NHS Procurement Page
import React from 'react';
import { colors, typography, radius, spacing } from '../../design-system/tokens';
import { Badge, Card, Button } from '../../design-system/components';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const FRAMEWORKS = [
  {
    name: 'G-Cloud 14',
    status: 'Active',
    description: 'Cloud hosting, software, and support services',
    reference: 'RM3829',
    lot: 'Lot 3: Cloud Software',
    url: 'https://www.digitalmarketplace.service.gov.uk/g-cloud',
  },
  {
    name: 'NHS AI and Digital Transformation Framework',
    status: 'Active',
    description: 'Digital health technologies for NHS ICBs and Trusts',
    reference: 'RM6250',
    lot: 'Lot 2: AI and Digital Transformation',
    url: 'https://www.supplychain.nhs.uk/our-services/digital-health/ai-digital-transformation-framework',
  },
];

const COMPLIANCE = [
  'NHS DSPT (Data Security and Protection Toolkit) ready',
  'NHS Spine integration (NHS Login, PDS, FHIR R4)',
  'DCB0129 clinical risk management',
  'CQC-aligned clinical governance',
  'NHS 111/CQS integration',
  'NICE Evidence Standards Framework compliance',
  'GDPR Art. 28-aligned data processing (in preparation)',
];

const BENEFITS = [
  {
    icon: '🚀',
    title: 'Rapid Deployment',
    desc: 'Pre-configured NHS integrations with your existing NHS systems (NHS Spine, PACS, EHR), deploy in weeks instead of months',
  },
  {
    icon: '🔐',
    title: 'Security First',
    desc: 'Built-in NHS DSPT compliance, NHS Login, CQC-aligned audit logs, and data residency in UK Azure regions',
  },
  {
    icon: '👥',
    title: 'NHS-Focused Support',
    desc: 'Dedicated NHS account manager, UK-based clinical engineering and support team, and onboarding for your Trust/ICB',
  },
  {
    icon: '💰',
    title: 'Framework Pricing',
    desc: 'Transparent, pre-agreed framework rates with no hidden fees, per-scan and unlimited options',
  },
];

export function NHSProcurementPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div style={{ background: colors.bg0, minHeight: '100vh', fontFamily: typography.fontBase }}>
      <style>{`
        @media (max-width: 1024px) {
          .benefits-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .benefits-grid { grid-template-columns: 1fr !important; }
          .hero-h1 { font-size: 32px !important; }
        }
      `}</style>
      <PublicNav activePage="pricing" onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: `clamp(${spacing[10]}, 10vh, ${spacing[20]}) ${spacing[6]} ${spacing[12]}`, background: `linear-gradient(180deg,${colors.bg1},${colors.bg0})` }}>
        <Badge variant="brand" style={{ marginBottom: spacing[5] }}>NHS Framework Procurement</Badge>
        <h1 className="hero-h1" style={{ fontSize: 'clamp(32px, 7vw, 48px)', fontWeight: 900, color: colors.textHigh, margin: `0 0 ${spacing[4]}`, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
          Procurement for NHS Trusts and ICBs
        </h1>
        <p style={{ fontSize: 15, color: colors.textMed, maxWidth: 640, margin: `0 auto ${spacing[10]}`, lineHeight: 1.8 }}>
          SEWA XAI is available on G-Cloud 14 and the NHS AI and Digital Transformation Framework. Pre-configured for NHS Spine, DSPT-ready, with NHS Login, and CDS Hooks integration.
        </p>
      </div>

      {/* Frameworks */}
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: `0 ${spacing[6]} ${spacing[12]}` }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: colors.textHigh, margin: `0 0 ${spacing[2]}`, fontFamily: typography.fontBase, letterSpacing: '-0.5px', textAlign: 'center' }}>Available Frameworks</h2>
        <p style={{ fontSize: 13, color: colors.textMed, textAlign: 'center', margin: `0 0 ${spacing[10]}` }}>SEWA XAI is listed on the following frameworks to support procurement planning (certifications in preparation)</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing[5], marginBottom: spacing[16] }}>
          {FRAMEWORKS.map((fw, i) => (
            <Card key={i} padding={spacing[7]} style={{ background: colors.bg2, borderRadius: radius.lg }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: colors.textHigh }}>{fw.name}</div>
                <Badge variant="default" style={{ background: `${colors.normal}14`, border: `${colors.normal}30`, color: colors.normal, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{fw.status}</Badge>
              </div>
              <p style={{ fontSize: 13, color: colors.textMed, marginBottom: spacing[4], lineHeight: 1.7 }}>{fw.description}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2], marginBottom: spacing[4] }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textLow, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Reference
                </div>
                <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
                  <Badge style={{ fontSize: 10, padding: '3px 9px' }}>Ref: {fw.reference}</Badge>
                  <Badge variant="default" style={{ fontSize: 10, padding: '3px 9px' }}>{fw.lot}</Badge>
                </div>
              </div>
              <Button variant="secondary" onClick={() => window.open(fw.url, '_blank')}>View on Digital Marketplace →</Button>
            </Card>
          ))}
        </div>

        {/* Benefits */}
        <h2 style={{ fontSize: 26, fontWeight: 800, color: colors.textHigh, margin: `0 0 ${spacing[2]}`, fontFamily: typography.fontBase, letterSpacing: '-0.5px', textAlign: 'center' }}>NHS Procurement Benefits</h2>
        <p style={{ fontSize: 13, color: colors.textMed, textAlign: 'center', margin: `0 0 ${spacing[10]}` }}>Everything you need for procurement planning and deployment preparation</p>
        <div className="benefits-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing[5], marginBottom: spacing[16] }}>
          {BENEFITS.map((b, i) => (
            <Card key={i} padding={spacing[6]} style={{ background: colors.bg2, borderRadius: radius.md }}>
              <div style={{ fontSize: 28, marginBottom: spacing[3] }}>{b.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.textHigh, margin: `0 0 ${spacing[2]}`, fontFamily: typography.fontBase }}>{b.title}</h3>
              <p style={{ fontSize: 12, color: colors.textLow, lineHeight: 1.6, margin: 0 }}>{b.desc}</p>
            </Card>
          ))}
        </div>

        {/* Compliance */}
        <Card padding={spacing[7]} style={{ background: `linear-gradient(135deg,${colors.bg2},${colors.bg3})`, marginBottom: spacing[16] }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.textHigh, margin: `0 0 ${spacing[4]}`, fontFamily: typography.fontBase }}>Compliance & Integration</h2>
          <p style={{ fontSize: 13, color: colors.textMed, marginBottom: spacing[6], lineHeight: 1.7 }}>SEWA XAI is pre-configured to meet NHS requirements:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2] }}>
            {COMPLIANCE.map((c, i) => (
            <Badge key={i} style={{ fontSize: 11, padding: '4px 10px' }}>{c}</Badge>
          ))}
        </div>
        </Card>

        {/* CTA */}
        <Card padding={`clamp(${spacing[8]}, 8vw, ${spacing[14]})`} style={{ textAlign: 'center', background: `linear-gradient(135deg,${colors.brandMuted},${colors.bg3})`, borderRadius: radius.lg }}>
          <h2 style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 800, color: colors.textHigh, margin: `0 0 ${spacing[4]}`, fontFamily: typography.fontBase, letterSpacing: '-1px' }}>Ready to start your NHS procurement?</h2>
          <p style={{ fontSize: 14, color: colors.textMed, margin: `0 0 ${spacing[8]}` }}>Contact our NHS team for a tailored demo and framework pricing.</p>
          <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => onNavigate('contact')}>Contact NHS Team →</Button>
            <Button variant="secondary" onClick={() => onNavigate('contact')}>Request NHS Trust Pack</Button>
            <Button variant="secondary" onClick={() => onNavigate('nhs-dspt-compliance')}>NHS DSPT Compliance</Button>
            <Button variant="secondary" onClick={() => onNavigate('clinical-validation')}>View Clinical Evidence</Button>
          </div>
        </Card>
      </div>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
