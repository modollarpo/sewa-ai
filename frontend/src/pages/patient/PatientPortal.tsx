// SEWA XAI — PatientPortal.tsx
// Patient-facing results portal: scan history, AI insights, appointments, billing
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePatientData, usePatientAppointments } from '../../hooks/useDashboardData';
import { Skeleton } from '../../components/ui/Skeleton';
import { apiClient } from '../../services/apiClient';
import { AppointmentModal } from './AppointmentModal';

const C = {
  bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandLt:'#52B09A',
  critical:'#E03535',
  urgent:'#E08A20',
  normal:'#1DBF73',
  info:'#2A6EF2',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',
  F:"'IBM Plex Sans',sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

export function PatientPortal() {
  const { user } = useAuthStore();
  const { scans, loading: scansLoading } = usePatientData();
  const { appointments, loading: apptsLoading } = usePatientAppointments();
  const [tab, setTab] = useState<'scans'|'appointments'|'progression'|'consent'|'access'|'account'|'billing'>('scans');
  const [showBooking, setShowBooking] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [status, setStatus] = useState<{ msg:string; type:'ok'|'err' } | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  useEffect(() => {
    if (tab !== 'billing') return;
    setPaymentsLoading(true);
    apiClient.get('/payments/history')
      .then(r => {
        const list = Array.isArray(r.data.payments) ? r.data.payments : (Array.isArray(r.data) ? r.data : []);
        setPayments(list);
      })
      .catch(() => setPayments([]))
      .finally(() => setPaymentsLoading(false));
  }, [tab]);

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
      setTimeout(() => { setShowPasswordModal(false); setStatus(null); }, 1500);
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setStatus({ msg: err.response?.data?.message || 'Password update failed.', type: 'err' });
    } finally {
      setIsChangingPass(false);
    }
  };

  const tabStyle = (t:string):React.CSSProperties => ({
    padding:'8px 16px',fontSize:12,fontWeight:tab===t?600:400,
    color:tab===t?C.brand:C.textLo,background:'none',border:'none',
    borderBottom:`2px solid ${tab===t?C.brand:'transparent'}`,
    cursor:'pointer',fontFamily:C.F,whiteSpace:'nowrap',
  });

  return (
    <div className="min-h-screen bg-[#05100D] font-sans text-[#D0ECE6] p-4 lg:p-10 relative overflow-hidden">
      
      {/* Portal Header */}
      <header className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#408D7B]/10 border border-[#408D7B]/20 text-[#408D7B] text-[10px] font-black uppercase tracking-widest mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#408D7B] animate-pulse" /> Patient Secure Access
          </div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-[#D0ECE6]">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#408D7B] to-[#52B09A]">{user?.firstName || 'Patient'}</span>
          </h1>
          <p className="text-sm text-[#3A6055] font-medium max-w-md">
            Review your clinical insights, longitudinal tracking, and diagnostic results in your encrypted medical node.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowBooking(true)}
            className="px-6 py-3 rounded-xl bg-[#408D7B] hover:bg-[#52B09A] text-white text-xs font-black tracking-widest uppercase shadow-lg shadow-[#408D7B]/20 transition-all active:scale-95"
          >
            Schedule Imaging
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="max-w-5xl mx-auto flex items-center gap-1 p-1.5 bg-[#08160F] rounded-2xl border border-[#1B3028] mb-10 w-full md:w-fit overflow-x-auto scrollbar-none">
        {['scans','appointments','progression','billing','account'].map(t => (
          <button 
            key={t} 
            onClick={() => setTab(t as any)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              tab === t 
                ? 'bg-[#408D7B] text-white shadow-lg' 
                : 'text-[#3A6055] hover:text-[#D0ECE6] hover:bg-[#111F1A]'
            }`}
          >
            <span>{t==='scans'?'🩻':t==='appointments'?'📅':t==='progression'?'📈':t==='billing'?'💳':'👤'}</span>
            {t}
          </button>
        ))}
      </nav>

      <main className="max-w-5xl mx-auto animate-fade-in">
        {tab==='scans' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {scansLoading ? (
              <><Skeleton height={200}/><Skeleton height={200}/></>
            ) : scans.length === 0 ? (
              <div className="col-span-full p-20 bg-[#0C1D17] rounded-3xl border border-[#1B3028] text-center space-y-4">
                <div className="text-4xl opacity-20">📂</div>
                <p className="text-[#3A6055] font-medium uppercase tracking-widest text-xs">No diagnostic records found</p>
              </div>
            ) : scans.map((s:any)=>(
              <div key={s.id} className="group p-6 bg-[#0C1D17] rounded-3xl border border-[#1B3028] hover:border-[#408D7B]/50 transition-all duration-500 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 text-6xl group-hover:opacity-10 transition-opacity">🩻</div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-xs font-mono text-[#408D7B] uppercase tracking-widest mb-1">{s.modality} Scan • #{s.id.slice(0,8)}</div>
                    <h3 className="text-xl font-black text-[#D0ECE6] uppercase">{s.bodyPart}</h3>
                  </div>
                  <span className="text-[10px] font-bold text-[#3A6055] bg-[#050F0C] px-3 py-1 rounded-full border border-[#1B3028]">
                    {new Date(s.receivedAt || s.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-[#6FA898] leading-relaxed mb-6 font-medium">
                  {s.aiResult?.summary || s.aiSummary || 'Clinical interpretation in progress...'}
                </p>
                <div className="flex items-center justify-between pt-6 border-t border-[#1B3028]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#1DBF73] animate-pulse" />
                    <span className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest">Analysis Verified</span>
                  </div>
                  {s.aiResult?.confidence && (
                    <div className="text-[10px] font-mono text-[#408D7B]">
                      ACCURACY: {Math.round(s.aiResult.confidence * 100)}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==='appointments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-black text-[#D0ECE6] uppercase tracking-widest">Upcoming Schedules</h3>
              <span className="text-[10px] font-mono text-[#3A6055] uppercase">{appointments.length} active sessions</span>
            </div>
            {apptsLoading ? <Skeleton height={100}/> : appointments.length === 0 ? (
              <div className="p-16 bg-[#0C1D17] rounded-3xl border border-[#1B3028] text-center">
                <p className="text-[#3A6055] text-sm italic">No upcoming appointments scheduled.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointments.map((a:any)=>(
                  <div key={a.id} className="p-6 bg-[#0C1D17] rounded-2xl border border-[#1B3028] flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-[#111F1A] border border-[#1B3028] flex items-center justify-center text-2xl">📅</div>
                    <div>
                      <div className="text-sm font-black text-[#D0ECE6] uppercase tracking-wide">{a.type.toUpperCase().replace('_',' ')}</div>
                      <div className="text-xs text-[#6FA898] mt-1">{new Date(a.scheduledDate).toLocaleString()}</div>
                      <div className={`text-[9px] font-black uppercase tracking-[0.2em] mt-3 inline-block px-2 py-0.5 rounded ${
                        a.status === 'confirmed' ? 'bg-[#0A1F14] text-[#1DBF73]' : 'bg-[#2A1800] text-[#E08A20]'
                      }`}>
                        {a.status || 'Confirmed'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==='progression' && (
          <div className="p-8 bg-[#0C1D17] rounded-3xl border border-[#1B3028] shadow-2xl overflow-hidden">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-xl font-black text-[#D0ECE6] uppercase">Disease Progression</h3>
                <p className="text-sm text-[#3A6055] mt-1 font-medium">Longitudinal AI-Tracked analysis across your scan history.</p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-[#111F1A] border border-[#1B3028] text-[#408D7B] text-[10px] font-mono">
                DATA_NODE: {user?.id?.slice(0,12)}
              </div>
            </div>
            
            {scans.length < 2 ? (
              <div className="p-20 text-center border-2 border-dashed border-[#1B3028] rounded-2xl">
                <p className="text-[#3A6055] text-xs font-bold uppercase tracking-widest">
                  Longitudinal analysis requires ≥2 completed sessions.
                </p>
              </div>
            ) : (
              <div className="relative pl-8 border-l border-[#1B3028] ml-4 space-y-12">
                {scans.map((s:any, i:number) => (
                  <div key={s.id} className="relative group animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className={`absolute -left-[41px] top-1 w-4 h-4 rounded-full border-4 border-[#0C1D17] shadow-xl transition-all group-hover:scale-125 ${
                      s.aiResult?.urgency === 'CRITICAL' ? 'bg-[#E03535]' : 'bg-[#408D7B]'
                    }`} />
                    <div className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest mb-1">{new Date(s.receivedAt || s.createdAt).toLocaleDateString('en-GB', { month:'long', day:'numeric', year:'numeric' })}</div>
                    <div className="text-lg font-black text-[#D0ECE6] tracking-tight">{s.aiResult?.primaryFinding || 'Routine Diagnostic Event'}</div>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-[10px] font-mono bg-[#111F1A] px-2 py-1 rounded border border-[#1B3028] text-[#6FA898]">ID_{s.id.substring(0,8)}</span>
                      <span className="text-[10px] font-mono text-[#3A6055]">{s.modality} {s.bodyPart} Analysis</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==='billing' && (
          <div className="p-8 bg-[#0C1D17] rounded-3xl border border-[#1B3028] shadow-2xl">
            <h3 className="text-xl font-black text-[#D0ECE6] uppercase mb-8">Financial & Subscriptions</h3>
            {paymentsLoading ? (
              <Skeleton height={100}/>
            ) : payments.length === 0 ? (
              <div className="p-12 text-center italic text-[#3A6055] text-sm">No payment history found.</div>
            ) : (
              <div className="space-y-4">
                {payments.map((p:any, i:number) => (
                  <div key={p.id ?? i} className="flex justify-between items-center p-6 bg-[#111F1A] rounded-2xl border border-[#1B3028] transition-all hover:border-[#408D7B]/30 group">
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 rounded-xl bg-[#08160F] flex items-center justify-center text-lg grayscale group-hover:grayscale-0 transition-all">💳</div>
                      <div>
                        <div className="text-sm font-black text-[#D0ECE6] tracking-wide uppercase">{p.planName || 'Clinical Service'}</div>
                        <div className="text-[10px] font-mono text-[#3A6055] mt-1 uppercase tracking-widest">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : p.date || '—'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-[#408D7B] font-mono">
                        {p.currency || 'GBP'} {p.amount ? (Number(p.amount)/100).toFixed(2) : p.amountDisplay || '—'}
                      </div>
                      <div className={`text-[9px] font-black uppercase tracking-[0.2em] mt-2 inline-block px-2 py-0.5 rounded ${
                        p.status === 'paid' ? 'bg-[#0A1F14] text-[#1DBF73]' : 'bg-[#2A0A0A] text-[#E03535]'
                      }`}>
                        {p.status === 'paid' ? '✓ Paid' : 'Pending'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==='account' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-[#0C1D17] rounded-3xl border border-[#1B3028] space-y-6">
              <div className="text-[10px] font-black text-[#408D7B] uppercase tracking-[0.3em]">Identity Node</div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-[#D0ECE6] tracking-tight">{user?.firstName} {user?.lastName}</h3>
                <p className="text-sm text-[#3A6055] font-mono lowercase">{user?.email}</p>
              </div>
              <div className="pt-6 border-t border-[#1B3028]">
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="px-6 py-3 rounded-xl border border-[#1B3028] text-[#D0ECE6] hover:bg-[#111F1A] hover:border-[#408D7B] transition-all text-[10px] font-black uppercase tracking-widest w-full text-center"
                >
                  Manage Encryption Key
                </button>
              </div>
            </div>
            
            <div className="p-8 bg-gradient-to-br from-[#0C1D17] to-[#08160F] rounded-3xl border border-[#1B3028] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl group-hover:scale-110 transition-transform">🔒</div>
              <h3 className="text-lg font-black text-[#D0ECE6] uppercase mb-4">Security Policy</h3>
              <p className="text-xs text-[#3A6055] leading-relaxed mb-6 font-medium">
                Your medical data is encrypted with industry-standard AES-256 at rest and TLS 1.3 in transit. Only authorized clinical nodes can request access to your diagnostic history.
              </p>
              <div className="inline-flex items-center gap-2 text-[9px] font-mono text-[#408D7B] uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-[#408D7B]" /> HIPAA Compliant Node
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Password Modal (Optimized) */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-[#050F0C]/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#0C1D17] border border-[#1B3028] rounded-3xl shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden animate-slide-up">
            <div className="p-8 border-b border-[#1B3028] bg-[#111F1A] flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-[#D0ECE6] uppercase tracking-tight">Access Control</h2>
                <p className="text-[10px] text-[#3A6055] font-black uppercase tracking-widest mt-1">Identity Security Terminal</p>
              </div>
              <button onClick={()=>{ setShowPasswordModal(false); setStatus(null); }} className="text-[#3A6055] hover:text-[#D0ECE6] transition-colors">✕</button>
            </div>
            
            <div className="p-8 space-y-6">
              {status && (
                <div className={`p-4 rounded-xl text-xs font-bold border ${
                  status.type==='ok' ? 'bg-[#0A1F14] border-[#1DBF73]/30 text-[#1DBF73]' : 'bg-[#2A0A0A] border-[#E03535]/30 text-[#E03535]'
                }`}>
                  {status.msg}
                </div>
              )}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#3A6055] uppercase tracking-[0.2em]">Current Credential</label>
                  <input type="password" value={passForm.currentPassword} onChange={e=>setPassForm({...passForm, currentPassword:e.target.value})} className="w-full bg-[#050F0C] border border-[#1B3028] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#408D7B] transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#3A6055] uppercase tracking-[0.2em]">New Credential</label>
                  <input type="password" value={passForm.newPassword} onChange={e=>setPassForm({...passForm, newPassword:e.target.value})} className="w-full bg-[#050F0C] border border-[#1B3028] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#408D7B] transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#3A6055] uppercase tracking-[0.2em]">Confirm Credential</label>
                  <input type="password" value={passForm.confirmPassword} onChange={e=>setPassForm({...passForm, confirmPassword:e.target.value})} className="w-full bg-[#050F0C] border border-[#1B3028] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#408D7B] transition-colors" />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-[#3A6055] hover:text-[#D0ECE6] transition-all">Cancel</button>
                <button 
                  onClick={handlePasswordChange} 
                  disabled={isChangingPass}
                  className="flex-1 py-3 rounded-xl bg-[#408D7B] hover:bg-[#52B09A] text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-[#408D7B]/20"
                >
                  {isChangingPass ? 'SECURE_UPDATE...' : 'UPDATE_ACCESS'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBooking && <AppointmentModal onClose={() => setShowBooking(false)} />}
    </div>
  );

}

const inputStyle = {
  width:'100%', padding:10, background:'#111F1A', border:'1px solid #1B3028',
  borderRadius:8, color:'#D0ECE6', fontSize:13, outline:'none', marginBottom:12
};
