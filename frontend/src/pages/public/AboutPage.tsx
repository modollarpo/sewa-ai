// SEWA XAI — AboutPage.tsx
import React from 'react';
import { colors, typography, spacing } from '../../design-system/tokens';
import { Card, Badge, Button } from '../../design-system/components';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const METRICS = [
  { value: '1.2M', label: 'Scans in R&D dataset', icon: '🩻' },
  { value: '14', label: 'Pathologies modelled', icon: '🔬' },
  { value: 'TRL 5', label: 'Development Stage', icon: '🏥' },
  { value: '8', label: 'Clinical partners (R&D)', icon: '🤝' },
];

const TEAM = [
  { name: 'Dr. Adesewa Dairo', role: 'CEO & Co-founder', bg: 'Trained radiologist (Oxford). Former NHS consultant. 15 years in clinical AI.', region: '🇬🇧 London' },
  { name: 'Dolapo Ariyo', role: 'CTO & Co-founder', bg: 'Sole inventor of the 4-Engine Safety Architecture. ML Research Lead at UCL & DeepMind. PhD Computer Vision.', region: '🇬🇧 London' },
  { name: 'Dr. Chioma Nwosu', role: 'Chief Medical Officer', bg: 'Consultant radiologist, LUTH Nigeria. Led national teleradiology programme. WHO AI Advisory Panel.', region: '🇳🇬 Lagos' },
  { name: 'Fatima Al-Hassan', role: 'Chief Compliance Officer', bg: 'Former Head of Digital Regulation, MHRA. GDPR / MDR expert. Built compliance frameworks for 3 MedTech unicorns.', region: '🇬🇧 London' },
  { name: 'Lars Eriksson', role: 'VP Engineering', bg: 'Previously Staff Engineer at Philips HealthSuite. Built FHIR R4 infrastructure processing 40M records/day.', region: '🇳🇱 Amsterdam' },
  { name: 'Dr. Priya Sharma', role: 'Head of Clinical Validation', bg: 'Clinical research lead with 200+ peer-reviewed publications. Ran RCTs at Kings College Hospital and AIIMS Delhi.', region: '🇮🇳 / 🇬🇧' },
];

const VALUES = [
  { icon: '❤️', title: 'Patient first', desc: 'Every engineering decision starts with one question: does this improve patient outcomes? Not revenue, not features — patients.' },
  { icon: '🔬', title: 'Evidence-based', desc: 'No marketing claims without peer-reviewed evidence. All clinical metrics are externally validated and published.' },
  { icon: '🌍', title: 'Global equity', desc: 'World-class diagnostic AI should not be a privilege of wealthy health systems. We price for Africa, build for Africa.' },
  { icon: '🔒', title: 'Privacy by design', desc: 'Patient data is never an asset. We built federated learning specifically so patient data never needs to leave your hospital.' },
  { icon: '🤝', title: 'Clinician partnership', desc: 'We do not replace radiologists. We give them superpowers. Every feature is co-designed with active clinicians.' },
  { icon: '📖', title: 'Open science', desc: 'We publish our validation datasets, model cards, and clinical evidence openly. Our science is our competitive advantage.' },
];

export function AboutPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  return (
    <div style={{ background: colors.bg0, minHeight: '100vh', fontFamily: typography.fontBase }}>
      <style>{`
        @media (max-width: 1024px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .team-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .values-grid { grid-template-columns: 1fr !important; }
          .team-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .hero-h1 { font-size: 36px !important; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr !important; }
          .mission-block { padding: 32px 20px !important; }
        }
      `}</style>
      <PublicNav activePage="about" onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ padding: `clamp(${spacing[10]}, 15vh, ${spacing[20]}) ${spacing[6]} ${spacing[12]}`, background: `linear-gradient(180deg,${colors.bg1},${colors.bg0})` }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <Badge variant="brand" style={{ marginBottom: spacing[5] }}>Our Story</Badge>
          <h1 className="hero-h1" style={{ fontSize: 'clamp(32px, 8vw, 52px)', fontWeight: 900, color: colors.textHigh, margin: `0 0 ${spacing[6]}`, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            We started in an<br/>NHS emergency room
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2.5vw, 17px)', color: colors.textMed, lineHeight: 1.8, margin: `0 0 ${spacing[8]}` }}>
            SEWA XAI was born from a problem Dr. Adesewa Dairo saw every day as an NHS radiologist: critical conditions were being delayed by overloaded worklists and radiologist shortages.
          </p>
          <div className="hero-btns" style={{ display: 'flex', gap: spacing[3], justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => onNavigate('contact')}>Join the Mission →</Button>
            <Button variant="secondary" onClick={() => onNavigate('solutions')}>Explore Solutions</Button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: `0 ${spacing[6]} ${spacing[12]}` }}>

        {/* Stats */}
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: spacing[3], marginBottom: spacing[12] }}>
          {METRICS.map(s => (
            <Card key={s.label} padding={spacing[5]} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: spacing[1] }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: colors.brand, fontFamily: typography.fontMono }}>{s.value}</div>
              <div style={{ fontSize: 10, color: colors.textLow, marginTop: spacing[1], lineHeight: 1.4 }}>{s.label}</div>
            </Card>
          ))}
        </div>

        {/* Mission */}
        <Card className="mission-block" padding={spacing[10]} style={{ 
          background: `linear-gradient(135deg,${colors.bg2},${colors.bg3})`, 
          marginBottom: spacing[12], 
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.brand, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: spacing[4] }}>Our Mission</div>
          <blockquote style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800, color: colors.textHigh, lineHeight: 1.4, margin: `0 0 ${spacing[5]}`, letterSpacing: '-0.5px', fontFamily: typography.fontBase }}>
            "From Hours to Seconds: Autonomous Diagnostic Intelligence for Global Healthcare."
          </blockquote>
        </Card>

        {/* Values */}
        <div style={{ marginBottom: spacing[12] }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: colors.textHigh, margin: `0 0 ${spacing[8]}`, letterSpacing: '-0.02em', fontFamily: typography.fontBase, textAlign: 'center' }}>What we stand for</h2>
          <div className="values-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: spacing[5] }}>
            {VALUES.map(v => (
              <Card key={v.title} padding={spacing[6]}>
                <div style={{ fontSize: 28, marginBottom: spacing[3] }}>{v.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.textHigh, margin: `0 0 ${spacing[2]}`, fontFamily: typography.fontBase }}>{v.title}</h3>
                <p style={{ fontSize: 13, color: colors.textLow, margin: 0, lineHeight: 1.7 }}>{v.desc}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Team */}
        <div style={{ marginBottom: spacing[12] }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: colors.textHigh, margin: `0 0 ${spacing[8]}`, letterSpacing: '-0.02em', textAlign: 'center', fontFamily: typography.fontBase }}>Leadership team</h2>
          <div className="team-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: spacing[5] }}>
            {TEAM.map(t => (
              <Card key={t.name} padding={spacing[6]}>
                <div style={{ width: 52, height: 52, background: `linear-gradient(135deg,${colors.brand},${colors.brandDark})`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'white', marginBottom: spacing[3] }}>
                  {t.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: colors.textHigh, marginBottom: spacing[0] }}>{t.name}</div>
                <div style={{ fontSize: 11, color: colors.brand, fontWeight: 600, marginBottom: spacing[2] }}>{t.role}</div>
                <p style={{ fontSize: 12, color: colors.textLow, margin: `0 0 ${spacing[2]}`, lineHeight: 1.6 }}>{t.bg}</p>
                <div style={{ fontSize: 11, color: colors.textMed }}>{t.region}</div>
              </Card>
            ))}
          </div>
        </div>

        <Card padding={`clamp(${spacing[5]}, 5vw, ${spacing[10]}`} style={{ 
          background: `${colors.brand}08`, 
          border: `1px solid ${colors.brand}30`,
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: colors.brand, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: spacing[4] }}>Intellectual Property</div>
          <p style={{ fontSize: 'clamp(13px, 2.5vw, 15px)', color: colors.textHigh, fontWeight: 600, lineHeight: 1.8, margin: '0 auto', maxWidth: 700 }}>
            The SEWA XAI 4-Engine Safety Architecture, metacognition layer, and sovereign deployment models are protected by <strong style={{ color: colors.brand }}>UK Patent Pending: GB2609706.3</strong> — Storegrill Inc Ltd (Company No. 14581073).
          </p>
        </Card>

      </div>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
