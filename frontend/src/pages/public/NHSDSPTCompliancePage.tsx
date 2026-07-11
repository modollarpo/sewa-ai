// SEWA XAI — NHS DSPT Compliance Page
import React from 'react';
import { colors, typography, radius, spacing } from '../../design-system/tokens';
import { Card, Badge } from '../../design-system/components';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const CATEGORIES = [
  {
    id: 'governance',
    title: 'Governance',
    icon: '⚖️',
    items: [
      { label: 'Data Protection Officer appointed', status: 'done' },
      { label: 'Privacy Impact Assessment (PIA) completed', status: 'done' },
      { label: 'IRAS form submitted', status: 'in progress' },
    ],
  },
  {
    id: 'security',
    title: 'Data Security',
    icon: '🔒',
    items: [
      { label: 'Encryption at rest (Azure Storage, Azure PostgreSQL)', status: 'done' },
      { label: 'Encryption in transit (TLS 1.3)', status: 'done' },
      { label: 'Azure Key Vault for secret management', status: 'done' },
      { label: 'Role-Based Access Control (RBAC)', status: 'done' },
      { label: 'Network segmentation (Kubernetes NetworkPolicies)', status: 'done' },
    ],
  },
  {
    id: 'monitoring',
    title: 'Monitoring & Auditing',
    icon: '📊',
    items: [
      { label: 'Azure Monitor logs', status: 'done' },
      { label: 'Prometheus metrics', status: 'done' },
      { label: 'Audit logging enabled for all services', status: 'done' },
      { label: 'Alerting for suspicious activity', status: 'done' },
    ],
  },
  {
    id: 'incident',
    title: 'Incident Management',
    icon: '🚨',
    items: [
      { label: 'Incident response plan', status: 'done' },
      { label: '24/7 on-call rota', status: 'done' },
      { label: 'NHS trust incident reporting process', status: 'done' },
    ],
  },
  {
    id: 'continuity',
    title: 'Business Continuity',
    icon: '🔄',
    items: [
      { label: 'Disaster recovery plan', status: 'done' },
      { label: 'RTO < 4 hours', status: 'done' },
      { label: 'RPO < 15 minutes', status: 'done' },
    ],
  },
];

export function NHSDSPTCompliancePage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const totalItems = CATEGORIES.reduce((sum, cat) => sum + cat.items.length, 0);
  const completedItems = CATEGORIES.reduce((sum, cat) => sum + cat.items.filter(i => i.status === 'done').length, 0);
  const progressPercentage = Math.round((completedItems / totalItems) * 100);

  return (
    <div style={{ background: colors.bg0, minHeight: '100vh', fontFamily: typography.fontBase }}>
      <style>{`
        @media (max-width: 1024px) {
          .categories-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .categories-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <PublicNav activePage="about" onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ padding: `clamp(${spacing[10]}, 12vh, ${spacing[20]}) ${spacing[6]} ${spacing[12]}`, textAlign: 'center', background: `linear-gradient(180deg, ${colors.bg3}, ${colors.bg0})` }}>
        <Badge variant="info" style={{ marginBottom: spacing[5] }}>NHS DSPT Compliance</Badge>
        <h1 style={{ fontSize: 'clamp(32px, 7vw, 48px)', fontWeight: 900, color: colors.textHigh, margin: `0 0 ${spacing[4]}`, letterSpacing: '-0.04em' }}>
          Complete NHS Data Security Protection Toolkit Compliance
        </h1>
        <p style={{ fontSize: 15, color: colors.textMed, maxWidth: 600, margin: `0 auto ${spacing[8]}`, lineHeight: 1.8 }}>
          Designed for NHS clinical study pilots and full production deployments. Meeting all DSPT requirements for data security and governance.
        </p>

        {/* Progress card */}
        <Card padding={spacing[7]} style={{ maxWidth: 800, margin: '0 auto', background: colors.bg2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing[4], flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: colors.info, fontFamily: typography.fontMono }}>{progressPercentage}%</div>
              <div style={{ fontSize: 12, color: colors.textLow, marginTop: spacing[1] }}>Compliance Progress</div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ height: 16, background: colors.bg4, borderRadius: 999, overflow: 'hidden', border: `1px solid ${colors.bgBorder}` }}>
                <div style={{ width: `${progressPercentage}%`, height: '100%', background: `linear-gradient(90deg, ${colors.info}, ${colors.brand})`, borderRadius: 999 }}></div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: colors.textHigh, fontFamily: typography.fontMono }}>{completedItems}/{totalItems}</div>
              <div style={{ fontSize: 12, color: colors.textLow, marginTop: spacing[1] }}>Checklist Items Complete</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Categories */}
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: `0 ${spacing[6]} ${spacing[20]}` }}>
        <div className="categories-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing[5] }}>
          {CATEGORIES.map(cat => (
            <Card key={cat.id} padding={spacing[6]} hoverable>
              <div style={{ fontSize: 28, marginBottom: spacing[3] }}>{cat.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: colors.textHigh, marginBottom: spacing[4], fontFamily: typography.fontBase }}>{cat.title}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                {cat.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                    <span style={{ fontSize: 14, color: colors.normal, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 12, color: colors.textMed, flex: 1 }}>{item.label}</span>
                    {(item as any).link && (
                      <a href={(item as any).link} style={{ fontSize: 10, color: colors.brand, textDecoration: 'none', fontWeight: 600 }}>{(item as any).linkText}</a>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
