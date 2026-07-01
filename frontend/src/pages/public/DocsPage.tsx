import React from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';

const C = {
  bg0: '#050F0C',
  bg1: '#08160F',
  bg2: '#0C1D17',
  brand: '#408D7B',
  brandLt: '#52B09A',
  textHi: '#D0ECE6',
  textMd: '#6FA898',
  textLo: '#3A6055',
  border: '#1B3028',
  fontMain: "'IBM Plex Sans', system-ui, sans-serif"
};

const DOCS_DATA = [
  {
    title: "Getting Started",
    content: "SEWA XAI is a cloud-native medical imaging platform. To begin, ensure you have an active tenant account and sufficient GPU credits."
  },
  {
    title: "API Integration",
    content: "Our REST API allows for seamless integration with existing Hospital Information Systems (HIS) and PACS."
  },
  {
    title: "Security & Compliance",
    content: "SEWA XAI is built with a security-first mindset, adhering to HIPAA, GDPR, and ISO 27001 standards."
  }
];

export const DocsPage: React.FC<{ onNavigate: (p: string) => void }> = ({ onNavigate }) => {
  return (
    <PublicLayout activePage="docs" onNavigate={onNavigate}>
      <div style={{ 
        padding: '80px clamp(24px, 5vw, 64px)', 
        maxWidth: '900px', 
        margin: '0 auto',
        minHeight: '80vh',
        fontFamily: C.fontMain 
      }}>
        <h1 style={{ 
          fontSize: 'clamp(2.5rem, 6vw, 4rem)', 
          fontWeight: 900,
          marginBottom: '3rem', 
          color: C.textHi,
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #fff 0%, #408D7B 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Documentation
        </h1>
        
        <div style={{ display: 'grid', gap: '32px' }}>
          {DOCS_DATA.map((doc, i) => (
            <div key={i} style={{ 
              padding: '32px', 
              background: C.bg1, 
              borderRadius: '24px',
              border: `1px solid ${C.border}`,
              transition: 'all 0.3s ease'
            }}>
              <h2 style={{ 
                color: C.brandLt, 
                fontSize: '1.5rem',
                fontWeight: 700,
                marginBottom: '16px' 
              }}>
                {doc.title}
              </h2>
              <p style={{ 
                color: C.textMd, 
                lineHeight: '1.7',
                fontSize: '1.1rem',
                margin: 0
              }}>
                {doc.content}
              </p>
            </div>
          ))}
        </div>

        <div style={{ 
          marginTop: '64px', 
          padding: '40px',
          background: 'rgba(64, 141, 123, 0.05)',
          borderRadius: '32px',
          border: `1px solid ${C.border}`,
          textAlign: 'center'
        }}>
          <h3 style={{ color: C.textHi, marginBottom: '16px' }}>Need help?</h3>
          <p style={{ color: C.textMd, marginBottom: '24px' }}>Our support team is available 24/7 for technical assistance.</p>
          <button style={{
            background: C.brand,
            color: '#fff',
            border: 'none',
            padding: '12px 32px',
            borderRadius: '100px',
            fontWeight: 700,
            cursor: 'pointer'
          }}>
            Contact Support
          </button>
        </div>
      </div>
    </PublicLayout>
  );
};

export default DocsPage;
