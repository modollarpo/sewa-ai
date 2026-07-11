// SEWA XAI — ClinicalEvidencePage.tsx
import React from 'react';
import { colors, typography, spacing } from '../../design-system/tokens';
import { Card, Badge } from '../../design-system/components';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

export function ClinicalEvidencePage({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div style={{ background: colors.bg0, minHeight: '100vh', fontFamily: typography.fontBase }}>
      <PublicNav activePage="clinical-evidence" onNavigate={onNavigate} />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: `clamp(${spacing[10]}, 15vh, ${spacing[20]}) ${spacing[6]} ${spacing[12]}` }}>
        <div style={{ textAlign: 'center', marginBottom: spacing[8] }}>
          <Badge variant="brand" style={{ marginBottom: spacing[5] }}>Clinical Evidence</Badge>
          <h1 style={{ fontSize: 'clamp(32px, 7vw, 48px)', fontWeight: 900, color: colors.brand, margin: `0 0 ${spacing[4]}`, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            Clinical Evidence
          </h1>
          <p style={{ fontSize: 16, color: colors.textMed, maxWidth: 600, margin: '0 auto', lineHeight: 1.8 }}>
            SEWA XAI is built on robust, peer-reviewed engineering. Our models undergo extensive retrospective testing and we are actively engaging in clinical safety reviews under the DCB0129 standard.
          </p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[5] }}>
          <Card padding={spacing[8]}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.textHigh, margin: `0 0 ${spacing[3]}` }}>Engineering Validation (TRL 5)</h2>
            <p style={{ color: colors.textMed, lineHeight: 1.8, margin: 0 }}>
              Our AI models (Triage, Uncertainty, and Metacognition) have been validated in simulated clinical environments using diverse datasets. We achieve an AUC &gt; 0.95 in detecting critical findings in engineering benchmarks.
            </p>
          </Card>
          
          <Card padding={spacing[8]}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.textHigh, margin: `0 0 ${spacing[3]}` }}>NHS Innovation Service</h2>
            <p style={{ color: colors.textMed, lineHeight: 1.8, margin: 0 }}>
              SEWA XAI is actively supported by the NHS Innovation Service (INN‑2604‑0064‑2) and we are progressing through the required regulatory pathways to ensure safety, efficacy, and trust before full commercial deployment.
            </p>
          </Card>
        </div>
      </div>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
