// SEWA XAI — SpecialistOnboarding.tsx
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
  const [errorMsg, setErrorMsg] = useState('');

  const update = (fields: Partial<typeof data>) => setData(d => ({ ...d, ...fields }));

  const handleRegister = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/register-specialist', data);
      setStripeLink(res.data.stripeOnboardingUrl);
      setStep(2);
    } catch (err: any) {
      setErrorMsg(`Registration failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05100D] flex items-center justify-center p-6 font-sans text-[#D0ECE6]">
      
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#408D7B]/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#408D7B]/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-lg bg-[#08160F] border border-[#1B3028] rounded-[2.5rem] p-10 lg:p-12 shadow-[0_32px_128px_rgba(0,0,0,0.6)] relative animate-fade-in">
        
        {/* Progress Indicator */}
        <div className="flex gap-1 mb-10 justify-center">
          {[1, 2].map(s => (
            <div key={s} className={`h-1 rounded-full transition-all duration-700 ${step >= s ? 'w-8 bg-[#408D7B]' : 'w-4 bg-[#1B3028]'}`} />
          ))}
        </div>

        <header className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#408D7B] to-[#52B09A] inline-flex items-center justify-center mb-6 shadow-xl shadow-[#408D7B]/20">
            <span className="text-3xl">👨‍⚕️</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#D0ECE6] uppercase">Specialist Network</h1>
          <p className="text-sm text-[#3A6055] font-medium mt-2">Join the institutional-grade clinical referral node.</p>
        </header>

        {errorMsg && (
          <div className="mb-8 p-4 rounded-2xl bg-[#2A0A0A] border border-[#E03535]/30 text-[#E03535] text-xs font-bold flex justify-between items-center animate-shake">
            <span className="flex items-center gap-2"><span>⚠️</span> {errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="opacity-50 hover:opacity-100">✕</button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-slide-up">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Given Name</label>
                <input value={data.firstName} onChange={e=>update({firstName:e.target.value})} placeholder="e.g. John" className={inputClass}/>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Surname</label>
                <input value={data.lastName} onChange={e=>update({lastName:e.target.value})} placeholder="e.g. Doe" className={inputClass}/>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Professional Email</label>
              <input value={data.email} onChange={e=>update({email:e.target.value})} placeholder="doctor@hospital.org" className={inputClass} type="email"/>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Secure Credential</label>
              <input value={data.password} onChange={e=>update({password:e.target.value})} placeholder="••••••••" className={inputClass} type="password"/>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Specialization</label>
                <select value={data.speciality} onChange={e=>update({speciality:e.target.value})} className={inputClass}>
                  <option value="">Select Domain...</option>
                  <option value="radiology">Neuroradiology / MRI</option>
                  <option value="cardiology">Cardiology / ECG</option>
                  <option value="ultrasound">POCUS / Sonography</option>
                  <option value="oncology">Oncology</option>
                  <option value="general">Internal Medicine</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Medical License</label>
                <input value={data.licenseNumber} onChange={e=>update({licenseNumber:e.target.value})} placeholder="GMC / Board ID" className={inputClass}/>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Clinical Profile</label>
              <textarea value={data.bio} onChange={e=>update({bio:e.target.value})} placeholder="Brief overview of clinical expertise..." className={`${inputClass} h-24 py-3 resize-none`}/>
            </div>
            
            <label className="flex gap-4 p-4 rounded-2xl bg-[#05100D] border border-[#1B3028] cursor-pointer group transition-all hover:border-[#408D7B]/30">
              <input type="checkbox" checked={data.agreedToTerms} onChange={e=>update({agreedToTerms:e.target.checked})} className="mt-1 w-4 h-4 rounded border-[#1B3028] bg-[#111F1A] text-[#408D7B] focus:ring-[#408D7B]" />
              <span className="text-[10px] text-[#6FA898] font-medium leading-relaxed uppercase tracking-wider">
                I agree to the SEWA XAI Specialist Agreement, including the 90/10 revenue model and clinical validation protocols.
              </span>
            </label>

            <button 
              onClick={handleRegister} 
              disabled={loading || !data.agreedToTerms} 
              className="w-full py-4 rounded-2xl bg-[#408D7B] hover:bg-[#52B09A] disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-[#408D7B]/20 active:scale-[0.98]"
            >
              {loading ? 'INITIALIZING_NODE...' : 'ACTIVATE_SPECIALIST_NODE'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="text-center space-y-8 animate-fade-in">
            <div className="p-8 bg-[#0A1F14] border border-[#1DBF73]/20 rounded-[2rem] space-y-4">
              <div className="text-3xl">✅</div>
              <h2 className="text-xl font-black text-[#1DBF73] uppercase tracking-tight">Identity Verified</h2>
              <p className="text-sm text-[#6FA898] leading-relaxed font-medium">
                Your clinical node is ready. To enable automated global payouts and referral fee processing, please link your institutional account via Stripe Connect.
              </p>
            </div>
            
            <div className="space-y-4">
              <a href={stripeLink} className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-[#635BFF] hover:bg-[#7A73FF] text-white text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-[#635BFF]/20 active:scale-[0.98]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13.911 8.01c-1.018-.468-2.316-.71-3.32-.71-2.18 0-3.6 1.053-3.6 3.018 0 3.018 4.14 2.527 4.14 3.82 0 .526-.456.818-1.391.818-1.229 0-2.614-.526-3.702-1.076l-.631 2.91c1.192.573 2.754.912 4.07 1.1h1.106c2.316 0 3.737-1.123 3.737-3.141 0-3.263-4.14-2.667-4.14-3.924 0-.468.421-.737 1.229-.737.982 0 2.21.351 3.105.818l.795-3.09z"/></svg>
                Stripe Connect Setup
              </a>
              
              <div className="pt-4 border-t border-[#1B3028]">
                <p className="text-[10px] text-[#3A6055] font-black uppercase tracking-[0.2em] mb-4">African Regional Payouts</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => alert("Paystack Integration Coming Soon. Please use Stripe Connect for now.")} className="py-3 rounded-xl bg-[#0BA4DB]/10 border border-[#0BA4DB]/30 hover:bg-[#0BA4DB]/20 text-[#0BA4DB] text-[10px] font-black uppercase tracking-wider transition-all">
                    Paystack
                  </button>
                  <button onClick={() => alert("Flutterwave Integration Coming Soon. Please use Stripe Connect for now.")} className="py-3 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/30 hover:bg-[#F5A623]/20 text-[#F5A623] text-[10px] font-black uppercase tracking-wider transition-all">
                    Flutterwave
                  </button>
                </div>
              </div>
              
              <button 
                onClick={() => window.location.href='/login'} 
                className="text-[10px] font-black text-[#3A6055] hover:text-[#D0ECE6] uppercase tracking-[0.3em] transition-colors"
              >
                Skip to Portal Node
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const inputClass = "w-full bg-[#05100D] border border-[#1B3028] rounded-xl px-4 py-2.5 text-xs text-[#D0ECE6] outline-none focus:border-[#408D7B] transition-all placeholder:text-[#3A6055]";

