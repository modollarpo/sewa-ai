// SEWA AI — frontend/src/pages/auth/AcceptInvitePage.tsx
// Handles the staff invitation link: /auth/accept-invite?token=...
// Lets new clinical staff set their password and activate their account.

import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

const C = {
  bg: '#08160F', bg2: '#0C1D17', bg3: '#111F1A',
  brand: '#408D7B', brandLt: '#52B09A',
  textHi: '#D0ECE6', textMd: '#6FA898', textLo: '#3A6055',
  border: '#1B3028', critical: '#E03535', normal: '#1DBF73',
  F: "'IBM Plex Sans', system-ui, sans-serif",
};

interface Props {
  token: string;
  onLogin: () => void;
}

type Status = 'loading' | 'ready' | 'success' | 'error' | 'invalid';

export function AcceptInvitePage({ token, onLogin }: Props) {
  const [status, setStatus]     = useState<Status>('loading');
  const [invite, setInvite]     = useState<{ email: string; role: string; tenantName: string } | null>(null);
  const [form, setForm]         = useState({ firstName: '', lastName: '', password: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  // Validate the token on mount
  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    apiClient.get(`/auth/invite/${token}`)
      .then(res => { setInvite(res.data); setStatus('ready'); })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const strength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8)      s++;
    if (/[A-Z]/.test(pw))   s++;
    if (/[0-9]/.test(pw))   s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s; // 0-4
  };
  const pw = form.password;
  const pwStrength = strength(pw);
  const strengthLabel = ['Too weak', 'Weak', 'Fair', 'Strong', 'Very strong'][pwStrength];
  const strengthColor = ['#E03535','#E08A20','#E8C840','#1DBF73','#408D7B'][pwStrength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('First and last name are required.'); return; }
    if (pwStrength < 2) { setError('Please choose a stronger password.'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      await apiClient.post(`/auth/invite/${token}/accept`, {
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        password:  form.password,
      });
      setStatus('success');
      setTimeout(() => onLogin(), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Account activation failed. Please contact your administrator.');
    } finally {
      setSubmitting(false);
    }
  };

  const input: React.CSSProperties = {
    width: '100%', padding: '10px 12px', background: C.bg3,
    border: `1px solid ${C.border}`, borderRadius: 10,
    color: C.textHi, fontSize: 13, fontFamily: C.F,
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.F, padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 20, padding: 36, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${C.brand}, #2E6B5E)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 14px ${C.brand}40` }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.textHi, letterSpacing: '-0.02em' }}>SEWA AI</div>
            <div style={{ fontSize: 10, color: C.textLo }}>Clinical Intelligence Platform</div>
          </div>
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: C.textMd, fontSize: 13 }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTopColor: C.brand, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Validating invitation...
          </div>
        )}

        {/* Invalid / Expired */}
        {status === 'invalid' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: C.textHi }}>Invalid Invitation</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: C.textLo, lineHeight: 1.5 }}>
              This invitation link is invalid or has already been used. Please contact your hospital administrator for a new invite.
            </p>
            <button onClick={onLogin} style={{ padding: '10px 24px', background: C.brand, border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Back to Login
            </button>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: C.textHi }}>Account Activated!</h2>
            <p style={{ margin: 0, fontSize: 13, color: C.textLo }}>Redirecting you to login...</p>
          </div>
        )}

        {/* Activation form */}
        {status === 'ready' && invite && (
          <form onSubmit={handleSubmit}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: C.textHi }}>Activate Your Account</h2>
            <p style={{ margin: '0 0 24px', fontSize: 12, color: C.textLo, lineHeight: 1.5 }}>
              You've been invited to <strong style={{ color: C.brandLt }}>{invite.tenantName}</strong> as a <strong style={{ color: C.brandLt }}>{invite.role}</strong>. Set your password to get started.
            </p>

            {/* Email (read-only) */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
              <input value={invite.email} readOnly style={{ ...input, color: C.textMd, cursor: 'not-allowed' }} />
            </div>

            {/* Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>First Name</label>
                <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Jane" required style={input} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last Name</label>
                <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Smith" required style={input} />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Set Password</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 chars, 1 uppercase, 1 number" required style={input} />
              {pw.length > 0 && (
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
              <input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Repeat password" required style={{ ...input, borderColor: form.confirm && form.confirm !== form.password ? C.critical : C.border }} />
              {form.confirm && form.confirm !== form.password && (
                <div style={{ fontSize: 11, color: C.critical, marginTop: 4 }}>⚠ Passwords do not match</div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: '10px 14px', background: `${C.critical}14`, border: `1px solid ${C.critical}40`, borderRadius: 10, color: C.critical, fontSize: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>⚠ {error}</span>
                <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
              </div>
            )}

            <button type="submit" disabled={submitting} style={{
              width: '100%', padding: '12px', background: submitting ? C.bg3 : `linear-gradient(135deg, ${C.brand}, #2E6B5E)`,
              border: 'none', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'all 200ms', boxShadow: submitting ? 'none' : `0 4px 16px ${C.brand}40`,
            }}>
              {submitting ? 'Activating...' : 'Activate Account & Sign In'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 11, color: C.textLo, marginTop: 16, lineHeight: 1.5 }}>
              By activating, you agree to the SEWA AI{' '}
              <span style={{ color: C.brandLt, cursor: 'pointer' }}>Terms of Service</span> and{' '}
              <span style={{ color: C.brandLt, cursor: 'pointer' }}>Privacy Policy</span>.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
