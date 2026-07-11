// SEWA XAI — ProfileSettings.tsx
// Management of Clinical Persona, Notification Rules, and Security
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../services/apiClient';
import { StatusBanner } from '../../design-system/components';

export function ProfileSettings() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile'|'security'|'notifications'|'ai-language'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [reportLanguage, setReportLanguage] = useState('en');
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);

  const LANGUAGES = [
    { code: 'en', native: 'English',    market: 'UK, US, Global',                    rtl: false },
    { code: 'ha', native: 'Hausa',      market: 'N. Nigeria, Niger, Chad',           rtl: false },
    { code: 'yo', native: 'Yorùbá',     market: 'SW Nigeria, Benin, Togo',           rtl: false },
    { code: 'ig', native: 'Igbo',       market: 'SE Nigeria',                        rtl: false },
    { code: 'sw', native: 'Kiswahili',  market: 'Kenya, Tanzania, Uganda, DRC',      rtl: false },
    { code: 'fr', native: 'Français',   market: 'West Africa (Côte d\'Ivoire), EU',  rtl: false },
    { code: 'pt', native: 'Português',  market: 'Mozambique, Angola, Brazil',        rtl: false },
    { code: 'ar', native: 'العربية',    market: 'Egypt, Sudan, N. Africa',           rtl: true  },
  ];

  useEffect(() => {
    // Fetch tenant settings to load current report language
    apiClient.get('/tenants/me').then((res: any) => {
      if (res.data?.reportLanguage) setReportLanguage(res.data.reportLanguage);
    }).catch(() => {});
  }, []);

  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    speciality: (user as any)?.speciality || '',
    language: user?.language || 'en',
    notifPrefs: (user as any)?.notifPrefs || { push:true, email:true, whatsapp:true, sms:false }
  });

  const [status, setStatus] = useState<{ msg:string; type:'ok'|'err' } | null>(null);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName,
        lastName: user.lastName,
        speciality: (user as any).speciality || '',
        language: user.language || 'en',
        notifPrefs: (user as any).notifPrefs || { push:true, email:true, whatsapp:true, sms:false }
      });
    }
  }, [user]);

  const handleSaveLanguage = async () => {
    setIsSavingLanguage(true);
    setStatus(null);
    try {
      await apiClient.patch('/tenants/me', { reportLanguage });
      setStatus({ msg: `AI report language updated to '${LANGUAGES.find(l => l.code === reportLanguage)?.native || reportLanguage}'. All new VLM reports will use this language.`, type: 'ok' });
    } catch (err: any) {
      setStatus({ msg: err.response?.data?.message || 'Language update failed.', type: 'err' });
    } finally {
      setIsSavingLanguage(false);
    }
  };

  const toggleNotif = (key: string) => {
    setForm(f => ({
      ...f,
      notifPrefs: { ...f.notifPrefs, [key]: !(f.notifPrefs as any)[key] }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);
    try {
      await apiClient.patch('/users/me', form);
      useAuthStore.setState(state => ({
        user: state.user ? { ...state.user, ...form } : null
      }));
      setStatus({ msg: 'Clinical profile updated successfully.', type: 'ok' });
    } catch (err: any) {
      setStatus({ msg: err.response?.data?.message || 'Update failed.', type: 'err' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passForm.currentPassword || !passForm.newPassword) {
      setStatus({ msg: 'Please fill in all password fields.', type: 'err' });
      return;
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      setStatus({ msg: 'New passwords do not match.', type: 'err' });
      return;
    }
    setIsChangingPass(true);
    setStatus(null);
    try {
      await apiClient.patch('/users/me/password', {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword
      });
      setStatus({ msg: 'Password updated successfully.', type: 'ok' });
      setShowPasswordModal(false);
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setStatus({ msg: err.response?.data?.message || 'Password update failed.', type: 'err' });
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 animate-fade-in">
      
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-[#D0ECE6] tracking-tighter">Account Terminal</h1>
        <p className="text-[#6FA898] mt-2 font-medium">Configure clinical identity, triage routing, and node security.</p>
      </div>

      <StatusBanner status={status} onClose={() => setStatus(null)} />

      <div className="flex flex-col md:flex-row gap-12">
        
        {/* Navigation */}
        <nav className="w-full md:w-64 flex flex-col gap-2">
          {[
            { id: 'profile', label: 'Clinical Profile', icon: '👤' },
            { id: 'security', label: 'Node Security', icon: '🔒' },
            { id: 'notifications', label: 'Triage Alerts', icon: '🔔' },
            { id: 'ai-language', label: 'AI Report Language', icon: '🌍' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-[#408D7B]/10 text-[#408D7B] border border-[#408D7B]/30' 
                  : 'text-[#3A6055] hover:text-[#6FA898] border border-transparent'
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </nav>

        {/* Content Area */}
        <div className="flex-1 bg-[#08160F] border border-[#1B3028] rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#408D7B]/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-fade-in">
              <h2 className="text-xl font-black text-[#D0ECE6] tracking-tight border-b border-[#1B3028] pb-4">Personal Metadata</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Given Name</label>
                  <input 
                    value={form.firstName} 
                    onChange={e => setForm({...form, firstName: e.target.value})}
                    className="w-full bg-[#0C1D17] border border-[#1B3028] rounded-xl px-4 py-3 text-sm focus:border-[#408D7B] transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Family Name</label>
                  <input 
                    value={form.lastName} 
                    onChange={e => setForm({...form, lastName: e.target.value})}
                    className="w-full bg-[#0C1D17] border border-[#1B3028] rounded-xl px-4 py-3 text-sm focus:border-[#408D7B] transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Clinical Specialty</label>
                <input 
                  value={form.speciality} 
                  onChange={e => setForm({...form, speciality: e.target.value})}
                  placeholder="e.g. Neuroradiology"
                  className="w-full bg-[#0C1D17] border border-[#1B3028] rounded-xl px-4 py-3 text-sm focus:border-[#408D7B] transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#1B3028]">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Auth Identifier</span>
                  <div className="text-xs font-mono text-[#6FA898] bg-[#05100D] p-3 rounded-lg border border-[#1B3028]">{user?.email}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Clinical Permissions</span>
                  <div className="inline-block px-3 py-1.5 rounded-lg bg-[#408D7B]/10 text-[#408D7B] text-[10px] font-black uppercase tracking-widest border border-[#408D7B]/20">
                    {user?.role || 'Clinician'} Node
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8 animate-fade-in">
              <h2 className="text-xl font-black text-[#D0ECE6] tracking-tight border-b border-[#1B3028] pb-4">Encryption & Keys</h2>
              
              <div className="p-6 bg-[#0C1D17] border border-[#1B3028] rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                  <div className="text-sm font-bold text-[#D0ECE6]">Two-Factor Authentication</div>
                  <div className="text-[10px] text-[#3A6055] font-bold uppercase tracking-widest mt-1">Multi-factor node protection is active</div>
                </div>
                <button className="px-5 py-2.5 rounded-xl bg-[#408D7B]/10 text-[#408D7B] border border-[#408D7B]/20 text-[10px] font-black uppercase tracking-widest hover:bg-[#408D7B] hover:text-white transition-all">Regenerate Keys</button>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl border border-[#1B3028] text-[#D0ECE6] text-[10px] font-black uppercase tracking-widest hover:bg-[#111F1A] transition-all"
                >
                  Rotate Access Password
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-8 animate-fade-in">
              <h2 className="text-xl font-black text-[#D0ECE6] tracking-tight border-b border-[#1B3028] pb-4">Alert Routing</h2>
              
              <div className="space-y-4">
                {[
                  { id: 'push', label: 'STAT Scan Hooks', desc: 'Critical findings trigger terminal-level push notifications.', icon: '🛰️' },
                  { id: 'email', label: 'Clinical Dispatch', desc: 'Patient summary and AI findings delivered via secure email.', icon: '📧' },
                  { id: 'whatsapp', label: 'Mobile Triage', desc: 'Encrypted WhatsApp dispatch for rapid trauma alerts.', icon: '📱' }
                ].map((n) => {
                  const active = (form.notifPrefs as any)[n.id];
                  return (
                    <div key={n.id} className="p-5 bg-[#0C1D17] border border-[#1B3028] rounded-2xl flex justify-between items-center group hover:border-[#408D7B]/30 transition-all">
                      <div className="flex gap-4 items-center">
                        <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">{n.icon}</span>
                        <div>
                          <div className="text-sm font-bold text-[#D0ECE6]">{n.label}</div>
                          <div className="text-[10px] text-[#3A6055] font-bold uppercase tracking-widest mt-0.5">{n.desc}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleNotif(n.id)}
                        className={`w-12 h-6 rounded-full relative transition-all ${active ? 'bg-[#408D7B]' : 'bg-[#1B3028]'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${active ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'ai-language' && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-xl font-black text-[#D0ECE6] tracking-tight border-b border-[#1B3028] pb-4">AI Report Language</h2>
                <p className="text-[11px] text-[#6FA898] font-medium mt-3 leading-relaxed">
                  Select the language for AI-generated clinical reports. SEWA XAI is the <span className="text-[#408D7B] font-bold">only clinical AI platform</span> that generates reports in African languages. All new scan reports will be generated in this language automatically.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    id={`lang-${lang.code}`}
                    onClick={() => setReportLanguage(lang.code)}
                    className={`p-4 rounded-2xl border text-left transition-all group ${
                      reportLanguage === lang.code
                        ? 'bg-[#408D7B]/10 border-[#408D7B]/50 shadow-[0_0_20px_rgba(64,141,123,0.15)]'
                        : 'bg-[#0C1D17] border-[#1B3028] hover:border-[#408D7B]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-black tracking-tight ${
                        reportLanguage === lang.code ? 'text-[#52B09A]' : 'text-[#D0ECE6]'
                      } ${lang.rtl ? 'dir-rtl text-right w-full' : ''}`}>
                        {lang.native}
                      </span>
                      {reportLanguage === lang.code && (
                        <span className="text-[#408D7B] text-lg">✓</span>
                      )}
                      {lang.rtl && (
                        <span className="text-[9px] text-[#E08A20] bg-[#2A1800] px-1.5 py-0.5 rounded font-bold">RTL</span>
                      )}
                    </div>
                    <div className="text-[9px] font-bold text-[#3A6055] uppercase tracking-widest">{lang.market}</div>
                  </button>
                ))}
              </div>

              <div className="p-4 bg-[#0A1F14] border border-[#1DBF73]/20 rounded-2xl text-[11px] text-[#6FA898] leading-relaxed">
                <span className="text-[#1DBF73] font-black uppercase tracking-widest">MOAT INSIGHT · </span>
                No competitor (Qure.ai, Aidoc, Viz.ai, Nuance) supports Hausa, Yoruba, Igbo or Swahili. This is an exclusive SEWA XAI capability covering 400M+ potential clinical users across Sub-Saharan Africa.
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveLanguage}
                  disabled={isSavingLanguage}
                  id="save-report-language"
                  className="px-10 py-4 rounded-xl bg-[#408D7B] hover:bg-[#52B09A] disabled:opacity-30 transition-all text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-[#408D7B]/20 active:scale-95"
                >
                  {isSavingLanguage ? 'Saving...' : 'Apply Language Setting'}
                </button>
              </div>
            </div>
          )}

          {activeTab !== 'ai-language' && (
          <div className="mt-12 pt-8 border-t border-[#1B3028] flex justify-end">
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className="px-10 py-4 rounded-xl bg-[#408D7B] hover:bg-[#52B09A] disabled:opacity-30 transition-all text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-[#408D7B]/20 active:scale-95"
            >
              {isSaving ? 'Syncing...' : 'Confirm Metadata Changes'}
            </button>
          </div>
          )}
        </div>
      </div>


      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#05100D]/90 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#08160F] border border-[#1B3028] rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#408D7B]/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            
            <h3 className="text-2xl font-black text-[#D0ECE6] tracking-tighter mb-8">Rotate Access Password</h3>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Existing Password</label>
                <input 
                  type="password" 
                  value={passForm.currentPassword} 
                  onChange={e => setPassForm({...passForm, currentPassword: e.target.value})}
                  className="w-full bg-[#0C1D17] border border-[#1B3028] rounded-xl px-4 py-3 text-sm focus:border-[#408D7B] transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">New Credential</label>
                <input 
                  type="password" 
                  value={passForm.newPassword} 
                  onChange={e => setPassForm({...passForm, newPassword: e.target.value})}
                  className="w-full bg-[#0C1D17] border border-[#1B3028] rounded-xl px-4 py-3 text-sm focus:border-[#408D7B] transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Confirm Credential</label>
                <input 
                  type="password" 
                  value={passForm.confirmPassword} 
                  onChange={e => setPassForm({...passForm, confirmPassword: e.target.value})}
                  className="w-full bg-[#0C1D17] border border-[#1B3028] rounded-xl px-4 py-3 text-sm focus:border-[#408D7B] transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 py-4 rounded-xl border border-[#1B3028] text-[#3A6055] text-[10px] font-black uppercase tracking-widest hover:text-[#D0ECE6] transition-all"
              >
                Abort
              </button>
              <button 
                onClick={handlePasswordChange}
                disabled={isChangingPass}
                className="flex-2 px-8 py-4 rounded-xl bg-[#408D7B] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#52B09A] transition-all shadow-lg active:scale-95"
              >
                {isChangingPass ? 'Rotating...' : 'Rotate Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
