// SEWA AI — HospitalAdminDashboard.tsx
// Hospital administration: staff mgmt, RBAC, integration health, billing, audit
import React, { useState, useEffect } from 'react';
import { useHospitalAdminData } from '../../hooks/useDashboardData';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';

const C = {
  bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',bg4:'#162821',
  brand:'#408D7B',brandLt:'#52B09A',brandDk:'#2E6B5E',
  critical:'#E03535',critBg:'#2A0A0A',
  urgent:'#E08A20',urgBg:'#2A1800',
  normal:'#1DBF73',normalBg:'#0A1F14',
  info:'#2A6EF2',infoBg:'#0A1530',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',
  F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

function StatusDot({ status }:{ status:string }) {
  const m:Record<string,string> = {connected:C.normal,warning:C.urgent,error:C.critical,active:C.normal,away:C.urgent,offline:C.textLo};
  const color = m[status]??C.textLo;
  return <span style={{width:7,height:7,borderRadius:'50%',background:color,display:'inline-block',boxShadow:`0 0 5px ${color}60`}}/>;
}

function RoleBadge({ role }:{ role:string }) {
  const m:Record<string,[string,string]> = {
    radiologist:[C.brand,`${C.brand}20`],
    doctor:['#2A6EF2','#0A1530'],
    admin:['#8B5CF6','#1a0a30'],
    technician:[C.urgent,`${C.urgent}15`],
    patient:[C.normal,`${C.normal}15`],
  };
  const [color,bg] = m[role]??[C.textMd,C.bg3];
  return (
    <span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:600,background:bg,color,border:`1px solid ${color}30`,fontFamily:C.F,textTransform:'capitalize'}}>
      {role}
    </span>
  );
}

function StatCard({ label,value,sub,color=C.brand,icon }:{ label:string;value:string|number;sub?:string;color?:string;icon?:string }) {
  return (
    <div style={{padding:'16px',background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <span style={{fontSize:11,color:C.textMd,fontFamily:C.F}}>{label}</span>
        {icon&&<span style={{fontSize:18}}>{icon}</span>}
      </div>
      <div style={{fontSize:24,fontWeight:700,color:C.textHi,fontFamily:C.FM,lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:10,color:C.textLo,marginTop:6,fontFamily:C.F}}>{sub}</div>}
    </div>
  );
}

export function HospitalAdminDashboard() {
  const { user } = useAuthStore();
  const { stats, staff, audit, integrations, loading } = useHospitalAdminData();
  const [tab, setTab] = useState<'overview'|'staff'|'integrations'|'billing'|'audit'>('overview');
  const [showAddUser, setShowAddUser] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const r = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  const tabStyle = (t:string):React.CSSProperties => ({
    padding:'8px 14px',fontSize:12,fontWeight:tab===t?600:400,
    color:tab===t?C.brand:C.textLo,background:'none',border:'none',
    borderBottom:`2px solid ${tab===t?C.brand:'transparent'}`,
    marginBottom:'-1px',cursor:'pointer',fontFamily:C.F,
    display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap',
  });

  return (
    <div style={{minHeight:'calc(100vh - 52px)',background:C.bg1,fontFamily:C.F,padding: isMobile ? '16px' : '24px'}}>

      {/* Page header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24, flexWrap:'wrap', gap:12}}>
        <div>
          <h1 style={{margin:0,fontSize: isMobile ? 18 : 22,fontWeight:700,color:C.textHi}}>Hospital Administration</h1>
          <p style={{margin:'4px 0 0',fontSize:12,color:C.textMd}}>
            {user?.tenantName || 'Royal London Hospital'} · {user?.region?.toUpperCase() || 'UK'} Region
          </p>
        </div>
        <button onClick={()=>setShowAddUser(true)} style={{
          padding:'8px 16px',background:C.brand,border:'none',borderRadius:8,
          color:'white',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:C.F,
          display:'flex',alignItems:'center',gap:6,
        }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          Add Staff
        </button>
      </div>

      {/* Tabs */}
      <div style={{borderBottom:`1px solid ${C.border}`,display:'flex',gap:2,marginBottom:20,overflowX:'auto', paddingBottom:4}}>
        {(['overview','staff','integrations','billing','audit'] as const).map(t=>(
          <button key={t} style={tabStyle(t)} onClick={()=>setTab(t)}>
            <span>{t==='overview'?'📊':t==='staff'?'👥':t==='integrations'?'🔗':t==='billing'?'💳':'🔒'}</span>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{flex:1}}>
        {tab==='overview' && (
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:12}}>
              <StatCard label="Scans Today" value={loading ? '...' : stats.scansToday} icon="🩻"/>
              <StatCard label="Critical Today" value={loading ? '...' : stats.criticalToday} color={C.critical} icon="🚨"/>
              <StatCard label="Avg Turnaround" value={loading ? '...' : stats.avgTurnaround} icon="⚡"/>
              <StatCard label="AI Accuracy" value="94.7%" color={C.normal} icon="🎯"/>
            </div>
            
            <div style={{padding:16,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`, overflow:'hidden' }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12,marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:C.textHi}}>Scan Volume Today</div>
                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  {[{color:C.critical,label:'STAT'},{color:C.urgent,label:'URGENT'},{color:C.brand,label:'ROUTINE'}].map(l=>(
                    <div key={l.label} style={{display:'flex',alignItems:'center',gap:4}}>
                      <div style={{width:8,height:8,borderRadius:2,background:l.color}}/>
                      <span style={{fontSize:10,color:C.textLo,fontFamily:C.F}}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{overflowX:'auto', paddingBottom:8}}>
                <div style={{display:'flex',alignItems:'flex-end',gap:4,height:80,minWidth:500}}>
                  {[{h:[60,30,80]},{h:[40,20,60]},{h:[30,15,90]},{h:[80,40,70]},{h:[50,25,85]},{h:[70,35,60]},{h:[45,20,75]},{h:[90,45,55]},{h:[60,30,80]},{h:[35,18,65]},{h:[55,28,70]},{h:[75,37,85]}].map((bar,i)=>(
                    <div key={i} style={{flex:1,display:'flex',flexDirection:'column',gap:1,alignItems:'center'}}>
                      {[C.critical,C.urgent,C.brand].map((c,j)=>(
                        <div key={j} style={{width:'100%',height:`${bar.h[j]*0.35}%`,background:c,opacity:0.8,borderRadius:'2px 2px 0 0',minHeight:2}}/>
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:4,marginTop:4,minWidth:500}}>
                  {['7a','8a','9a','10a','11a','12p','1p','2p','3p','4p','5p','6p'].map(t=>(
                    <div key={t} style={{flex:1,fontSize:8,color:C.textLo,textAlign:'center',fontFamily:C.FM}}>{t}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab==='staff' && (
          <div style={{background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:600}}>
              <thead>
                <tr style={{background:C.bg3}}>
                  {['Name','Role','Status','Actions'].map(h=>(
                    <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:10,fontWeight:600,color:C.textLo,textTransform:'uppercase'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map((s:any)=>(
                  <tr key={s.id} style={{borderTop:`1px solid ${C.border}`}}>
                    <td style={{padding:'12px 16px',fontSize:12,color:C.textHi}}>{s.firstName} {s.lastName}</td>
                    <td style={{padding:'12px 16px'}}><RoleBadge role={s.role}/></td>
                    <td style={{padding:'12px 16px'}}><div style={{display:'flex',alignItems:'center',gap:6}}><StatusDot status={s.status}/><span style={{fontSize:11,color:C.textMd}}>{s.status}</span></div></td>
                    <td style={{padding:'12px 16px'}}><button style={{padding:'4px 8px',fontSize:10,background:C.bg3,border:`1px solid ${C.border}`,color:C.textMd,borderRadius:6,cursor:'pointer'}}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(['integrations','billing','audit'] as const).includes(tab as any) && (
          <div style={{padding:40, textAlign:'center', background:C.bg2, borderRadius:12, border:`1px solid ${C.border}`, color:C.textLo}}>
            {tab.charAt(0).toUpperCase()+tab.slice(1)} view coming soon for mobile.
          </div>
        )}
      </div>

      {showAddUser && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
          <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:16,width:'100%',maxWidth:440,padding:24,boxShadow:'0 24px 64px rgba(0,0,0,0.8)',animation:'pop 200ms ease'}}>
            <style>{`@keyframes pop{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}`}</style>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.textHi}}>Add New Staff Member</h2>
              <button onClick={()=>setShowAddUser(false)} style={{background:'none',border:'none',color:C.textLo,cursor:'pointer'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
            </div>
            
            <form onSubmit={async (e)=>{
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              try {
                await apiClient.post('/users', Object.fromEntries(d));
                alert('Staff member invited successfully.');
                setShowAddUser(false);
              } catch(err) {
                alert('Invitation failed. Check role permissions.');
              }
            }} style={{display:'flex',flexDirection:'column',gap:16}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label style={{fontSize:11,color:C.textLo,display:'block',marginBottom:6}}>FIRST NAME</label><input name="firstName" required style={{width:'100%',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px',color:C.textHi,fontSize:13,boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:11,color:C.textLo,display:'block',marginBottom:6}}>LAST NAME</label><input name="lastName" required style={{width:'100%',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px',color:C.textHi,fontSize:13,boxSizing:'border-box'}}/></div>
              </div>
              <div><label style={{fontSize:11,color:C.textLo,display:'block',marginBottom:6}}>EMAIL ADDRESS (@nhs.uk / @tenant.com)</label><input name="email" type="email" required style={{width:'100%',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px',color:C.textHi,fontSize:13,boxSizing:'border-box'}}/></div>
              <div>
                <label style={{fontSize:11,color:C.textLo,display:'block',marginBottom:6}}>CLINICAL ROLE</label>
                <select name="role" style={{width:'100%',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px',color:C.textHi,fontSize:13}}>
                  <option value="radiologist">Radiologist</option>
                  <option value="doctor">Physician</option>
                  <option value="technician">Technician</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <button type="submit" style={{marginTop:8,padding:'12px',background:C.brand,color:'white',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer',fontSize:14}}>🚀 Invite Staff Member</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
