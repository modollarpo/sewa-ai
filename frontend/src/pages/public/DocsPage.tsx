import React from 'react';
import { colors, typography, radius, spacing } from '../../design-system/tokens';
import { Button, Card } from '../../design-system/components';
import { PublicLayout } from '../../components/public/PublicLayout';

const DOCS_DATA = [
  {
    title: 'NHS Trust Pack v2.0',
    content: 'Confidential dossier for NHS R&D committees and Medical Directors. PDF under revision — clinical evidence and regulatory status are available now.',
    action: { label: 'View Clinical Evidence', onClick: (onNavigate: (p: string) => void) => onNavigate('clinical-validation') },
  },
  {
    title: 'Master Dossier v2.0',
    content: 'Complete clinical, regulatory, and technical documentation for SEWA XAI platform. PDF under revision — clinical evidence and regulatory status are available now.',
    action: { label: 'View Clinical Evidence', onClick: (onNavigate: (p: string) => void) => onNavigate('clinical-validation') },
  },
  {
    title: 'Enterprise v2.0 Vision',
    content: 'Strategic vision and roadmap for SEWA XAI platform development.',
    action: { label: 'Download', href: '/docs/SEWA_AI_Enterprise_v2.0_Vision.pdf', download: true },
  },
  {
    title: 'NHS DSPT Compliance',
    content: 'Data Security and Protection Toolkit documentation.',
    action: { label: 'Download', href: '/docs/nhs-dspt-compliance.pdf', download: true },
  },
  {
    title: 'API Integration',
    content: 'Our REST API allows for seamless integration with existing Hospital Information Systems (HIS) and PACS.',
    action: { label: 'View API Docs', onClick: (onNavigate: (p: string) => void) => onNavigate('api-docs') },
  },
  {
    title: 'Security & Compliance',
    content: 'SEWA XAI is built with a security-first mindset, adhering to HIPAA, GDPR, NHS DSPT, and ISO 27001 standards.',
    action: { label: 'View Compliance', onClick: (onNavigate: (p: string) => void) => onNavigate('nhs-dspt-compliance') },
  },
];

export const DocsPage: React.FC<{ onNavigate: (p: string) => void }> = ({ onNavigate }) => {
  return (
    <PublicLayout activePage="docs" onNavigate={onNavigate}>
      <div style={{ 
        padding: `${spacing[20]} clamp(24px, 5vw, ${spacing[16]})`, 
        maxWidth: '900px', 
        margin: '0 auto',
        minHeight: '80vh',
        fontFamily: typography.fontBase 
      }}>
        <h1 style={{ 
          fontSize: 'clamp(2.5rem, 6vw, 4rem)', 
          fontWeight: 900,
          marginBottom: spacing[10], 
          color: colors.textHigh,
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #fff 0%, #408D7B 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Documentation
        </h1>
        
        <div style={{ display: 'grid', gap: spacing[5] }}>
          {DOCS_DATA.map((doc, i) => (
            <Card key={i} padding={spacing[8]} hoverable style={{ 
              background: colors.bg1, 
              borderRadius: radius['2xl'],
            }}>
              <h2 style={{ 
                color: colors.brandLight, 
                fontSize: typography.size.xl,
                fontWeight: 700,
                marginBottom: spacing[3],
                fontFamily: typography.fontBase,
              }}>
                {doc.title}
              </h2>
              <p style={{ 
                color: colors.textMed, 
                lineHeight: typography.lineHeight.relaxed,
                fontSize: typography.size.base,
                marginBottom: spacing[5],
                fontFamily: typography.fontBase,
              }}>
                {doc.content}
              </p>
              {doc.action.download ? (
                <a href={doc.action.href} download style={{ textDecoration: 'none' }}>
                  <Button variant="secondary">{doc.action.label} →</Button>
                </a>
              ) : (
                <Button variant="secondary" onClick={() => doc.action.onClick?.(onNavigate)}>
                  {doc.action.label} →
                </Button>
              )}
            </Card>
          ))}
        </div>

        <div style={{ 
          marginTop: spacing[16], 
          padding: spacing[10],
          background: `${colors.brand}05`,
          borderRadius: radius['2xl'],
          border: `1px solid ${colors.bgBorder}`,
          textAlign: 'center'
        }}>
          <h3 style={{ color: colors.textHigh, marginBottom: spacing[4], fontFamily: typography.fontBase, fontSize: typography.size.lg, fontWeight: 700 }}>
            Need more?
          </h3>
          <p style={{ color: colors.textMed, marginBottom: spacing[6], fontFamily: typography.fontBase, fontSize: typography.size.base }}>
            Download additional docs and guides from our downloads page.
          </p>
          <Button variant="primary" onClick={() => onNavigate('downloads')}>
            Visit Downloads Page →
          </Button>
        </div>
      </div>
    </PublicLayout>
  );
};

export default DocsPage;
