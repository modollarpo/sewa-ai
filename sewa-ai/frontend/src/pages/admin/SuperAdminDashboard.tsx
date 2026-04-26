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
  const { stats, tenants, regionalStats, health, audit, telemetry, loading, error } = useSuperAdminData();
  const [tab, setTab] = useState<'overview'|'tenants'|'aimodels'|'deployments'|'compliance'|'logs'|'edge'|'federated'|'billing'>('overview');
  const [tenantSearch, setTenantSearch] = useState('');
  const [showProvision, setShowProvision] = useState(false);
  const [logLimit, setLogLimit] = useState(50);

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
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <span style={{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,background:`${C.critical}14`,color:C.critical,border:`1px solid ${C.critical}30`,letterSpacing:'0.06em'}}>
              ⚡ SUPER ADMIN
            </span>
            <span style={{fontSize:10,color:C.textLo,fontFamily:C.FM}}>
              {new Date().toISOString().split('T')[0]} · SEWA AI v2.4.1
            </span>
          </div>
          <h1 style={{margin:0,fontSize:22,fontWeight:700,color:C.textHi}}>Platform Command Centre</h1>
          <p style={{margin:'4px 0 0',fontSize:12,color:C.textMd}}>Global infrastructure management</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={() => setShowProvision(true)} style={{padding:'7px 14px',borderRadius:8,background:C.brand,color:'white',border:'none',fontSize:11,fontWeight:600,cursor:'pointer'}}>Provision Tenant</button>
        </div>
      </div>

      <div style={{borderBottom:`1px solid ${C.border}`,display:'flex',gap:2,marginBottom:20,overflowX:'auto'}}>
        {['overview','tenants','aimodels','deployments','compliance','logs','edge','federated','billing'].map(t=>(
          <button key={t} style={tabStyle(t)} onClick={()=>setTab(t as any)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
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
          <div style={{background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:C.bg3}}>
                  {['Institution','Region','Plan','Status'].map(h=>(
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:10,fontWeight:600,color:C.textLo}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((t,i)=>(
                  <tr key={i} style={{borderTop:`1px solid ${C.border}`}}>
                    <td style={{padding:'12px 12px',fontSize:12,color:C.textHi}}>{t.name}</td>
                    <td style={{padding:'12px 12px',fontSize:10,color:C.textMd}}>{t.region}</td>
                    <td style={{padding:'12px 12px',fontSize:10,color:C.textMd}}>{t.plan}</td>
                    <td style={{padding:'12px 12px',fontSize:10,color:C.normal}}>{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='aimodels' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {AI_MODELS.map(m=>(
            <div key={m.version} style={{padding:16,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:14,fontWeight:700,color:C.textHi}}>{m.version} - {m.type}</div>
              <div style={{fontSize:11,color:C.textMd}}>{m.status} · Accuracy: {m.accuracy}%</div>
            </div>
          ))}
        </div>
      )}

      {tab==='deployments' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{padding:20,background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.textHi}}>Infrastructure Health</div>
            <div style={{fontSize:12,color:C.textMd}}>CPU: {telemetry?.infrastructure?.cpu}% | RAM: {telemetry?.infrastructure?.memory}%</div>
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
           <div style={{padding:20,background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:16,fontWeight:700,color:C.textHi}}>Federated Learning</div>
              <p style={{fontSize:12,color:C.textMd}}>Aggregating weights from {tenants.length} nodes.</p>
              <button onClick={()=>apiClient.post('/ai/federated/train')} style={{padding:'8px 16px',background:C.info,color:'white',border:'none',borderRadius:8,cursor:'pointer'}}>Start Training Round</button>
           </div>
        </div>
      )}

      {showProvision && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}}>
          <div style={{background:C.bg2,padding:24,borderRadius:16,width:400}}>
            <h2 style={{color:C.textHi}}>Provision Tenant</h2>
            <button onClick={()=>setShowProvision(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
