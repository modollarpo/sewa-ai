// SEWA XAI — frontend/src/pages/auth/VerifyEmailPage.tsx
// Handles: /verify-email?token=...
// Called when a newly registered user clicks the email verification link.

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';

const C = {
  bg: '#08160F', bg2: '#0C1D17', bg3: '#111F1A',
  brand: '#408D7B', brandLt: '#52B09A', brandDk: '#2E6B5E',
  textHi: '#D0ECE6', textMd: '#6FA898', textLo: '#3A6055',
  border: '#1B3028', critical: '#E03535',
  F: "'IBM Plex Sans', system-ui, sans-serif",
};

interface Props { token: string; onLogin: () => void; }
type Status = 'verifying' | 'success' | 'error';

export function VerifyEmailPage({ token, onLogin }: Props) {
  const [status, setStatus] = useState<Status>('verifying');
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setError('No verification token provided.'); return; }
    apiClient.post('/auth/verify-email', { token })
      .then(() => { setStatus('success'); setTimeout(() => onLogin(), 2500); })
      .catch((e: any) => {
        setStatus('error');
        setError(e.response?.data?.error || 'Verification failed. The link may have expired.');
      });
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.F, padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 20, padding: 36, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', textAlign: 'center' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${C.brand}, ${C.brandDk})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 14px ${C.brand}40` }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.textHi, letterSpacing: '-0.02em' }}>SEWA XAI</div>
            <div style={{ fontSize: 10, color: C.textLo }}>Clinical Intelligence Platform</div>
          </div>
        </div>

        {/* Verifying */}
        {status === 'verifying' && (
          <div style={{ padding: '32px 0' }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.brand, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: C.textHi }}>Verifying your email…</h2>
            <p style={{ margin: 0, fontSize: 13, color: C.textLo }}>Please wait while we activate your account.</p>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div style={{ padding: '16px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: C.textHi }}>Email Verified!</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: C.textLo, lineHeight: 1.6 }}>
              Your clinical account is now active. Redirecting you to login…
            </p>
            <div style={{ height: 4, background: C.bg3, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: C.brand, borderRadius: 2, animation: 'fill 2.5s linear forwards' }} />
              <style>{`@keyframes fill{from{width:0}to{width:100%}}`}</style>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div style={{ padding: '16px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>⏱️</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: C.textHi }}>Link Expired</h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: C.textLo, lineHeight: 1.6 }}>
              {error || 'This verification link is invalid or has expired (links are valid for 24 hours). Please register again or contact your administrator.'}
            </p>
            <button onClick={onLogin} style={{
              padding: '10px 28px', background: C.brand, border: 'none',
              borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
