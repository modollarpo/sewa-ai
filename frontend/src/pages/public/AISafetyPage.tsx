// SEWA XAI — AISafetyPage.tsx
import React from 'react';
import { colors, typography, spacing } from '../../design-system/tokens';
import { Card, Badge } from '../../design-system/components';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const FEATURES = [
  {
    title: 'Uncertainty Quantification',
    desc: 'Our models don\'t just provide predictions; they provide confidence intervals. By employing Monte Carlo dropout and ensemble methods, we calculate epistemic and aleatoric uncertainty for every scan, flagging low-confidence results for immediate human review.'
  },
  {
    title: 'Explainable AI (XAI)',
    desc: 'Black-box AI is unacceptable in clinical workflows. We utilize state-of-the-art pixel attribution methods (like Grad-CAM) to highlight exactly which parts of a scan influenced the AI\'s findings.'
  },
  {
    title: 'Metacognition & Hallucination Defense',
    desc: 'Our VLM reports are evaluated by an independent cross-checking mechanism before they are presented to the clinician. This multi-layer self-evaluation is designed to reduce the risk of hallucinations and improve factual accuracy.'
  }
];

export function AISafetyPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div style={{ background: colors.bg0, minHeight: '100vh', fontFamily: typography.fontBase }}>
      <style>{`
        @media (max-width: 768px) {
          .safety-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <PublicNav activePage="ai-safety" onNavigate={onNavigate} />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: `clamp(${spacing[10]}, 15vh, ${spacing[20]}) ${spacing[6]} ${spacing[12]}` }}>
        <div style={{ textAlign: 'center', marginBottom: spacing[8] }}>
          <Badge variant="brand" style={{ marginBottom: spacing[5] }}>AI Safety & Trust</Badge>
          <h1 style={{ fontSize: 'clamp(32px, 7vw, 48px)', fontWeight: 900, color: colors.brand, margin: `0 0 ${spacing[4]}`, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            AI Safety & Trust
          </h1>
          <p style={{ fontSize: 16, color: colors.textMed, maxWidth: 600, margin: '0 auto', lineHeight: 1.8 }}>
            Safety is at the core of the SEWA XAI platform. We believe AI in healthcare must be fully transparent, explainable, and capable of knowing its own limitations.
          </p>
        </div>
        
        <div className="safety-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: spacing[5]
        }}>
          {FEATURES.map(f => (
            <Card key={f.title} padding={spacing[8]}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: colors.textHigh, margin: `0 0 ${spacing[3]}` }}>{f.title}</h2>
              <p style={{ color: colors.textMed, lineHeight: 1.8, margin: 0 }}>{f.desc}</p>
            </Card>
          ))}
        </div>
      </div>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
