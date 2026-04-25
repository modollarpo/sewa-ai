// SEWA AI — RegisterPage.tsx
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

export function RegisterPage({ onLogin }: { onLogin:()=>void }) {
  const [role, setRole] = useState<'patient'|'expert'>('patient');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', hospitalCode:'' });
  const { register, isLoading, error } = useAuthStore();
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    try {
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
      
      alert(`Registration successful for ${form.email}. Please sign in.`);
      onLogin();
    } catch (err: any) {
      setLocalError(err.message || 'Registration failed. Please check your hospital code.');
    }
  };

  const inputStyle = {
    width:'100%', padding:'12px 14px', background:C.bg3, border:`1px solid ${C.border}`,
    borderRadius:10, color:C.textHi, fontSize:14, fontFamily:C.F, outline:'none'
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:C.bg0, fontFamily:C.F, padding:20 }}>
      <div style={{ width:'100%', maxWidth:440, padding: '16px' }}>
        
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

        {step === 1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <button onClick={()=>{setRole('patient'); setStep(2);}} style={{ padding:20, background:C.bg2, border:`1px solid ${role==='patient'?C.brand:C.border}`, borderRadius:16, textAlign:'left', cursor:'pointer' }}>
              <div style={{ fontSize:24, marginBottom:8 }}>👤</div>
              <div style={{ fontWeight:700, color:C.textHi }}>Register as Patient</div>
              <div style={{ fontSize:12, color:C.textMd, marginTop:4 }}>Track your scans, view reports, and manage clinical consent.</div>
            </button>
            <button onClick={()=>{setRole('expert'); setStep(2);}} style={{ padding:20, background:C.bg2, border:`1px solid ${role==='expert'?C.brand:C.border}`, borderRadius:16, textAlign:'left', cursor:'pointer' }}>
              <div style={{ fontSize:24, marginBottom:8 }}>🩻</div>
              <div style={{ fontWeight:700, color:C.textHi }}>Practitioner Enrollment</div>
              <div style={{ fontSize:12, color:C.textMd, marginTop:4 }}>Doctors, Radiologists, and Techs. Requires secondary facility verification.</div>
            </button>
            <button onClick={onLogin} style={{ marginTop:12, background:'none', border:'none', color:C.textLo, fontSize:13, cursor:'pointer' }}>Already have an account? Sign In</button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', gap:12 }}>
              <div style={{ flex:1 }}><label style={{ fontSize:11, color:C.textLo, display:'block', marginBottom:6 }}>FIRST NAME</label><input required value={form.firstName} onChange={e=>setForm({...form, firstName:e.target.value})} style={inputStyle} /></div>
              <div style={{ flex:1 }}><label style={{ fontSize:11, color:C.textLo, display:'block', marginBottom:6 }}>LAST NAME</label><input required value={form.lastName} onChange={e=>setForm({...form, lastName:e.target.value})} style={inputStyle} /></div>
            </div>
            <div><label style={{ fontSize:11, color:C.textLo, display:'block', marginBottom:6 }}>EMAIL ADDRESS</label><input type="email" required value={form.email} onChange={e=>setForm({...form, email:e.target.value})} style={inputStyle} /></div>
            
            {role === 'expert' && (
              <div><label style={{ fontSize:11, color:C.textLo, display:'block', marginBottom:6 }}>HOSPITAL FACILITY CODE</label><input placeholder="RLH-UK-001" value={form.hospitalCode} onChange={e=>setForm({...form, hospitalCode:e.target.value})} style={inputStyle} /></div>
            )}

            <div><label style={{ fontSize:11, color:C.textLo, display:'block', marginBottom:6 }}>PASSWORD</label><input type="password" required value={form.password} onChange={e=>setForm({...form, password:e.target.value})} style={inputStyle} /></div>
            
            <button type="submit" disabled={isLoading} style={{ marginTop:12, height:48, background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, border:'none', borderRadius:12, color:'white', fontWeight:700, cursor:'pointer', fontSize:15 }}>
              {isLoading ? 'Creating Account...' : 'Continue Registration →'}
            </button>
            <button onClick={()=>setStep(1)} type="button" style={{ background:'none', border:'none', color:C.textLo, fontSize:13, cursor:'pointer' }}>Back to role selection</button>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}
