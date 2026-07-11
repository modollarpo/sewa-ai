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
        @media (max-width: 600px) {
          .specialization-grid { grid-template-columns: 1fr !important; }
          .hero-btns { flex-direction: column !important; }
          .hero-btns > button { width: 100% !important; }
        }
        @media (max-width: 1024px) {
          .specialization-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
      <PublicNav activePage="solutions" onNavigate={onNavigate} />

      {/* Hero */}
      <section style={{ 
        padding: `clamp(${spacing[10]}, 15vh, ${spacing[20]}) ${spacing[6]} ${spacing[16]}`, 
        textAlign: 'center', 
        background: `radial-gradient(circle at top, ${colors.brand}08 0%, transparent 70%)` 
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Badge variant="brand" style={{ marginBottom: spacing[5] }}>ENGINE 05-07: SPECIALIZED AI</Badge>
          <h1 style={{ 
            fontSize: 'clamp(32px, 8vw, 56px)', 
            fontWeight: 900, 
            color: colors.textHigh, 
            margin: `0 0 ${spacing[4]}`, 
            letterSpacing: '-2px', 
            lineHeight: 1.1 
          }}>
            Specialized AI for every modality.
          </h1>
          <p style={{ 
            fontSize: 'clamp(15px, 2.5vw, 18px)', 
            color: colors.textMed, 
            lineHeight: 1.7, 
            margin: `0 0 ${spacing[8]}` 
          }}>
            From histopathology to retinal scans, our specialized AI modules are tailored for specific clinical domains with modality-specific optimizations.
          </p>
          <div className="hero-btns" style={{ display: 'flex', gap: spacing[3], justifyContent: 'center' }}>
            <Button variant="primary" onClick={() => onNavigate('contact')}>Talk to a Specialist →</Button>
            <Button variant="secondary" onClick={() => onNavigate('clinical-validation')}>View Clinical Evidence</Button>
          </div>
        </div>
      </section>

      {/* Specializations */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: `0 ${spacing[6]} ${spacing[16]}` }}>
        <h2 style={{ 
          fontSize: 32, 
          fontWeight: 800, 
          color: colors.textHigh, 
          marginBottom: spacing[10], 
          textAlign: 'center' 
        }}>
          Our Specialized AI Modules
        </h2>
        <div className="specialization-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing[5] }}>
          {SPECIALIZATIONS.map(spec => (
            <Card key={spec.id} padding={spacing[8]} hoverable>
              <div style={{ fontSize: 40, marginBottom: spacing[4] }}>{spec.icon}</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: colors.textHigh, marginBottom: spacing[3] }}>{spec.title}</h3>
              <p style={{ fontSize: 14, color: colors.textMed, marginBottom: spacing[5], lineHeight: 1.7 }}>{spec.description}</p>
              <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap', marginBottom: spacing[6] }}>
                {spec.badges.map(badge => <Badge key={badge} variant="default">{badge}</Badge>)}
              </div>
              <Button variant="secondary" style={{ background: `${spec.color}14`, border: `1px solid ${spec.color}30`, color: spec.color }} onClick={() => onNavigate(spec.pageId)}>{spec.cta} →</Button>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
