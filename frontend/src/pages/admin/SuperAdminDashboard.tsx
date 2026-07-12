// SEWA XAI — SuperAdminDashboard.tsx
// Global platform management: tenants, AI, deployments, compliance, billing, logs
import React, { useState, useMemo, useEffect } from 'react';
import { useSuperAdminData } from '../../hooks/useDashboardData';
import { apiClient } from '../../services/apiClient';
import { dashboardColors as C } from '../../design-system/tokens';

interface AiModel {
  id?: string;
  version?: string;
  type?: string;
  trafficPct?: number;
  traffic?: string;
  deployedAt?: string;
  deployed?: string;
  status?: string;
  accuracy?: number;
  _avg?: { confidence?: number };
  _count?: { id?: number };
}

interface FailedScan {
  id?: string;
  status: string;
  modality?: string;
  bodyPart?: string;
  errorMessage?: string;
  updatedAt?: string;
}

interface FederatedNode {
  id: string;
  tenantId: string;
  tenant?: { name?: string; region?: string };
  totalScansContributed: number;
}

interface FederatedRound {
  id: string;
  roundNumber: number;
  status: string;
  accuracy?: number;
}

interface EdgeDevice {
  id: string;
  deviceId: string;
  tenantId: string;
  tenant?: { name?: string };
  region?: string;
  status: string;
  storageUsedMB: number;
  totalSyncedScans: number;
  lastHeartbeat: string;
}

interface Tenant {
  id?: string;
  name?: string;
  region?: string;
  plan?: string;
  status?: string;
  supportedModalities?: string[];
}

interface HealthService {
  name: string;
  status: string;
  latency?: number;
}


function BigStat({ label,value,sub,color=C.textHi,icon }:{ label:string;value:string|number;sub?:string;color?:string;icon?:string }) {
  return (
    <div style={{padding:20,background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <span style={{fontSize:11,color:C.textMd,fontFamily:C.F,letterSpacing:'0.02em'}}>{label}</span>
        {icon&&<span style={{fontSize:20}}>{icon}</span>}
      </div>
      <div style={{fontSize:28,fontWeight:700,color,fontFamily:C.FM,lineHeight:1,letterSpacing:'-0.02em'}}>{value}</div>
      {sub&&<div style={{fontSize:10,color:C.textLo,marginTop:8,fontFamily:C.F}}>{sub}</div>}
    </div>
  );
}

function GlobeMap({ data }: { data: { region: string, count: number }[] }) {
  const baseRegions = [
    {x:'18%',y:'22%',label:'UK',key:'uk',color:C.brand},
    {x:'28%',y:'24%',label:'EU',key:'eu',color:C.info},
    {x:'14%',y:'30%',label:'US',key:'us',color:'#8B5CF6'},
    {x:'46%',y:'44%',label:'NG',key:'ng',color:C.urgent},
    {x:'52%',y:'52%',label:'KE',key:'ke',color:C.normal},
    {x:'48%',y:'60%',label:'ZA',key:'za',color:C.textMd},
    {x:'70%',y:'32%',label:'IN',key:'in',color:'#E86EAC'},
  ];

  const regions = baseRegions.map(r => {
    const d = data.find(stat => stat.region === r.key);
    return { ...r, scans: d ? `${(d.count / 1000).toFixed(1)}K` : '—', active: !!d };
  });

  return (
    <div style={{position:'relative',height:160,background:`linear-gradient(180deg,${C.bg3} 0%,${C.bg2} 100%)`,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
      {[0,1,2,3].map(i=>(
        <div key={i} style={{position:'absolute',top:`${25*(i+1)}%`,left:0,right:0,height:1,background:`${C.border}60`}}/>
      ))}
      {[0,1,2,3,4].map(i=>(
        <div key={i} style={{position:'absolute',left:`${20*(i+1)}%`,top:0,bottom:0,width:1,background:`${C.border}60`}}/>
      ))}
      {regions.map(r=>(
        <div key={r.label} style={{position:'absolute',left:r.x,top:r.y,transform:'translate(-50%,-50%)', opacity: r.active ? 1 : 0.3}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:r.color,boxShadow: r.active ? `0 0 12px ${r.color}` : 'none'}}/>
          <div style={{position:'absolute',top:12,left:'50%',transform:'translateX(-50%)',whiteSpace:'nowrap',fontSize:9,color:C.textMd,fontFamily:C.FM,background:C.bg3,padding:'1px 4px',borderRadius:3}}>
            {r.label} {r.scans}
          </div>
        </div>
      ))}
      <div style={{position:'absolute',bottom:8,right:12,fontSize:9,color:C.textLo,fontFamily:C.F}}>Active deployments · real-time</div>
    </div>
  );
}

export function SuperAdminDashboard() {
  const { stats, tenants, regionalStats, health, telemetry, loading, error: _error } = useSuperAdminData();
  const [tab, setTab] = useState<'overview'|'tenants'|'aimodels'|'deployments'|'diagnostics'|'federated'|'billing'|'edge'>('overview');
  const [tenantSearch, setTenantSearch] = useState('');
  const [showProvision, setShowProvision] = useState(false);

  // A8: Fetch AI models from real API instead of hardcoded constant
  const [aiModels, setAiModels]           = useState<AiModel[]>([]);
  const [aiModelsLoading, setAiModelsLoading] = useState(false);
  const [dlqDepth, setDlqDepth]           = useState<number|null>(null);
  const [failedScans, setFailedScans]     = useState<FailedScan[]>([]);
  const [diagLoading, setDiagLoading]     = useState(false);
  const [fedNodes, setFedNodes]           = useState<FederatedNode[]>([]);
  const [fedRounds, setFedRounds]         = useState<FederatedRound[]>([]);
  const [_fedLoading, setFedLoading]       = useState(false);
  const [edgeDevices, setEdgeDevices]     = useState<EdgeDevice[]>([]);
  const [_edgeLoading, setEdgeLoading]     = useState(false);

  useEffect(() => {
    setAiModelsLoading(true);
    apiClient.get('/ai/models')
      .then(r => setAiModels(Array.isArray(r.data) ? r.data : []))
      .catch(() => setAiModels([]))
      .finally(() => setAiModelsLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'diagnostics') return;
    setDiagLoading(true);
    Promise.all([
      apiClient.get('/admin/dlq/depth').catch(() => ({ data: { depth: 0 } })),
      apiClient.get('/scans?status=failed&limit=20').catch(() => ({ data: { scans: [] } })),
    ]).then(([dlqRes, scanRes]) => {
      setDlqDepth(dlqRes.data?.depth ?? 0);
      const raw = scanRes.data?.scans ?? (Array.isArray(scanRes.data) ? scanRes.data : []);
      setFailedScans(raw.filter((s: FailedScan) => s.status === 'failed').slice(0, 20));
    }).finally(() => setDiagLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== 'federated') return;
    const fetchFed = () => {
      setFedLoading(true);
      Promise.all([
        apiClient.get('/ai/federated/nodes').catch(() => ({ data: [] })),
        apiClient.get('/ai/federated/rounds').catch(() => ({ data: [] })),
      ]).then(([nodesRes, roundsRes]) => {
        setFedNodes(nodesRes.data || []);
        setFedRounds(roundsRes.data || []);
      }).finally(() => setFedLoading(false));
    };
    fetchFed();
    // Poll every 5s while on tab
    const interval = setInterval(fetchFed, 5000);
    return () => clearInterval(interval);
  }, [tab]);

  useEffect(() => {
    if (tab !== 'edge') return;
    const fetchEdge = () => {
      setEdgeLoading(true);
      apiClient.get('/ai/edge/devices').then(res => {
        setEdgeDevices(res.data || []);
      }).catch(() => setEdgeDevices([])).finally(() => setEdgeLoading(false));
    };
    fetchEdge();
    const interval = setInterval(fetchEdge, 5000);
    return () => clearInterval(interval);
  }, [tab]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tabStyle = (t:string):React.CSSProperties => ({
    padding:'8px 14px',fontSize:12,fontWeight:tab===t?600:400,
    color:tab===t?C.brand:C.textLo,background:'none',border:'none',
    borderBottom:`2px solid ${tab===t?C.brand:'transparent'}`,
    marginBottom:'-1px',cursor:'pointer',fontFamily:C.F,whiteSpace:'nowrap',
    display:'flex',alignItems:'center',gap:5,
  });

  const filteredTenants = useMemo(() => tenants.filter((t:Tenant)=>!tenantSearch||(t.name||'').toLowerCase().includes(tenantSearch.toLowerCase())||(t.region||'').includes(tenantSearch)), [tenants, tenantSearch]);

  const [adminStatus, setAdminStatus] = useState<{ msg:string; type:'ok'|'err' } | null>(null);
  const [showTrainingConfirm, setShowTrainingConfirm] = useState(false);

  return (
    <div style={{minHeight:'calc(100vh - 76px)', background:C.bg0, fontFamily:C.F, padding: isMobile ? '16px' : '24px'}}>
      {/* Admin Action Feed */}
      {adminStatus && (
        <div style={{ 
          position:'fixed', top:80, right: isMobile ? 16 : 24, left: isMobile ? 16 : 'auto', zIndex:3000, padding:'12px 20px', 
          background: adminStatus.type === 'ok' ? C.normalBg : C.critBg,
          border: `1px solid ${adminStatus.type === 'ok' ? C.normal : C.critical}40`,
          borderRadius:10, color: adminStatus.type === 'ok' ? C.normal : C.critical,
          fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)', animation: 'slideIn 300ms ease'
        }}>
          <style>{`@keyframes slideIn{from{transform:translateX(50px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
          <span style={{ flex: 1 }}>{adminStatus.type === 'ok' ? '✓' : '⚠'} {adminStatus.msg}</span>
          <button onClick={() => setAdminStatus(null)} style={{ background:'none', border:'none', color:'inherit', cursor:'pointer' }}>✕</button>
        </div>
      )}

      <div style={{display:'flex', alignItems: isMobile ? 'stretch' : 'flex-start', justifyContent:'space-between', flexDirection: isMobile ? 'column' : 'row', gap: 16, marginBottom:24}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <span style={{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,background:`${C.critical}14`,color:C.critical,border:`1px solid ${C.critical}30`,letterSpacing:'0.06em'}}>
              ⚡ SUPER ADMIN
            </span>
            <span style={{fontSize:10,color:C.textLo,fontFamily:C.FM}}>
              {new Date().toISOString().split('T')[0]} · SEWA XAI v2.4.1
            </span>
          </div>
          <h1 style={{margin:0,fontSize: isMobile ? 20 : 22, fontWeight:700, color:C.textHi}}>Platform Command Centre</h1>
          <p style={{margin:'4px 0 0',fontSize:12,color:C.textMd}}>Global infrastructure management</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={() => setShowProvision(true)} style={{flex: isMobile ? 1 : 'none', padding:'8px 20px',borderRadius:10,background:C.brand,color:'white',border:'none',fontSize:11,fontWeight:700,cursor:'pointer', textTransform: 'uppercase', letterSpacing: '0.05em'}}>+ Provision Tenant</button>
        </div>
      </div>

      <div style={{borderBottom:`1px solid ${C.border}`, display:'flex', gap:2, marginBottom:24, overflowX:'auto', scrollbarWidth: 'none'}}>
        {(['overview','tenants','aimodels','deployments','diagnostics','federated','edge','billing'] as const).map(t=>(
          <button key={t} style={tabStyle(t)} onClick={()=>setTab(t)}>
            {t==='overview'&&'🌐 '}{t==='tenants'&&'🏥 '}{t==='aimodels'&&'🤖 '}{t==='deployments'&&'⚡ '}{t==='diagnostics'&&'🔧 '}{t==='federated'&&'🤝 '}{t==='edge'&&'📡 '}{t==='billing'&&'💰 '}
            {t==='edge' ? 'Edge AI' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab==='overview' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:12}}>
            <BigStat label="Total Tenants" value={stats.tenants || 0} icon="🏥"/>
            <BigStat label="Global Scans" value={(stats.totalScans || 0).toLocaleString()} icon="🩻" color={C.brand}/>
            <BigStat label="Critical Alerts" value={stats.criticalToday || 0} icon="🚨" color={C.critical}/>
            <BigStat label="Monthly Revenue" value={`$${(stats.totalRevenueUSD || 0).toLocaleString()}`} icon="💰" color={C.brand}/>
          </div>
          <div style={{padding:16,background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`}}>
            <GlobeMap data={regionalStats}/>
          </div>
        </div>
      )}

      {tab==='tenants' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Search + actions row */}
          <div style={{display:'flex',alignItems:'center',gap:10,justifyContent:'space-between'}}>
            <div style={{position:'relative',flex:1,maxWidth:320}}>
              <svg style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:C.textLo}} width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                value={tenantSearch}
                onChange={e => setTenantSearch(e.target.value)}
                placeholder="Search institution or region…"
                style={{width:'100%',height:34,padding:'0 10px 0 30px',boxSizing:'border-box',background:C.bg2,border:`1px solid ${C.border}`,borderRadius:8,color:C.textHi,fontSize:12,fontFamily:C.F,outline:'none'}}
              />
            </div>
            <span style={{fontSize:11,color:C.textLo,fontFamily:C.FM,flexShrink:0}}>
              {filteredTenants.length} / {tenants.length} tenants
            </span>
            <button onClick={() => setShowProvision(true)} style={{padding:'6px 14px',borderRadius:8,background:C.brand,color:'white',border:'none',fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0}}>
              + Provision
            </button>
          </div>
          <div style={{background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:C.bg3}}>
                  {['Institution','Region','Plan','Status','Modalities'].map(h=>(
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:10,fontWeight:600,color:C.textLo}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTenants.length === 0 ? (
                  <tr><td colSpan={5} style={{padding:32,textAlign:'center',color:C.textLo,fontSize:12}}>
                    {tenantSearch ? `No tenants matching "${tenantSearch}"` : 'No tenants provisioned yet.'}
                  </td></tr>
                ) : filteredTenants.map((t:Tenant, i:number)=>(
                  <tr key={i} style={{borderTop:`1px solid ${C.border}`}}>
                    <td style={{padding:'12px 12px',fontSize:12,color:C.textHi}}>{t.name}</td>
                    <td style={{padding:'12px 12px',fontSize:10,color:C.textMd}}>{t.region}</td>
                    <td style={{padding:'12px 12px',fontSize:10,color:C.textMd}}>{t.plan}</td>
                    <td style={{padding:'12px 12px',fontSize:10,color:C.normal}}>{t.status}</td>
                    <td style={{padding:'12px 12px'}}>
                      {/* Supported Modalities Toggles */}
                      <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                        {['CT','MRI','US','XRAY','PET','ECG','DERM'].map(mod => {
                          const active = (t.supportedModalities || ['CT','XRAY']).includes(mod);
                          return (
                            <button
                              key={mod}
                              title={`Toggle ${mod} for ${t.name}`}
                              onClick={async () => {
                                const current: string[] = t.supportedModalities || ['CT','XRAY'];
                                const next = active
                                  ? current.filter((m:string) => m !== mod)
                                  : [...current, mod];
                                try {
                                  await apiClient.patch(`/tenants/${t.id}`, { supportedModalities: next });
                                  setAdminStatus({ msg: `Updated ${t.name} modalities.`, type:'ok' });
                                  t.supportedModalities = next; // optimistic
                                } catch {
                                  setAdminStatus({ msg: 'Modality update failed.', type:'err' });
                                }
                              }}
                              style={{
                                padding:'2px 8px', borderRadius:20, fontSize:9, fontWeight:800,
                                letterSpacing:'0.05em', cursor:'pointer', border:'1px solid',
                                transition:'all 150ms',
                                background: active ? `${C.brand}20` : C.bg3,
                                color: active ? C.brand : C.textLo,
                                borderColor: active ? `${C.brand}50` : C.border,
                              }}
                            >
                              {mod}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {tab==='aimodels' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {aiModelsLoading ? (
            <div style={{padding:20,color:C.textLo,fontSize:12}}>Loading models...</div>
          ) : aiModels.length === 0 ? (
            <div style={{padding:40,textAlign:'center',color:C.textLo,fontSize:12}}>
              No AI models registered. Use the A/B test panel to register and promote models.
            </div>
          ) : aiModels.map((m:AiModel)=>(
            <div key={m.version || m.id} style={{padding:16,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:C.textHi}}>{m.version} — {m.type?.toUpperCase()}</div>
                  <div style={{fontSize:11,color:C.textMd,marginTop:2}}>
                    Traffic: {m.trafficPct != null ? `${m.trafficPct}%` : (m.traffic || '100%')} ·
                    Deployed: {m.deployedAt ? new Date(m.deployedAt).toLocaleDateString('en-GB') : (m.deployed || 'Recent')}
                  </div>
                </div>
                <span style={{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,
                  background:m.status==='production'?`${C.normal}15`:`${C.info}15`,
                  color:m.status==='production'?C.normal:C.info,
                  border:`1px solid ${m.status==='production'?`${C.normal}30`:`${C.info}40`}`}}>
                  {m.status==='production'?'✓ PRODUCTION':'● '+m.status?.toUpperCase()}
                </span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {[
                  {l:'Accuracy',v: m.accuracy != null ? `${Number(m.accuracy).toFixed(1)}%` : '—'},
                  {l:'Avg Confidence',v: m._avg?.confidence != null ? `${(m._avg.confidence*100).toFixed(1)}%` : '—'},
                  {l:'Inferences',v: m._count?.id?.toLocaleString() ?? '—'},
                ].map(s=>(
                  <div key={s.l} style={{padding:'8px 10px',background:C.bg3,borderRadius:8}}>
                    <div style={{fontSize:9,color:C.textLo,marginBottom:3}}>{s.l.toUpperCase()}</div>
                    <div style={{fontSize:14,fontWeight:700,color:C.textHi,fontFamily:C.FM}}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='deployments' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{padding:20,background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.textHi,marginBottom:12}}>Infrastructure Health</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
              {[
                {label:'CPU Usage',    value:`${telemetry?.infrastructure?.cpu ?? '--'}%`,  color:C.brand},
                {label:'RAM Usage',    value:`${telemetry?.infrastructure?.memory ?? '--'}%`,color:C.urgent},
                {label:'Storage Used', value:telemetry?.infrastructure?.storage ?? '4.2 TB', color:C.textHi},
                {label:'P50 Latency',  value:telemetry?.infrastructure?.latency ?? '142ms',  color:C.info},
                {label:'Uptime',       value:telemetry?.global?.uptime ?? '99.98%',           color:C.normal},
                {label:'Active Nodes', value:telemetry?.global?.activeNodes ?? 14,            color:C.textHi},
              ].map(s=>(  
                <div key={s.label} style={{padding:'12px 14px',background:C.bg3,borderRadius:10,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:9,color:C.textLo,marginBottom:4,textTransform:'uppercase',letterSpacing:'0.04em'}}>{s.label}</div>
                  <div style={{fontSize:18,fontWeight:700,color:s.color,fontFamily:C.FM}}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{padding:16,background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:12,fontWeight:700,color:C.textHi,marginBottom:10}}>AI Service Status</div>
            {loading ? <div style={{fontSize:12,color:C.textLo}}>Loading...</div> : health?.map((svc:HealthService)=>(
              <div key={svc.name} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:12,color:C.textHi}}>{svc.name}</span>
                <span style={{fontSize:11,color:svc.status==='healthy'?C.normal:C.critical,fontFamily:C.FM}}>{svc.status} {svc.latency?`${svc.latency}ms`:''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='diagnostics' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
            {[
              {label:'DLQ Queue Depth', value: dlqDepth ?? '—', color: (dlqDepth ?? 0)>0?C.urgent:C.normal, icon:'📬'},
              {label:'Failed Scans',    value: failedScans.length, color: failedScans.length>0?C.critical:C.normal, icon:'❌'},
              {label:'Backend Uptime',  value: telemetry?.global?.uptime ?? '99.98%', color: C.normal, icon:'✅'},
            ].map(s=>(
              <div key={s.label} style={{padding:16,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{fontSize:11,color:C.textMd}}>{s.label}</span>
                  <span style={{fontSize:18}}>{s.icon}</span>
                </div>
                <div style={{fontSize:26,fontWeight:700,color:s.color,fontFamily:C.FM}}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{padding:16,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:12,fontWeight:700,color:C.textHi,marginBottom:12}}>Failed Scans (last 20)</div>
            {diagLoading ? (
              <div style={{fontSize:12,color:C.textLo}}>Loading...</div>
            ) : failedScans.length === 0 ? (
              <div style={{padding:20,textAlign:'center',color:C.normal,fontSize:12}}>✓ No failed scans in queue.</div>
            ) : failedScans.map((s: FailedScan) => (
              <div key={s.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
                <div>
                  <div style={{fontSize:12,color:C.textHi,fontFamily:C.FM}}>{s.id?.slice(0,12)}...</div>
                  <div style={{fontSize:10,color:C.textLo}}>{s.modality} · {s.bodyPart}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:10,color:C.critical}}>{s.errorMessage?.slice(0,60) || 'Unknown error'}</div>
                  <div style={{fontSize:9,color:C.textLo}}>{s.updatedAt ? new Date(s.updatedAt).toLocaleString('en-GB') : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab==='billing' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))',gap:12}}>
            <BigStat label="Global Revenue" value={`$${(stats.totalRevenueUSD || 0).toLocaleString()}`} icon="💰" color={C.brand}/>
            <BigStat label="Active Subscriptions" value={tenants.length} icon="🏥"/>
          </div>
        </div>
      )}

      {tab==='federated' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
           <div style={{padding:20,background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:C.textHi}}>Federated Learning Global Orchestrator</div>
                <p style={{fontSize:12,color:C.textMd,margin:'4px 0 0'}}>Aggregating neural weights from {fedNodes.length} opted-in clinical nodes.</p>
              </div>
              <button onClick={()=>setShowTrainingConfirm(true)} style={{padding:'8px 16px',background:C.info,color:'white',border:'none',borderRadius:8,cursor:'pointer', fontWeight:600, fontSize:12}}>Start Training Round</button>
           </div>
           
           <div style={{display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:16}}>
             <div style={{background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
               <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,fontSize:13,fontWeight:700,color:C.textHi}}>Active Federated Nodes</div>
               <table style={{width:'100%',borderCollapse:'collapse'}}>
                 <thead>
                   <tr style={{background:C.bg3}}>
                     <th style={{padding:'10px 16px',textAlign:'left',fontSize:10,color:C.textLo,fontWeight:600}}>HOSPITAL</th>
                     <th style={{padding:'10px 16px',textAlign:'left',fontSize:10,color:C.textLo,fontWeight:600}}>REGION</th>
                     <th style={{padding:'10px 16px',textAlign:'right',fontSize:10,color:C.textLo,fontWeight:600}}>SCANS TRAINED</th>
                   </tr>
                 </thead>
                 <tbody>
                   {fedNodes.length === 0 ? <tr><td colSpan={3} style={{padding:20,textAlign:'center',color:C.textLo,fontSize:12}}>No active nodes</td></tr> : fedNodes.map(n => (
                     <tr key={n.id} style={{borderTop:`1px solid ${C.border}`}}>
                       <td style={{padding:'12px 16px',fontSize:12,color:C.textHi}}>{n.tenant?.name || n.tenantId}</td>
                       <td style={{padding:'12px 16px',fontSize:12,color:C.textMd}}>{n.tenant?.region}</td>
                       <td style={{padding:'12px 16px',fontSize:12,color:C.brand,textAlign:'right',fontFamily:C.FM}}>{n.totalScansContributed.toLocaleString()}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
             <div style={{background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
               <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,fontSize:13,fontWeight:700,color:C.textHi}}>Global Training Rounds</div>
               <table style={{width:'100%',borderCollapse:'collapse'}}>
                 <thead>
                   <tr style={{background:C.bg3}}>
                     <th style={{padding:'10px 16px',textAlign:'left',fontSize:10,color:C.textLo,fontWeight:600}}>ROUND</th>
                     <th style={{padding:'10px 16px',textAlign:'left',fontSize:10,color:C.textLo,fontWeight:600}}>STATUS</th>
                     <th style={{padding:'10px 16px',textAlign:'right',fontSize:10,color:C.textLo,fontWeight:600}}>ACCURACY</th>
                   </tr>
                 </thead>
                 <tbody>
                   {fedRounds.length === 0 ? <tr><td colSpan={3} style={{padding:20,textAlign:'center',color:C.textLo,fontSize:12}}>No completed rounds</td></tr> : fedRounds.map(r => (
                     <tr key={r.id} style={{borderTop:`1px solid ${C.border}`}}>
                       <td style={{padding:'12px 16px',fontSize:12,color:C.textHi,fontWeight:600}}>#{r.roundNumber}</td>
                       <td style={{padding:'12px 16px',fontSize:11}}>
                         {r.status === 'in_progress' ? <span style={{color:C.urgent}}>⏳ Aggregating...</span> : <span style={{color:C.normal}}>✓ Completed</span>}
                       </td>
                       <td style={{padding:'12px 16px',fontSize:12,color:r.accuracy?C.normal:C.textLo,textAlign:'right',fontFamily:C.FM}}>
                         {r.accuracy ? `${(r.accuracy * 100).toFixed(1)}%` : '--'}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      )}

      {showTrainingConfirm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:4000,padding:20}}>
          <div style={{background:C.bg2,padding:24,borderRadius:16,width:'100%',maxWidth:400,border:`1px solid ${C.border}`,boxShadow:'0 24px 64px rgba(0,0,0,0.8)'}}>
            <h3 style={{margin:0,color:C.textHi,fontSize:18,fontWeight:700,marginBottom:12}}>Trigger Federated Round?</h3>
            <p style={{fontSize:13,color:C.textMd,lineHeight:1.5,marginBottom:20}}>This will initiate a global aggregation of neural weights from all clinical nodes. This is a high-resource operation requiring massive GPU orchestration.</p>
            <div style={{display:'flex',gap:12}}>
              <button onClick={()=>setShowTrainingConfirm(false)} style={{flex:1,padding:12,background:'transparent',color:C.textLo,border:`1px solid ${C.border}`,borderRadius:10,cursor:'pointer'}}>Cancel</button>
              <button onClick={async ()=>{
                setShowTrainingConfirm(false);
                setAdminStatus(null);
                try {
                  await apiClient.post('/ai/federated/train');
                  setAdminStatus({ msg: 'Federated training round initiated.', type:'ok' });
                } catch(e: unknown) {
                  const msg = e instanceof Error ? e.message : String(e);
                  setAdminStatus({ msg: `Training trigger failed: ${msg}`, type:'err' });
                }
              }} style={{flex:1,padding:12,background:C.info,color:'white',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer'}}>Initiate Round</button>
            </div>
          </div>
        </div>
      )}

      {tab==='edge' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
           <div style={{padding:20,background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:C.textHi}}>Edge AI Fleet Management</div>
                <p style={{fontSize:12,color:C.textMd,margin:'4px 0 0'}}>Monitoring {edgeDevices.length} remote devices operating in zero-connectivity environments.</p>
              </div>
           </div>
           
           <div style={{background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
             <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,fontSize:13,fontWeight:700,color:C.textHi}}>Field Units</div>
             <div style={{overflowX:'auto'}}>
               <table style={{width:'100%',borderCollapse:'collapse', minWidth: 600}}>
                 <thead>
                   <tr style={{background:C.bg3}}>
                     <th style={{padding:'10px 16px',textAlign:'left',fontSize:10,color:C.textLo,fontWeight:600}}>DEVICE ID</th>
                     <th style={{padding:'10px 16px',textAlign:'left',fontSize:10,color:C.textLo,fontWeight:600}}>HOSPITAL / REGION</th>
                     <th style={{padding:'10px 16px',textAlign:'left',fontSize:10,color:C.textLo,fontWeight:600}}>STATUS</th>
                     <th style={{padding:'10px 16px',textAlign:'right',fontSize:10,color:C.textLo,fontWeight:600}}>OFFLINE STORAGE USED</th>
                     <th style={{padding:'10px 16px',textAlign:'right',fontSize:10,color:C.textLo,fontWeight:600}}>TOTAL SCANS SYNCED</th>
                     <th style={{padding:'10px 16px',textAlign:'right',fontSize:10,color:C.textLo,fontWeight:600}}>LAST HEARTBEAT</th>
                   </tr>
                 </thead>
                 <tbody>
                   {edgeDevices.length === 0 ? <tr><td colSpan={6} style={{padding:20,textAlign:'center',color:C.textLo,fontSize:12}}>No Edge Devices registered</td></tr> : edgeDevices.map(d => (
                     <tr key={d.id} style={{borderTop:`1px solid ${C.border}`}}>
                       <td style={{padding:'12px 16px',fontSize:12,color:C.textHi,fontWeight:600}}>{d.deviceId.substring(0,8)}</td>
                       <td style={{padding:'12px 16px',fontSize:12,color:C.textHi}}>{d.tenant?.name || d.tenantId} <span style={{color:C.textLo}}>({d.region || 'Unknown'})</span></td>
                       <td style={{padding:'12px 16px',fontSize:11}}>
                         {d.status === 'online' && <span style={{color:C.normal}}>🟢 Online</span>}
                         {d.status === 'offline' && <span style={{color:C.textLo}}>⚫ Offline</span>}
                         {d.status === 'syncing' && <span style={{color:C.urgent}}>⏳ Syncing...</span>}
                       </td>
                       <td style={{padding:'12px 16px',fontSize:12,color:C.textMd,textAlign:'right',fontFamily:C.FM}}>{d.storageUsedMB} MB</td>
                       <td style={{padding:'12px 16px',fontSize:12,color:C.brand,textAlign:'right',fontFamily:C.FM}}>{d.totalSyncedScans.toLocaleString()}</td>
                       <td style={{padding:'12px 16px',fontSize:11,color:C.textLo,textAlign:'right',fontFamily:C.FM}}>{new Date(d.lastHeartbeat).toLocaleString('en-GB')}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      )}

      {showProvision && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000,padding:20}}>
          <div style={{background:C.bg2,padding:24,borderRadius:16,width:'100%',maxWidth:480,border:`1px solid ${C.border}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{margin:0,fontSize:18,color:C.textHi,fontWeight:700}}>Provision New Tenant</h2>
              <button onClick={()=>setShowProvision(false)} style={{background:'none',border:'none',color:C.textLo,cursor:'pointer',fontSize:18}}>✕</button>
            </div>
            <form onSubmit={async (e)=>{
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              setAdminStatus(null);
              try {
                await apiClient.post('/tenants', Object.fromEntries(d));
                setAdminStatus({ msg: 'Tenant provisioned successfully.', type:'ok' });
                setShowProvision(false);
              } catch(err: unknown) { 
                const msg = err instanceof Error ? err.message : 'Operation failed';
                setAdminStatus({ msg: `Provisioning failed: ${msg}`, type:'err' });
              }
            }} style={{display:'flex',flexDirection:'column',gap:14}}>
              <div><label style={{fontSize:11,color:C.textLo,display:'block',marginBottom:4}}>INSTITUTION NAME</label>
                <input name="name" required style={{width:'100%',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px',color:C.textHi,fontSize:13,boxSizing:'border-box'}}/>
              </div>
              <div><label style={{fontSize:11,color:C.textLo,display:'block',marginBottom:4}}>ADMIN EMAIL</label>
                <input name="adminEmail" type="email" required style={{width:'100%',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px',color:C.textHi,fontSize:13,boxSizing:'border-box'}}/>
              </div>
              <div style={{display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12}}>
                <div><label style={{fontSize:11,color:C.textLo,display:'block',marginBottom:4}}>REGION</label>
                  <select name="region" style={{width:'100%',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px',color:C.textHi,fontSize:13}}>
                    <option value="uk">🇬🇧 United Kingdom</option>
                    <option value="eu">🇪🇺 European Union</option>
                    <option value="us">🇺🇸 United States</option>
                    <option value="ng">🇳🇬 Nigeria</option>
                    <option value="ke">🇰🇪 Kenya</option>
                    <option value="za">🇿🇦 South Africa</option>
                  </select>
                </div>
                <div><label style={{fontSize:11,color:C.textLo,display:'block',marginBottom:4}}>PLAN</label>
                  <select name="plan" style={{width:'100%',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px',color:C.textHi,fontSize:13}}>
                    <option value="trial">Trial (50 scans)</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
              <button type="submit" style={{marginTop:8,padding:'12px',background:C.brand,color:'white',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer',fontSize:14}}>🚀 Provision Tenant</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
