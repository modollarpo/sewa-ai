// SEWA AI — PopulationHealthDashboard.tsx
// Population health analytics: disease burden, geography, cohort trends, referrals
import React, { useState } from 'react';
import { usePopulationHealthData } from '../../hooks/useDashboardData';

const C = {
  bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',bg4:'#162821',
  brand:'#408D7B',brandLt:'#52B09A',
  critical:'#E03535',urgent:'#E08A20',normal:'#1DBF73',normalBg:'#0A1F14',
  info:'#2A6EF2',textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",FM:"'IBM Plex Mono',monospace",
};

// Fallbacks handled in hook

const POSTCODES = [
  {code:'E1',label:'Whitechapel',cases:84,color:'#E03535',r:18},
  {code:'EC1',label:'Barbican',cases:42,color:'#E08A20',r:13},
  {code:'N1',label:'Islington',cases:28,color:'#E08A20',r:11},
  {code:'E2',label:'Bethnal Green',cases:67,color:'#E03535',r:16},
  {code:'E8',label:'Hackney',cases:55,color:'#D44000',r:15},
  {code:'SE1',label:'Southwark',cases:31,color:'#408D7B',r:11},
  {code:'WC1',label:'Holborn',cases:19,color:'#408D7B',r:9},
];

export function PopulationHealthDashboard() {
  const { stats, conditions, geography, loading } = usePopulationHealthData();
  const [tab, setTab] = useState<'burden'|'geography'|'trends'|'referrals'>('burden');
  const tabStyle = (t:string):React.CSSProperties => ({
    padding:'7px 13px',fontSize:11,fontWeight:tab===t?600:400,
    color:tab===t?C.brand:C.textLo,background:'none',border:'none',
    borderBottom:`2px solid ${tab===t?C.brand:'transparent'}`,
    marginBottom:'-1px',cursor:'pointer',fontFamily:C.F,whiteSpace:'nowrap',
  });

  return (
    <div style={{padding:24,background:C.bg1,minHeight:'calc(100vh - 76px)',fontFamily:C.F}}>
      <div style={{marginBottom:20}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.textHi}}>Population Health Analytics</h2>
        <p style={{margin:'4px 0 0',fontSize:12,color:C.textMd}}>
          Aggregate, anonymised disease surveillance · Powered by SEWA AI triage data
        </p>
      </div>

      {/* Key headline stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'Total Scans (30d)',value:loading ? '...' : stats.totalScans.toLocaleString(),sub:'Catchment area',icon:'🩻'},
          {label:'Positive Findings',value:loading ? '...' : stats.positives.toLocaleString(),sub:`Detection rate: ${stats.totalScans ? ((stats.positives/stats.totalScans)*100).toFixed(1) : 0}%`,icon:'🔍'},
          {label:'Critical Cases',value:loading ? '...' : stats.criticals.toLocaleString(),sub:'Urgency-1 triggers',icon:'🚨'},
          {label:'Lives Impacted',value:loading ? '...' : stats.impact.toLocaleString(),sub:'AI-assisted triage',icon:'❤️'},
        ].map(s=>(
          <div key={s.label} style={{padding:16,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
              <span style={{fontSize:11,color:C.textMd}}>{s.label}</span>
              <span style={{fontSize:18}}>{s.icon}</span>
            </div>
            <div style={{fontSize:24,fontWeight:700,color:C.textHi,fontFamily:C.FM,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:10,color:C.textLo,marginTop:6}}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{borderBottom:`1px solid ${C.border}`,display:'flex',gap:2,marginBottom:16}}>
        {['burden','geography','trends','referrals'].map(t=>(
          <button key={t} style={tabStyle(t)} onClick={()=>setTab(t as any)}>
            {t==='burden'&&'📊 Disease Burden'}{t==='geography'&&'🗺 Geography'}
            {t==='trends'&&'📈 Trends'}{t==='referrals'&&'🔗 Referral Network'}
          </button>
        ))}
      </div>

      {tab==='burden' && (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {conditions.length === 0 ? (
            <div style={{padding:40,textAlign:'center',color:C.textLo}}>{loading?'Aggregating disease burden...':'No epidemiological data found.'}</div>
          ) : conditions.map((d:any,i:number)=>(
            <div key={d.condition} style={{padding:14,background:i%2===0?C.bg2:'transparent',borderRadius:10,border:`1px solid ${C.border}`,display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',gap:12,alignItems:'center'}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:C.textHi}}>{d.condition}</div>
                <div style={{fontSize:10,color:C.textLo,marginTop:2}}>Median age: {d.ageMedian}</div>
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:C.textHi,fontFamily:C.FM}}>{d.count}</div>
                <div style={{fontSize:9,color:C.textLo}}>Cases detected</div>
              </div>
              <div>
                <span style={{fontSize:12,fontWeight:700,color:d.trend>0?C.critical:C.normal,fontFamily:C.FM}}>
                  {d.trend>0?'↑':'↓'} {Math.abs(d.trend)}%
                </span>
                <div style={{fontSize:9,color:C.textLo}}>Trend (Rel)</div>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:C.textHi}}>{d.mortality}</div>
                <div style={{fontSize:9,color:C.textLo}}>Mortality</div>
              </div>
              <div style={{flex:1}}>
                <div style={{height:4,background:C.bg4,borderRadius:2,overflow:'hidden'}}>
                  <div style={{width:`${Math.min(100, (d.count/50)*100)}%`,height:'100%',background:d.count>40?C.critical:d.count>20?C.urgent:C.brand}}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='geography' && (
        <div style={{padding:20,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:12,fontWeight:700,color:C.textHi,marginBottom:16}}>Global Disease Incidence</div>
          <div style={{position:'relative',height:320,background:`linear-gradient(180deg,${C.bg3},${C.bg2})`,borderRadius:10,border:`1px solid ${C.border}`,overflow:'hidden'}}>
            {/* Grid */}
            {[1,2,3,4,5,6,7,8].map(i=><div key={`h${i}`} style={{position:'absolute',top:`${12.5*i}%`,left:0,right:0,height:1,background:`${C.border}60`}}/>)}
            {[1,2,3,4,5,6,7,8].map(i=><div key={`v${i}`} style={{position:'absolute',left:`${12.5*i}%`,top:0,bottom:0,width:1,background:`${C.border}60`}}/>)}
            
            {/* World Map Overlay (Conceptual) */}
            <div style={{position:'absolute',inset:0,opacity:0.05,pointerEvents:'none',display:'flex',alignItems:'center',justifyContent:'center',fontSize:200,fontFamily:'sans-serif'}}>🌍</div>

            {/* Dynamic Geography Markers */}
            {(geography && geography.length > 0 ? geography : POSTCODES).map((loc:any, i:number)=>{
              // Dynamic global projection if lat/lng exists, else fallback to grid distribution
              let x = 10 + (i%4)*22;
              let y = 15 + Math.floor(i/4)*40;
              let name = loc.name || loc.label || loc.code;
              let count = loc.count || loc.cases;
              let color = count > 50 ? C.critical : count > 20 ? C.urgent : C.brand;
              let r = Math.max(8, Math.min(24, count / 2));

              if (loc.lat !== undefined && loc.lng !== undefined && loc.lat !== null) {
                // Approximate Web Mercator or simple Equirectangular
                x = ((loc.lng + 180) / 360) * 100;
                y = ((90 - loc.lat) / 180) * 100;
              }

              return (
                <div key={loc.tenantId || loc.code || i} style={{position:'absolute',left:`${x}%`,top:`${y}%`,transform:'translate(-50%,-50%)'}}>
                  <div style={{width:r*2,height:r*2,borderRadius:'50%',background:color,opacity:0.7,border:`2px solid ${color}`,boxShadow:`0 0 ${r}px ${color}60`}}/>
                  <div style={{position:'absolute',top:'110%',left:'50%',transform:'translateX(-50%)',whiteSpace:'nowrap',textAlign:'center'}}>
                    <div style={{fontSize:10,color:C.textHi,fontFamily:C.FM,fontWeight:700,textShadow:`0 2px 4px rgba(0,0,0,0.8)`}}>{name}</div>
                    <div style={{fontSize:9,color:C.textLo,fontFamily:C.FM}}>{count} cases</div>
                  </div>
                </div>
              );
            })}
            {/* Legend */}
            <div style={{position:'absolute',bottom:10,right:12,display:'flex',gap:8,background:C.bg3,padding:'6px 8px',borderRadius:8,border:`1px solid ${C.border}`}}>
              {[{color:C.critical,label:'High Volume'},{color:C.urgent,label:'Medium Volume'},{color:C.brand,label:'Low Volume'}].map(l=>(
                <div key={l.label} style={{display:'flex',alignItems:'center',gap:4}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:l.color}}/>
                  <span style={{fontSize:9,color:C.textLo,fontFamily:C.F}}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{marginTop:12,display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:8}}>
            {(geography || []).slice(0, 4).map((loc:any)=>(
              <div key={loc.tenantId} style={{padding:'10px 12px',background:C.bg3,borderRadius:8,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:12,fontWeight:700,color:C.textHi,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{loc.name}</div>
                <div style={{fontSize:10,color:C.textLo,marginTop:2}}>{loc.region.toUpperCase()} • {loc.timezone}</div>
                <div style={{fontSize:14,fontWeight:700,color:loc.count > 50 ? C.critical : C.brand,fontFamily:C.FM,marginTop:6}}>{loc.count} cases logged</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='trends' && (
        <div style={{padding:20,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:12,fontWeight:700,color:C.textHi,marginBottom:16}}>12-Month Incidence Trends</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:4,height:120,marginBottom:8}}>
            {[42,38,45,51,48,56,62,58,67,71,68,74].map((v,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                <div style={{width:'100%',height:`${(v/74)*100}%`,background:`linear-gradient(180deg,${C.critical},${C.urgent})`,borderRadius:'3px 3px 0 0',opacity:0.8}}/>
              </div>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
            {['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'].map(m=>(
              <span key={m} style={{fontSize:9,color:C.textLo,fontFamily:C.FM}}>{m}</span>
            ))}
          </div>
          <div style={{padding:14,background:`${C.critical}0A`,borderRadius:10,border:`1px solid ${C.critical}30`}}>
            <div style={{fontSize:12,fontWeight:700,color:C.critical,marginBottom:4}}>⚠ Trend Alert</div>
            <div style={{fontSize:11,color:C.textMd}}>ICH incidence has increased 76% over 12 months in East London. Recommend review with public health team.</div>
          </div>
        </div>
      )}

      {tab==='referrals' && (
        <div style={{padding:20,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:12,fontWeight:700,color:C.textHi,marginBottom:16}}>SEWA Referral Network</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              {from:'Royal London Hospital',to:'The National Hospital for Neurology',count:28,type:'ICH/Stroke',time:'Avg 18 min'},
              {from:'Royal London Hospital',to:'St Bartholomew\'s Hospital',count:14,type:'Cardiac',time:'Avg 22 min'},
              {from:'Royal London Hospital',to:'Homerton University Hospital',count:9,type:'General',time:'Avg 35 min'},
            ].map(r=>(
              <div key={r.to} style={{padding:14,background:C.bg3,borderRadius:10,border:`1px solid ${C.border}`}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                  <span style={{fontSize:11,color:C.textMd}}>{r.from}</span>
                  <span style={{color:C.brand}}>→</span>
                  <span style={{fontSize:11,fontWeight:600,color:C.textHi}}>{r.to}</span>
                </div>
                <div style={{display:'flex',gap:12}}>
                  <span style={{fontSize:10,color:C.textLo}}>{r.count} referrals/month</span>
                  <span style={{fontSize:10,color:C.brand}}>{r.type}</span>
                  <span style={{fontSize:10,color:C.normal}}>{r.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
