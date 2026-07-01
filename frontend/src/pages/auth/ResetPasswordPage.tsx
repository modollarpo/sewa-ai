// SEWA XAI — frontend/src/pages/auth/ResetPasswordPage.tsx
// Handles the password reset link: /reset-password?token=...&tenant=...
// Lets clinical staff set a new password after requesting a reset.

import React, { useState } from 'react';
import { apiClient } from '../../services/apiClient';

const C = {
  bg: '#08160F', bg2: '#0C1D17', bg3: '#111F1A',
  brand: '#408D7B', brandLt: '#52B09A', brandDk: '#2E6B5E',
  textHi: '#D0ECE6', textMd: '#6FA898', textLo: '#3A6055',
  border: '#1B3028', critical: '#E03535',
  F: "'IBM Plex Sans', system-ui, sans-serif",
};

interface Props {
  token: string;
  onLogin: () => void;
}

type Status = 'form' | 'success' | 'error';

export function ResetPasswordPage({ token, onLogin }: Props) {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [status, setStatus]       = useState<Status>('form');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [focused, setFocused]     = useState('');

  const strength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8)           s++;
    if (/[A-Z]/.test(pw))        s++;
    if (/[0-9]/.test(pw))        s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const pwStrength = strength(password);
  const strengthLabel = ['Too weak','Weak','Fair','Strong','Very strong'][pwStrength];
  const strengthColor = ['#E03535','#E08A20','#E8C840','#1DBF73','#408D7B'][pwStrength];

  const input = (id: string): React.CSSProperties => ({
    width: '100%', padding: '10px 12px', background: C.bg3,
    border: `1px solid ${focused === id ? C.brand : C.border}`, borderRadius: 10,
    color: C.textHi, fontSize: 13, fontFamily: C.F,
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 150ms',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pwStrength < 2) { setError('Please choose a stronger password.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, password });
      setStatus('success');
      setTimeout(() => onLogin(), 2500);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Reset failed. The link may have expired.';
      setError(msg);
      if (err.response?.status === 400) setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.F, padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 20, padding: 36, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${C.brand}, ${C.brandDk})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 14px ${C.brand}40` }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.textHi, letterSpacing: '-0.02em' }}>SEWA XAI</div>
            <div style={{ fontSize: 10, color: C.textLo }}>Clinical Intelligence Platform</div>
          </div>
        </div>

        {/* Success */}
        {status === 'success' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: C.textHi }}>Password Reset!</h2>
            <p style={{ margin: 0, fontSize: 13, color: C.textLo }}>Your password has been updated. Redirecting to login...</p>
          </div>
        )}

        {/* Expired / Invalid */}
        {status === 'error' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏱️</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: C.textHi }}>Link Expired</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: C.textLo, lineHeight: 1.5 }}>
              This password reset link is invalid or has expired. Reset links are valid for 1 hour.
            </p>
            <button onClick={onLogin} style={{ padding: '10px 24px', background: C.brand, border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Back to Login
            </button>
          </div>
        )}

        {/* Form */}
        {status === 'form' && (
          <form onSubmit={handleSubmit}>
            <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: C.textHi }}>Set New Password</h2>
            <p style={{ margin: '0 0 24px', fontSize: 12, color: C.textLo, lineHeight: 1.5 }}>
              Choose a strong password for your clinical account.
            </p>

            {/* New password */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>New Password</label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocused('pw')} onBlur={() => setFocused('')}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                required style={input('pw')}
              />
              {password.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < pwStrength ? strengthColor : C.bg3, transition: 'background 200ms' }} />
                  ))}
                  <span style={{ fontSize: 10, color: strengthColor, fontWeight: 600, flexShrink: 0, marginLeft: 6 }}>{strengthLabel}</span>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Confirm Password</label>
              <input
                type="password" value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onFocus={() => setFocused('cf')} onBlur={() => setFocused('')}
                placeholder="Repeat password" required
                style={{ ...input('cf'), borderColor: confirm && confirm !== password ? C.critical : focused === 'cf' ? C.brand : C.border }}
              />
              {confirm && confirm !== password && (
                <div style={{ fontSize: 11, color: C.critical, marginTop: 4 }}>⚠ Passwords do not match</div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: '10px 14px', background: `${C.critical}14`, border: `1px solid ${C.critical}40`, borderRadius: 10, color: C.critical, fontSize: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <span>⚠ {error}</span>
                <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? C.bg3 : `linear-gradient(135deg, ${C.brand}, ${C.brandDk})`,
              color: 'white', fontSize: 14, fontWeight: 700, transition: 'all 200ms',
              boxShadow: loading ? 'none' : `0 4px 16px ${C.brand}40`,
            }}>
              {loading ? 'Updating Password...' : 'Set New Password'}
            </button>

            <button type="button" onClick={onLogin} style={{ display: 'block', width: '100%', marginTop: 12, textAlign: 'center', background: 'none', border: 'none', color: C.textLo, fontSize: 12, cursor: 'pointer', fontFamily: C.F }}>
              ← Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
