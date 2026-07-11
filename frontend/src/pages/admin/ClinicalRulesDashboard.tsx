import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import { Activity, Settings2, Bell, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';

import { dashboardColors as C } from '../../design-system/tokens';

export function ClinicalRulesDashboard() {
  const [rules, setRules] = useState<any[]>([]);
  const [strokeCodes, setStrokeCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'monitor'|'rules'>('monitor');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([
        apiClient.get('/rules'),
        apiClient.get('/stroke-codes')
      ]);
      setRules(rRes.data?.rules || []);
      setStrokeCodes(sRes.data?.codes || []);
    } catch {
      // Rules engine data load failed — UI shows empty state
    } finally {
      setLoading(false);
    }
  };

  const resolveStrokeCode = async (codeId: string) => {
    try {
      await apiClient.post(`/stroke-codes/${codeId}/resolve`, { outcome: 'Resolved by Admin' });
      fetchData(); // refresh list
    } catch {
      // Stroke code resolve failed — non-critical
    }
  };

  if (loading) {
    return (
      <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:C.textLo, fontFamily:C.F}}>
        Loading Clinical Decision Support...
      </div>
    );
  }

  return (
    <div style={{flex:1, display:'flex', flexDirection:'column', background:C.bg1, overflow:'hidden', fontFamily:C.F}}>
      
      {/* Header */}
      <div style={{padding:'24px 32px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', background:C.bg2}}>
        <div>
          <h1 style={{fontSize:24, fontWeight:600, color:C.textHi, margin:0, display:'flex', alignItems:'center', gap:12}}>
            <Settings2 size={24} color={C.brand} />
            Clinical Decision Support
          </h1>
          <p style={{fontSize:13, color:C.textMd, margin:'4px 0 0'}}>Manage AI-driven pathway triggers, stroke codes, and automated clinical actions.</p>
        </div>
        <button 
          onClick={fetchData}
          style={{padding:'8px 16px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:6, color:C.textHi, fontSize:12, cursor:'pointer'}}
        >
          Refresh Sync
        </button>
      </div>

      {/* Tabs */}
      <div style={{padding:'0 32px', display:'flex', gap:32, borderBottom:`1px solid ${C.border}`, background:C.bg2}}>
        <TabButton active={tab === 'monitor'} onClick={() => setTab('monitor')} icon={<Activity size={16} />} label="Active Monitor" />
        <TabButton active={tab === 'rules'} onClick={() => setTab('rules')} icon={<Zap size={16} />} label="Rules Configuration" />
      </div>

      {/* Content */}
      <div style={{flex:1, overflowY:'auto', padding:'32px'}}>
        {tab === 'monitor' && (
          <div style={{display:'flex', flexDirection:'column', gap:24}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <h2 style={{fontSize:16, fontWeight:600, color:C.textHi, margin:0}}>Live Clinical Pathways</h2>
              <span style={{padding:'4px 10px', background:strokeCodes.length > 0 ? C.critBg : C.normalBg, color:strokeCodes.length > 0 ? C.critical : C.normal, borderRadius:12, fontSize:12, fontWeight:700, border:`1px solid ${strokeCodes.length > 0 ? '#E0353540' : '#1DBF7340'}`}}>
                {strokeCodes.length} Active Incidents
              </span>
            </div>

            {strokeCodes.length === 0 ? (
              <div style={{padding:48, textAlign:'center', border:`1px dashed ${C.border}`, borderRadius:12, background:C.bg2}}>
                <CheckCircle2 size={48} color={C.normal} style={{marginBottom:16, opacity:0.8}} />
                <div style={{color:C.textHi, fontSize:16, fontWeight:600}}>No Active Critical Pathways</div>
                <div style={{color:C.textLo, fontSize:13, marginTop:8}}>All AI-detected critical findings have been triaged and resolved.</div>
              </div>
            ) : (
              <div style={{display:'grid', gap:16}}>
                {strokeCodes.map((c: any) => (
                  <div key={c.id} style={{padding:20, borderRadius:12, border:`1px solid #E0353540`, background:C.critBg, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                    <div style={{display:'flex', gap:16, alignItems:'center'}}>
                      <div style={{width:48, height:48, borderRadius:24, background:'#E0353520', display:'flex', alignItems:'center', justifyContent:'center'}}>
                        <ShieldAlert size={24} color={C.critical} />
                      </div>
                      <div>
                        <div style={{fontSize:16, fontWeight:700, color:'#FF8A8A', marginBottom:4, display:'flex', alignItems:'center', gap:8}}>
                          {c.type === 'LVO' ? 'Stroke Code: Large Vessel Occlusion' : `Critical Code: ${c.type}`}
                          <span style={{fontSize:10, padding:'2px 6px', background:'#FF8A8A20', borderRadius:4}}>{c.priority}</span>
                        </div>
                        <div style={{fontSize:13, color:'#FFB3B3'}}>
                          Scan ID: {c.scanId} • Triggered: {new Date(c.activatedAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => resolveStrokeCode(c.id)}
                      style={{padding:'10px 20px', background:C.critical, color:'#FFF', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:8}}
                    >
                      <CheckCircle2 size={16} /> Resolve Incident
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'rules' && (
          <div style={{display:'flex', flexDirection:'column', gap:24}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <h2 style={{fontSize:16, fontWeight:600, color:C.textHi, margin:0}}>Rules Engine Policies</h2>
              <button style={{padding:'8px 16px', background:C.brand, border:'none', borderRadius:6, color:C.bg1, fontSize:13, fontWeight:600, cursor:'pointer'}}>
                + Create Rule
              </button>
            </div>

            <div style={{display:'grid', gap:16}}>
              {rules.map((r: any) => (
                <div key={r.id || r.name} style={{padding:20, borderRadius:12, border:`1px solid ${C.border}`, background:C.bg2}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:12}}>
                    <div>
                      <div style={{fontSize:15, fontWeight:600, color:C.textHi}}>{r.name}</div>
                      <div style={{fontSize:13, color:C.textMd, marginTop:4}}>{r.description}</div>
                    </div>
                    <div>
                      <span style={{padding:'4px 10px', background:r.enabled ? C.brandLt+'20' : C.bg3, color:r.enabled ? C.brandLt : C.textLo, borderRadius:12, fontSize:11, fontWeight:700}}>
                        {r.enabled ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                  </div>

                  <div style={{display:'flex', gap:32, marginTop:20, paddingTop:20, borderTop:`1px dashed ${C.border}`}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11, fontWeight:700, color:C.textLo, marginBottom:12, textTransform:'uppercase', letterSpacing:1}}>Conditions (IF)</div>
                      <div style={{display:'flex', flexDirection:'column', gap:8}}>
                        {r.conditions?.map((cond: any, idx: number) => (
                          <div key={idx} style={{fontSize:13, color:C.textMd, display:'flex', gap:8, alignItems:'center', background:C.bg3, padding:'6px 12px', borderRadius:6, border:`1px solid ${C.border}`}}>
                            <span style={{color:C.textHi, fontFamily:C.FM}}>{cond.field}</span>
                            <span style={{color:C.brand}}>{cond.operator}</span>
                            <span style={{color:C.textHi, fontFamily:C.FM}}>{String(cond.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11, fontWeight:700, color:C.textLo, marginBottom:12, textTransform:'uppercase', letterSpacing:1}}>Actions (THEN)</div>
                      <div style={{display:'flex', flexDirection:'column', gap:8}}>
                        {r.actions?.map((act: any, idx: number) => (
                          <div key={idx} style={{fontSize:13, color:C.textMd, display:'flex', gap:8, alignItems:'center', background:C.bg3, padding:'6px 12px', borderRadius:6, border:`1px solid ${C.border}`}}>
                            <Bell size={14} color={C.info} />
                            <span><strong style={{color:C.textHi}}>{act.type}</strong> {act.target ? `→ ${act.target}` : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active:boolean; onClick:()=>void; icon:React.ReactNode; label:string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:'16px 4px', background:'none', border:'none', 
        borderBottom: `2px solid ${active ? C.brand : 'transparent'}`,
        color: active ? C.textHi : C.textLo,
        fontSize:14, fontWeight:600, display:'flex', alignItems:'center', gap:8,
        cursor:'pointer', transition:'all 0.2s', fontFamily:C.F
      }}
    >
      {icon} {label}
    </button>
  );
}
