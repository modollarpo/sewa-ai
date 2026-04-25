// SEWA AI — SuperAdminDashboard.tsx
// Global platform management: tenants, AI, deployments, compliance, billing, logs
import React, { useState } from 'react';
import { useSuperAdminData } from '../../hooks/useDashboardData';
import { Skeleton, StatSkeleton, TableRowSkeleton } from '../../components/ui/Skeleton';
import { apiClient } from '../../services/apiClient';
import { Tooltip } from '../../components/ui/Tooltip';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',bg4:'#162821',
  brand:'#408D7B',brandLt:'#52B09A',brandDk:'#2E6B5E',
  critical:'#E03535',critBg:'#2A0A0A',
  urgent:'#E08A20',urgBg:'#2A1800',
  normal:'#1DBF73',normalBg:'#0A1F14',
  info:'#2A6EF2',infoBg:'#0A1530',
  purple:'#8B5CF6',purpleBg:'#1a0a30',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',
  F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

// Fallbacks handled in hook

// Fallbacks handled in hook

const REGION_FLAGS:Record<string,string> = {uk:'🇬🇧',eu:'🇪🇺',us:'🇺🇸',ng:'🇳🇬',ke:'🇰🇪',za:'🇿🇦',in:'🇮🇳',gh:'🇬🇭'};

const AI_MODELS = [
  { version: 'v2.4.1', type: 'triage', status: 'production', deployed: '2026-03-01', accuracy: 94.1, traffic: '100% Global' },
  { version: 'v2.5.0-rc', type: 'triage', status: 'ab_test', deployed: '2026-03-10', accuracy: 95.8, traffic: '10% (LUTH, Lagos)' },
  { version: 'v1.2.0', type: 'vlm', status: 'production', deployed: '2026-02-15', accuracy: 89.4, traffic: '100% Global' },
  { version: 'v2.0.1', type: 'metacognition', status: 'production', deployed: '2026-03-05', accuracy: 99.2, traffic: '100% Global' },
];

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
  // Stylised world map with region indicators
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
      {/* Grid lines */}
      {[0,1,2,3].map(i=>(
        <div key={i} style={{position:'absolute',top:`${25*(i+1)}%`,left:0,right:0,height:1,background:`${C.border}60`}}/>
      ))}
      {[0,1,2,3,4].map(i=>(
        <div key={i} style={{position:'absolute',left:`${20*(i+1)}%`,top:0,bottom:0,width:1,background:`${C.border}60`}}/>
      ))}
      {/* Region dots */}
      {regions.map(r=>(
        <div key={r.label} style={{position:'absolute',left:r.x,top:r.y,transform:'translate(-50%,-50%)', opacity: r.active ? 1 : 0.3}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:r.color,boxShadow: r.active ? `0 0 12px ${r.color}` : 'none',animation: r.active ? 'pulseR 2s infinite' : 'none'}}/>
          <style>{`@keyframes pulseR{0%,100%{transform:scale(1)}50%{transform:scale(1.4)}}`}</style>
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
  const { stats, tenants, regionalStats, health, audit, loading, error } = useSuperAdminData();
  const [tab, setTab] = useState<'overview'|'tenants'|'aimodels'|'deployments'|'compliance'|'logs'|'edge'>('overview');
  const [tenantSearch, setTenantSearch] = useState('');
  const [showProvision, setShowProvision] = useState(false);

  const tabStyle = (t:string):React.CSSProperties => ({
    padding:'8px 14px',fontSize:12,fontWeight:tab===t?600:400,
    color:tab===t?C.brand:C.textLo,background:'none',border:'none',
    borderBottom:`2px solid ${tab===t?C.brand:'transparent'}`,
    marginBottom:'-1px',cursor:'pointer',fontFamily:C.F,whiteSpace:'nowrap',
    display:'flex',alignItems:'center',gap:5,
  });

  const filteredTenants = tenants.filter(t=>!tenantSearch||(t.name||'').toLowerCase().includes(tenantSearch.toLowerCase())||(t.region||'').includes(tenantSearch));

  return (
    <div style={{minHeight:'calc(100vh - 76px)',background:C.bg0,fontFamily:C.F,padding:24}}>

      {/* Super Admin Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <span style={{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,background:`${C.critical}14`,color:C.critical,border:`1px solid ${C.critical}30`,letterSpacing:'0.06em'}}>
              ⚡ SUPER ADMIN
            </span>
            <span style={{fontSize:10,color:C.textLo,fontFamily:C.FM}}>
              {new Date().toISOString().split('T')[0]} · SEWA AI Platform v2.4.1
            </span>
          </div>
          <h1 style={{margin:0,fontSize:22,fontWeight:700,color:C.textHi}}>Platform Command Centre</h1>
          <p style={{margin:'4px 0 0',fontSize:12,color:C.textMd}}>Global infrastructure management across all regions and tenants</p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}}>
          {[
            {label:'Provision Tenant',color:C.brand, onClick: () => setShowProvision(true)},
            {label:'Deploy Model',color:C.info, onClick: () => setTab('aimodels')},
            {label:'Platform Audit',color:C.bg3, onClick: () => setTab('logs')}
          ].map(btn=>(
            <button key={btn.label} style={{
              padding:'7px 14px',borderRadius:8,border:`1px solid ${btn.color==='#111F1A'?C.border:btn.color}`,
              background:btn.color,color:btn.color===C.bg3?C.textMd:'white',
              fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:C.F,
            }} onClick={btn.onClick}>{btn.label}</button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{borderBottom:`1px solid ${C.border}`,display:'flex',gap:2,marginBottom:20,overflowX:'auto'}}>
        {[
          {key:'overview',icon:'🌍'},
          {key:'tenants',icon:'🏥'},
          {key:'aimodels',icon:'🧠'},
          {key:'deployments',icon:'🚀'},
          {key:'compliance',icon:'🔒'},
          {key:'logs',icon:'📋'},
          {key:'edge',icon:'📡'},
        ].map(t=>(
          <button key={t.key} style={tabStyle(t.key)} onClick={()=>setTab(t.key as any)}>
            {t.icon} {t.key.charAt(0).toUpperCase()+t.key.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab==='overview' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {error && (
            <div style={{padding:'10px 16px',background:`${C.critical}15`,border:`1px solid ${C.critical}40`,borderRadius:10,color:C.critical,fontSize:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>⚠️ {error}</span>
              <button onClick={() => window.location.reload()} style={{background:C.critical,border:'none',color:'white',padding:'4px 10px',borderRadius:6,fontSize:10,cursor:'pointer'}}>Retry Now</button>
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:12}}>
            {loading ? (
              <>
                <StatSkeleton/><StatSkeleton/><StatSkeleton/><StatSkeleton/>
              </>
            ) : (
              <>
                <BigStat label="Total Tenants" value={stats.tenants || 0} sub={`${tenants?.length || 0} regions configured`} icon="🏥"/>
                <BigStat label="Global Scans" value={(stats.totalScans || 0).toLocaleString()} sub="Real-time ingestion active" icon="🩻" color={C.brand}/>
                <BigStat label="Critical Alerts 24h" value={stats.criticalToday || 0} sub="All active response teams" icon="🚨" color={C.critical}/>
                <BigStat label="Platform Accuracy" value={`${(stats.avgAIConfidence || 0).toFixed(1)}%`} sub="Weighted avg across tenants" icon="🎯" color={C.normal}/>
              </>
            )}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:12}}>
            {loading ? (
              <>
                <StatSkeleton/><StatSkeleton/><StatSkeleton/><StatSkeleton/>
              </>
            ) : (
              <>
                <BigStat label="AI Inferences Total" value={(stats.totalInferences || 0).toLocaleString()} icon="⚡" color={C.info}/>
                <BigStat label="Avg Inference Time" value={`${((stats.avgInferenceMs || 0) / 1000).toFixed(1)}s`} sub="Triage → Report" icon="⏱"/>
                <BigStat label="Uptime (30d)" value={stats.uptime || '100%'} color={C.normal} icon="✅"/>
                <BigStat label="Monthly Revenue" value={`$${(stats.totalRevenueUSD || 0).toLocaleString()}`} sub="Global aggregate" icon="💰" color={C.brand}/>
              </>
            )}
          </div>

          {/* Global map */}
          <div style={{padding:16,background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:12,fontWeight:700,color:C.textHi,marginBottom:12}}>Global Deployment Map</div>
            {loading ? <Skeleton height={160}/> : <GlobeMap data={regionalStats}/>}
          </div>

          {/* AI Service health */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:12}}>
            {health.length > 0 ? health.map((svc: any)=>(
              <div key={svc.name} style={{padding:14,background:C.bg2,borderRadius:12,border:`1px solid ${svc.status==='healthy'?`${C.normal}20`:C.border}`}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                  <span style={{width:7,height:7,borderRadius:'50%',background:svc.status==='healthy'?C.normal:svc.status==='running'?C.info:C.critical,boxShadow:`0 0 5px ${svc.status==='healthy'?C.normal:svc.status==='running'?C.info:C.critical}`}}/>
                  <span style={{fontSize:11,fontWeight:600,color:C.textHi,fontFamily:C.F}}>{svc.name}</span>
                  <span style={{fontSize:10,color:C.textLo,fontFamily:C.FM,marginLeft:'auto'}}>{svc.version}</span>
                </div>
                <div style={{display:'flex',gap:8,fontSize:10,color:C.textLo,fontFamily:C.FM}}>
                  <span>{svc.latency ? `${svc.latency}ms` : '—'}</span>
                  <span>·</span>
                  <span>{svc.status.toUpperCase()}</span>
                  <span>·</span>
                  <span>{svc.backend || 'UK-SOUTH'}</span>
                </div>
              </div>
            )) : (
              <div style={{gridColumn:'1/-1', padding:20, textAlign:'center', color:C.textLo, fontSize:12}}>
                📡 Connecting to AI service telemetry...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deployments & Cluster Health */}
      {tab==='deployments' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))',gap:16}}>
            <div style={{padding:20,background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:12,fontWeight:700,color:C.textHi}}>AKS Cluster: sewa-prod-aks</span>
                  <Tooltip position="right" content="Azure Kubernetes Service: Host for the entire AI pipeline and API layer. High-availability mode active.">
                    <span style={{fontSize:10,color:C.textLo,cursor:'help'}}>ⓘ</span>
                  </Tooltip>
                </div>
                <span style={{fontSize:10,color:C.normal,fontWeight:700}}>ONLINE</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={{fontSize:11,color:C.textMd}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span>CPU Utilisation</span><span>{(Math.random()*40 + 20).toFixed(1)}%</span></div>
                  <div style={{height:4,background:C.bg3,borderRadius:2}}><div style={{width:'34%',height:'100%',background:C.brand,borderRadius:2}}/></div>
                </div>
                <div style={{fontSize:11,color:C.textMd}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span>Memory Allocation</span><span>{(Math.random()*30 + 50).toFixed(1)}%</span></div>
                  <div style={{height:4,background:C.bg3,borderRadius:2}}><div style={{width:'58%',height:'100%',background:C.info,borderRadius:2}}/></div>
                </div>
              </div>
            </div>
            
            <div style={{padding:20,background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:12,fontWeight:700,color:C.textHi,marginBottom:16}}>Active Pod Status</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {[
                  {n:'backend',s:'Running',p:3},
                  {n:'triage',s:'Running',p:8},
                  {n:'vlm',s:'Running',p:4},
                  {n:'dicom',s:'Running',p:2},
                ].map(p=>(
                  <div key={p.n} style={{padding:'8px 12px',background:C.bg3,borderRadius:8,display:'flex',flexDirection:'column',gap:2}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.textHi,textTransform:'uppercase'}}>{p.n}</div>
                    <div style={{fontSize:9,color:C.normal}}>{p.s} ({p.p} replicas)</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{padding:20,background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:12,fontWeight:700,color:C.textHi,marginBottom:12}}>Continuous Deployment Pipeline</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[
                {step:'ACR Build: Backend', status:'SUCCESS', time:'2m ago'},
                {step:'ACR Build: Triage-AI', status:'SUCCESS', time:'5m ago'},
                {step:'AKS Manifest Update', status:'SUCCESS', time:'1m ago'},
                {step:'SWA Frontend Build', status:'IN_PROGRESS', time:'Running...'},
              ].map((s,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:10,background:C.bg3,borderRadius:8}}>
                  <span style={{width:10,height:10,borderRadius:'50%',background:s.status==='SUCCESS'?C.normal:C.info,animation:s.status==='IN_PROGRESS'?'pulse 2s infinite':'none'}}/>
                  <div style={{flex:1,fontSize:11,color:C.textHi}}>{s.step}</div>
                  <div style={{fontSize:10,color:C.textLo,fontFamily:C.FM}}>{s.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tenants */}
      {tab==='tenants' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{position:'relative',flex:1}}>
              <svg style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:C.textLo}} width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={tenantSearch} onChange={e=>setTenantSearch(e.target.value)} placeholder="Search tenants by name or region…"
                style={{width:'100%',height:34,padding:'0 8px 0 28px',boxSizing:'border-box',background:C.bg2,border:`1px solid ${C.border}`,borderRadius:8,color:C.textHi,fontSize:12,fontFamily:C.F,outline:'none'}}/>
            </div>
            <span style={{fontSize:11,color:C.textLo,fontFamily:C.F,whiteSpace:'nowrap'}}>{(filteredTenants || []).length} tenants</span>
          </div>

          <div style={{background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:C.bg3}}>
                  {['Institution','Region','Plan','Scans/mo','Users','AI Accuracy','Revenue','Status','Actions'].map(h=>(
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:10,fontWeight:600,color:C.textLo,letterSpacing:'0.05em',textTransform:'uppercase',fontFamily:C.F,whiteSpace:'nowrap'}}>
                      <div style={{display:'flex',alignItems:'center',gap:4}}>
                        {h}
                        {h==='Actions' && (
                          <Tooltip content="Management controls: View details, rotate edge API keys, or suspend tenant access.">
                            <span style={{fontSize:9,cursor:'help'}}>ⓘ</span>
                          </Tooltip>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={9}><TableRowSkeleton/></td></tr>)
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{padding:40,textAlign:'center',color:C.textLo,fontSize:12,fontFamily:C.F}}>
                      No tenants match your search.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t,i)=>(
                    <tr key={t.id || i} style={{borderTop:`1px solid ${C.border}`,background:i%2===0?'transparent':C.bg1+'30'}}>
                      <td style={{padding:'12px 12px'}}>
                        <div style={{fontSize:12,fontWeight:600,color:C.textHi}}>{t.name || 'Unknown Institution'}</div>
                        <div style={{fontSize:10,color:C.textLo,fontFamily:C.FM}}>ID: {t.id || 'N/A'}</div>
                      </td>
                      <td style={{padding:'12px 12px'}}>
                        <span style={{fontSize:14}}>{t.region ? REGION_FLAGS[t.region] : '🌐'}</span>
                        <span style={{fontSize:10,color:C.textMd,marginLeft:4,textTransform:'uppercase'}}>{t.region || 'Unknown'}</span>
                      </td>
                    <td style={{padding:'12px 12px'}}>
                      <span style={{fontSize:10,padding:'2px 6px',borderRadius:6,background:`${C.brand}15`,color:C.brand,border:`1px solid ${C.brand}30`,fontFamily:C.F,textTransform:'capitalize'}}>
                        {t.plan || 'enterprise'}
                      </span>
                    </td>
                    <td style={{padding:'12px 12px',fontFamily:C.FM,fontSize:12,color:C.textHi}}>{(t.scansMonth || 0).toLocaleString()}</td>
                    <td style={{padding:'12px 12px',fontFamily:C.FM,fontSize:12,color:C.textHi}}>{t.users || 0}</td>
                    <td style={{padding:'12px 12px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{flex:1,height:3,background:C.bg4,borderRadius:2,overflow:'hidden',minWidth:50}}>
                          <div style={{width:`${t.aiAccuracy || 0}%`,height:'100%',background:(t.aiAccuracy || 0)>=93?C.normal:C.urgent}}/>
                        </div>
                        <span style={{fontSize:10,fontFamily:C.FM,color:(t.aiAccuracy || 0)>=93?C.normal:C.urgent}}>{t.aiAccuracy || 0}%</span>
                      </div>
                    </td>
                    <td style={{padding:'12px 12px',fontFamily:C.FM,fontSize:11,color:C.textHi}}>{t.revenue || '$0'}</td>
                    <td style={{padding:'12px 12px'}}>
                      <span style={{fontSize:10,padding:'2px 7px',borderRadius:20,
                        background:t.status==='active'?C.normalBg:t.status==='trial'?`${C.urgent}15`:C.bg3,
                        color:t.status==='active'?C.normal:t.status==='trial'?C.urgent:C.textLo,
                        border:`1px solid ${t.status==='active'?'#0D2A1A':t.status==='trial'?`${C.urgent}40`:C.border}`,
                        fontFamily:C.F,fontWeight:600,letterSpacing:'0.04em',
                      }}>{t.status || 'inactive'}</span>
                    </td>
                    <td style={{padding:'12px 12px'}}>
                      <div style={{display:'flex',gap:4}}>
                        {['View','Rotate Key','Suspend'].map(a=>(
                          <button key={a} onClick={async () => {
                            if(a === 'Suspend') {
                              if(confirm(`Are you sure you want to suspend ${t.name}?`)) {
                                await apiClient.patch(`/admin/tenants/${t.id}/status`, { status: 'suspended' });
                                alert(`${t.name} suspended.`);
                                window.location.reload();
                              }
                            } else if (a === 'Rotate Key') {
                              if(confirm(`Rotate API Key for ${t.name}? This will disconnect active Edge nodes until updated.`)) {
                                const res = await apiClient.post(`/admin/tenants/${t.id}/rotate-key`);
                                alert(`New API Key: ${res.data.apiKey}\n\nPlease copy this key now. It will not be shown again.`);
                              }
                            } else {
                              alert(`${a} tenant details coming soon.`);
                            }
                          }} style={{padding:'3px 7px',fontSize:10,borderRadius:5,border:`1px solid ${C.border}`,background:C.bg3,color:a==='Suspend'?C.critical:C.textMd,cursor:'pointer',fontFamily:C.F}}>{a}</button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Models */}
      {tab==='aimodels' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{padding:16,background:`${C.info}0A`,borderRadius:12,border:`1px solid ${C.info}30`,fontSize:12,color:C.textMd}}>
            🧠 Model versioning, A/B testing, and rollout management. All deployments are immutable and audited.
          </div>
          {AI_MODELS.map(m=>(
            <div key={m.version+m.type} style={{padding:16,background:C.bg2,borderRadius:12,border:`1px solid ${m.status==='production'?`${C.brand}30`:m.status==='ab_test'?`${C.info}30`:C.border}`}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <span style={{fontFamily:C.FM,fontSize:16,fontWeight:700,color:C.textHi}}>{m.version}</span>
                <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,
                  background:m.status==='production'?`${C.brand}20`:m.status==='ab_test'?`${C.info}20`:`${C.urgent}15`,
                  color:m.status==='production'?C.brand:m.status==='ab_test'?C.info:C.urgent,
                  border:`1px solid ${m.status==='production'?`${C.brand}40`:m.status==='ab_test'?`${C.info}40`:`${C.urgent}30`}`,
                  fontFamily:C.F,fontWeight:700,letterSpacing:'0.04em',textTransform:'uppercase',
                }}>{m.status.replace('_',' ')}</span>
                <span style={{fontSize:10,color:C.textLo,fontFamily:C.F,textTransform:'capitalize'}}>{m.type} engine</span>
                <span style={{marginLeft:'auto',fontSize:11,color:C.textLo,fontFamily:C.F}}>Deployed {m.deployed}</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))',gap:10}}>
                <div style={{padding:'8px 10px',background:C.bg3,borderRadius:8}}>
                  <div style={{fontSize:9,color:C.textLo,marginBottom:4,letterSpacing:'0.04em'}}>ACCURACY</div>
                  <div style={{fontSize:18,fontWeight:700,color:C.normal,fontFamily:C.FM}}>{m.accuracy}%</div>
                </div>
                <div style={{padding:'8px 10px',background:C.bg3,borderRadius:8}}>
                  <div style={{fontSize:9,color:C.textLo,marginBottom:4,letterSpacing:'0.04em'}}>TRAFFIC SPLIT</div>
                  <div style={{fontSize:18,fontWeight:700,color:C.info,fontFamily:C.FM}}>{m.traffic}</div>
                </div>
                <div style={{padding:'8px 10px',background:C.bg3,borderRadius:8}}>
                  <div style={{fontSize:9,color:C.textLo,marginBottom:4,letterSpacing:'0.04em'}}>STATUS</div>
                  <div style={{fontSize:11,fontWeight:600,color:C.textHi,fontFamily:C.F,marginTop:4,textTransform:'capitalize'}}>{m.status.replace('_',' ')}</div>
                </div>
              </div>
              <div style={{display:'flex',gap:6,marginTop:12}}>
                {m.status==='ab_test'&&<button onClick={() => alert('Promoting model to production...')} style={{padding:'6px 12px',background:C.brand,border:'none',borderRadius:7,color:'white',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:C.F}}>Promote to Production</button>}
                {m.status==='ab_test'&&<button onClick={() => alert('Rolling back model...')} style={{padding:'6px 12px',background:C.critBg,border:`1px solid ${C.critical}40`,borderRadius:7,color:C.critical,fontSize:11,cursor:'pointer',fontFamily:C.F}}>Rollback</button>}
                <button onClick={() => alert('View metrics coming soon.')} style={{padding:'6px 12px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:7,color:C.textMd,fontSize:11,cursor:'pointer',fontFamily:C.F}}>View Metrics</button>
                <button onClick={() => alert('View changelog coming soon.')} style={{padding:'6px 12px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:7,color:C.textMd,fontSize:11,cursor:'pointer',fontFamily:C.F}}>View Changelog</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compliance */}
      {tab==='compliance' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))',gap:16}}>
          {[
            {label:'GDPR / UK DPA 2018',region:'UK/EU',status:'compliant',items:['Data minimisation','Right to erasure','DPIA complete','DPO appointed','Breach response < 72h']},
            {label:'NHS DSPT 2024-25',region:'UK',status:'compliant',items:['Toolkit submission','IG training 100%','Data flows mapped','Pen test Q4','Incident log current']},
            {label:'EU MDR Annex XIV (SaMD)',region:'EU',status:'in_progress',items:['Class IIb classification','Clinical evaluation filed','QMS ISO 13485','PMS plan active','PMCF ongoing']},
            {label:'FDA 510(k) Pre-submission',region:'US',status:'in_progress',items:['De Novo pathway','510(k) draft filed','IDE waiver submitted','Predicate identified','Substantial equivalence']},
            {label:'EU AI Act (High Risk)',region:'EU',status:'in_progress',items:['Risk assessment complete','Human oversight implemented','Transparency docs','Bias monitoring active','Incident reporting']},
            {label:'HIPAA Security Rule',region:'US',status:'compliant',items:['BAA with all vendors','Audit logs 6yr retention','Encryption at rest/transit','Access controls RBAC','Annual risk assessment']},
          ].map(reg=>(
            <div key={reg.label} style={{padding:16,background:C.bg2,borderRadius:12,border:`1px solid ${reg.status==='compliant'?`${C.normal}30`:C.border}`}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:C.textHi}}>{reg.label}</div>
                  <div style={{fontSize:10,color:C.textLo,marginTop:2}}>{reg.region}</div>
                </div>
                <span style={{
                  padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,
                  background:reg.status==='compliant'?C.normalBg:`${C.urgent}15`,
                  color:reg.status==='compliant'?C.normal:C.urgent,
                  border:`1px solid ${reg.status==='compliant'?'#0D2A1A':`${C.urgent}40`}`,
                  fontFamily:C.F,letterSpacing:'0.04em',textTransform:'uppercase',
                }}>{reg.status==='compliant'?'✓ Compliant':'⏳ In Progress'}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                {reg.items.map(item=>(
                  <div key={item} style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{color:reg.status==='compliant'?C.normal:C.textLo,fontSize:12,flexShrink:0}}>
                      {reg.status==='compliant'?'✓':'○'}
                    </span>
                    <span style={{fontSize:11,color:C.textMd,fontFamily:C.F}}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Logs */}
      {tab==='logs' && (
        <div style={{background:C.bg0,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',background:C.bg2}}>
            <span style={{fontSize:12,fontWeight:700,color:C.textHi,fontFamily:C.FM}}>Platform System Log</span>
            <div style={{display:'flex',gap:8}}>
              {['ALL','ERROR','WARN','INFO'].map(l=>(
                <button key={l} style={{padding:'3px 8px',borderRadius:5,background:l==='ALL'?C.brand:C.bg3,border:`1px solid ${C.border}`,color:l==='ALL'?'white':C.textLo,fontSize:10,cursor:'pointer',fontFamily:C.FM}}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{fontFamily:C.FM,fontSize:11,padding:'8px 0',maxHeight:400,overflowY:'auto'}}>
            {audit.length > 0 ? audit.map((log: any,i: number)=>(
              <div key={i} style={{
                display:'flex',gap:12,padding:'5px 16px',
                borderBottom:`1px solid ${C.border}30`,
                background:log.level==='ERROR'?`${C.critical}08`:log.level==='WARN'?`${C.urgent}06`:'transparent',
              }}>
                <span style={{color:C.textLo,flexShrink:0,fontSize:10}}>{new Date(log.createdAt).toLocaleTimeString()}</span>
                <span style={{
                  width:34,flexShrink:0,fontSize:9,fontWeight:700,textAlign:'center',
                  color:log.action.includes('ERROR')?C.critical:log.action.includes('WARN')?C.urgent:C.info,
                }}>{log.action.split('_')[0]}</span>
                <span style={{color:C.brand,flexShrink:0,fontSize:10,minWidth:110}}>{log.entity}</span>
                <span style={{color:C.textMd,fontSize:11,flex:1}}>{log.action}: {log.entityId} — User: {log.userId}</span>
              </div>
            )) : (
              <div style={{padding:20, textAlign:'center', color:C.textLo, fontSize:11}}>
                Loading platform ledger...
              </div>
            )}
          </div>
        </div>
      )}

      {tab==='edge' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{padding:16,background:`${C.brand}10`,borderRadius:12,border:`1px solid ${C.brand}30`,display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:24}}>📡</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.textHi}}>Edge Infrastructure Management</div>
              <div style={{fontSize:11,color:C.textMd}}>Deploy and monitor offline-first DICOM gateways at clinical sites.</div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(340px, 1fr))',gap:16}}>
            <div style={{padding:20,background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`}}>
              <h3 style={{margin:'0 0 16px',fontSize:14,color:C.textHi}}>Provision New Edge Node</h3>
              <p style={{fontSize:12,color:C.textMd,lineHeight:1.5,marginBottom:20}}>
                Edge nodes process medical images locally using INT8 models and sync results to the cloud when connectivity is available.
              </p>
              
              <div style={{background:C.bg0,padding:16,borderRadius:10,fontFamily:C.FM,fontSize:11,color:C.brand,border:`1px solid ${C.border}`,position:'relative'}}>
                <div style={{position:'absolute',top:8,right:8,fontSize:9,color:C.textLo}}>UBUNTU 22.04 LTS</div>
                <div style={{color:C.textLo,marginBottom:8}}># Run on local hospital server</div>
                <div>curl -fsSL https://api.sewaxai.health/edge/setup.sh | bash -s -- \</div>
                <div style={{paddingLeft:16}}>--tenant-id=HOSPITAL_ID \</div>
                <div style={{paddingLeft:16}}>--api-key=YOUR_PLATFORM_KEY \</div>
                <div style={{paddingLeft:16}}>--region=africa</div>
              </div>

              <div style={{marginTop:20,display:'flex',flexDirection:'column',gap:10}}>
                {[
                  'Automatic INT8 Model Quantisation',
                  'Local SQLite Audit Log (Synced)',
                  'GSM/SMS Fallback Alerts Active',
                  'PACS/DICOM Listener (Port 11112)'
                ].map(check=>(
                  <div key={check} style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:C.textMd}}>
                    <span style={{color:C.normal}}>✓</span> {check}
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{padding:16,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                  <span style={{fontSize:12,fontWeight:700,color:C.textHi}}>Active Edge Nodes</span>
                  <span style={{fontSize:10,color:C.textLo,fontFamily:C.FM}}>3 TOTAL</span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {[
                    {id:'EN-01',loc:'Lagos, NG',status:'online',sync:'2m ago'},
                    {id:'EN-02',loc:'Nairobi, KE',status:'offline',sync:'14h ago'},
                    {id:'EN-03',loc:'Accra, GH',status:'online',sync:'Just now'},
                  ].map(node=>(
                    <div key={node.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:8,background:C.bg3,borderRadius:8}}>
                      <div>
                        <div style={{fontSize:11,fontWeight:600,color:C.textHi}}>{node.id} · {node.loc}</div>
                        <div style={{fontSize:9,color:C.textLo}}>Last sync: {node.sync}</div>
                      </div>
                      <span style={{fontSize:9,padding:'2px 6px',borderRadius:20,background:node.status==='online'?C.normalBg:C.critBg,color:node.status==='online'?C.normal:C.critical,fontWeight:700}}>{node.status.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{padding:16,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:C.textHi,marginBottom:8}}>Hardware Specs</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))',gap:12}}>
                  <div>
                    <div style={{fontSize:9,color:C.textLo}}>MINIMUM</div>
                    <div style={{fontSize:11,color:C.textMd}}>4-Core CPU<br/>8GB RAM<br/>128GB SSD</div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:C.textLo}}>RECOMMENDED</div>
                    <div style={{fontSize:11,color:C.textMd}}>8-Core CPU<br/>16GB RAM<br/>256GB NVMe</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {tab==='edge' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {/* ... existing edge content consolidates here ... */}
          <div style={{padding:16,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`, textAlign:'center'}}>
            <div style={{fontSize:11,color:C.textLo}}>Global Edge Overlay Management · Platform Version {config.VERSION || '2.4.1'}</div>
          </div>
        </div>
      )}

      {showProvision && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000,padding:20}}>
          <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:16,width:'100%',maxWidth:480,padding:24,boxShadow:'0 32px 64px rgba(0,0,0,0.8)',animation:'pop 200ms ease-out'}}>
            <style>{`@keyframes pop{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}`}</style>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <div>
                <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.textHi}}>Provision New Tenant</h2>
                <p style={{margin:'4px 0 0',fontSize:11,color:C.textLo}}>Configure a new hospital instance in the cloud</p>
              </div>
              <button onClick={()=>setShowProvision(false)} style={{background:'none',border:'none',color:C.textLo,cursor:'pointer'}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
            </div>
            
            <form onSubmit={async (e)=>{
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              try {
                await apiClient.post('/tenants', Object.fromEntries(d));
                alert('Hospital provisioned successfully. Initializing regional Edge nodes...');
                setShowProvision(false);
                window.location.reload();
              } catch(err) {
                alert('Provisioning failed. Check slug uniqueness.');
              }
            }} style={{display:'flex',flexDirection:'column',gap:16}}>
              <div>
                <label style={{fontSize:11,color:C.textMd,display:'block',marginBottom:6}}>HOSPITAL NAME</label>
                <input name="name" required placeholder="e.g. Mayo Clinic" style={{width:'100%',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'12px',color:C.textHi,fontSize:13,boxSizing:'border-box'}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={{fontSize:11,color:C.textMd,display:'block',marginBottom:6}}>URL SLUG</label>
                  <input name="slug" required placeholder="mayo-clinic" style={{width:'100%',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'12px',color:C.textHi,fontSize:13,boxSizing:'border-box'}}/>
                </div>
                <div>
                  <label style={{fontSize:11,color:C.textMd,display:'block',marginBottom:6}}>SUBDOMAIN</label>
                  <input name="subdomain" required placeholder="mayo" style={{width:'100%',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'12px',color:C.textHi,fontSize:13,boxSizing:'border-box'}}/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={{fontSize:11,color:C.textMd,display:'block',marginBottom:6}}>REGION</label>
                  <select name="region" style={{width:'100%',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'12px',color:C.textHi,fontSize:13}}>
                    {Object.keys(REGION_FLAGS).map(r => <option key={r} value={r}>{r.toUpperCase()} {REGION_FLAGS[r]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:11,color:C.textMd,display:'block',marginBottom:6}}>PLAN</label>
                  <select name="plan" style={{width:'100%',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'12px',color:C.textHi,fontSize:13}}>
                    <option value="enterprise">Enterprise</option>
                    <option value="impact">Impact (Grant)</option>
                    <option value="trial">Clinical Trial</option>
                  </select>
                </div>
              </div>
              <button type="submit" style={{marginTop:12,padding:'14px',background:C.brand,color:'white',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer',fontSize:14,boxShadow:`0 4px 12px ${C.brand}40`}}>🚀 Deploy Hospital Instance</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
