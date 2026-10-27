// SEWA XAI — Trust Center Page
import React from 'react';
import { colors, typography, spacing } from '../../design-system/tokens';
import { Button, Badge, Card } from '../../design-system/components';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const COMPLIANCE_BADGES = [
  { icon:'🏥', label:'NHS Innovation Service', desc:'INN-2604-0064-2', status:'Active', color:colors.brand },
  { icon:'🛡️', label:'DCB0129', desc:'Clinical Risk Management', status:'In Preparation', color:colors.warning },
  { icon:'📋', label:'IEC 62304', desc:'Medical Device Software Lifecycle', status:'In Progress', color:colors.warning },
  { icon:'🔒', label:'ISO 14971', desc:'Risk Management for Medical Devices', status:'In Progress', color:colors.warning },
  { icon:'🔐', label:'ISO 27001', desc:'Information Security Management', status:'Planned', color:colors.textMed },
  { icon:'🏥', label:'ISO 13485', desc:'Quality Management for Medical Devices', status:'Planned', color:colors.textMed },
  { icon:'🌍', label:'GDPR', desc:'General Data Protection Regulation', status:'Aligned', color:colors.warning },
  { icon:'🇺🇸', label:'HIPAA', desc:'Health Insurance Portability and Accountability', status:'Aligned', color:colors.warning },
];

const SECURITY_FEATURES = [
  { icon:'🔐', title:'End-to-End Encryption', desc:'Designed for AES-256 encryption at rest and TLS 1.3 in transit, with clinical data encrypted before leaving the device.' },
  { icon:'🛡️', title:'Zero-Trust Architecture', desc:'Every request verified. No implicit trust. Microsegmentation and least-privilege access controls.' },
  { icon:'🌍', title:'Data Residency', desc:'Data residency is planned for UK, EU, US and Africa regions. No live regional deployments are claimed today.' },
  { icon:'🔍', title:'Audit Logging', desc:'Complete audit trail for all system access and modifications. HIPAA and NHS DSPT aligned (in preparation).' },
  { icon:'🧬', title:'Federated Learning', desc:'Planned architecture for training models without moving data.' },
  { icon:'✅', title:'Penetration Testing', desc:'Third-party security assessments and vulnerability scanning are planned as the platform matures.' },
];

const INCIDENT_RESPONSE = [
  { phase:'Detection', time:'< 15 minutes', desc:'Automated monitoring and alerting systems detect potential incidents.' },
  { phase:'Triage', time:'< 1 hour', desc:'Security team assesses severity and impact. Initial containment measures.' },
  { phase:'Communication', time:'< 24 hours', desc:'Notify affected parties and regulators as required by GDPR/HIPAA.' },
  { phase:'Resolution', time:'< 72 hours', desc:'Implement fixes, conduct post-incident review, update procedures.' },
];

export function TrustCenterPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  return (
    <div style={{ background:colors.bg0, minHeight:'100vh', fontFamily:typography.fontBase }}>
      <PublicNav activePage="trust" onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ textAlign:'center', padding:`clamp(${spacing[10]}, 10vh, ${spacing[20]}) ${spacing[6]} ${spacing[12]}`, background:`linear-gradient(180deg,${colors.bg1},${colors.bg0})` }}>
        <Badge variant="brand" style={{ marginBottom:spacing[5] }}>TRUST CENTER</Badge>
        <h1 style={{ fontSize:'clamp(28px, 7vw, 48px)', fontWeight:900, color:colors.textHigh, margin:`0 0 ${spacing[4]}`, letterSpacing:'-0.04em', lineHeight:1.1 }}>
          Security &amp; Regulatory Alignment
        </h1>
        <p style={{ fontSize:'clamp(14px, 2.5vw, 15px)', color:colors.textMed, maxWidth:600, margin:`0 auto ${spacing[8]}`, lineHeight:1.8 }}>
          Security controls and regulatory alignment designed into the SEWA XAI platform. Certifications shown as in progress or planned are not yet held.
        </p>
      </div>

      {/* Compliance Badges Grid */}
      <div style={{ maxWidth:1160, margin:'0 auto', padding:`0 ${spacing[6]} ${spacing[20]}` }}>
        <h2 style={{ fontSize:24, fontWeight:800, color:colors.textHigh, margin:`0 0 ${spacing[6]}`, textAlign:'center' }}>Regulatory Alignment</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:spacing[4], marginBottom:spacing[20] }}>
          {COMPLIANCE_BADGES.map(badge => (
            <Card key={badge.label} padding={spacing[6]} hoverable style={{ display:'flex', alignItems:'center', gap:spacing[4] }}>
              <div style={{ fontSize:32, flexShrink:0 }}>{badge.icon}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:colors.textHigh }}>{badge.label}</div>
                <div style={{ fontSize:12, color:colors.textMed, marginBottom:spacing[2] }}>{badge.desc}</div>
                <Badge style={{ background:`${badge.color}20`, color:badge.color, fontSize:10 }}>{badge.status}</Badge>
              </div>
            </Card>
          ))}
        </div>

        {/* Security Features */}
        <h2 style={{ fontSize:24, fontWeight:800, color:colors.textHigh, margin:`0 0 ${spacing[6]}`, textAlign:'center' }}>Security Features</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:spacing[5], marginBottom:spacing[20] }}>
          {SECURITY_FEATURES.map(feature => (
            <Card key={feature.title} padding={spacing[6]} style={{ background:colors.bg2 }}>
              <div style={{ fontSize:28, marginBottom:spacing[3] }}>{feature.icon}</div>
              <h3 style={{ fontSize:16, fontWeight:700, color:colors.textHigh, margin:`0 0 ${spacing[2]}` }}>{feature.title}</h3>
              <p style={{ fontSize:13, color:colors.textMed, lineHeight:1.6, margin:0 }}>{feature.desc}</p>
            </Card>
          ))}
        </div>

        {/* Incident Response Timeline */}
        <h2 style={{ fontSize:24, fontWeight:800, color:colors.textHigh, margin:`0 0 ${spacing[6]}`, textAlign:'center' }}>Incident Response</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:spacing[4], marginBottom:spacing[20] }}>
          {INCIDENT_RESPONSE.map((step) => (
            <Card key={step.phase} padding={spacing[5]} style={{ background:colors.bg2, textAlign:'center' }}>
              <div style={{ fontSize:24, fontWeight:900, color:colors.brand, fontFamily:typography.fontMono, marginBottom:spacing[2] }}>{step.time}</div>
              <div style={{ fontSize:14, fontWeight:700, color:colors.textHigh, marginBottom:spacing[2] }}>{step.phase}</div>
              <p style={{ fontSize:12, color:colors.textMed, lineHeight:1.5, margin:0 }}>{step.desc}</p>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <Card padding={`clamp(${spacing[8]}, 8vw, ${spacing[14]})`} style={{ textAlign:'center', background:`linear-gradient(135deg,${colors.bg2},${colors.bg3})` }}>
          <h2 style={{ fontSize:'clamp(24px, 5vw, 32px)', fontWeight:800, color:colors.textHigh, margin:`0 0 ${spacing[4]}`, fontFamily:typography.fontBase, letterSpacing:'-1px' }}>Questions About Security?</h2>
          <p style={{ fontSize:14, color:colors.textMed, margin:`0 0 ${spacing[8]}` }}>Our security team is ready to answer your questions and provide documentation.</p>
          <div style={{ display:'flex', gap:spacing[3], justifyContent:'center', flexWrap:'wrap' }}>
            <Button variant="primary" onClick={() => onNavigate('contact')}>Contact Security Team →</Button>
            <Button variant="secondary" onClick={() => onNavigate('security')}>View Security Documentation</Button>
          </div>
        </Card>
      </div>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
