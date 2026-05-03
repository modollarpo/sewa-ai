// SEWA AI — PatientPortal.tsx
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
    <div style={{maxWidth:860,margin:'0 auto',padding:24,fontFamily:C.F,minHeight:'80vh'}}>
      <div style={{marginBottom:32}}>
        <h1 style={{margin:0,fontSize:24,fontWeight:700,color:C.textHi}}>Welcome back, {user?.firstName || 'Patient'}</h1>
        <p style={{margin:'4px 0 0',fontSize:14,color:C.textMd}}>Your secure medical imaging & AI triage history</p>
      </div>

      <div style={{display:'flex',gap:12,borderBottom:`1px solid ${C.border}`,marginBottom:24,overflowX:'auto'}}>
        {['scans','appointments','progression','billing','account'].map(t=>(
          <button key={t} style={tabStyle(t)} onClick={()=>setTab(t as any)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab==='scans' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {scansLoading ? <Skeleton height={100}/> : scans.length === 0 ? (
            <div style={{padding:40,background:C.bg2,borderRadius:16,border:`1px solid ${C.border}`,textAlign:'center',color:C.textLo}}>
              No scans available in your record yet.
            </div>
          ) : scans.map((s:any)=>(
            <div key={s.id} style={{padding:20,background:C.bg2,borderRadius:16,border:`1px solid ${C.border}`}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                <div style={{fontSize:16,fontWeight:700,color:C.textHi}}>{s.modality} {s.bodyPart}</div>
                <div style={{fontSize:12,color:C.textLo}}>{new Date(s.receivedAt || s.createdAt).toLocaleDateString()}</div>
              </div>
              <div style={{fontSize:13,color:C.textMd,lineHeight:1.5}}>{s.aiResult?.summary || s.aiSummary || 'Analysis pending radiologist sign-off.'}</div>
              {s.aiResult?.confidence && (
                <div style={{marginTop:12, fontSize:11, color:C.brandLt, fontWeight:600}}>
                  AI System Confidence: {Math.round(s.aiResult.confidence * 100)}%
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab==='appointments' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h3 style={{margin:0,color:C.textHi}}>Appointments</h3>
            <button onClick={()=>setShowBooking(true)} style={{padding:'8px 16px',background:C.brand,color:'white',border:'none',borderRadius:8, cursor:'pointer'}}>+ Book</button>
          </div>
          {apptsLoading ? <Skeleton height={60}/> : appointments.length === 0 ? (
            <div style={{padding:40,textAlign:'center',color:C.textLo}}>No upcoming appointments.</div>
          ) : appointments.map((a:any)=>(
            <div key={a.id} style={{padding:16,background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`}}>
               <div style={{fontSize:14,fontWeight:700,color:C.textHi}}>{a.type.toUpperCase().replace('_',' ')}</div>
               <div style={{fontSize:12,color:C.textMd}}>{new Date(a.scheduledDate).toLocaleString()}</div>
               <div style={{fontSize:10,color:C.brand,marginTop:4}}>Status: {a.status || 'Confirmed'}</div>
            </div>
          ))}
        </div>
      )}

      {tab==='progression' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{padding:20,background:C.bg2,borderRadius:16,border:`1px solid ${C.border}`}}>
            <h3 style={{color:C.textHi, margin:'0 0 16px'}}>Disease Progression (AI-Tracked)</h3>
            <p style={{fontSize:13, color:C.textMd, marginBottom:24}}>Longitudinal tracking of lesion volumes and clinical findings across all your scans.</p>
            
            {scans.length < 2 ? (
              <div style={{padding:30, textAlign:'center', color:C.textLo, fontSize:12}}>
                Longitudinal analysis requires at least two completed scans.
              </div>
            ) : (
              <div style={{position:'relative', paddingLeft:24, borderLeft:`1px dashed ${C.border}`, marginLeft:12}}>
                {scans.map((s:any, i:number) => (
                  <div key={s.id} style={{marginBottom:32, position:'relative'}}>
                    <div style={{position:'absolute', left:-29, top:4, width:10, height:10, borderRadius:'50%', background: s.aiResult?.urgency === 'CRITICAL' ? C.critical : C.brand, border:`3px solid ${C.bg2}`}} />
                    <div style={{fontSize:11, color:C.textLo, marginBottom:4}}>{new Date(s.receivedAt || s.createdAt).toLocaleDateString()}</div>
                    <div style={{fontSize:15, fontWeight:700, color:C.textHi}}>{s.aiResult?.primaryFinding || 'Routine Analysis'}</div>
                    <div style={{fontSize:12, color:C.textMd, marginTop:4}}>
                      Scan ID: {s.id.substring(0,8)} · {s.modality} {s.bodyPart}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab==='billing' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{padding:20,background:C.bg2,borderRadius:16,border:`1px solid ${C.border}`}}>
            <h3 style={{color:C.textHi, margin:'0 0 16px'}}>Billing &amp; Payments</h3>
            {paymentsLoading ? (
              <Skeleton height={60}/>
            ) : payments.length === 0 ? (
              <div style={{padding:'24px 0',color:C.textLo,fontSize:12,textAlign:'center'}}>
                No payment records found for your account.
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {payments.map((p:any, i:number) => (
                  <div key={p.id ?? i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderTop:`1px solid ${C.border}`}}>
                    <div>
                      <div style={{color:C.textHi,fontWeight:600,fontSize:13}}>{p.planName || 'Subscription'}</div>
                      <div style={{color:C.textLo,fontSize:11,marginTop:2}}>
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : p.date || '—'}
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{color:C.brand,fontWeight:700,fontFamily:C.FM,fontSize:14}}>
                        {p.currency || 'GBP'} {p.amount ? (Number(p.amount)/100).toFixed(2) : p.amountDisplay || '—'}
                      </div>
                      <div style={{marginTop:4}}>
                        <span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,
                          background: p.status==='paid'?'#0A1F14':'#2A0A0A',
                          color: p.status==='paid'?C.normal:C.critical,
                          border:`1px solid ${p.status==='paid'?'#0D2A1A':'#4A1515'}`}}>
                          {p.status === 'paid' ? '✓ Paid' : p.status || 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab==='account' && (
        <div style={{maxWidth:400}}>
           <div style={{padding:16,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:11,color:C.textLo, fontWeight:700, marginBottom:8}}>SECURE CLINICAL IDENTITY</div>
              <div style={{color:C.textHi, fontSize:15, fontWeight:600}}>{user?.firstName} {user?.lastName}</div>
              <div style={{color:C.textLo, fontSize:12, marginTop:4}}>{user?.email}</div>
              <div style={{marginTop:16, paddingTop:16, borderTop:`1px solid ${C.border}`}}>
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  style={{background:'none', border:`1px solid ${C.border}`, color:C.textHi, padding:'8px 16px', borderRadius:8, fontSize:11, cursor:'pointer'}}
                >
                  Change Password
                </button>
              </div>
           </div>
        </div>
      )}

      {showPasswordModal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:1000, 
          display:'flex', alignItems:'center', justifyContent:'center', padding:20
        }}>
          <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16, padding:24, width:'100%', maxWidth:400 }}>
            <h3 style={{ color:C.textHi, margin:'0 0 20px', fontSize:16 }}>Change Password</h3>
            {status && (
              <div style={{ padding:10, borderRadius:8, marginBottom:16, background:`${status.type==='ok'?C.normal:C.critical}15`, border:`1px solid ${status.type==='ok'?C.normal:C.critical}30`, color:status.type==='ok'?C.normal:C.critical, fontSize:12 }}>
                {status.msg}
              </div>
            )}
            <label style={{ fontSize:10, color:C.textLo, display:'block', marginBottom:4 }}>CURRENT PASSWORD</label>
            <input type="password" value={passForm.currentPassword} onChange={e=>setPassForm({...passForm, currentPassword:e.target.value})} style={inputStyle} />
            <label style={{ fontSize:10, color:C.textLo, display:'block', marginBottom:4 }}>NEW PASSWORD</label>
            <input type="password" value={passForm.newPassword} onChange={e=>setPassForm({...passForm, newPassword:e.target.value})} style={inputStyle} />
            <label style={{ fontSize:10, color:C.textLo, display:'block', marginBottom:4 }}>CONFIRM NEW PASSWORD</label>
            <input type="password" value={passForm.confirmPassword} onChange={e=>setPassForm({...passForm, confirmPassword:e.target.value})} style={inputStyle} />
            <div style={{ display:'flex', gap:10, marginTop:10 }}>
              <button onClick={() => { setShowPasswordModal(false); setStatus(null); }} style={{ flex:1, padding:10, background:C.bg3, color:C.textHi, border:'none', borderRadius:8, cursor:'pointer' }}>Cancel</button>
              <button onClick={handlePasswordChange} disabled={isChangingPass} style={{
                flex:1, padding:10, background:C.brand, color:'white', border:'none', borderRadius:8,
                fontWeight:700, cursor:'pointer', opacity: isChangingPass ? 0.6 : 1
              }}>
                {isChangingPass ? 'Updating...' : 'Update'}
              </button>
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
