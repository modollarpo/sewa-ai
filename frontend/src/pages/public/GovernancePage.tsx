// SEWA XAI — GovernancePage.tsx
import React from 'react';
import { colors, typography } from '../../design-system/tokens';
import { Card, Badge } from '../../design-system/components';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const SECTIONS = [
  {
    title: 'Clinical Safety Standards (DCB0129)',
    desc: 'We are actively implementing the DCB0129 standard (Clinical Risk Management: its Application in the Manufacture of Health IT Systems). This ensures that hazard logs, clinical safety cases, and rigorous risk assessments are maintained throughout the product lifecycle.'
  },
  {
    title: 'Quality Management System (QMS)',
    desc: 'Our QMS is designed around ISO 13485 requirements, laying the groundwork for future UKCA and CE marking as a Class IIb Medical Device under the UK MDR 2002 and EU MDR 2017/745.'
  },
  {
    title: 'Data Security & Privacy',
    desc: 'SEWA XAI supports end‑to‑end encryption, Zero‑Knowledge proofs for consent, and federated learning architectures to maintain strict compliance with GDPR, HIPAA, and NHS DSPT standards.'
  }
];

export function GovernancePage({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div style={{ background: colors.bg0, minHeight: '100vh', fontFamily: typography.fontBase }}>
      <PublicNav activePage="governance" onNavigate={onNavigate} />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(80px, 15vh, 110px) 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Badge variant="brand" style={{ marginBottom: 20 }}>Governance & Oversight</Badge>
          <h1 style={{ fontSize: 'clamp(32px, 7vw, 48px)', fontWeight: 900, color: colors.brand, margin: '0 0 16px', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            Clinical Governance & Oversight
          </h1>
          <p style={{ fontSize: 16, color: colors.textMd, maxWidth: 600, margin: '0 auto', lineHeight: 1.8 }}>
            At SEWA XAI, clinical governance is not an afterthought; it is embedded in the platform's architecture. Our clinical safety and governance procedures align with the highest international standards.
          </p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {SECTIONS.map(s => (
            <Card key={s.title} padding="32">
              <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.textHi, margin: '0 0 12px' }}>{s.title}</h2>
              <p style={{ color: colors.textMd, lineHeight: 1.8, margin: 0 }}>{s.desc}</p>
            </Card>
          ))}
        </div>
      </div>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
