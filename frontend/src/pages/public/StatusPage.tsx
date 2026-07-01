// SEWA XAI — StatusPage.tsx
// Real-time system status page at status.sewaxai.health
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import React, { useState, useEffect } from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
const C = { bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', brand:'#408D7B', brandLt:'#52B09A', textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055', border:'#1B3028', F:"'IBM Plex Sans',system-ui,sans-serif", FM:"'IBM Plex Mono',monospace" };

const SERVICES = [
  { name:'API (sewaxai.health)',          url:'https://api.sewaxai.health/health',                  group:'Core' },
  { name:'Triage Engine (Engine 1)',       url:'https://api.sewaxai.health/api/v1/ai/triage/health', group:'AI Pipeline' },
  { name:'VLM Report Generator (Engine 3)',url:'https://api.sewaxai.health/api/v1/ai/vlm/health',   group:'AI Pipeline' },
  { name:'Uncertainty Engine (Engine 2)',  url:'https://api.sewaxai.health/api/v1/ai/uncertainty/health', group:'AI Pipeline' },
  { name:'Metacognition (Engine 4)',       url:'https://api.sewaxai.health/api/v1/ai/metacognition/health', group:'AI Pipeline' },
  { name:'FHIR R4 Interface',              url:'https://api.sewaxai.health/api/v1/fhir/health',     group:'Integrations' },
  { name:'Database (PostgreSQL)',          url:'https://api.sewaxai.health/health',                  group:'Infrastructure' },
  { name:'Cache (Redis)',                  url:'https://api.sewaxai.health/health',                  group:'Infrastructure' },
];

type ServiceStatus = 'operational' | 'degraded' | 'down' | 'checking';

const STATUS_COLORS = {
  operational: { color:'#1DBF73', label:'Operational', dot:'#1DBF73' },
  degraded:    { color:'#F59E0B', label:'Degraded',    dot:'#F59E0B' },
  down:        { color:'#E03535', label:'Down',         dot:'#E03535' },
  checking:    { color:'#6FA898', label:'Checking...',  dot:'#6FA898' },
};

export function StatusPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  const [statuses, setStatuses] = useState<Record<string, ServiceStatus>>(
    Object.fromEntries(SERVICES.map(s => [s.name, 'checking']))
  );
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkAll = async () => {
    const results: Record<string, ServiceStatus> = {};
    await Promise.allSettled(
      SERVICES.map(async svc => {
        try {
          const r = await fetch(svc.url, { method:'GET', signal: AbortSignal.timeout(5000) });
          results[svc.name] = r.ok ? 'operational' : 'degraded';
        } catch {
          results[svc.name] = 'down';
        }
      })
    );
    setStatuses(prev => ({ ...prev, ...results }));
    setLastChecked(new Date());
  };

  useEffect(() => { checkAll(); const t = setInterval(checkAll, 60_000); return () => clearInterval(t); }, []);

  const allOk = Object.values(statuses).every(s => s === 'operational');
  const anyDown = Object.values(statuses).some(s => s === 'down');
  const groups = [...new Set(SERVICES.map(s => s.group))];

  return (
    <PublicLayout activePage="status" onNavigate={onNavigate}>
      <div style={{ background: anyDown ? 'rgba(224,53,53,0.10)' : allOk ? 'rgba(29,191,115,0.08)' : 'rgba(245,158,11,0.08)', padding:'32px clamp(16px,5vw,80px)', borderBottom:`1px solid ${C.border}`, textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:8 }}>{ anyDown ? '⚠️' : allOk ? '✅' : '⚠' }</div>
        <h1 style={{ fontSize:24, fontWeight:900, color: anyDown ? '#FF8080' : allOk ? '#1DBF73' : '#F59E0B', fontFamily:C.F, margin:'0 0 6px' }}>
          { anyDown ? 'Service Disruption Detected' : allOk ? 'All Systems Operational' : 'Partial Degradation' }
        </h1>
        <p style={{ fontSize:13, color:C.textMd, margin:0 }}>
          Last checked: {lastChecked ? lastChecked.toLocaleTimeString() : 'Checking...'} · Auto-refreshes every 60s
        </p>
      </div>
      <div style={{ maxWidth:800, margin:'0 auto', padding:'40px clamp(16px,5vw,48px) 80px' }}>
        {groups.map(group => (
          <div key={group} style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.textLo, letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:C.F, marginBottom:12 }}>{group}</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {SERVICES.filter(s => s.group===group).map(svc => {
                const st = statuses[svc.name] || 'checking';
                const sc = STATUS_COLORS[st];
                return (
                  <div key={svc.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', background:C.bg1, borderRadius:12, border:`1px solid ${C.border}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:sc.dot, boxShadow: st==='operational' ? `0 0 6px ${sc.dot}` : 'none' }} />
                      <span style={{ fontSize:14, color:C.textHi, fontFamily:C.F }}>{svc.name}</span>
                    </div>
                    <span style={{ fontSize:12, color:sc.color, fontWeight:700, fontFamily:C.F }}>{sc.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div style={{ textAlign:'center', marginTop:32 }}>
          <button onClick={checkAll} style={{ padding:'10px 24px', background:C.brand, border:'none', borderRadius:10, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:C.F }}>
            🔄 Refresh Now
          </button>
          <p style={{ fontSize:12, color:C.textLo, marginTop:12 }}>
            Subscribe to incidents: <a href="mailto:info@sewaxai.health?subject=Status Alerts" style={{color:C.brandLt}}>info@sewaxai.health</a>
          </p>
        </div>
        <p style={{ fontSize:11, color:C.textLo, marginTop:32, textAlign:'center' }}>
          © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.
        </p>
      </div>
    </PublicLayout>
  );
}

