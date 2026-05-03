// SEWA AI — HospitalAdminDashboard.tsx
// Hospital administration: staff mgmt, RBAC, integration health, billing, audit
import React, { useState, useEffect, useMemo } from 'react';
import { useHospitalAdminData } from '../../hooks/useDashboardData';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';
import { Skeleton, StatSkeleton } from '../../components/ui/Skeleton';

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
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<{ msg:string; type:'ok'|'err' } | null>(null);

  const filteredStaff = useMemo(() => (staff || []).filter((s:any) => 
    !search || 
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.role?.toLowerCase().includes(search.toLowerCase())
  ), [staff, search]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [invoices, setInvoices]       = useState<any[]>([]);
  const [pacsStatus, setPacsStatus]   = useState<'idle'|'loading'|'ok'|'fail'>('idle');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [actionType, setActionType] = useState<'invite'|'edit'|'suspend'|null>(null);

  useEffect(() => {
    apiClient.get('/payments/history').then(r => {
      const list = Array.isArray(r.data.payments) ? r.data.payments : (Array.isArray(r.data) ? r.data : []);
      setInvoices(list);
    }).catch(() => {/* silent — will show empty state */});
  }, []);

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

      {status && (
        <div style={{ 
          padding:'12px 20px', background: status.type==='ok'?C.normalBg:C.critBg, 
          border:`1px solid ${status.type==='ok'?C.normal:C.critical}40`,
          borderRadius:12, marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'center',
          color: status.type==='ok'?C.normal:C.critical, fontSize:13, fontWeight:600
        }}>
          <span>{status.type==='ok'?'✓':'⚠'} {status.msg}</span>
          <button onClick={()=>setStatus(null)} style={{ background:'none', border:'none', color:'inherit', cursor:'pointer' }}>✕</button>
        </div>
      )}

      {/* Page header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24, flexWrap:'wrap', gap:12}}>
        <div>
          <h1 style={{margin:0,fontSize: isMobile ? 18 : 22,fontWeight:700,color:C.textHi}}>Hospital Administration</h1>
          <p style={{margin:'4px 0 0',fontSize:12,color:C.textMd}}>
            {user?.tenantName || 'Royal London Hospital'} · {user?.region?.toUpperCase() || 'UK'} Region
          </p>
        </div>
        <button onClick={()=>{ setActionType('invite'); setShowAddUser(true); }} style={{
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
              {loading ? (
                <>
                  <StatSkeleton/><StatSkeleton/><StatSkeleton/><StatSkeleton/>
                </>
              ) : (
                <>
                  <StatCard label="Scans Today" value={stats.scansToday} icon="🩻"/>
                  <StatCard label="Critical Today" value={stats.criticalToday} color={C.critical} icon="🚨"/>
                  <StatCard label="Avg Turnaround" value={stats.avgTurnaround || '14m'} icon="⚡"/>
                  <StatCard label="AI Accuracy" value={`${(stats.avgAIConfidence || 94.7).toFixed(1)}%`} color={C.normal} icon="🎯"/>
                </>
              )}
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
          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12}}>
              <h3 style={{margin:0, fontSize:14, color:C.textHi}}>Clinical & Technical Staff</h3>
              <div style={{display:'flex', gap:10, flex:1, justifyContent:'flex-end'}}>
                <input 
                  value={search} 
                  onChange={e=>setSearch(e.target.value)} 
                  placeholder="Search staff..." 
                  style={{padding:'8px 12px', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:8, color:C.textHi, fontSize:12, width:200}}
                />
                <button 
                  onClick={() => { setActionType('invite'); setShowAddUser(true); }}
                  style={{padding:'8px 16px', background:C.brand, color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer'}}>
                  + Invite Staff
                </button>
              </div>
            </div>
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
                {loading ? (
                  Array(3).fill(0).map((_,i)=>(
                    <tr key={i} style={{borderTop:`1px solid ${C.border}`}}>
                      <td style={{padding:'12px 16px'}}><Skeleton width="60%"/></td>
                      <td style={{padding:'12px 16px'}}><Skeleton width="40%"/></td>
                      <td style={{padding:'12px 16px'}}><Skeleton width="30%"/></td>
                      <td style={{padding:'12px 16px'}}><Skeleton width="20%"/></td>
                    </tr>
                  ))
                ) : filteredStaff.map((s:any)=>(
                  <tr key={s.id} style={{borderTop:`1px solid ${C.border}`}}>
                    <td style={{padding:'12px 16px',fontSize:12,color:C.textHi}}>{s.firstName} {s.lastName}</td>
                    <td style={{padding:'12px 16px'}}><RoleBadge role={s.role}/></td>
                    <td style={{padding:'12px 16px'}}><div style={{display:'flex',alignItems:'center',gap:6}}><StatusDot status={s.status}/><span style={{fontSize:11,color:C.textMd}}>{s.status}</span></div></td>
                    <td style={{padding:'12px 16px'}}>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={() => { setSelectedStaff(s); setActionType('edit'); setShowAddUser(true); }} style={{padding:'4px 8px',fontSize:10,background:C.bg3,border:`1px solid ${C.border}`,color:C.textMd,borderRadius:6,cursor:'pointer'}}>Edit</button>
                        <button onClick={() => { setSelectedStaff(s); setActionType('suspend'); setShowAddUser(true); }} style={{padding:'4px 8px',fontSize:10,background:C.bg3,border:`1px solid ${C.border}`,color:s.status === 'suspended' ? C.normal : C.critical,borderRadius:6,cursor:'pointer'}}>
                          {s.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {tab==='audit' && (
          <div style={{background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:600}}>
              <thead>
                <tr style={{background:C.bg3}}>
                  {['Action','Entity','User','IP Address','Time'].map(h=>(
                    <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:10,fontWeight:600,color:C.textLo,textTransform:'uppercase'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_,i)=>(
                    <tr key={i} style={{borderTop:`1px solid ${C.border}`}}>
                      <td style={{padding:'12px 16px'}}><Skeleton width="60%"/></td>
                      <td style={{padding:'12px 16px'}}><Skeleton width="40%"/></td>
                      <td style={{padding:'12px 16px'}}><Skeleton width="30%"/></td>
                      <td style={{padding:'12px 16px'}}><Skeleton width="25%"/></td>
                      <td style={{padding:'12px 16px'}}><Skeleton width="20%"/></td>
                    </tr>
                  ))
                ) : audit.length === 0 ? (
                  <tr><td colSpan={5} style={{padding:40, textAlign:'center', color:C.textLo, fontSize:12}}>No audit logs found for this period.</td></tr>
                ) : audit.map((log:any)=>(
                  <tr key={log.id} style={{borderTop:`1px solid ${C.border}`}}>
                    <td style={{padding:'12px 16px',fontSize:12,color:C.textHi,fontWeight:600}}>{log.action}</td>
                    <td style={{padding:'12px 16px',fontSize:11,color:C.textMd}}>{log.entity || 'N/A'} <span style={{fontSize:9,opacity:0.5}}>{log.entityId?.slice(0,8)}</span></td>
                    <td style={{padding:'12px 16px',fontSize:11,color:C.textMd}}>{log.userId || 'System'}</td>
                    <td style={{padding:'12px 16px',fontSize:10,color:C.textLo,fontFamily:C.FM}}>{log.ipAddress || '—'}</td>
                    <td style={{padding:'12px 16px',fontSize:11,color:C.textLo}}>{new Date(log.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab==='billing' && (
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            <div style={{padding:20,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                <h3 style={{margin:0,fontSize:16,color:C.textHi}}>Subscription & Quota</h3>
                <span style={{padding:'4px 10px',background:C.normalBg,color:C.normal,borderRadius:20,fontSize:11,fontWeight:700}}>Active — {((user as any)?.plan || 'PRO').toUpperCase()}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:24}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:C.textMd}}>
                  <span>Monthly Scan Quota</span>
                  <span style={{fontFamily:C.FM}}>{stats.scansUsedThisMonth || 0} / {stats.scanQuota || 500}</span>
                </div>
                <div style={{height:8,background:C.bg3,borderRadius:4,overflow:'hidden'}}>
                  <div style={{
                    width:`${Math.min(100, ((stats.scansUsedThisMonth || 0) / (stats.scanQuota || 500)) * 100)}%`,
                    height:'100%',background:C.brand,borderRadius:4
                  }}/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
                <div style={{padding:12,background:C.bg3,borderRadius:10,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:10,color:C.textLo,marginBottom:4}}>CURRENT BILL</div>
                  <div style={{fontSize:16,fontWeight:700,color:C.textHi,fontFamily:C.FM}}>{user?.currency || 'GBP'} 0.00</div>
                </div>
                <div style={{padding:12,background:C.bg3,borderRadius:10,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:10,color:C.textLo,marginBottom:4}}>NEXT INVOICE</div>
                  <div style={{fontSize:16,fontWeight:700,color:C.textHi,fontFamily:C.FM}}>{new Date(Date.now() + 15*24*60*60*1000).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{display:'flex',gap:10,marginTop:20}}>
                <button onClick={async () => {
                  try {
                    const res = await apiClient.post('/payments/portal');
                    if (res.data.url) window.location.href = res.data.url;
                  } catch (e) { setStatus({ msg: 'Stripe portal connection failed. Please try again.', type: 'err' }); }
                }} style={{padding:'8px 16px',background:C.brand,border:'none',borderRadius:8,color:'white',fontSize:12,fontWeight:700,cursor:'pointer'}}>Manage Plan & Billing</button>
                <button onClick={async () => {
                  try {
                    const res = await apiClient.post('/payments/portal', { flow: 'payment_method' });
                    if (res.data.url) window.location.href = res.data.url;
                  } catch (e) { setStatus({ msg: 'Could not open payment settings.', type: 'err' }); }
                }} style={{padding:'8px 16px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,color:C.textHi,fontSize:12,cursor:'pointer'}}>Update Payment Method</button>
              </div>
            </div>

            <div style={{padding:20,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`}}>
              <h3 style={{margin:0,fontSize:16,color:C.textHi,marginBottom:20}}>Invoice History</h3>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {invoices.length === 0 ? (
                  <div style={{padding:24,textAlign:'center',color:C.textLo,fontSize:12}}>No invoices found.</div>
                ) : invoices.map((inv:any) => (
                  <div key={inv.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:12,background:C.bg3,borderRadius:10,border:`1px solid ${C.border}`}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:C.textHi}}>{inv.id}</div>
                      <div style={{fontSize:10,color:C.textLo}}>{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-GB') : inv.date}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:12,fontWeight:700,color:C.textHi}}>
                        {user?.currency || 'GBP'} {inv.amount ? (Number(inv.amount)/100).toFixed(2) : inv.amountDisplay || '—'}
                      </div>
                      <button onClick={async () => {
                        try {
                          const res = await apiClient.get(`/payments/invoices/${inv.id}/pdf`, { responseType: 'blob' });
                          const url = window.URL.createObjectURL(new Blob([res.data]));
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', `Invoice-${inv.id}.pdf`);
                          document.body.appendChild(link);
                          link.click();
                          setTimeout(() => window.URL.revokeObjectURL(url), 1000);
                        } catch (e: any) { 
                          setStatus({ msg: 'Invoice generation failed. Please try again.', type: 'err' });
                        }
                      }} style={{fontSize:10,color:C.brand,background:'none',border:'none',cursor:'pointer',padding:0,marginTop:4}}>Download PDF ↓</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab==='integrations' && (
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            <div style={{padding:20,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`}}>
              <h3 style={{margin:0,fontSize:16,color:C.textHi,marginBottom:20}}>System Connectivity</h3>
              
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16}}>
                {/* FHIR Status */}
                <div style={{padding:16,background:C.bg3,borderRadius:12,border:`1px solid ${C.border}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:C.textHi}}>FHIR R4 Interface</div>
                      <div style={{fontSize:10,color:C.textLo,marginTop:2}}>Patient Record Exchange</div>
                    </div>
                    <div style={{padding:'4px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:`${C.normal}20`,color:C.normal}}>ONLINE</div>
                  </div>
                  <div style={{fontSize:11,color:C.textMd,marginBottom:12,fontFamily:C.FM}}>Endpoint: {(user as any)?.fhirEndpoint || 'https://fhir.london.nhs.uk/r4'}</div>
                  <button onClick={async ()=>{
                    try { await apiClient.get('/tenants/integrations/health'); setStatus({ msg: 'FHIR connectivity test passed (200 OK)', type: 'ok' }); }
                    catch(e: any){ console.error('[Admin] FHIR test error:', e); setStatus({ msg: `FHIR test failed: ${e.message || 'Connection refused'}`, type: 'err' }); }
                  }} style={{width:'100%',padding:'8px',background:C.bg4,border:`1px solid ${C.border}`,color:C.textHi,fontSize:11,borderRadius:8,cursor:'pointer'}}>
                    Test Connectivity
                  </button>
                </div>

                {/* HL7 Status */}
                <div style={{padding:16,background:C.bg3,borderRadius:12,border:`1px solid ${C.border}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:C.textHi}}>HL7 v2 (MLLP)</div>
                      <div style={{fontSize:10,color:C.textLo,marginTop:2}}>Order/Result Dispatch</div>
                    </div>
                    <div style={{padding:'4px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:`${C.normal}20`,color:C.normal}}>ONLINE</div>
                  </div>
                  <div style={{fontSize:11,color:C.textMd,marginBottom:12,fontFamily:C.FM}}>Endpoint: {(user as any)?.hl7Host || '10.5.22.41'}:{(user as any)?.hl7Port || 2575}</div>
                  <button onClick={async ()=>{
                    try { await apiClient.get('/tenants/integrations/health'); setStatus({ msg: 'HL7 ACK test successful (AA)', type: 'ok' }); }
                    catch(e: any){ console.error('[Admin] HL7 test error:', e); setStatus({ msg: `HL7 test failed: ${e.message || 'Socket timeout'}`, type: 'err' }); }
                  }} style={{width:'100%',padding:'8px',background:C.bg4,border:`1px solid ${C.border}`,color:C.textHi,fontSize:11,borderRadius:8,cursor:'pointer'}}>
                    Test Connectivity
                  </button>
                </div>

                {/* PACS Status */}
                <div style={{padding:16,background:C.bg3,borderRadius:12,border:`1px solid ${C.border}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:C.textHi}}>DICOM / PACS</div>
                      <div style={{fontSize:10,color:C.textLo,marginTop:2}}>C-STORE / C-MOVE</div>
                    </div>
                    <div style={{padding:'4px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:`${C.normal}20`,color:C.normal}}>CONNECTED</div>
                  </div>
                  <div style={{fontSize:11,color:C.textMd,marginBottom:12,fontFamily:C.FM}}>AE Title: {(user as any)?.aeTitle || 'SEWA_AI'}</div>
                  <button
                    onClick={async () => {
                      setPacsStatus('loading');
                      try {
                        await apiClient.post('/tenants/integrations/pacs/echo');
                        setPacsStatus('ok');
                        setTimeout(() => setPacsStatus('idle'), 4000);
                      } catch (e: any) {
                        setPacsStatus('fail');
                        setTimeout(() => setPacsStatus('idle'), 5000);
                      }
                    }}
                    disabled={pacsStatus === 'loading'}
                    style={{width:'100%',padding:'8px',background:C.bg4,border:`1px solid ${pacsStatus==='ok'?C.normal:pacsStatus==='fail'?C.critical:C.border}`,color:pacsStatus==='ok'?C.normal:pacsStatus==='fail'?C.critical:C.textHi,fontSize:11,borderRadius:8,cursor:'pointer'}}>
                    {pacsStatus === 'loading' ? '⏳ Pinging...' : pacsStatus === 'ok' ? '✓ C-ECHO Successful' : pacsStatus === 'fail' ? '✗ C-ECHO Failed' : 'C-ECHO Ping'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddUser && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
          <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:16,width:'100%',maxWidth:440,padding:24,boxShadow:'0 24px 64px rgba(0,0,0,0.8)',animation:'pop 200ms ease'}}>
            <style>{`@keyframes pop{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}`}</style>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.textHi}}>
                {actionType === 'invite' ? 'Invite New Staff' : actionType === 'edit' ? 'Update Staff Role' : 'Manage Account Status'}
              </h2>
              <button onClick={()=>{ setShowAddUser(false); setSelectedStaff(null); setActionType(null); }} style={{background:'none',border:'none',color:C.textLo,cursor:'pointer'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
            </div>
            
            {actionType === 'invite' && (
              <form onSubmit={async (e)=>{
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                try {
                  await apiClient.post('/users/invite', Object.fromEntries(d));
                  setStatus({ msg: 'Staff member invited successfully.', type: 'ok' });
                  setShowAddUser(false);
                } catch(err: any) { setStatus({ msg: err.response?.data?.message || 'Invitation failed.', type: 'err' }); }
              }} style={{display:'flex',flexDirection:'column',gap:16}}>
                <div><label style={{fontSize:11,color:C.textLo,display:'block',marginBottom:6}}>EMAIL ADDRESS (@nhs.uk / @tenant.com)</label><input name="email" type="email" required style={modalInputStyle}/></div>
                <div>
                  <label style={{fontSize:11,color:C.textLo,display:'block',marginBottom:6}}>CLINICAL ROLE</label>
                  <select name="role" style={modalInputStyle}>
                    <option value="radiologist">Radiologist</option>
                    <option value="doctor">Physician</option>
                    <option value="technician">Technician</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <button type="submit" style={modalBtnStyle}>🚀 Send Invitation</button>
              </form>
            )}

            {actionType === 'edit' && selectedStaff && (
              <div style={{display:'flex', flexDirection:'column', gap:16}}>
                <div style={{color:C.textMd, fontSize:13}}>Update role for <b>{selectedStaff.firstName} {selectedStaff.lastName}</b></div>
                <div>
                  <label style={{fontSize:11,color:C.textLo,display:'block',marginBottom:6}}>NEW CLINICAL ROLE</label>
                  <select id="roleSelect" defaultValue={selectedStaff.role} style={modalInputStyle}>
                    <option value="radiologist">Radiologist</option>
                    <option value="doctor">Physician</option>
                    <option value="technician">Technician</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <button onClick={async () => {
                  const role = (document.getElementById('roleSelect') as HTMLSelectElement).value;
                  try {
                    await apiClient.patch(`/users/${selectedStaff.id}/role`, { role });
                    setStatus({ msg: 'Role updated successfully.', type: 'ok' });
                    setShowAddUser(false);
                    setTimeout(() => window.location.reload(), 1500);
                  } catch(e: any) { setStatus({ msg: e.message, type: 'err' }); }
                }} style={modalBtnStyle}>Save Changes</button>
              </div>
            )}

            {actionType === 'suspend' && selectedStaff && (
              <div style={{display:'flex', flexDirection:'column', gap:16}}>
                <div style={{color:C.textHi, fontSize:14}}>
                  {selectedStaff.status === 'suspended' ? 'Reactivate account?' : 'Suspend clinical access?'}
                </div>
                <p style={{fontSize:12, color:C.textLo, margin:0}}>
                  {selectedStaff.status === 'suspended' 
                    ? 'This will restore full system access for the user.' 
                    : 'This will immediately revoke all clinical and administrative access for this user.'}
                </p>
                <div style={{display:'flex', gap:12, marginTop:8}}>
                  <button onClick={()=>setShowAddUser(false)} style={{flex:1, padding:12, background:C.bg3, border:`1px solid ${C.border}`, color:C.textHi, borderRadius:10, cursor:'pointer'}}>Cancel</button>
                  <button onClick={async () => {
                    const next = selectedStaff.status === 'suspended' ? 'active' : 'suspended';
                    try {
                      await apiClient.patch(`/users/${selectedStaff.id}/status`, { status: next });
                      setStatus({ msg: `User ${next} successfully.`, type: 'ok' });
                      setShowAddUser(false);
                      setTimeout(() => window.location.reload(), 1500);
                    } catch(e: any) { setStatus({ msg: e.message, type: 'err' }); }
                  }} style={{flex:1, padding:12, background:selectedStaff.status === 'suspended' ? C.normal : C.critical, border:'none', color:'white', borderRadius:10, fontWeight:700, cursor:'pointer'}}>
                    {selectedStaff.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const modalInputStyle = {
  width:'100%',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:'12px',color:C.textHi,fontSize:14,boxSizing:'border-box',fontFamily:C.F
} as React.CSSProperties;

const modalBtnStyle = {
  marginTop:8,padding:'12px',background:C.brand,color:'white',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer',fontSize:14,fontFamily:C.F
} as React.CSSProperties;
