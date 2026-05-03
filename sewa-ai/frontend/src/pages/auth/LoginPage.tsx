// SEWA AI — LoginPage.tsx
// Enterprise clinical login: credentials → MFA → session
// Dark clinical aesthetic, region-aware, HIPAA/GDPR/NHS-compliant messaging

import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTenant }    from '../../hooks/useTenant';

const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A',
  brand:'#408D7B', brandLt:'#52B09A', brandDk:'#2E6B5E',
  critical:'#E03535', normal:'#1DBF73', info:'#2A6EF2',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028',
  F: "'IBM Plex Sans', system-ui, sans-serif",
  FM: "'IBM Plex Mono', monospace",
};

const DEMO_CREDENTIALS = [
  { role: 'Radiologist', email: 'sarah.chen@royallondon.nhs.uk', hint: 'Full PACS workspace' },
  { role: 'Physician', email: 'james.okafor@royallondon.nhs.uk', hint: 'Clinical alerts & patient list' },
  { role: 'Patient', email: 'patient.smith@example.com', hint: 'Patient portal & consent' },
  { role: 'Technician', email: 'tech@knh.go.ke', hint: 'Upload & worklist' },
];

const COMPLIANCE_BADGES = [
  { label: 'NHS DSPT', flag: '🇬🇧' },
  { label: 'GDPR', flag: '🇪🇺' },
  { label: 'HIPAA', flag: '🇺🇸' },
  { label: 'ISO 13485', flag: '🔬' },
];

// Animated background brain-scan lines
function BackgroundGrid() {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }} viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#408D7B" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)"/>
      {/* ECG-style waveform */}
      <polyline points="0,300 80,300 100,260 120,340 140,260 160,320 180,300 260,300 280,240 300,360 310,220 320,380 330,300 420,300 440,270 460,330 480,300 800,300"
        fill="none" stroke="#408D7B" strokeWidth="1.5" opacity="0.8"/>
      <circle cx="310" cy="220" r="3" fill="#E03535" opacity="0.6">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}

function MFAInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split('');

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i: number, v: string) => {
    const d = v.replace(/\D/g, '');
    if (!d) {
      const next = digits.slice();
      next[i] = '';
      onChange(next.join(''));
      return;
    }
    const next = digits.slice();
    next[i] = d[d.length - 1];
    onChange(next.join(''));
    if (i < 5) inputs.current[i + 1]?.focus();
  };

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el; }}
          value={digits[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          maxLength={1}
          type="text"
          inputMode="numeric"
          autoFocus={i === 0}
          style={{
            width: '44px', height: '52px', textAlign: 'center',
            background: C.bg3, border: `1px solid ${digits[i] ? C.brand : C.border}`,
            borderRadius: '10px', color: C.textHi, fontSize: '22px', fontWeight: '700',
            fontFamily: C.FM, outline: 'none', transition: 'border-color 150ms',
            boxShadow: digits[i] ? `0 0 0 1px ${C.brand}40` : 'none',
          }}
        />
      ))}
    </div>
  );
}

export function LoginPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { login, verifyMFA, isLoading, error } = useAuthStore();
  const { tenantSlug: subdomainTenant } = useTenant(); // ← was missing: caused ReferenceError on every submit
  const [step, setStep] = useState<'credentials' | 'mfa' | 'forgot' | 'forgot-sent'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaChallenge, setMfaChallenge] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoPanel, setShowDemoPanel] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [localError, setLocalError] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Auto-submit MFA when 6 digits entered
  useEffect(() => {
    if (mfaCode.length === 6 && step === 'mfa') {
      handleMFASubmit();
    }
  }, [mfaCode]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    try {
      // Prioritize subdomain tenant, fallback to domain derivation for global login
      let tenantSlug = subdomainTenant || '';
      
      if (!tenantSlug) {
        const domain = email.split('@')[1];
        if (domain === 'royallondon.nhs.uk') tenantSlug = 'royal-london';
        else if (domain === 'luth.edu.ng') tenantSlug = 'luth-lagos';
        else if (domain === 'knh.go.ke') tenantSlug = 'kenyatta-nh';
        else if (domain === 'sewaxai.health') tenantSlug = 'royal-london';
        else if (domain === 'example.com') tenantSlug = 'royal-london';
        else {
          tenantSlug = 'royal-london'; // Global fallback
        }
      }

      const result = await login(email, password, tenantSlug);
      if (result?.mfaRequired) {
        setMfaChallenge(result.mfaChallenge || '');
        setStep('mfa');
      }
    } catch (err: any) {
      setLocalError(err?.response?.data?.message || 'Invalid credentials');
    }
  };

  const handleMFASubmit = async () => {
    if (mfaCode.length < 6) return;
    try {
      await verifyMFA(mfaChallenge, mfaCode);
    } catch {
      setLocalError('Invalid code — please try again');
      setMfaCode('');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      // Derive tenant from email domain, same as login flow
      let tenantSlug = subdomainTenant || '';
      if (!tenantSlug) {
        const domain = forgotEmail.split('@')[1];
        if (domain === 'royallondon.nhs.uk') tenantSlug = 'royal-london';
        else if (domain === 'luth.edu.ng') tenantSlug = 'luth-lagos';
        else if (domain === 'knh.go.ke') tenantSlug = 'kenyatta-nh';
        else tenantSlug = 'royal-london';
      }
      await import('../../services/apiClient').then(({ apiClient }) =>
        apiClient.post('/auth/forgot-password', { email: forgotEmail, tenantSlug })
      );
      setStep('forgot-sent');
    } catch {
      // Always show sent message to avoid user enumeration
      setStep('forgot-sent');
    } finally {
      setForgotLoading(false);
    }
  };

  const displayError = error || localError;

  const inputStyle = (id: string): React.CSSProperties => ({
    width: '100%', height: '44px', padding: '0 40px 0 40px', boxSizing: 'border-box',
    background: C.bg3, border: `1px solid ${focused === id ? C.brand : C.border}`,
    borderRadius: '10px', color: C.textHi, fontSize: '14px', fontFamily: C.F,
    outline: 'none', transition: 'border-color 150ms',
    boxShadow: focused === id ? `0 0 0 2px ${C.brand}20` : 'none',
  });

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: C.bg0, position: 'relative', overflow: 'hidden', fontFamily: C.F,
    }}>
      <BackgroundGrid />

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '600px', borderRadius: '50%',
        background: `radial-gradient(circle, ${C.brand}08 0%, transparent 70%)`,
        pointerEvents: 'none',
      }}/>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px', padding: '16px' }}>

        {/* Logo card */}
        <div style={{
          textAlign: 'center', marginBottom: '28px',
          animation: 'fadeDown 400ms ease',
        }}>
          <style>{`
            @keyframes fadeDown { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:none; } }
            @keyframes fadeUp   { from { opacity:0; transform:translateY(12px);  } to { opacity:1; transform:none; } }
          `}</style>
          <div style={{
            display: 'inline-flex', width: '56px', height: '56px', borderRadius: '16px',
            background: `linear-gradient(135deg, ${C.brand}, ${C.brandDk})`,
            alignItems: 'center', justifyContent: 'center', marginBottom: '14px',
            boxShadow: `0 0 32px ${C.brand}40, 0 8px 24px rgba(0,0,0,0.4)`,
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: C.textHi, letterSpacing: '-0.03em', lineHeight: 1 }}>
            SEWA AI
          </div>
          <div style={{ fontSize: '12px', color: C.textMd, marginTop: '6px', letterSpacing: '0.04em' }}>
            Smart Early Warning Assistant
          </div>
        </div>

        {/* Main card */}
        <div style={{
          background: C.bg1, border: `1px solid ${C.border}`,
          borderRadius: '20px', padding: '28px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          animation: 'fadeUp 400ms ease',
        }}>

          {/* Step indicator */}
          {step === 'mfa' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <button onClick={() => { setStep('credentials'); setMfaCode(''); setLocalError(''); }}
                style={{ background: 'none', border: 'none', color: C.textLo, cursor: 'pointer', padding: '2px', display: 'flex' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
              </button>
              <span style={{ fontSize: '12px', color: C.textMd }}>Two-factor authentication</span>
            </div>
          )}

          {/* Error */}
          {displayError && (
            <div style={{
              marginBottom: '16px', padding: '10px 14px', borderRadius: '10px',
              background: `${C.critical}14`, border: `1px solid ${C.critical}40`,
              color: C.critical, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {displayError}
            </div>
          )}

          {/* CREDENTIALS STEP */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit}>
              <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '700', color: C.textHi }}>
                Sign in to your account
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: C.textMd, marginBottom: '6px' }}>
                    Email address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: C.textLo }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="doctor@hospital.nhs.uk" required
                      onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                      style={inputStyle('email')}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: C.textMd, marginBottom: '6px' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: C.textLo }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••" required
                      onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                      style={inputStyle('password')}
                    />
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textLo, cursor: 'pointer', display: 'flex' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {showPassword
                          ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                          : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                        }
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Forgot password link */}
              <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 12 }}>
                <button type="button" onClick={() => { setStep('forgot'); setForgotEmail(email); setLocalError(''); }}
                  style={{ background: 'none', border: 'none', color: C.textLo, fontSize: '12px', cursor: 'pointer', fontFamily: C.F }}>
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={isLoading || !email || !password} style={{
                width: '100%', height: '44px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${C.brand}, ${C.brandDk})`,
                color: 'white', fontSize: '14px', fontWeight: '700', fontFamily: C.F,
                boxShadow: `0 4px 16px ${C.brand}40`,
                opacity: isLoading || !email || !password ? 0.6 : 1,
                transition: 'opacity 150ms',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
                {isLoading ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.7s linear infinite' }}>
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                      <path d="M12 2a10 10 0 0 1 10 10"/>
                    </svg>
                    Signing in…
                  </>
                ) : 'Sign In →'}
              </button>

              {/* Registration links */}
              <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: C.textMd }}>
                <span>Don't have an account? </span>
                <button type="button" onClick={() => onNavigate('register')}
                  style={{ background: 'none', border: 'none', color: C.brand, fontWeight: '700', cursor: 'pointer', fontFamily: C.F, padding: 0 }}>
                  Create one here
                </button>
              </div>

              {/* Demo login panel */}
              <div style={{ marginTop: '16px' }}>
                <button type="button" onClick={() => setShowDemoPanel(s => !s)}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textLo, fontSize: '12px', cursor: 'pointer', fontFamily: C.F, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {showDemoPanel ? 'Hide' : 'Show'} demo credentials
                </button>

                {showDemoPanel && (
                  <div style={{
                    marginTop: '8px', padding: '12px', background: C.bg2,
                    borderRadius: '10px', border: `1px solid ${C.border}`,
                    animation: 'fadeUp 200ms ease',
                  }}>
                    <p style={{ margin: '0 0 10px', fontSize: '11px', color: C.textLo }}>
                      All demo accounts use password: <code style={{ fontFamily: C.FM, color: C.brand }}>SewaAI2024!</code>
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {DEMO_CREDENTIALS.map(cred => (
                        <button key={cred.email} type="button"
                          onClick={() => { setEmail(cred.email); setPassword('SewaAI2024!'); setShowDemoPanel(false); }}
                          style={{
                            padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`,
                            background: C.bg3, cursor: 'pointer', textAlign: 'left', fontFamily: C.F,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            transition: 'border-color 120ms',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = C.brand + '60')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
                        >
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: C.textHi }}>{cred.role}</div>
                            <div style={{ fontSize: '10px', color: C.textLo, fontFamily: C.FM }}>{cred.email}</div>
                          </div>
                          <span style={{ fontSize: '10px', color: C.textLo }}>{cred.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </form>
          )}

          {/* MFA STEP */}
          {step === 'mfa' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px', margin: '0 auto 14px',
                  background: `${C.brand}20`, border: `1px solid ${C.brand}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2">
                    <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                  </svg>
                </div>
                <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '700', color: C.textHi }}>
                  Two-factor authentication
                </h2>
                <p style={{ margin: 0, fontSize: '12px', color: C.textMd }}>
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <MFAInput value={mfaCode} onChange={setMfaCode} />

              <button onClick={handleMFASubmit} disabled={isLoading || mfaCode.length < 6}
                style={{
                  width: '100%', height: '44px', marginTop: '20px', borderRadius: '10px', border: 'none',
                  background: `linear-gradient(135deg, ${C.brand}, ${C.brandDk})`,
                  color: 'white', fontSize: '14px', fontWeight: '700', fontFamily: C.F, cursor: 'pointer',
                  opacity: mfaCode.length < 6 || isLoading ? 0.5 : 1, transition: 'opacity 150ms',
                }}>
                {isLoading ? 'Verifying…' : 'Verify & Sign In'}
              </button>

              <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: C.textLo }}>
                Lost access to your authenticator?{' '}
                <button onClick={() => { setStep('forgot'); setLocalError(''); }} style={{ background: 'none', border: 'none', color: C.brand, cursor: 'pointer', fontFamily: C.F, fontSize: '12px' }}>
                  Reset via email
                </button>
              </p>
            </div>
          )}

          {/* FORGOT PASSWORD STEP */}
          {step === 'forgot' && (
            <form onSubmit={handleForgotPassword}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <button type="button" onClick={() => setStep('credentials')} style={{ background: 'none', border: 'none', color: C.textLo, cursor: 'pointer', padding: 2, display: 'flex' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <span style={{ fontSize: 12, color: C.textMd }}>Reset your password</span>
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: C.textHi }}>Forgot password?</h2>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: C.textLo, lineHeight: 1.5 }}>
                Enter your clinical email address and we'll send you a secure reset link valid for 1 hour.
              </p>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.textMd, marginBottom: 6 }}>Email address</label>
                <input
                  type="email" value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="doctor@hospital.nhs.uk" required
                  onFocus={() => setFocused('forgot-email')} onBlur={() => setFocused(null)}
                  style={inputStyle('forgot-email')}
                />
              </div>
              <button type="submit" disabled={forgotLoading || !forgotEmail} style={{
                width: '100%', height: 44, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${C.brand}, ${C.brandDk})`,
                color: 'white', fontSize: 14, fontWeight: 700, fontFamily: C.F,
                opacity: forgotLoading || !forgotEmail ? 0.6 : 1, transition: 'opacity 150ms',
                boxShadow: `0 4px 16px ${C.brand}40`,
              }}>
                {forgotLoading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD — SENT CONFIRMATION */}
          {step === 'forgot-sent' && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>📧</div>
              <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: C.textHi }}>Check your email</h2>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: C.textLo, lineHeight: 1.6 }}>
                If an account exists for <strong style={{ color: C.brandLt }}>{forgotEmail}</strong>, a password reset link has been sent. It expires in 1 hour. Check your inbox and spam folder.
              </p>
              <button onClick={() => { setStep('credentials'); setLocalError(''); }} style={{
                padding: '10px 28px', background: C.brand, border: 'none',
                borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                Back to Sign In
              </button>
            </div>
          )}
        </div>

        {/* Compliance badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
          {COMPLIANCE_BADGES.map(b => (
            <div key={b.label} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 10px', borderRadius: '20px', background: C.bg1,
              border: `1px solid ${C.border}`, fontSize: '10px', color: C.textLo, fontFamily: C.F,
            }}>
              <span style={{ fontSize: '12px' }}>{b.flag}</span>
              <span>{b.label}</span>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: '10px', color: C.textLo, marginTop: '12px', fontFamily: C.F }}>
          SEWA AI v2.4.1 · End-to-end encrypted · Zero-knowledge architecture
        </p>
      </div>
    </div>
  );
}
