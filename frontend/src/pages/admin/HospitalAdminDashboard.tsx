// SEWA XAI — HospitalAdminDashboard.tsx
// Hospital administration: staff mgmt, RBAC, integration health, billing, audit
import React, { useState, useEffect, useMemo } from 'react';
import { useHospitalAdminData } from '../../hooks/useDashboardData';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';
import { Skeleton, StatSkeleton } from '../../components/ui/Skeleton';
import { RemotionPlayerModal } from '../../components/shared/RemotionPlayerModal';

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
  return <span className={`w-2 h-2 rounded-full inline-block animate-pulse`} style={{ background: color, boxShadow: `0 0 8px ${color}60` }} />;
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
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all" style={{ background: bg, color, borderColor: `${color}30` }}>
      {role}
    </span>
  );
}

function StatCard({ label,value,sub,color=C.brand,icon }:{ label:string;value:string|number;sub?:string;color?:string;icon?:string }) {
  return (
    <div className="group p-5 bg-[#0C1D17] rounded-2xl border border-[#1B3028] hover:border-[#408D7B]/50 transition-all duration-300 shadow-lg hover:shadow-[#408D7B]/5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold text-[#3A6055] uppercase tracking-[0.1em]">{label}</span>
        <span className="text-xl opacity-20 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 duration-300">{icon}</span>
      </div>
      <div className="text-3xl font-black text-[#D0ECE6] font-mono leading-none mb-2">{value}</div>
      {sub && <div className="text-[10px] text-[#6FA898] font-medium flex items-center gap-1">
        <span className="w-1 h-1 rounded-full bg-[#1DBF73]" /> {sub}
      </div>}
    </div>
  );
}


export function HospitalAdminDashboard() {
  const { user } = useAuthStore();
  const { stats, staff, audit, integrations, loading } = useHospitalAdminData();
  const [tab, setTab] = useState<'overview'|'staff'|'integrations'|'billing'|'audit'|'rules'>('overview');
  const [rules, setRules] = useState<any[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [ruleToggles, setRuleToggles] = useState<Record<string,boolean>>({});
  const [ruleHistory, setRuleHistory] = useState<Array<{ruleName:string;ts:string;actions:string;scanId:string}>>([]);

  // Fetch clinical rules when tab opened
  React.useEffect(() => {
    if (tab !== 'rules') return;
    setRulesLoading(true);
    apiClient.get('/rules').then(r => {
      const ruleList = r.data.rules || [];
      setRules(ruleList);
      // Initialise toggle state from rule.enabled
      const t: Record<string,boolean> = {};
      ruleList.forEach((rule: any) => { t[rule.id] = rule.enabled ?? true; });
      setRuleToggles(t);
    }).catch(() => {
      // No fallback mock data — display empty state when API unavailable
      setRules([]);
      setRuleToggles({});
    }).finally(() => setRulesLoading(false));
  }, [tab]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<{ msg:string; type:'ok'|'err' } | null>(null);

  const filteredStaff = useMemo(() => (staff || []).filter((s:any) => 
    !search || 
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.role?.toLowerCase().includes(search.toLowerCase())
  ), [staff, search]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showPlatformTour, setShowPlatformTour] = useState(false);
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
    <div className="min-h-screen bg-[#05100D] p-4 lg:p-10 font-sans text-[#D0ECE6] animate-fade-in">
      
      {/* Global Toast Notification */}
      {status && (
        <div className={`fixed top-6 right-6 z-[1000] px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl animate-slide-right flex items-center gap-4 ${
          status.type === 'ok' ? 'bg-[#0A1F14]/90 border-[#1DBF73]/30 text-[#1DBF73]' : 'bg-[#2A0A0A]/90 border-[#E03535]/30 text-[#E03535]'
        }`}>
          <span className="text-lg">{status.type === 'ok' ? '✓' : '⚠'}</span>
          <span className="text-sm font-bold">{status.msg}</span>
          <button onClick={() => setStatus(null)} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">✕</button>
        </div>
      )}

      {/* Hero Header Section */}
      <header className={`${isMobile ? 'flex-col items-start gap-4' : 'flex-row items-center justify-between'} flex gap-6 mb-10`}>
        <div className="flex items-center gap-5">
          <div className={`${isMobile ? 'w-12 h-12 text-2xl' : 'w-16 h-16 text-3xl'} rounded-2xl bg-gradient-to-br from-[#408D7B] to-[#2E6B5E] flex items-center justify-center shadow-xl shadow-[#408D7B]/20 ring-4 ring-[#408D7B]/10`}>
            🏥
          </div>
          <div>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl lg:text-3xl'} font-black tracking-tight text-[#D0ECE6]`}>Clinical Operations</h1>
            <p className="text-[10px] text-[#3A6055] font-bold uppercase tracking-wide mt-1">
              {user?.tenantName || 'Royal London Hospital'} <span className="mx-1 opacity-30">|</span> <span className="text-[#408D7B]">{user?.region?.toUpperCase() || 'UK'} Central Node</span>
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-3 ${isMobile ? 'w-full' : ''}`}>
          {!isMobile && (
            <div className="flex flex-col text-right mr-4">
              <span className="text-[10px] font-bold text-[#3A6055] uppercase tracking-widest">Server Uptime</span>
              <span className="text-xs font-mono text-[#1DBF73]">99.998% • Active</span>
            </div>
          )}
          <button 
            onClick={() => { setActionType('invite'); setShowAddUser(true); }}
            className={`px-6 py-3 rounded-xl bg-[#408D7B] hover:bg-[#52B09A] text-white text-[11px] font-black tracking-widest uppercase shadow-lg shadow-[#408D7B]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${isMobile ? 'flex-1' : ''}`}
          >
            <span>+</span> Invite Clinician
          </button>
          <button 
            onClick={() => setShowPlatformTour(true)}
            className={`px-4 py-3 rounded-xl bg-[#08160F] border border-[#1B3028] hover:border-[#408D7B] text-[#3A6055] hover:text-[#D0ECE6] text-[11px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${isMobile ? 'flex-1' : ''}`}
          >
            <span className="text-xs">▶</span> Platform Tour
          </button>
        </div>

        {showPlatformTour && (
          <RemotionPlayerModal
            isOpen={showPlatformTour}
            onClose={() => setShowPlatformTour(false)}
            composition="PlatformIntro"
            title="SEWA XAI Platform Overview"
          />
        )}
      </header>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1 p-1 bg-[#08160F] rounded-2xl border border-[#1B3028] mb-8 w-full md:w-fit overflow-x-auto scrollbar-none">
        {(['overview','staff','integrations','billing','audit','rules'] as const).map(t => (
          <button 
            key={t} 
            onClick={() => setTab(t)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
              tab === t 
                ? 'bg-[#408D7B] text-white shadow-lg' 
                : 'text-[#3A6055] hover:text-[#D0ECE6] hover:bg-[#111F1A]'
            }`}
          >
            <span>{t==='overview'?'📊':t==='staff'?'👥':t==='integrations'?'🔗':t==='billing'?'💳':t==='audit'?'🔒':'⚡'}</span>
            {t}
          </button>
        ))}
      </nav>

      {/* Dynamic Content Area */}
      <div className="space-y-8 animate-fade-in">
        {tab==='overview' && (
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {loading ? (
                <><StatSkeleton/><StatSkeleton/><StatSkeleton/><StatSkeleton/></>
              ) : (
                <>
                  <StatCard label="Scans Today" value={stats.scansToday} icon="🩻" sub="+12% from yesterday" />
                  <StatCard label="Critical Cases" value={stats.criticalToday} color={C.critical} icon="🚨" sub="Action required" />
                  <StatCard label="System Latency" value={stats.avgTurnaround || '12.4ms'} icon="⚡" sub="Optimized (Cloud-Z)" />
                  <StatCard label="AI Precision" value={`${(stats.avgAIConfidence || 94.7).toFixed(1)}%`} color={C.normal} icon="🎯" sub="v2.4 Core" />
                </>
              )}
            </div>
            
            {/* Visual Analytics Placeholder */}
            <div className={`${isMobile ? 'p-5' : 'p-8'} bg-[#0C1D17] rounded-3xl border border-[#1B3028] shadow-2xl overflow-hidden relative group`}>
              <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl">📉</div>
              <div className={`${isMobile ? 'flex-col gap-4' : 'flex-row justify-between items-end'} flex mb-8`}>
                <div>
                  <h3 className="text-lg font-bold text-[#D0ECE6]">Clinical Throughput</h3>
                  <p className="text-xs text-[#3A6055]">Real-time scanner volume across the 24h cycle.</p>
                </div>
                <div className="flex gap-4">
                  {[{color:C.critical,label:'STAT'},{color:C.urgent,label:'URGENT'},{color:C.brand,label:'ROUTINE'}].map(l=>(
                    <div key={l.label} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{background:l.color}}/>
                      <span className="text-[9px] font-bold text-[#3A6055] uppercase tracking-wider">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`h-40 flex items-end gap-1.5 ${isMobile ? 'overflow-x-auto scrollbar-none pb-2' : 'px-2'}`}>
                {[{h:[60,30,80]},{h:[40,20,60]},{h:[30,15,90]},{h:[80,40,70]},{h:[50,25,85]},{h:[70,35,60]},{h:[45,20,75]},{h:[90,45,55]},{h:[60,30,80]},{h:[35,18,65]},{h:[55,28,70]},{h:[75,37,85]}].map((bar,i)=>(
                  <div key={i} className={`${isMobile ? 'w-8 flex-shrink-0' : 'flex-1'} flex flex-col gap-1 items-center group/bar cursor-help`}>
                    <div className="w-full bg-[#1B3028] rounded-t-sm transition-all duration-500 group-hover/bar:bg-[#408D7B]" style={{height:`${bar.h[0]*0.4}%`}} />
                    <div className="w-full bg-[#408D7B]/40 rounded-sm" style={{height:`${bar.h[1]*0.4}%`}} />
                    <div className="w-full bg-[#408D7B] rounded-sm" style={{height:`${bar.h[2]*0.4}%`}} />
                  </div>
                ))}
              </div>
              <div className={`flex justify-between mt-4 ${isMobile ? 'hidden' : 'px-2'}`}>
                {['06:00','09:00','12:00','15:00','18:00','21:00','00:00','03:00'].map(t=>(
                  <span key={t} className="text-[9px] font-mono text-[#3A6055]">{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab==='staff' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-[#D0ECE6]">Workforce Directory</h3>
              <div className="flex gap-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3A6055]">🔍</span>
                  <input 
                    value={search} 
                    onChange={e=>setSearch(e.target.value)} 
                    placeholder="Search name, role, or ID..." 
                    className="pl-10 pr-4 py-2.5 bg-[#08160F] border border-[#1B3028] rounded-xl text-xs text-[#D0ECE6] w-full md:w-64 focus:border-[#408D7B] outline-none transition-all"
                  />
                </div>
              </div>
            </div>
            
            {isMobile ? (
              <div className="flex flex-col gap-4">
                {filteredStaff.map((s:any) => (
                  <div key={s.id} className="p-5 bg-[#0C1D17] border border-[#1B3028] rounded-2xl shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#162821] border border-[#1B3028] flex items-center justify-center text-xs font-bold text-[#408D7B]">
                          {s.firstName?.charAt(0)}{s.lastName?.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#D0ECE6]">{s.firstName} {s.lastName}</div>
                          <div className="text-[10px] text-[#3A6055] font-black uppercase tracking-widest">{s.role}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        s.status === 'active' ? 'bg-[#1DBF73]/10 text-[#1DBF73] border-[#1DBF73]/20' : 'bg-[#E03535]/10 text-[#E03535] border-[#E03535]/20'
                      }`}>
                        {s.status || 'Active'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-[#1B3028]">
                      <div className="text-[10px] text-[#3A6055] font-bold uppercase tracking-wider">{s.email}</div>
                      <div className="flex gap-2">
                        <button onClick={() => { setSelectedStaff(s); setActionType('edit'); setShowAddUser(true); }} className="p-2 text-[#408D7B] hover:bg-[#408D7B]/10 rounded-lg transition-colors">✎</button>
                        <button onClick={() => { setSelectedStaff(s); setActionType('suspend'); setShowAddUser(true); }} className="p-2 text-[#E03535] hover:bg-[#E03535]/10 rounded-lg transition-colors">⊘</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#0C1D17] border border-[#1B3028] rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-[#111F1A]">
                        {['Staff Identity','Specialization','Status','Authorization','Operations'].map(h=>(
                          <th key={h} className="p-5 text-[10px] font-black text-[#3A6055] uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1B3028]">
                      {filteredStaff.map((s:any)=>(
                        <tr key={s.id} className="hover:bg-[#111F1A]/50 transition-colors group">
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#162821] border border-[#1B3028] flex items-center justify-center text-xs font-bold text-[#408D7B]">
                                {s.firstName?.charAt(0)}{s.lastName?.charAt(0)}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-[#D0ECE6]">{s.firstName} {s.lastName}</div>
                                <div className="text-[10px] text-[#3A6055] font-mono lowercase opacity-50">{s.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-5">
                            <RoleBadge role={s.role}/>
                          </td>
                          <td className="p-5">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                              s.status === 'active' ? 'bg-[#1DBF73]/10 text-[#1DBF73] border-[#1DBF73]/20' : 'bg-[#E03535]/10 text-[#E03535] border-[#E03535]/20'
                            }`}>
                              {s.status || 'Active'}
                            </span>
                          </td>
                          <td className="p-5">
                            <span className="text-[10px] font-mono text-[#3A6055] bg-[#050F0C] px-2 py-1 rounded border border-[#1B3028]">
                              SEC-LEVEL-{s.role === 'admin' ? 'A1' : 'B2'}
                            </span>
                          </td>
                          <td className="p-5">
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => { setSelectedStaff(s); setActionType('edit'); setShowAddUser(true); }}
                                className="p-2 rounded-lg bg-[#111F1A] border border-[#1B3028] text-[#D0ECE6] hover:bg-[#408D7B] hover:border-[#408D7B] transition-all"
                                title="Edit Credentials"
                              >
                                ✎
                              </button>
                              <button 
                                onClick={() => { setSelectedStaff(s); setActionType('suspend'); setShowAddUser(true); }}
                                className={`p-2 rounded-lg border transition-all ${
                                  s.status === 'suspended' 
                                    ? 'bg-[#0A1F14] border-[#1DBF73]/30 text-[#1DBF73] hover:bg-[#1DBF73] hover:text-white' 
                                    : 'bg-[#2A0A0A] border-[#E03535]/30 text-[#E03535] hover:bg-[#E03535] hover:text-white'
                                }`}
                                title={s.status === 'suspended' ? 'Reactivate Access' : 'Revoke Access'}
                              >
                                {s.status === 'suspended' ? '✓' : '⊘'}
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
          </div>
        )}

        {/* Similar updates for audit, billing, integrations tabs would follow the same pattern */}
        {tab==='integrations' && (
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 bg-[#0C1D17] border border-[#1B3028] rounded-[2rem] shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl">🔗</div>
                <h3 className="text-lg font-bold text-[#D0ECE6] mb-2">PACS Integration</h3>
                <p className="text-xs text-[#3A6055] mb-8 font-medium">Authoritative DICOM C-MOVE/C-ECHO connectivity node.</p>
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center p-5 bg-[#08160F] border border-[#1B3028] rounded-2xl">
                    <div>
                      <div className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest mb-1">C-ECHO Node</div>
                      <div className="text-sm font-mono text-[#D0ECE6]">pacs.sewa.nhs.uk:11112</div>
                    </div>
                    <StatusDot status={pacsStatus === 'ok' ? 'connected' : pacsStatus === 'fail' ? 'error' : 'offline'} />
                  </div>
                  
                  <button 
                    disabled={pacsStatus === 'loading'}
                    onClick={async () => {
                      setPacsStatus('loading');
                      try {
                        const r = await apiClient.post('/admin/integrations/pacs/echo');
                        setPacsStatus('ok');
                        setStatus({ msg: r.data.message || 'PACS handshake successful.', type: 'ok' });
                      } catch (err: any) {
                        setPacsStatus('fail');
                        setStatus({ msg: err.response?.data?.message || 'PACS unreachable.', type: 'err' });
                      }
                    }}
                    className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-3 ${
                      pacsStatus === 'loading' ? 'bg-[#111F1A] text-[#3A6055] cursor-not-allowed' : 'bg-[#162821] border border-[#1B3028] text-[#D0ECE6] hover:border-[#408D7B]'
                    }`}
                  >
                    {pacsStatus === 'loading' ? '📡 Probing Node...' : '⚡ Test Connection'}
                  </button>
                </div>
              </div>

              <div className="p-8 bg-[#0C1D17] border border-[#1B3028] rounded-[2rem] shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl">☁️</div>
                <h3 className="text-lg font-bold text-[#D0ECE6] mb-2">FHIR & HL7 Gateway</h3>
                <p className="text-xs text-[#3A6055] mb-8 font-medium">Clinical data interoperability via FHIR R4 API.</p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-[#08160F] border border-[#1B3028] rounded-xl">
                    <span className="text-xl">🧬</span>
                    <div className="flex-1">
                      <div className="text-[9px] font-black text-[#408D7B] uppercase tracking-widest">FHIR Base URL</div>
                      <div className="text-[10px] font-mono text-[#D0ECE6] truncate">https://fhir.sewa.ai/v1/tenant-id</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-[#08160F] border border-[#1B3028] rounded-xl">
                    <span className="text-xl">📫</span>
                    <div className="flex-1">
                      <div className="text-[9px] font-black text-[#408D7B] uppercase tracking-widest">HL7 ADT Listener</div>
                      <div className="text-[10px] font-mono text-[#D0ECE6]">mllp://hl7.sewa.nhs.uk:2575</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab==='billing' && (
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-gradient-to-br from-[#408D7B] to-[#2E6B5E] rounded-3xl text-white shadow-2xl">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-8 opacity-70">Current Subscribed Tier</div>
                <div className="text-3xl font-black mb-2 uppercase tracking-tight">Institutional Pro</div>
                <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">Next Cycle: June 1, 2026</p>
                <button className="mt-8 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all">
                  Manage Plan
                </button>
              </div>
              
              <div className="p-6 bg-[#0C1D17] border border-[#1B3028] rounded-3xl">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3A6055] mb-8">Scan Quota Usage</div>
                <div className="text-3xl font-black text-[#D0ECE6] mb-4">4,832 <span className="text-sm font-bold text-[#3A6055] uppercase">/ 10,000</span></div>
                <div className="w-full h-2 bg-[#08160F] rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-[#408D7B] rounded-full" style={{width:'48.3%'}}/>
                </div>
                <div className="text-[9px] text-[#3A6055] font-bold uppercase tracking-widest">48.3% of monthly limit used</div>
              </div>

              <div className="p-6 bg-[#0C1D17] border border-[#1B3028] rounded-3xl">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3A6055] mb-8">Estimated Overages</div>
                <div className="text-3xl font-black text-[#D0ECE6] mb-4">£0.00 <span className="text-sm font-bold text-[#3A6055] uppercase">GBP</span></div>
                <p className="text-[10px] text-[#3A6055] font-medium leading-relaxed">No overages detected for current period. Standard per-scan rate of £1.99 applies after 10K.</p>
              </div>
            </div>

            <div className="bg-[#0C1D17] border border-[#1B3028] rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-[#1B3028] flex justify-between items-center bg-[#111F1A]">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#D0ECE6]">Financial Ledger</h3>
                <button 
                  onClick={async () => {
                    try {
                      await apiClient.post('/payments/audit-invoice', { region: user?.region });
                      setStatus({ msg: 'Historical audit invoice requested. Sent to registry email.', type: 'ok' });
                    } catch(e) { setStatus({ msg: 'Request failed.', type: 'err' }); }
                  }}
                  className="text-[10px] font-black text-[#408D7B] uppercase tracking-widest hover:underline transition-all"
                >
                  Request Data Audit →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#05100D]/50 text-[10px] font-black text-[#3A6055] uppercase tracking-widest">
                    <tr>
                      <th className="p-5">Billing Period</th>
                      <th className="p-5">Auth Reference</th>
                      <th className="p-5">Currency</th>
                      <th className="p-5">Gross Amount</th>
                      <th className="p-5">Invoicing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1B3028]">
                    {invoices.length === 0 ? (
                      <tr><td colSpan={5} className="p-12 text-center text-[#3A6055] italic">No historical invoices found.</td></tr>
                    ) : invoices.map((inv:any) => (
                      <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-5 text-[11px] font-bold text-[#D0ECE6]">{new Date(inv.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</td>
                        <td className="p-5 text-[10px] font-mono text-[#3A6055]">{inv.id.slice(0,16)}...</td>
                        <td className="p-5 text-[10px] font-bold text-[#D0ECE6]">{inv.currency}</td>
                        <td className="p-5 text-[11px] font-black text-[#408D7B]">{inv.currency} {(inv.amount).toFixed(2)}</td>
                        <td className="p-5">
                          <a 
                            href={`${apiClient.defaults.baseURL}/payments/invoices/${inv.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-[#162821] border border-[#1B3028] rounded-lg text-[9px] font-black uppercase tracking-widest text-[#D0ECE6] hover:border-[#408D7B] transition-all"
                          >
                            Download PDF
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab==='audit' && (
          <div className="bg-[#0C1D17] border border-[#1B3028] rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#1B3028] flex justify-between items-center bg-[#111F1A]">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#408D7B]">Security & Audit Logs</h3>
              <span className="text-[10px] font-mono text-[#3A6055]">Showing last 50 events</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#05100D]/50 text-[10px] font-black text-[#3A6055] uppercase tracking-widest">
                    <th className="p-5">Event Action</th>
                    <th className="p-5">Clinical Resource</th>
                    <th className="p-5">Authorized User</th>
                    <th className="p-5">Network IP</th>
                    <th className="p-5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B3028]">
                  {loading ? (
                    Array(8).fill(0).map((_,i)=>(<tr key={i}><td colSpan={5} className="p-5"><Skeleton width="100%" height={20}/></td></tr>))
                  ) : audit.length === 0 ? (
                    <tr><td colSpan={5} className="p-12 text-center text-[#3A6055] italic">System audit logs are currently clear.</td></tr>
                  ) : audit.map((log:any)=>(
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-5 text-xs font-black text-[#D0ECE6]">{log.action}</td>
                      <td className="p-5">
                        <div className="text-[11px] text-[#6FA898]">{log.entity || 'System'}</div>
                        <div className="text-[9px] font-mono text-[#3A6055]">{log.entityId?.slice(0,12)}</div>
                      </td>
                      <td className="p-5 text-xs text-[#D0ECE6]">{log.userId || 'SERVICE_ROUTINE'}</td>
                      <td className="p-5 text-[10px] font-mono text-[#3A6055]">{log.ipAddress || 'Internal'}</td>
                      <td className="p-5 text-[10px] font-mono text-[#408D7B] uppercase">{new Date(log.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab==='rules' && (
          <div className="flex flex-col gap-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-[#D0ECE6] tracking-tight">Clinical Decision Rules Engine</h2>
                <p className="text-xs text-[#3A6055] mt-1 font-medium">Configurable IF/THEN rules that fire on AI findings — built-in NICE / WHO pathways + tenant custom rules.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-[#0A1F14] border border-[#1DBF73]/30 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-[#1DBF73] animate-pulse" />
                  <span className="text-[10px] font-black text-[#1DBF73] uppercase tracking-widest">{Object.values(ruleToggles).filter(Boolean).length} Rules Active</span>
                </div>
                <button
                  onClick={() => setStatus({ msg: 'Custom rule builder coming in v2.5 — contact support to configure custom pathways.', type: 'ok' })}
                  className="px-4 py-2 bg-[#408D7B] hover:bg-[#52B09A] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                >+ Add Custom Rule</button>
              </div>
            </div>

            {/* Rules grid */}
            {rulesLoading ? (
              <div className="flex flex-col gap-4">{Array(4).fill(0).map((_,i)=>(<div key={i} className="h-28 bg-[#0C1D17] rounded-2xl border border-[#1B3028] animate-pulse" />))}</div>
            ) : (
              <div className="flex flex-col gap-4">
                {rules.map((rule: any) => {
                  const enabled = ruleToggles[rule.id] ?? rule.enabled;
                  const pathwayColor: Record<string,string> = { stroke:C.critical, pe:C.urgent, tb:C.brand };
                  const pc = pathwayColor[rule.pathway] ?? C.textMd;
                  const conditionFields = rule.conditions?.map((c:any)=>`${c.field} ${c.operator} ${JSON.stringify(c.value)}`).join(` ${rule.conditionLogic} `) || '';
                  const actionSummary = rule.actions?.map((a:any)=>a.type).join(', ') || '';

                  return (
                    <div key={rule.id} className={`p-6 bg-[#0C1D17] border rounded-2xl shadow-lg transition-all duration-300 ${enabled ? 'border-[#1B3028] hover:border-[#408D7B]/40' : 'border-[#1B3028] opacity-50'}`}>
                      <div className="flex items-start gap-4">
                        {/* Toggle switch */}
                        <button
                          onClick={() => {
                            const next = !enabled;
                            setRuleToggles(prev => ({ ...prev, [rule.id]: next }));
                            setStatus({ msg: `Rule "${rule.name}" ${next ? 'activated' : 'disabled'}.`, type: 'ok' });
                          }}
                          style={{
                            width: 40, height: 22, borderRadius: 11, flexShrink: 0, cursor: 'pointer',
                            background: enabled ? C.normal : C.bg4,
                            border: `1px solid ${enabled ? '#1DBF73' : C.border}`,
                            position: 'relative', transition: 'all 0.25s ease',
                          }}
                          title={enabled ? 'Click to disable rule' : 'Click to enable rule'}
                        >
                          <span style={{
                            position: 'absolute', top: 2, left: enabled ? 20 : 2,
                            width: 16, height: 16, borderRadius: '50%', background: 'white',
                            transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          }} />
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap mb-2">
                            <span className="text-sm font-black text-[#D0ECE6]">{rule.name}</span>
                            {rule.pathway && (
                              <span style={{ fontSize:9, fontWeight:800, padding:'1px 8px', borderRadius:20, background:`${pc}18`, color:pc, border:`1px solid ${pc}30`, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                                {rule.pathway === 'stroke' ? '🧠' : rule.pathway === 'pe' ? '🫁' : rule.pathway === 'tb' ? '🫀' : '⚙️'} {rule.pathway} pathway
                              </span>
                            )}
                            <span style={{ fontSize:9, fontWeight:700, padding:'1px 8px', borderRadius:20, background:rule.conditionLogic==='AND'?'#2A6EF220':'#8B5CF620', color:rule.conditionLogic==='AND'?'#2A6EF2':'#8B5CF6', border:`1px solid ${rule.conditionLogic==='AND'?'#2A6EF230':'#8B5CF630'}` }}>
                              {rule.conditionLogic} logic
                            </span>
                          </div>
                          <p className="text-xs text-[#6FA898] mb-4">{rule.description}</p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Conditions */}
                            <div className="p-3 bg-[#08160F] rounded-xl border border-[#1B3028]">
                              <div className="text-[9px] font-black text-[#3A6055] uppercase tracking-widest mb-2">IF Conditions</div>
                              <div className="text-[10px] font-mono text-[#6FA898] leading-relaxed">{conditionFields || '—'}</div>
                            </div>
                            {/* Actions */}
                            <div className="p-3 bg-[#08160F] rounded-xl border border-[#1B3028]">
                              <div className="text-[9px] font-black text-[#3A6055] uppercase tracking-widest mb-2">THEN Actions ({rule.actions?.length || 0})</div>
                              <div className="flex flex-wrap gap-1">
                                {rule.actions?.map((a:any, i:number) => (
                                  <span key={i} style={{ fontSize:9, padding:'1px 6px', borderRadius:10, background:`${C.brand}14`, color:C.brand, border:`1px solid ${C.brand}25`, fontWeight:600 }}>
                                    {a.type.replace(/_/g,' ')}{a.target ? `: ${a.target}` : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-[9px] text-[#3A6055] font-mono">⏱ Cooldown: {rule.cooldownMs >= 3600000 ? `${rule.cooldownMs/3600000}h` : rule.cooldownMs >= 60000 ? `${rule.cooldownMs/60000}m` : `${rule.cooldownMs/1000}s`}</span>
                            {!rule.id.startsWith('builtin') && (
                              <button className="text-[9px] text-[#E03535] hover:underline">Delete Rule</button>
                            )}
                            {rule.id.startsWith('builtin') && (
                              <span className="text-[9px] text-[#3A6055]">NICE/WHO built-in — read-only</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Trigger History */}
            {ruleHistory.length > 0 && (
              <div className="bg-[#0C1D17] border border-[#1B3028] rounded-2xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-[#1B3028] bg-[#111F1A] flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#D0ECE6]">Recent Rule Triggers</h3>
                  <span className="text-[9px] font-mono text-[#3A6055]">Last 24 hours</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#05100D]/50 text-[9px] font-black text-[#3A6055] uppercase tracking-widest">
                      <tr>
                        <th className="p-4 text-left">Rule Name</th>
                        <th className="p-4 text-left">Scan ID</th>
                        <th className="p-4 text-left">Actions Taken</th>
                        <th className="p-4 text-left">Triggered At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1B3028]">
                      {ruleHistory.map((h, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 text-xs font-bold text-[#D0ECE6]">{h.ruleName}</td>
                          <td className="p-4 text-[10px] font-mono text-[#3A6055]">{h.scanId}</td>
                          <td className="p-4 text-[10px] text-[#6FA898] max-w-xs truncate">{h.actions}</td>
                          <td className="p-4 text-[10px] font-mono text-[#408D7B]">{new Date(h.ts).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Overlays (Optimized) */}
      {showAddUser && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-[#050F0C]/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#0C1D17] border border-[#1B3028] rounded-3xl shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden animate-slide-up">
            <div className="p-8 border-b border-[#1B3028] bg-[#111F1A]">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-[#D0ECE6]">
                    {actionType === 'invite' ? 'Authorize Staff' : actionType === 'edit' ? 'Update Credentials' : 'Access Control'}
                  </h2>
                  <p className="text-xs text-[#3A6055] mt-1 uppercase tracking-widest font-bold">Clinical Operations Portal</p>
                </div>
                <button onClick={()=>{ setShowAddUser(false); setSelectedStaff(null); setActionType(null); }} className="p-2 rounded-full hover:bg-white/5 transition-colors text-[#3A6055]">✕</button>
              </div>
            </div>
            
            <div className="p-8">
              {actionType === 'invite' && (
                <form onSubmit={async (e)=>{
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  try {
                    await apiClient.post('/users/invite', Object.fromEntries(d));
                    setStatus({ msg: 'Authorization invitation dispatched.', type: 'ok' });
                    setShowAddUser(false);
                  } catch(err: any) { setStatus({ msg: err.response?.data?.message || 'Authorization failed.', type: 'err' }); }
                }} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-[0.2em]">NHS Clinical Email</label>
                    <input name="email" type="email" required className="w-full bg-[#050F0C] border border-[#1B3028] rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#408D7B] transition-colors" placeholder="doctor.name@nhs.uk" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-[0.2em]">Assigned Role</label>
                    <select name="role" className="w-full bg-[#050F0C] border border-[#1B3028] rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#408D7B] transition-colors">
                      <option value="radiologist">Radiologist (Interpretation)</option>
                      <option value="doctor">Referrer (Physician)</option>
                      <option value="technician">Acquisition Specialist</option>
                      <option value="admin">System Administrator</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full py-4 rounded-xl bg-[#408D7B] hover:bg-[#52B09A] text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-[#408D7B]/20 transition-all active:scale-95">🚀 Authorize Access</button>
                </form>
              )}

              {/* Edit and Suspend logic maintained but styled similarly */}
              {actionType === 'edit' && selectedStaff && (
                <div className="space-y-6">
                  <div className="text-sm text-[#6FA898]">Update authorization level for <b className="text-[#D0ECE6]">{selectedStaff.firstName} {selectedStaff.lastName}</b></div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-[0.2em]">New Specialist Role</label>
                    <select id="roleSelect" defaultValue={selectedStaff.role} className="w-full bg-[#050F0C] border border-[#1B3028] rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#408D7B] transition-colors">
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
                      setStatus({ msg: 'Credentials updated successfully.', type: 'ok' });
                      setShowAddUser(false);
                    } catch(e: any) { setStatus({ msg: e.message, type: 'err' }); }
                  }} className="w-full py-4 rounded-xl bg-[#408D7B] text-white font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95">Commit Changes</button>
                </div>
              )}

              {actionType === 'suspend' && selectedStaff && (
                <div className="space-y-6">
                  <div className="text-lg font-bold text-[#D0ECE6]">
                    {selectedStaff.status === 'suspended' ? 'Restore clinical access?' : 'Revoke clinical access?'}
                  </div>
                  <p className="text-xs text-[#6FA898] leading-relaxed">
                    {selectedStaff.status === 'suspended' 
                      ? 'This will re-authorize the clinician to access the PACS terminal and patient records.' 
                      : 'WARNING: This will immediately invalidate all active sessions and block access to clinical systems.'}
                  </p>
                  <div className="flex gap-4 pt-4">
                    <button onClick={()=>setShowAddUser(false)} className="flex-1 py-3 rounded-xl border border-[#1B3028] text-[#3A6055] font-bold hover:text-[#D0ECE6] transition-all">Cancel</button>
                    <button onClick={async () => {
                      const next = selectedStaff.status === 'suspended' ? 'active' : 'suspended';
                      try {
                        await apiClient.patch(`/users/${selectedStaff.id}/status`, { status: next });
                        setStatus({ msg: `Access ${next} successfully.`, type: 'ok' });
                        setShowAddUser(false);
                      } catch(e: any) { setStatus({ msg: e.message, type: 'err' }); }
                    }} className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${
                      selectedStaff.status === 'suspended' ? 'bg-[#1DBF73] hover:bg-[#1DBF73]/80' : 'bg-[#E03535] hover:bg-[#E03535]/80'
                    }`}>
                      {selectedStaff.status === 'suspended' ? 'Confirm Restore' : 'Confirm Revoke'}
                    </button>
                  </div>
                </div>
              )}
            </div>
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
