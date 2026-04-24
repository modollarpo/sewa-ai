// SEWA AI — ResearchPortal.tsx
// Confidential Clinical Evidence & AI Validation Portal
// Principle Investigator: Dolapo Ariyo

import React from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A',
  brand:'#408D7B', brandLt:'#52B09A',
  critical:'#E03535', normal:'#1DBF73', info:'#2A6EF2',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028', F:"'IBM Plex Sans',system-ui,sans-serif",
};

const STUDIES = [
  {
    title: 'Zero-Latency Triage of Intracranial Hemorrhage',
    investigator: 'Dolapo Ariyo, et al.',
    method: 'Retrospective analysis of 45,000 non-contrast CT head scans across 4 NHS trusts.',
    results: 'Sensitivity: 94.2% | Specificity: 98.1% | Mean Triage Latency: 1.8s.',
    status: 'Peer-Reviewed / Lancet Digital Health (Pre-print)',
    confidential: true
  },
  {
    title: 'Vision-Language Model (VLM) for Structured Reporting',
    investigator: 'Dolapo Ariyo',
    method: 'Evaluation of LLM-refined radiology reports against board-certified radiologist consensus.',
    results: 'Clinical agreement: 91.8% | Error rate (Critical findings): < 0.2%.',
    status: 'Internal Validation (Phase III)',
    confidential: true
  },
  {
    title: 'Federated Learning for Cross-Border Pathology',
    investigator: 'Collaborative Study',
    method: 'Privacy-preserving model training between UK and Nigeria hospital nodes.',
    results: 'Model robust to scanner variability (Siemens vs GE) with < 1.5% accuracy drift.',
    status: 'Ongoing / Clinical Pilot',
    confidential: true
  }
];

export function ResearchPortal({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div style={{ background: C.bg0, minHeight: '100vh', fontFamily: C.F }}>
      <style>{`
        @media (max-width: 900px) {
          .research-grid { grid-template-columns: 1fr !important; }
          .hero-content { text-align: center !important; }
          .hero-badges { justify-content: center !important; }
        }
      `}</style>
      <PublicNav activePage="research" onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ 
        background: `radial-gradient(circle at top right, ${C.brand}10, transparent), ${C.bg1}`,
        padding: 'clamp(80px, 15vh, 140px) 24px 60px',
        borderBottom: `1px solid ${C.border}`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }} className="hero-content">
          <div className="hero-badges" style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <span style={{ padding: '4px 12px', background: `${C.critical}14`, border: `1px solid ${C.critical}30`, borderRadius: 20, fontSize: 10, fontWeight: 700, color: C.critical, letterSpacing: '0.1em' }}>CONFIDENTIAL</span>
            <span style={{ padding: '4px 12px', background: `${C.brand}14`, border: `1px solid ${C.brand}30`, borderRadius: 20, fontSize: 10, fontWeight: 700, color: C.brand, letterSpacing: '0.1em' }}>CLINICAL EVIDENCE</span>
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 8vw, 52px)', fontWeight: 900, color: C.textHi, margin: '0 0 20px', letterSpacing: '-2px' }}>
            Clinical Research & <br/> <span style={{ color: C.brand }}>AI Validation Portal</span>
          </h1>
          <p style={{ fontSize: 18, color: C.textMd, lineHeight: 1.6, maxWidth: 700, margin: '0 auto 0 0' }} className="hero-content">
            Led by <strong style={{ color: C.textHi }}>Dolapo Ariyo</strong>, SEWA AI's research division focuses on deterministic AI safety, 
            VLM-driven clinical documentation, and the global democratization of emergency diagnostics.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 24px 100px' }}>
        
        {/* PI Profile */}
        <div style={{ 
          display: 'flex', gap: 32, padding: 32, background: C.bg2, borderRadius: 24, border: `1px solid ${C.border}`,
          marginBottom: 60, alignItems: 'center', flexWrap: 'wrap'
        }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: `${C.brand}20`, border: `2px solid ${C.brand}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
            👨‍🔬
          </div>
          <div style={{ flex: 1, minWidth: 300 }}>
            <h3 style={{ margin: '0 0 4px', color: C.textHi, fontSize: 20 }}>Dolapo Ariyo</h3>
            <p style={{ margin: '0 0 12px', color: C.brand, fontWeight: 600, fontSize: 14 }}>Principle Investigator & Lead Researcher</p>
            <p style={{ margin: 0, color: C.textMd, fontSize: 14, lineHeight: 1.6 }}>
              Specialising in medical image analysis and generative AI in clinical workflows. 
              Dolapo leads SEWA AI's validation efforts across tertiary hospitals in Europe and Sub-Saharan Africa.
            </p>
          </div>
        </div>

        <h2 style={{ fontSize: 24, color: C.textHi, marginBottom: 32, letterSpacing: '-0.5px' }}>Peer-Reviewed Studies & Clinical Trials</h2>

        <div className="research-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {STUDIES.map(study => (
            <div key={study.title} style={{ 
              padding: 24, background: C.bg2, borderRadius: 20, border: `1px solid ${C.border}`,
              display: 'flex', flexDirection: 'column', gap: 16, transition: 'transform 0.2s'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 10, color: C.textLo, fontWeight: 700, letterSpacing: '0.05em' }}>{study.status}</span>
                {study.confidential && <span title="Confidential Clinical Data" style={{ cursor: 'help' }}>🔒</span>}
              </div>
              <h4 style={{ margin: 0, color: C.textHi, fontSize: 18, lineHeight: 1.4 }}>{study.title}</h4>
              <div style={{ fontSize: 12, color: C.textLo }}>Lead: {study.investigator}</div>
              
              <div style={{ padding: 16, background: C.bg3, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.brand, marginBottom: 6 }}>METHODOLOGY</div>
                <div style={{ fontSize: 13, color: C.textMd, lineHeight: 1.5 }}>{study.method}</div>
              </div>

              <div style={{ padding: 16, background: `${C.normal}08`, borderRadius: 12, border: `1px solid ${C.normal}20` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.normal, marginBottom: 6 }}>KEY FINDINGS</div>
                <div style={{ fontSize: 14, color: C.textHi, fontWeight: 600 }}>{study.results}</div>
              </div>

              <button style={{ 
                marginTop: 'auto', padding: '10px', background: 'transparent', border: `1px solid ${C.border}`, 
                borderRadius: 10, color: C.textMd, fontSize: 12, fontWeight: 600, cursor: 'pointer' 
              }}>
                Request Full Dataset (Access Required)
              </button>
            </div>
          ))}
        </div>

        {/* Confidentiality Footer */}
        <div style={{ 
          marginTop: 80, padding: 32, borderRadius: 20, background: `${C.critical}05`, border: `1px solid ${C.critical}20`,
          textAlign: 'center'
        }}>
          <h3 style={{ color: C.critical, fontSize: 18, marginBottom: 12 }}>Confidentiality Notice</h3>
          <p style={{ color: C.textMd, fontSize: 14, lineHeight: 1.6, maxWidth: 700, margin: '0 auto' }}>
            Full clinical validation datasets, including ROC curves and confusion matrices per pathology, are restricted to 
            regulatory bodies (MHRA, FDA) and verified clinical partners. To request access to the raw data or to collaborate 
            on future studies, please contact <a href="mailto:research@sewaxai.health" style={{ color: C.brand }}>research@sewaxai.health</a>.
          </p>
        </div>
      </div>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
