// SEWA AI — SpecialistOnboarding.tsx
// Onboarding for independent clinical specialists to join the referral marketplace
import React, { useState } from 'react';
import { apiClient } from '../../services/apiClient';

const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A', bg4:'#162821',
  brand:'#408D7B', brandLt:'#52B09A', brandDk:'#2E6B5E',
  critical:'#E03535', urgent:'#E08A20', normal:'#1DBF73',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028', F:"'IBM Plex Sans',system-ui,sans-serif", FM:"'IBM Plex Mono',monospace",
};

export function SpecialistOnboarding() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    firstName: '', lastName: '', email: '', password: '',
    speciality: '', licenseNumber: '', bio: '',
    agreedToTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [stripeLink, setStripeLink] = useState('');

  const update = (fields: Partial<typeof data>) => setData(d => ({ ...d, ...fields }));

  const handleRegister = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/register-specialist', data);
      setStripeLink(res.data.stripeOnboardingUrl);
      setStep(2);
    } catch (err: any) {
      alert(`Registration failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:C.bg0, display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:C.F }}>
      <div style={{ width:'100%', maxWidth:440, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:24, padding:40, boxShadow:'0 20px 40px rgba(0,0,0,0.4)' }}>
        
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:C.brand, display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
            <span style={{ fontSize:24 }}>👨‍⚕️</span>
          </div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:C.textHi }}>Specialist Network</h1>
          <p style={{ margin:'8px 0 0', fontSize:13, color:C.textLo }}>Join the SEWA AI clinical referral marketplace</p>
        </div>

        {step === 1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <input value={data.firstName} onChange={e=>update({firstName:e.target.value})} placeholder="First Name" style={inputStyle}/>
              <input value={data.lastName} onChange={e=>update({lastName:e.target.value})} placeholder="Last Name" style={inputStyle}/>
            </div>
            <input value={data.email} onChange={e=>update({email:e.target.value})} placeholder="Professional Email" style={inputStyle} type="email"/>
            <input value={data.password} onChange={e=>update({password:e.target.value})} placeholder="Create Password" style={inputStyle} type="password"/>
            
            <select value={data.speciality} onChange={e=>update({speciality:e.target.value})} style={inputStyle}>
              <option value="">Select Speciality…</option>
              <option value="radiology">Neuroradiology</option>
              <option value="cardiology">Cardiology</option>
              <option value="oncology">Oncology</option>
              <option value="general">Internal Medicine</option>
            </select>
            
            <input value={data.licenseNumber} onChange={e=>update({licenseNumber:e.target.value})} placeholder="Medical License Number (GMC/Medical Board)" style={inputStyle}/>

            <textarea value={data.bio} onChange={e=>update({bio:e.target.value})} placeholder="Professional Bio (Speciality, research interests, etc.)" style={{ ...inputStyle, height:80, padding:'10px 14px', resize:'none' }}/>
            
            <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginTop:8 }}>
              <input type="checkbox" checked={data.agreedToTerms} onChange={e=>update({agreedToTerms:e.target.checked})} style={{ marginTop:4 }}/>
              <span style={{ fontSize:11, color:C.textMd, lineHeight:1.5 }}>
                I agree to the SEWA AI Specialist Terms, including the 90/10 revenue split model and clinical liability policies.
              </span>
            </div>

            <button onClick={handleRegister} disabled={loading || !data.agreedToTerms} style={btnStyle}>
              {loading ? 'Creating Account…' : 'Join Network'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign:'center' }}>
            <div style={{ padding:20, background:`${C.normal}10`, border:`1px solid ${C.normal}40`, borderRadius:16, marginBottom:24 }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.normal, marginBottom:8 }}>Account Created!</div>
              <p style={{ fontSize:12, color:C.textMd, lineHeight:1.6, margin:0 }}>
                To receive referral fees, you must link your bank account via Stripe Connect. 
                Our platform uses Stripe to handle automated payouts and tax documentation.
              </p>
            </div>
            
            <a href={stripeLink} style={{ ...btnStyle, textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13.911 8.01c-1.018-.468-2.316-.71-3.32-.71-2.18 0-3.6 1.053-3.6 3.018 0 3.018 4.14 2.527 4.14 3.82 0 .526-.456.818-1.391.818-1.229 0-2.614-.526-3.702-1.076l-.631 2.91c1.192.573 2.754.912 4.07 1.1h1.106c2.316 0 3.737-1.123 3.737-3.141 0-3.263-4.14-2.667-4.14-3.924 0-.468.421-.737 1.229-.737.982 0 2.21.351 3.105.818l.795-3.09z"/></svg>
              Connect with Stripe
            </a>
            
            <button onClick={() => window.location.href='/login'} style={{ background:'none', border:'none', color:C.textLo, fontSize:11, marginTop:16, cursor:'pointer' }}>
              I'll do this later (Limited features)
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width:'100%', height:44, padding:'0 14px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:12,
  color:C.textHi, fontSize:13, fontFamily:C.F, outline:'none', boxSizing:'border-box'
};

const btnStyle: React.CSSProperties = {
  width:'100%', height:48, background:C.brand, color:'white', border:'none', borderRadius:14,
  fontSize:14, fontWeight:800, cursor:'pointer', marginTop:12, transition:'transform 150ms',
  fontFamily:C.F, boxShadow:`0 4px 12px ${C.brand}40`
};
