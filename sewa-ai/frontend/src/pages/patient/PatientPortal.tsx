// SEWA AI — PatientPortal.tsx
// Patient-facing results portal: scan history, AI insights, appointments, billing
import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePatientData, usePatientAppointments } from '../../hooks/useDashboardData';
import { Skeleton } from '../../components/ui/Skeleton';
import { apiClient } from '../../services/apiClient';

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
              <h3 style={{color:C.textHi, margin:'0 0 16px'}}>Billing History</h3>
              {scans.filter((s:any)=>s.status==='complete'||s.status==='validated').length === 0 ? (
                <div style={{padding:'20px 0',color:C.textLo,fontSize:12,textAlign:'center'}}>No completed scans found for billing.</div>
              ) : scans.filter((s:any)=>s.status==='complete'||s.status==='validated').map((s:any)=>(
                <div key={s.id} style={{display:'flex',justifyContent:'space-between',padding:'12px 0',borderTop:`1px solid ${C.border}`}}>
                  <div style={{color:C.textHi}}>{s.modality} Analysis · {s.bodyPart}</div>
                  <div style={{color:s.cost ? C.brand : C.textLo,fontWeight:700, fontFamily:C.FM}}>
                    {s.cost ? `£${Number(s.cost).toFixed(2)}` : '£0.00'}
                  </div>
                </div>
              ))}
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
                <button style={{background:'none', border:`1px solid ${C.border}`, color:C.textHi, padding:'8px 16px', borderRadius:8, fontSize:11, cursor:'pointer'}}>Change Password</button>
              </div>
           </div>
        </div>
      )}

      {showBooking && <AppointmentModal onClose={() => setShowBooking(false)} />}
    </div>
  );
}
