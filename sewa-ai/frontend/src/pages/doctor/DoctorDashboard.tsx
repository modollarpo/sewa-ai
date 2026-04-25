// SEWA AI — DoctorDashboard.tsx
// Physician workflow: patient list, AI alerts, critical findings, quick actions
import React, { useState, useEffect } from 'react';
import { useDoctorData } from '../../hooks/useDashboardData';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';
import { Skeleton } from '../../components/ui/Skeleton';
import { Tooltip } from '../../components/ui/Tooltip';

const C = {
  bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',bg4:'#162821',
  brand:'#408D7B',brandLt:'#52B09A',
  critical:'#E03535',critBg:'#2A0A0A',critBorder:'#4A1515',
  urgent:'#E08A20',urgBg:'#2A1800',
  normal:'#1DBF73',normalBg:'#0A1F14',
  info:'#2A6EF2',infoBg:'#0A1530',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',
  bg0:'#050F0C',
  F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
  fontBase:"'IBM Plex Sans', system-ui, sans-serif",
  fontMono:"'IBM Plex Mono', monospace",
};

function UrgencyDot({ u }:{ u:string }) {
  const m:Record<string,string> = {CRITICAL:C.critical,URGENT:C.urgent,NORMAL:C.normal,ROUTINE:C.textLo};
  const color = m[(u||'').toUpperCase()] ?? C.textLo;
  return <span style={{ width:7,height:7,borderRadius:'50%',background:color,display:'inline-block',flexShrink:0,boxShadow:`0 0-5px ${color}80` }} />;
}

function UrgencyBadge({ u }:{ u:string }) {
  const styles:Record<string,[string,string,string]> = {
    CRITICAL:[C.critical,C.critBg,C.critBorder],
    URGENT:[C.urgent,C.urgBg,'#3A2000'],
    NORMAL:[C.normal,C.normalBg,'#0D2A1A'],
    ROUTINE:[C.textLo,C.bg3,C.border],
  };
  const [color,bg,border] = styles[(u||'ROUTINE').toUpperCase()] ?? styles.ROUTINE;
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:20,
      fontSize:10,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',
      background:bg,color,border:`1px solid ${border}`,fontFamily:C.F}}>
      <span style={{width:4,height:4,borderRadius:'50%',background:color,boxShadow:`0 0 4px ${color}`}}/>
      {u||'ROUTINE'}
    </span>
  );
}

function ConfBar({ v,height=3 }:{ v:number,height?:number }) {
  const pct = Math.round(v*100);
  const color = pct>=85?C.normal:pct>=65?C.urgent:C.critical;
  return (
    <div style={{display:'flex',alignItems:'center',gap:6}}>
      <div style={{flex:1,height,background:C.bg4,borderRadius:2,overflow:'hidden'}}>
        <div style={{width:`${pct}%`,height:'100%',background:color,boxShadow:`0 0 4px ${color}50`}}/>
      </div>
      <span style={{fontSize:10,fontFamily:C.FM,fontWeight:700,color,minWidth:28,textAlign:'right'}}>{pct}%</span>
    </div>
  );
}

function urgencyColor(u:string) {
  const m:Record<string,string> = {CRITICAL:C.critical,URGENT:C.urgent,NORMAL:C.normal,ROUTINE:C.textMd};
  return m[(u||'').toUpperCase()] ?? C.textMd;
}

export function DoctorDashboard() {
  const { user } = useAuthStore();
  const { patients, alerts, loading } = useDoctorData();
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [tab, setTab] = useState<'patients'|'alerts'|'history'>('alerts');
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const r = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  const activeAlerts = alerts.filter(a => !dismissedAlerts.includes(a.id));
  const filteredPatients = patients.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.mrn.includes(search)
  );

  const criticalCount = activeAlerts.filter(a=>a.urgency==='CRITICAL').length;

  const tabStyle = (t:string):React.CSSProperties => ({
    padding:'8px 16px', borderRadius:'8px 8px 0 0', fontSize:12, fontWeight:600,
    background: tab===t ? C.bg2 : 'transparent',
    color: tab===t ? C.textHi : C.textLo,
    border:`1px solid ${tab===t?C.border:'transparent'}`,
    borderBottom: tab===t?`1px solid ${C.bg2}`:'none',
    cursor:'pointer', fontFamily:C.F, marginBottom:'-1px',
    display:'flex',alignItems:'center',gap:6,
  });

  const renderList = () => (
    <div style={{ flex: isMobile ? '1 1 100%' : '0 1 340px', minWidth: isMobile ? 'auto' : '280px', display:'flex', flexDirection:'column', borderRight: isMobile ? 'none' : `1px solid ${C.border}`, background:C.bg1 }}>
      {/* Header */}
      <div style={{padding:'16px',borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:C.textHi}}>Dr. {user?.lastName || 'Dashboard'}</div>
            <div style={{fontSize:11,color:C.textLo,marginTop:2}}>
              {new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}
            </div>
          </div>
          {criticalCount > 0 && (
            <div style={{
              padding:'4px 10px',borderRadius:20,
              background:C.critBg,border:`1px solid ${C.critBorder}`,
              display:'flex',alignItems:'center',gap:6,
            }}>
              <span style={{width:6,height:6,borderRadius:'50%',background:C.critical,boxShadow:`0 0 6px ${C.critical}`,animation:'blink 1s infinite'}}/>
              <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
              <span style={{fontSize:11,fontWeight:700,color:C.critical}}>{criticalCount} STAT</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:12}}>
          {[
            {label:'Patients',value:patients.length,color:C.textMd,tip:'Total unique patients assigned to you.'},
            {label:'STAT',value:activeAlerts.filter(a=>a.urgency==='CRITICAL').length,color:C.critical,tip:'Critical scans requiring immediate diagnostic attention.'},
            {label:'Pending',value:patients.filter(p=>p.status==='ai_complete').length,color:C.urgent,tip:'Scans processed by AI but not yet signed by a radiologist.'},
            {label:'Signed',value:patients.filter(p=>p.status==='signed').length,color:C.normal,tip:'Completed cases where a final report is released.'},
          ].map(s=>(
            <Tooltip key={s.label} content={s.tip}>
              <div style={{textAlign:'center',padding:'6px 4px',background:C.bg2,borderRadius:8,border:`1px solid ${C.border}`,cursor:'help'}}>
                <div style={{fontSize:16,fontWeight:700,color:s.color,fontFamily:C.FM}}>{s.value}</div>
                <div style={{fontSize:9,color:C.textLo}}>{s.label}</div>
              </div>
            </Tooltip>
          ))}
        </div>

        {/* Search */}
        <div style={{position:'relative'}}>
          <svg style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:C.textLo}} width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search MRN or name…"
            style={{width:'100%',height:32,padding:'0 8px 0 28px',boxSizing:'border-box',background:C.bg2,border:`1px solid ${C.border}`,borderRadius:8,color:C.textHi,fontSize:11,fontFamily:C.F,outline:'none'}}/>
        </div>
      </div>

      {/* Tabs */}
      <div style={{padding:'0 12px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:2, overflowX:'auto'}}>
        <button style={tabStyle('alerts')} onClick={()=>setTab('alerts')}>🚨 Alerts</button>
        <button style={tabStyle('patients')} onClick={()=>setTab('patients')}>Patients</button>
        <button style={tabStyle('history')} onClick={()=>setTab('history')}>History</button>
      </div>

      {/* List */}
      <div style={{flex:1,overflowY:'auto', background:C.bg0}}>
        {loading ? (
          Array(6).fill(0).map((_,i)=>(
            <div key={i} style={{padding:14,borderBottom:`1px solid ${C.border}`}}>
              <Skeleton width="40%" height={12} style={{marginBottom:8}}/>
              <Skeleton width="80%" height={16} style={{marginBottom:8}}/>
              <Skeleton width="60%" height={10}/>
            </div>
          ))
        ) : (
          <>
            {tab==='alerts' && activeAlerts.map(alert=>(
              <div key={alert.id} onClick={()=>setSelectedPatient({...alert,type:'alert'})}
                style={{padding:'14px',borderBottom:`1px solid ${C.border}`,cursor:'pointer',borderLeft:`3px solid ${urgencyColor(alert.urgency)}`, background: selectedPatient?.id === alert.id ? `${C.brand}0A` : 'transparent'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><UrgencyBadge u={alert.urgency}/><span style={{fontSize:10,color:C.textLo}}>{alert.time}</span></div>
                <div style={{fontSize:13,fontWeight:700,color:C.textHi}}>{alert.patient}</div>
                <div style={{fontSize:11,color:urgencyColor(alert.urgency),marginTop:2}}>{alert.finding}</div>
                <div style={{marginTop:8}}><ConfBar v={alert.confidence}/></div>
              </div>
            ))}
            {tab==='patients' && filteredPatients.map(p=>(
              <div key={p.id} onClick={()=>setSelectedPatient(p)}
                style={{padding:'14px',borderBottom:`1px solid ${C.border}`,cursor:'pointer',background: selectedPatient?.id === p.id ? `${C.brand}0A` : 'transparent'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:`${C.brand}20`,color:C.brand,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700}}>{p.name[0]}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.textHi}}>{p.name}</div>
                    <div style={{fontSize:11,color:C.textLo}}>{p.mrn} · {p.age}y</div>
                  </div>
                  <UrgencyDot u={p.lastScan?.urgency}/>
                </div>
              </div>
            ))}
            {tab==='history' && <div style={{padding:40,textAlign:'center',color:C.textLo,fontSize:12}}>No history available</div>}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{display:'flex',height:'calc(100vh - 52px)',background:C.bg1,fontFamily:C.F,overflow:'hidden'}}>
      {(!isMobile || !selectedPatient) && renderList()}
      {(!isMobile || selectedPatient) && (
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:C.bg1, position: isMobile ? 'absolute' : 'relative', width: isMobile ? '100%' : 'auto', height:'100%', zIndex: isMobile ? 10 : 'auto'}}>
          {selectedPatient ? (
            <div style={{flex:1, display:'flex', flexDirection:'column'}}>
               {isMobile && (
                 <button onClick={()=>setSelectedPatient(null)} style={{padding:'12px 16px', background:C.bg3, border:'none', color:C.brand, fontSize:12, fontWeight:700, textAlign:'left', display:'flex', alignItems:'center', gap:8}}>
                   ← Back to list
                 </button>
               )}
               <PatientDetailPanel patient={selectedPatient} onClose={()=>setSelectedPatient(null)}/>
            </div>
          ) : (
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:C.textLo}}>Select a patient to view details</div>
          )}
        </div>
      )}
    </div>
  );
}

function PatientDetailPanel({ patient, onClose }:{ patient:any; onClose:()=>void }) {
  const urgency = patient.urgency || patient.lastScan?.urgency || 'ROUTINE';
  return (
    <div style={{flex:1, display:'flex', flexDirection:'column', overflowY:'auto', background:C.bg1}}>
      <div style={{padding:'20px', borderBottom:`1px solid ${C.border}`, background: urgency === 'CRITICAL' ? C.critBg : 'transparent', borderTop:`2px solid ${urgency === 'CRITICAL' ? C.critical : 'transparent'}`}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
          <div>
            <UrgencyBadge u={urgency}/>
            <div style={{fontSize:20, fontWeight:700, color:C.textHi, marginTop:8}}>{patient.patient || patient.name}</div>
            <div style={{fontSize:13, color:C.textMd, marginTop:4}}>{patient.finding || patient.lastScan?.finding}</div>
          </div>
          <button onClick={onClose} style={{background:'none', border:'none', color:C.textLo, cursor:'pointer'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        </div>
      </div>
      
      <div style={{padding:'20px', display:'flex', flexDirection:'column', gap:16}}>
        <div style={{padding:16, background:C.bg2, borderRadius:12, border:`1px solid ${C.border}`}}>
          <div style={{fontSize:12, fontWeight:700, color:C.textHi, marginBottom:12}}>AI Triage Summary</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            {[{l:'Finding',v:patient.finding||patient.lastScan?.finding},{l:'Modality',v:patient.modality||patient.lastScan?.modality},{l:'Time',v:patient.time||patient.lastScan?.time},{l:'Conf',v:Math.round((patient.confidence||patient.lastScan?.confidence||0)*100)+'%'}].map(x=>(
              <div key={x.l} style={{padding:10, background:C.bg3, borderRadius:8}}>
                <div style={{fontSize:9, color:C.textLo, textTransform:'uppercase'}}>{x.l}</div>
                <div style={{fontSize:12, color:C.textHi, fontWeight:600}}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          {[
            { label: 'Confirm Findings', color: C.normal, action: async () => {
                if (!patient.id && !patient.scanId) return;
                const id = patient.scanId || patient.id;
                try {
                  await apiClient.post(`/ai/validate/${id}`, { status: 'CONFIRMED' });
                  alert('Clinical validation complete. Report generating...');
                  window.location.reload();
                } catch (err) { alert('Validation failed.'); }
            }},
            { label: 'Correct Finding', color: C.urgent, action: () => {
                const correction = prompt('Enter corrected finding:');
                if (correction) {
                  const id = patient.scanId || patient.id;
                  apiClient.post(`/ai/validate/${id}`, { status: 'REJECTED', correctedFinding: correction })
                    .then(() => { alert('Correction recorded.'); window.location.reload(); })
                    .catch(() => alert('Failed to record correction.'));
                }
            }},
            { label: 'Review Scans', color: C.brand, action: () => {
                const id = patient.scanId || patient.id;
                if (id) window.open(`/dashboard?scanId=${id}`, '_blank');
            }},
            { label: 'Escalate STAT', color: C.critical, action: async () => {
                const id = patient.scanId || patient.id;
                if (!id) return;
                try {
                  await apiClient.patch(`/scans/${id}/status`, { status: 'CRITICAL' });
                  alert('Case successfully escalated to STAT.');
                } catch (err) {
                  alert('Escalation failed. Patient record might be locked.');
                }
            }},
          ].map(a=>(
            <button 
              key={a.label} 
              onClick={a.action}
              style={{
                padding:12, 
                background:a.color, 
                border:a.color===C.bg2?`1px solid ${C.border}`:'none', 
                borderRadius:10, color:'white', fontSize:12, fontWeight:600, cursor:'pointer'
              }}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
