// SEWA XAI — PublicationsPage.tsx
import React from 'react';
import { colors, typography, spacing } from '../../design-system/tokens';
import { Card, Badge } from '../../design-system/components';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const FORTHCOMING_PUBS = [
  {
    title: 'Uncertainty Quantification in Triage AI',
    desc: 'A comprehensive evaluation of Monte Carlo dropout applied to emergency radiology triage algorithms across diverse, multi-ethnic datasets.'
  },
  {
    title: 'Federated Learning for Cross‑Border Diagnostic AI',
    desc: 'Engineering architecture and privacy-preserving methodologies for continuous model improvement without data centralization.'
  },
  {
    title: 'Metacognitive Defenses in Vision-Language Models',
    desc: 'Addressing hallucination rates in automated radiology report generation using multi-agent self-reflection pipelines.'
  }
];

export function PublicationsPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div style={{ background: colors.bg0, minHeight: '100vh', fontFamily: typography.fontBase }}>
      <PublicNav activePage="publications" onNavigate={onNavigate} />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: `clamp(${spacing[10]}, 15vh, ${spacing[20]}) ${spacing[6]} ${spacing[12]}` }}>
        <div style={{ textAlign: 'center', marginBottom: spacing[8] }}>
          <Badge variant="brand" style={{ marginBottom: spacing[5] }}>Research & Publications</Badge>
          <h1 style={{ fontSize: 'clamp(32px, 7vw, 48px)', fontWeight: 900, color: colors.brand, margin: `0 0 ${spacing[4]}`, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            Research & Publications
          </h1>
          <p style={{ fontSize: 16, color: colors.textMed, maxWidth: 600, margin: '0 auto', lineHeight: 1.8 }}>
            SEWA XAI's core algorithms are rooted in academic research and transparent engineering practices.
            While our clinical trials are currently in the planning phase, our technical methodologies are actively being prepared for peer-review.
          </p>
        </div>
        
        <Card padding={spacing[8]}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.textHigh, margin: `0 0 ${spacing[6]}` }}>Forthcoming Publications</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
            {FORTHCOMING_PUBS.map((pub, i) => (
              <div key={i} style={{ paddingLeft: spacing[3], borderLeft: `3px solid ${colors.brand}` }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: colors.textHigh, margin: `0 0 ${spacing[2]}` }}>{pub.title}</div>
                <p style={{ color: colors.textMed, lineHeight: 1.7, margin: 0 }}>{pub.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
