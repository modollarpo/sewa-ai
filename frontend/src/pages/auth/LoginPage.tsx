// SEWA XAI — LoginPage.tsx
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

// No demo credentials in production builds

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

  // Hidden keyboard shortcut to toggle Demo Panel (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        if (import.meta.env.MODE !== 'production') {
          setShowDemoPanel(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05100D] relative overflow-hidden font-sans text-[#D0ECE6]">
      <BackgroundGrid />
      
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#408D7B]/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#408D7B]/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg p-6 animate-fade-in">
        
        {/* Logo Section */}
        <header className="text-center mb-10 space-y-4">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-[#408D7B] to-[#2E6B5E] items-center justify-center shadow-2xl shadow-[#408D7B]/20 animate-slide-up">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div className="animate-slide-up [animation-delay:100ms]">
            <h1 className="text-3xl font-black tracking-tighter uppercase">SEWA XAI</h1>
            <p className="text-[10px] font-black tracking-[0.4em] text-[#3A6055] mt-1">Smart Early Warning Assistant</p>
          </div>
        </header>

        {/* Main Interface Card */}
        <div className="bg-[#08160F]/80 backdrop-blur-2xl border border-[#1B3028] rounded-[2.5rem] p-10 lg:p-12 shadow-[0_32px_128px_rgba(0,0,0,0.6)] animate-slide-up [animation-delay:200ms]">
          
          {step === 'mfa' && (
            <button 
              onClick={() => { setStep('credentials'); setMfaCode(''); setLocalError(''); }}
              className="flex items-center gap-2 text-[10px] font-black text-[#3A6055] hover:text-[#D0ECE6] uppercase tracking-widest mb-8 transition-colors"
            >
              ← Back to Credentials
            </button>
          )}

          {displayError && (
            <div className="mb-8 p-4 rounded-2xl bg-[#2A0A0A] border border-[#E03535]/30 text-[#E03535] text-xs font-bold flex items-center gap-3 animate-shake">
              <span className="text-lg">⚠️</span>
              {displayError}
            </div>
          )}

          {/* Step 1: Credentials */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Identity Provider Email</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3A6055] group-focus-within:text-[#408D7B] transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="doctor@hospital.org" required
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest">Secret Credential</label>
                    <button type="button" onClick={() => setStep('forgot')} className="text-[9px] font-black text-[#408D7B] uppercase tracking-widest hover:text-[#52B09A]">Recovery Path</button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3A6055] group-focus-within:text-[#408D7B] transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••" required
                      className={inputClass}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#3A6055] hover:text-[#D0ECE6] transition-colors">
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading || !email || !password}
                className="w-full py-5 rounded-2xl bg-[#408D7B] hover:bg-[#52B09A] disabled:opacity-30 text-white text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-[#408D7B]/20 active:scale-95"
              >
                {isLoading ? 'ESTABLISHING_SESSION...' : 'INITIATE_LOGIN_SEQUENCE'}
              </button>

              <div className="pt-6 text-center">
                <span className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest">No Node Access? </span>
                <button type="button" onClick={() => onNavigate('register')} className="text-[10px] font-black text-[#408D7B] uppercase tracking-widest hover:text-[#52B09A] ml-2">Request Onboarding</button>
              </div>

              {/* No demo panel in production builds */}
              {showDemoPanel && import.meta.env.MODE !== 'production' && (
                <div className="mt-6 p-4 rounded-xl bg-[#0C1D17] border border-[#1B3028] space-y-3 animate-fade-in">
                  <h3 className="text-[10px] font-black text-[#6FA898] uppercase tracking-widest text-center mb-4">Demo Credentials (Ctrl+Shift+D)</h3>
                  {[
                    { role: 'Superadmin', email: 'superadmin@sewaxai.health' },
                    { role: 'Radiologist', email: 'sarah.chen@royallondon.nhs.uk' },
                    { role: 'Patient', email: 'patient.smith@example.com' }
                  ].map(acc => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => {
                        setEmail(acc.email);
                        // Using a placeholder; user should still know the DB password or the admin should set it to 'password' for local dev.
                        // Assuming the seed uses "password" locally or something the user sets.
                        setPassword('SewaXAI2026!'); 
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-[#08160F] hover:bg-[#111F1A] border border-[#1B3028] hover:border-[#408D7B]/50 flex justify-between items-center transition-colors text-left"
                    >
                      <span className="text-xs font-black text-[#D0ECE6]">{acc.role}</span>
                      <span className="text-[10px] text-[#3A6055]">{acc.email}</span>
                    </button>
                  ))}
                  <p className="text-[9px] text-center text-[#E03535] mt-2">Note: You must still replace the password with whatever `SEED_ADMIN_PASSWORD` was set to during seed.</p>
                </div>
              )}
            </form>

          )}

          {/* Step 2: MFA */}
          {step === 'mfa' && (
            <div className="space-y-10 animate-fade-in">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#408D7B]/10 border border-[#408D7B]/20 flex items-center justify-center text-3xl mx-auto">🛡️</div>
                <h2 className="text-xl font-black uppercase tracking-tight">Security Checkpoint</h2>
                <p className="text-sm text-[#6FA898] font-medium leading-relaxed">Multi-factor authentication is required for clinical session integrity. Enter your 6-digit code.</p>
              </div>

              <MFAInput value={mfaCode} onChange={setMfaCode} />

              <button 
                onClick={handleMFASubmit} 
                disabled={isLoading || mfaCode.length < 6}
                className="w-full py-5 rounded-2xl bg-[#408D7B] hover:bg-[#52B09A] disabled:opacity-30 text-white text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-[#408D7B]/20 active:scale-95"
              >
                {isLoading ? 'VALIDATING_CREDENTIALS...' : 'FINALIZE_SESSION'}
              </button>

              <div className="text-center">
                <p className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest leading-loose">
                  Credential Outage? <br/>
                  <button onClick={() => setStep('forgot')} className="text-[#408D7B] hover:text-[#52B09A]">Initiate Recovery Sequence</button>
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Forgot Password */}
          {step === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-8 animate-fade-in">
              <div className="space-y-4">
                <button 
                  type="button" 
                  onClick={() => setStep('credentials')}
                  className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest"
                >
                  ← Return to Login
                </button>
                <h2 className="text-xl font-black uppercase tracking-tight">Credential Recovery</h2>
                <p className="text-sm text-[#6FA898] font-medium leading-relaxed">Enter your institutional email address to receive a one-time secure recovery link.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Institutional Email</label>
                <input
                  type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                  placeholder="doctor@hospital.org" required
                  className={inputClass}
                />
              </div>

              <button 
                type="submit" 
                disabled={forgotLoading || !forgotEmail}
                className="w-full py-5 rounded-2xl bg-[#408D7B] text-white text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-[#408D7B]/20 active:scale-95"
              >
                {forgotLoading ? 'TRANSMITTING...' : 'SEND_RECOVERY_TOKEN'}
              </button>
            </form>
          )}

          {/* Step 4: Forgot Sent */}
          {step === 'forgot-sent' && (
            <div className="text-center space-y-10 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-[#408D7B]/10 border border-[#408D7B]/20 flex items-center justify-center text-4xl mx-auto">📧</div>
              <div className="space-y-4">
                <h2 className="text-xl font-black uppercase tracking-tight">Token Transmitted</h2>
                <p className="text-sm text-[#6FA898] font-medium leading-relaxed">
                  If your identity exists in our clinical registry, a recovery token has been dispatched to <span className="text-[#D0ECE6]">{forgotEmail}</span>.
                </p>
              </div>
              <button 
                onClick={() => setStep('credentials')}
                className="w-full py-5 rounded-2xl bg-[#0C1D17] border border-[#1B3028] text-[10px] font-black text-[#D0ECE6] uppercase tracking-[0.2em]"
              >
                Return to Portal Entry
              </button>
            </div>
          )}
        </div>

        {/* Footer Compliance Metadata */}
        <footer className="mt-12 space-y-8 animate-fade-in [animation-delay:400ms]">
          <div className="flex flex-wrap justify-center gap-3">
            {COMPLIANCE_BADGES.map(b => (
              <div key={b.label} className="px-3 py-1.5 rounded-full bg-[#08160F] border border-[#1B3028] text-[9px] font-black text-[#3A6055] uppercase tracking-widest flex items-center gap-2">
                <span className="text-sm">{b.flag}</span>
                {b.label}
              </div>
            ))}
          </div>
          <div className="text-center space-y-2">
            <p className="text-[9px] font-black text-[#1B3028] uppercase tracking-[0.5em]">SEWA XAI V2.4.1 — ZERO_KNOWLEDGE_ARCHITECTURE</p>
            <p className="text-[9px] text-[#3A6055] font-medium leading-relaxed">End-to-end encrypted clinical node. Audited for HIPAA, GDPR, and NHS DSPT compliance.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

const inputClass = "w-full bg-[#05100D] border border-[#1B3028] rounded-2xl pl-12 pr-4 py-4 text-sm text-[#D0ECE6] outline-none focus:border-[#408D7B] transition-all placeholder:text-[#3A6055]";
