// SEWA XAI — RegisterPage.tsx
// Onboarding for Patients and Practitioners
import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';

const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A',
  brand:'#408D7B', brandLt:'#52B09A', brandDk:'#2E6B5E',
  critical:'#E03535', normal:'#1DBF73', info:'#2A6EF2',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028', F:"'IBM Plex Sans',system-ui,sans-serif", FM:"'IBM Plex Mono',monospace",
};

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

export function RegisterPage({ onLogin, onInstitutionalOnboarding }: { onLogin:()=>void, onInstitutionalOnboarding:()=>void }) {
  const [role, setRole] = useState<'patient'|'expert'|'specialist'>('patient');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', hospitalCode:'', speciality:'', licenseNumber:'' });
  const { register, isLoading, error } = useAuthStore();
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    try {
      if (role === 'specialist') {
        const url = await useAuthStore.getState().registerSpecialist({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          specialty: form.speciality,
          licenseNumber: form.licenseNumber
        });
        setLocalSuccess(`Specialist account created! Redirecting you to Stripe Connect...`);
        setTimeout(() => { window.location.href = url; }, 1500);
        return;
      }

      // Logic: Patients are often global or assigned to a default 'Sewa Patient Portal' tenant
      // Experts MUST provide a valid hospital code/slug.
      const tenantSlug = role === 'patient' ? 'sewa-public' : form.hospitalCode.toLowerCase().trim();

      if (role === 'expert' && !tenantSlug) {
        setLocalError('Hospital facility code is required for practitioners.');
        return;
      }

      await register({
        tenantSlug,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        role: role === 'patient' ? 'patient' : 'doctor' 
      });
      
      setLocalSuccess(`Registration successful for ${form.email}. Please sign in.`);
      setTimeout(() => { onLogin(); }, 1500);
    } catch (err: any) {
      setLocalError(err.message || 'Registration failed. Please check your details.');
    }
  };

  const inputStyle = {
    width:'100%', padding:'12px 14px', background:C.bg3, border:`1px solid ${C.border}`,
    borderRadius:10, color:C.textHi, fontSize:14, fontFamily:C.F, outline:'none'
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05100D] relative overflow-hidden font-sans text-[#D0ECE6]">
      <BackgroundGrid />
      
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#408D7B]/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#408D7B]/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg p-6 animate-fade-in" style={{ padding: '16px' }}>
        
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
            SEWA XAI
          </div>
          <div style={{ fontSize: '12px', color: C.textMd, marginTop: '6px', letterSpacing: '0.04em' }}>
            Smart Early Warning Assistant
          </div>
        </div>

        <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:24, padding:32, boxShadow:'0 24px 64px rgba(0,0,0,0.5)', animation: 'fadeUp 400ms ease' }}>
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <div style={{ fontSize:22, fontWeight:800, color:C.textHi, letterSpacing:'-0.03em' }}>Join the Clinical Network</div>
            <p style={{ fontSize:13, color:C.textMd, marginTop:6 }}>Choose your role to begin onboarding</p>
          </div>

          {/* Error */}
          {(error || localError) && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: '10px', background: `${C.critical}14`, border: `1px solid ${C.critical}40`, color: C.critical, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️ {(error || localError)}</span>
            </div>
          )}

          {/* Success */}
          {localSuccess && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: '10px', background: `${C.normal}14`, border: `1px solid ${C.normal}40`, color: C.normal, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✓ {localSuccess}</span>
            </div>
          )}

        {step === 1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <button onClick={()=>{setRole('patient'); setStep(2);}} style={{ padding:20, background:C.bg2, border:`1px solid ${role==='patient'?C.brand:C.border}`, borderRadius:16, textAlign:'left', cursor:'pointer' }}>
              <div style={{ fontSize:24, marginBottom:8 }}>👤</div>
              <div style={{ fontWeight:700, color:C.textHi }}>Register as Patient</div>
              <div style={{ fontSize:12, color:C.textMd, marginTop:4 }}>Track your scans, view reports, and manage clinical consent.</div>
            </button>
            <button onClick={()=>{setRole('specialist'); setStep(2);}} style={{ padding:20, background:C.bg2, border:`1px solid ${role==='specialist'?C.info:C.border}`, borderRadius:16, textAlign:'left', cursor:'pointer' }}>
              <div style={{ fontSize:24, marginBottom:8 }}>🌟</div>
              <div style={{ fontWeight:700, color:C.textHi }}>Independent Specialist Network</div>
              <div style={{ fontSize:12, color:C.textMd, marginTop:4 }}>Provide second opinions on the SEWA marketplace and earn revenue.</div>
            </button>
            <button onClick={()=>{setRole('expert'); setStep(2);}} style={{ padding:20, background:C.bg2, border:`1px solid ${C.brand}60`, borderRadius:16, textAlign:'left', cursor:'pointer' }}>
              <div style={{ fontSize:24, marginBottom:8 }}>🏥</div>
              <div style={{ fontWeight:700, color:C.textHi }}>Hospital & Institutional Access</div>
              <div style={{ fontSize:12, color:C.textMd, marginTop:4 }}>For Doctors, Radiologists, and Hospital Administrators setting up new facilities.</div>
            </button>
            <button onClick={onLogin} style={{ marginTop:12, background:'none', border:'none', color:C.textLo, fontSize:13, cursor:'pointer' }}>Already have an account? Sign In</button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {role === 'expert' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:12 }}>
                <div style={{ fontSize:13, color:C.textMd, fontWeight:600 }}>I AM...</div>
                <div style={{ display:'flex', gap:8 }}>
                  <button type="button" onClick={() => setForm({...form, hospitalCode:''})} style={{ flex:1, padding:12, background:!form.hospitalCode?'#1DBF7320':C.bg3, border:`1px solid ${!form.hospitalCode?C.normal:C.border}`, borderRadius:10, color:!form.hospitalCode?C.normal:C.textMd, fontSize:12, fontWeight:700, cursor:'pointer' }}>REGISTERING NEW HOSPITAL</button>
                  <button type="button" onClick={() => setForm({...form, hospitalCode:'PENDING'})} style={{ flex:1, padding:12, background:form.hospitalCode?'#408D7B20':C.bg3, border:`1px solid ${form.hospitalCode?C.brand:C.border}`, borderRadius:10, color:form.hospitalCode?C.brand:C.textMd, fontSize:12, fontWeight:700, cursor:'pointer' }}>JOINING EXISTING FACILITY</button>
                </div>
              </div>
            )}

            {role === 'expert' && form.hospitalCode === '' && (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <p style={{ fontSize:13, color:C.textMd, marginBottom:16 }}>To register a new institution, you must complete the Clinical Infrastructure Onboarding.</p>
                <button type="button" onClick={onInstitutionalOnboarding} style={{ width:'100%', height:44, background:C.brand, border:'none', borderRadius:10, color:'white', fontWeight:700, cursor:'pointer' }}>Launch Onboarding Wizard →</button>
              </div>
            )}

            {(role !== 'expert' || (role === 'expert' && form.hospitalCode !== '')) && (
              <>
                <div style={{ display:'flex', gap:12 }}>
                  <div style={{ flex:1 }}><label style={{ fontSize:11, color:C.textLo, display:'block', marginBottom:6 }}>FIRST NAME</label><input required value={form.firstName} onChange={e=>setForm({...form, firstName:e.target.value})} style={inputStyle} /></div>
                  <div style={{ flex:1 }}><label style={{ fontSize:11, color:C.textLo, display:'block', marginBottom:6 }}>LAST NAME</label><input required value={form.lastName} onChange={e=>setForm({...form, lastName:e.target.value})} style={inputStyle} /></div>
                </div>
                <div><label style={{ fontSize:11, color:C.textLo, display:'block', marginBottom:6 }}>EMAIL ADDRESS</label><input type="email" required value={form.email} onChange={e=>setForm({...form, email:e.target.value})} style={inputStyle} /></div>
                
                {role === 'expert' && (
                  <div><label style={{ fontSize:11, color:C.textLo, display:'block', marginBottom:6 }}>HOSPITAL FACILITY CODE</label><input placeholder="RLH-UK-001" required value={form.hospitalCode === 'PENDING' ? '' : form.hospitalCode} onChange={e=>setForm({...form, hospitalCode:e.target.value})} style={inputStyle} /></div>
                )}
            {role === 'specialist' && (
              <div style={{ display:'flex', gap:12 }}>
                <div style={{ flex:1 }}><label style={{ fontSize:11, color:C.textLo, display:'block', marginBottom:6 }}>SPECIALITY</label><input required placeholder="e.g. Neuroradiology" value={form.speciality} onChange={e=>setForm({...form, speciality:e.target.value})} style={inputStyle} /></div>
                <div style={{ flex:1 }}><label style={{ fontSize:11, color:C.textLo, display:'block', marginBottom:6 }}>MEDICAL LICENSE #</label><input required placeholder="e.g. GMC 1234567" value={form.licenseNumber} onChange={e=>setForm({...form, licenseNumber:e.target.value})} style={inputStyle} /></div>
              </div>
            )}

            <div><label style={{ fontSize:11, color:C.textLo, display:'block', marginBottom:6 }}>PASSWORD</label><input type="password" required value={form.password} onChange={e=>setForm({...form, password:e.target.value})} style={inputStyle} /></div>
            
            <button type="submit" disabled={isLoading} style={{ marginTop:12, height:48, background: role === 'specialist' ? `linear-gradient(135deg,${C.info},#1038A0)` : `linear-gradient(135deg,${C.brand},${C.brandDk})`, border:'none', borderRadius:12, color:'white', fontWeight:700, cursor:'pointer', fontSize:15 }}>
              {isLoading ? 'Processing...' : role === 'specialist' ? 'Connect Stripe & Join →' : 'Continue Registration →'}
            </button>
          </>
        )}
            <button onClick={()=>setStep(1)} type="button" style={{ background:'none', border:'none', color:C.textLo, fontSize:13, cursor:'pointer' }}>Back to role selection</button>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}
