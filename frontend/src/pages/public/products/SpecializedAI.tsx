// SEWA XAI — SpecializedAI.tsx
// Dedicated landing page for specialized AI modules (Pathology, Mammography, Retinal)
import React from 'react';
import { colors, typography, spacing, radius } from '../../../design-system/tokens';
import { Card, Badge, Button } from '../../../design-system/components';
import { PublicNav, PublicFooter } from '../../../components/public/PublicLayout';

const SPECIALIZATIONS = [
  {
    id: 'pathology',
    title: 'Pathology AI',
    description: 'Whole slide imaging (WSI) analysis for histopathology, including cancer detection, grading, and margin assessment.',
    badges: ['WSI', 'Histopathology', 'Cancer Detection'],
    cta: 'Explore Pathology AI',
    icon: '🔬',
    pageId: 'pathology-ai',
    color: colors.normal
  },
  {
    id: 'mammography',
    title: 'Mammography AI',
    description: 'Breast cancer screening and diagnosis with high sensitivity and specificity, including micro-calcification and mass detection.',
    badges: ['Breast Cancer', 'Screening', 'BI-RADS'],
    cta: 'Explore Mammography AI',
    icon: '🩺',
    pageId: 'mammography-ai',
    color: colors.brand
  },
  {
    id: 'retinal',
    title: 'Retinal AI',
    description: 'Diabetic retinopathy, glaucoma, and macular degeneration detection from fundus photography and OCT scans.',
    badges: ['Diabetic Eye Disease', 'OCT', 'Glaucoma'],
    cta: 'Explore Retinal AI',
    icon: '👁️',
    pageId: 'retinal-ai',
    color: colors.info
  }
];

export function SpecializedAI({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div style={{ background: colors.bg0, minHeight: '100vh', fontFamily: typography.fontBase }}>
      <style>{`
        @media (max-width: 640px) {
          .spec-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .spec-hero-btns { flex-direction: column !important; }
          .spec-hero-btns > button { width: 100% !important; }
          .spec-hero-title { font-size: 28px !important; letter-spacing: -1px !important; }
          .spec-hero-sub { font-size: 14px !important; }
          .spec-section { padding: 0 16px 64px !important; }
          .spec-card { padding: 20px !important; }
          .spec-card-title { font-size: 18px !important; }
          .spec-card-desc { font-size: 13px !important; }
          .spec-section-title { font-size: 24px !important; }
        }
        @media (min-width: 641px) and (max-width: 1024px) {
          .spec-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
      <PublicNav activePage="solutions" onNavigate={onNavigate} />

      {/* Hero */}
      <section style={{ 
        padding: `clamp(${spacing[8]}, 12vh, ${spacing[20]}) ${spacing[5]} ${spacing[12]}`, 
        textAlign: 'center', 
        background: `radial-gradient(circle at top, ${colors.brand}08 0%, transparent 70%)` 
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Badge variant="brand" style={{ marginBottom: spacing[4] }}>SPECIALIZED AI</Badge>
          <h1 className="spec-hero-title" style={{ 
            fontSize: 'clamp(28px, 7vw, 56px)', 
            fontWeight: 900, 
            color: colors.textHigh, 
            margin: `0 0 ${spacing[4]}`, 
            letterSpacing: '-2px', 
            lineHeight: 1.1 
          }}>
            Specialized AI for every modality.
          </h1>
          <p className="spec-hero-sub" style={{ 
            fontSize: 'clamp(14px, 2.5vw, 18px)', 
            color: colors.textMed, 
            lineHeight: 1.7, 
            margin: `0 0 ${spacing[8]}`,
            padding: `0 ${spacing[2]}`
          }}>
            From histopathology to retinal scans, our specialized AI modules are tailored for specific clinical domains with modality-specific optimizations.
          </p>
          <div className="spec-hero-btns" style={{ display: 'flex', gap: spacing[3], justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => onNavigate('contact')}>Talk to a Specialist →</Button>
            <Button variant="secondary" onClick={() => onNavigate('clinical-validation')}>View Clinical Evidence</Button>
          </div>
        </div>
      </section>

      {/* Specializations */}
      <section className="spec-section" style={{ maxWidth: 1200, margin: '0 auto', padding: `0 ${spacing[6]} ${spacing[16]}` }}>
        <h2 className="spec-section-title" style={{ 
          fontSize: 'clamp(24px, 5vw, 32px)', 
          fontWeight: 800, 
          color: colors.textHigh, 
          marginBottom: spacing[8], 
          textAlign: 'center',
          letterSpacing: '-0.5px'
        }}>
          Our Specialized AI Modules
        </h2>
        <div className="spec-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing[5] }}>
          {SPECIALIZATIONS.map(spec => (
            <Card key={spec.id} padding={spacing[8]} hoverable className="spec-card">
              <div style={{ fontSize: 40, marginBottom: spacing[4] }}>{spec.icon}</div>
              <h3 className="spec-card-title" style={{ fontSize: 'clamp(18px, 3vw, 20px)', fontWeight: 800, color: colors.textHigh, marginBottom: spacing[3] }}>{spec.title}</h3>
              <p className="spec-card-desc" style={{ fontSize: 'clamp(13px, 2vw, 14px)', color: colors.textMed, marginBottom: spacing[5], lineHeight: 1.7 }}>{spec.description}</p>
              <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap', marginBottom: spacing[6] }}>
                {spec.badges.map(badge => <Badge key={badge} variant="default">{badge}</Badge>)}
              </div>
              <Button variant="secondary" fullWidth style={{ background: `${spec.color}14`, border: `1px solid ${spec.color}30`, color: spec.color }} onClick={() => onNavigate(spec.pageId)}>{spec.cta} →</Button>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
