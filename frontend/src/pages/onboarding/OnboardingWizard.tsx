// SEWA XAI — OnboardingWizard.tsx
// Multi-step hospital onboarding: institution → compliance → integrations → go-live
import React, { useState } from 'react';
import { apiClient } from '../../services/apiClient';

const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A', bg4:'#162821',
  brand:'#408D7B', brandLt:'#52B09A', brandDk:'#2E6B5E',
  critical:'#E03535', critBg:'#1A0A0A', urgent:'#E08A20', normal:'#1DBF73', normalBg:'#0A1F14',
  info:'#2A6EF2', infoBg:'#0A1530',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028',
  F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

const STEPS = [
  { id:'institution', label:'Institution',    icon:'🏥' },
  { id:'compliance',  label:'Compliance',     icon:'🔒' },
  { id:'integrations',label:'Integrations',   icon:'🔗' },
  { id:'environment', label:'Environment',    icon:'⚙️' },
  { id:'benchmark',   label:'AI Benchmark',   icon:'🧠' },
  { id:'golive',      label:'Go Live',        icon:'🚀' },
];

const REGIONS = [
  { key:'uk', flag:'🇬🇧', label:'United Kingdom', compliance:'NHS DSPT · GDPR', currency:'GBP', payment:'Stripe' },
  { key:'eu', flag:'🇪🇺', label:'European Union',  compliance:'MDR · EU AI Act', currency:'EUR', payment:'Stripe' },
  { key:'us', flag:'🇺🇸', label:'North America',   compliance:'HIPAA · FDA 510(k)', currency:'USD', payment:'Stripe' },
  { key:'ng', flag:'🇳🇬', label:'Nigeria',         compliance:'NDPR · ISO 13485', currency:'NGN', payment:'Paystack' },
  { key:'ke', flag:'🇰🇪', label:'Kenya',           compliance:'DPA 2019', currency:'KES', payment:'M-Pesa' },
  { key:'za', flag:'🇿🇦', label:'South Africa',    compliance:'POPIA', currency:'ZAR', payment:'Paystack' },
  { key:'gh', flag:'🇬🇭', label:'Ghana',           compliance:'DPA 2012', currency:'GHS', payment:'Flutterwave' },
  { key:'in', flag:'🇮🇳', label:'India',           compliance:'DPDP 2023', currency:'INR', payment:'Stripe' },
];

function Input({ label, value, onChange, placeholder, required, type='text' }: {
  label:string; value:string; onChange:(v:string)=>void;
  placeholder?:string; required?:boolean; type?:string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{display:'block',fontSize:11,fontWeight:600,color:C.textMd,marginBottom:6,fontFamily:C.F}}>
        {label}{required&&<span style={{color:C.critical}}> *</span>}
      </label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{
          width:'100%',height:40,padding:'0 12px',boxSizing:'border-box',
          background:C.bg3,border:`1px solid ${focused?C.brand:C.border}`,
          borderRadius:10,color:C.textHi,fontSize:13,fontFamily:C.F,outline:'none',
          transition:'border-color 150ms',
          boxShadow:focused?`0 0 0 2px ${C.brand}20`:'none',
        }}/>
    </div>
  );
}

function Select({ label, value, onChange, options, required }: {
  label:string; value:string; onChange:(v:string)=>void;
  options:{value:string;label:string}[]; required?:boolean;
}) {
  return (
    <div>
      <label style={{display:'block',fontSize:11,fontWeight:600,color:C.textMd,marginBottom:6,fontFamily:C.F}}>
        {label}{required&&<span style={{color:C.critical}}> *</span>}
      </label>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{width:'100%',height:40,padding:'0 12px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,color:value?C.textHi:C.textLo,fontSize:13,fontFamily:C.F,outline:'none'}}>
        <option value="">Select…</option>
        {options.map(o=><option key={o.value} value={o.value} style={{background:C.bg3}}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Checkbox({ checked, onChange, label, description }: { checked:boolean; onChange:(v:boolean)=>void; label:string; description?:string }) {
  return (
    <div style={{display:'flex',alignItems:'flex-start',gap:10,cursor:'pointer'}} onClick={()=>onChange(!checked)}>
      <div style={{
        width:18,height:18,borderRadius:5,flexShrink:0,marginTop:1,
        background:checked?C.brand:C.bg3,border:`2px solid ${checked?C.brand:C.border}`,
        display:'flex',alignItems:'center',justifyContent:'center',transition:'all 150ms',
      }}>
        {checked&&<svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}><path d="m5 12 5 5L20 7"/></svg>}
      </div>
      <div>
        <div style={{fontSize:13,color:C.textHi,fontFamily:C.F}}>{label}</div>
        {description&&<div style={{fontSize:11,color:C.textLo,marginTop:2,fontFamily:C.F}}>{description}</div>}
      </div>
    </div>
  );
}

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    // Institution
    name:'', type:'', region:'', city:'', domain:'', adminEmail:'', adminFirst:'', adminLast:'',
    totalBeds:'', radBeds:'', dailyScans:'',
    // Compliance
    gdpr:false, hipaa:false, nhs:false, iso13485:false, dpo:'', complianceOfficer:'',
    // Integrations
    pacsVendor:'', pacsHost:'', pacsPort:'104', aeTitle:'',
    fhirEndpoint:'', fhirVersion:'R4',
    hl7Host:'', hl7Port:'2575',
    // Environment
    env:'sandbox', dataResidency:'', tier:'',
    // Benchmark
    benchmarkComplete:false, benchmarkAUC:0, benchmarkLatency:0,
    // Success
    launched: false,
    launchedTenant: null as any,
  });

  const [loading, setLoading] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<Record<string,string>>({});
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{msg:string, type:'ok'|'err'} | null>(null);

  const update = (fields: Partial<typeof data>) => setData(d => ({ ...d, ...fields }));

  // Pre-select plan/tier from URL query parameters (e.g. from pricing page)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get('plan') || params.get('tier');
    if (planParam) {
      const normalizedPlan = planParam.toLowerCase() === 'pro' ? 'hospital' : planParam.toLowerCase();
      if (['starter', 'hospital', 'enterprise'].includes(normalizedPlan)) {
        update({ tier: normalizedPlan });
      }
    }
  }, []);

  const handleLaunch = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/onboarding/launch', {
        ...data,
        // Map frontend fields to backend route expectations
        adminEmail: data.adminEmail,
        adminFirst: data.adminFirst,
        adminLast: data.adminLast,
      });

      const { payment } = res.data;
      
      if (payment.authorizationUrl) {
        // Paystack handshake
        window.location.href = payment.authorizationUrl;
      } else if (payment.provider === 'stripe' && payment.paymentLink) {
        // Stripe hosted checkout redirect
        window.location.href = payment.paymentLink;
      } else if (payment.paymentLink) {
        // Flutterwave handshake
        window.location.href = payment.paymentLink;
      } else if (payment.clientSecret) {
        // Stripe fallback (legacy)
        setStatusMsg({ msg: 'Institution created. Please check your email to complete Stripe payment setup.', type: 'ok' });
        setTimeout(() => window.location.href = '/login', 2500);
      } else if (payment.checkoutRequestId) {
        // M-Pesa handshake
        setStatusMsg({ msg: `STK Push sent to your phone. Request ID: ${payment.checkoutRequestId}`, type: 'ok' });
        setTimeout(() => window.location.href = '/login', 2500);
      } else {
        setStatusMsg({ msg: 'Launch successful! Finalizing your deployment...', type: 'ok' });
        update({ launched: true, launchedTenant: res.data.tenant });
      }
    } catch (err: any) {
      setStatusMsg({ msg: `Launch failed: ${err.response?.data?.message || err.message}`, type: 'err' });
    } finally {
      setLoading(false);
    }
  };

  const testIntegration = async (type: string) => {
    const host = type === 'pacs' ? data.pacsHost : type === 'fhir' ? data.fhirEndpoint : data.hl7Host;
    const port = type === 'pacs' ? data.pacsPort : type === 'hl7' ? data.hl7Port : '443';

    if (!host) {
      setStatusMsg({ msg: `Please enter the ${type.toUpperCase()} host or endpoint first.`, type: 'err' });
      return;
    }

    setIntegrationStatus(s => ({ ...s, [type]: 'testing' }));
    try {
      await apiClient.post('/onboarding/validate-integration', {
        type,
        host,
        port,
        aeTitle: data.aeTitle
      });
      setIntegrationStatus(s => ({ ...s, [type]: 'connected' }));
    } catch (err: any) {
      setIntegrationStatus(s => ({ ...s, [type]: 'failed' }));
      const errorDetail = err.response?.data?.details || 'Check network settings';
      setStatusMsg({ msg: `Integration failed: ${errorDetail}`, type: 'err' });
    }
  };

  const runBenchmark = async () => {
    setBenchmarkRunning(true); setBenchmarkProgress(0);
    const interval = setInterval(() => setBenchmarkProgress(p => Math.min(95, p + 2)), 100);
    
    try {
      const res = await apiClient.post('/onboarding/benchmark', { region: data.region });
      clearInterval(interval);
      setBenchmarkProgress(100);
      setBenchmarkRunning(false);
      update({ 
        benchmarkComplete: true, 
        benchmarkAUC: res.data.auc, 
        benchmarkLatency: res.data.latency 
      });
    } catch (err) {
      clearInterval(interval);
      setBenchmarkRunning(false);
      setStatusMsg({ msg: 'Benchmark failed. Resource allocation error.', type: 'err' });
    }
  };

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const canProceed = () => {
    if (step === 0) return data.name && data.type && data.region && data.adminEmail;
    if (step === 1) return (data as any).gdpr || (data as any).hipaa || (data as any).nhs || (data as any).iso13485 || data.dpo || data.complianceOfficer;
    if (step === 2) return integrationStatus['pacs'] === 'connected';
    if (step === 4) return data.benchmarkComplete;
    return true;
  };

  return (
    <div style={{ minHeight:'100vh', background:C.bg0, display:'flex', flexDirection:'column', fontFamily:C.F }}>

      {/* Top bar */}
      <div style={{ padding:'0 24px', height:52, display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:`1px solid ${C.border}`, background:C.bg1, position:'sticky', top:0, zIndex:1000 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-toggle"
            style={{ display:'none', background:'none', border:'none', color:C.textHi, cursor:'pointer', padding:4, marginRight:8 }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>
          <div style={{ width:28, height:28, borderRadius:8, background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <span style={{ fontSize:14, fontWeight:700, color:C.textHi, whiteSpace:'nowrap' }}>SEWA XAI</span>
          <span style={{ fontSize:12, color:C.textLo, display: 'inline-block' }} className="nav-breadcrumb">/ Onboarding</span>
        </div>
        <span style={{ fontSize:11, color:C.textLo }}>Step {step+1} of {STEPS.length}</span>
      </div>

      {/* Global Status Message */}
      {statusMsg && (
        <div style={{ position:'fixed', top:24, left:'50%', transform:'translateX(-50%)', zIndex:3000, padding:'12px 20px', background: statusMsg.type === 'ok' ? C.normalBg : C.critBg, border: `1px solid ${statusMsg.type === 'ok' ? C.normal : C.critical}40`, borderRadius:10, color: statusMsg.type === 'ok' ? C.normal : C.critical, fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:12, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', animation: 'fadeDown 300ms ease' }}>
          <style>{`@keyframes fadeDown{from{transform:translate(-50%,-20px);opacity:0}to{transform:translate(-50%,0);opacity:1}}`}</style>
          <span>{statusMsg.type === 'ok' ? '✓' : '⚠'} {statusMsg.msg}</span>
          <button onClick={() => setStatusMsg(null)} style={{ background:'none', border:'none', color:'inherit', cursor:'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ flex:1, display:'flex', position:'relative', overflow:'hidden' }}>
        <style>{`
          @media (max-width: 768px) {
            .nav-breadcrumb { display: none !important; }
            .mobile-menu-toggle { display: block !important; }
            .sidebar-overlay { 
              display: block !important;
              position: fixed; top: 52px; left: 0; right: 0; bottom: 0;
              background: rgba(0,0,0,0.5); z-index: 900;
              opacity: 0; pointer-events: none; transition: opacity 200ms;
            }
            .sidebar-overlay.open { opacity: 1; pointer-events: auto; }
            .sidebar {
              position: fixed !important; top: 52px; bottom: 0; left: -240px;
              z-index: 1000 !important; width: 240px !important;
              transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1) !important;
              background: ${C.bg1} !important;
            }
            .sidebar.open { transform: translateX(240px); }
            .main-content { padding: 24px 16px !important; }
            .form-grid-2 { grid-template-columns: 1fr !important; }
            .form-grid-3 { grid-template-columns: 1fr !important; }
            .form-grid-4 { grid-template-columns: 1fr 1fr !important; }
            .responsive-p { font-size: 12px !important; }
            .responsive-h1 { font-size: 18px !important; }
            .step-sidebar-footer { display: none !important; }
            .desktop-collapse-btn { display: none !important; }
          }
          @media (min-width: 769px) {
            .sidebar-overlay { display: none !important; }
          }
        `}</style>

        <div 
          className={`sidebar-overlay ${mobileMenuOpen ? 'open' : ''}`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Step sidebar */}
        <div className={`sidebar ${mobileMenuOpen ? 'open' : ''}`} style={{ 
          width: sidebarCollapsed ? 64 : 220, 
          flexShrink:0, 
          borderRight:`1px solid ${C.border}`, 
          background:C.bg1, 
          padding: sidebarCollapsed ? '16px 8px' : '24px 16px',
          transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1), padding 300ms',
          display:'flex',
          flexDirection:'column',
          position:'relative'
        }}>
          {/* Collapse toggle (Desktop only) */}
          <button 
            className="desktop-collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{ 
              position:'absolute', right:-12, top:24, width:24, height:24, borderRadius:'50%', 
              background:C.bg3, border:`1px solid ${C.border}`, color:C.textMd,
              display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none', transition:'transform 300ms' }}><path d="m15 18-6-6 6-6"/></svg>
          </button>

          <div style={{ display:'flex', flexDirection:'column', gap:4, flex:1 }}>
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <div key={s.id} title={sidebarCollapsed ? s.label : ''} style={{
                  display:'flex', alignItems:'center', gap: sidebarCollapsed ? 0 : 10, padding: sidebarCollapsed ? '9px 0' : '9px 12px', borderRadius:10,
                  background: active ? `${C.brand}14` : 'transparent',
                  border: `1px solid ${active ? `${C.brand}40` : 'transparent'}`,
                  cursor: done ? 'pointer' : 'default',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  transition: 'padding 300ms, gap 300ms',
                }} onClick={() => {
                  if (done) setStep(i);
                  if (window.innerWidth <= 768) setMobileMenuOpen(false);
                }}>
                  <div style={{
                    width:24, height:24, borderRadius:'50%', flexShrink:0,
                    background: done ? C.brand : active ? `${C.brand}20` : C.bg3,
                    border: `1.5px solid ${done ? C.brand : active ? C.brand : C.border}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:10,
                  }}>
                    {done
                      ? <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}><path d="m5 12 5 5L20 7"/></svg>
                      : <span style={{ fontSize:11 }}>{s.icon}</span>
                    }
                  </div>
                  {!sidebarCollapsed && (
                    <div style={{ fontSize:12, fontWeight: active ? 600 : 400, color: active ? C.brand : done ? C.textMd : C.textLo, overflow:'hidden', whiteSpace:'nowrap' }}>
                      {s.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!sidebarCollapsed && (
            <div className="step-sidebar-footer" style={{ marginTop:32, padding:14, background:C.bg2, borderRadius:12, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.textHi, marginBottom:6 }}>Need help?</div>
              <div style={{ fontSize:11, color:C.textMd, lineHeight:1.5, marginBottom:10 }}>Our onboarding team is available 24/7 to assist.</div>
              <a href="mailto:onboarding@sewaxai.health" style={{ fontSize:11, color:C.brand, textDecoration:'none', fontFamily:C.F }}>
                onboarding@sewaxai.health
              </a>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="main-content" style={{ flex:1, overflowY:'auto', padding:40, background:C.bg0 }}>
          <div style={{ maxWidth:620, margin:'0 auto' }}>

            {!data.launched && (
              <div style={{ marginBottom:28 }}>
                <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:C.textHi }}>
                  {currentStep.icon} {currentStep.label}
                </h1>
                <p style={{ margin:'6px 0 0', fontSize:13, color:C.textMd }}>
                  {step===0 && 'Tell us about your institution to set up your SEWA XAI account.'}
                  {step===1 && 'Select applicable compliance frameworks for your region.'}
                  {step===2 && 'Connect SEWA XAI to your existing PACS, FHIR, and HL7 systems.'}
                  {step===3 && 'Choose deployment environment and data residency preferences.'}
                  {step===4 && 'Run the AI benchmark to verify performance on your infrastructure.'}
                  {step===5 && 'Review your configuration and launch your SEWA XAI deployment.'}
                </p>
              </div>
            )}

            {/* STEP 0 — Institution Details */}
            {step === 0 && !data.launched && (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div className="form-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Input label="Institution Name" value={data.name} onChange={v=>update({name:v})} placeholder="Royal London Hospital" required/>
                  <Select label="Institution Type" value={data.type} onChange={v=>update({type:v})} required
                    options={[{value:'nhs',label:'NHS Trust'},{value:'private',label:'Private Hospital'},{value:'clinic',label:'Imaging Clinic'},{value:'academic',label:'Academic Medical Centre'},{value:'community',label:'Community Health Centre'}]}/>
                </div>

                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, color:C.textMd, marginBottom:10, fontFamily:C.F }}>
                    Region / Data Residency <span style={{color:C.critical}}>*</span>
                  </label>
                  <div className="form-grid-4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                    {REGIONS.map(r => (
                      <div key={r.key} onClick={() => update({ region:r.key })}
                        style={{
                          padding:'10px 8px', borderRadius:10, cursor:'pointer', textAlign:'center',
                          background: data.region===r.key ? `${C.brand}18` : C.bg3,
                          border:`2px solid ${data.region===r.key ? C.brand : C.border}`,
                          transition:'all 150ms',
                        }}>
                        <div style={{ fontSize:18, marginBottom:4 }}>{r.flag}</div>
                        <div style={{ fontSize:11, fontWeight:600, color: data.region===r.key ? C.brand : C.textMd }}>{r.label}</div>
                        <div style={{ fontSize:9, color:C.textLo, marginTop:2 }}>{r.compliance}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Input label="City" value={data.city} onChange={v=>update({city:v})} placeholder="London"/>
                  <Input label="Hospital Domain" value={data.domain} onChange={v=>update({domain:v})} placeholder="royallondon.nhs.uk"/>
                </div>
                <div className="form-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Input label="Admin First Name" value={data.adminFirst} onChange={v=>update({adminFirst:v})} required/>
                  <Input label="Admin Last Name" value={data.adminLast} onChange={v=>update({adminLast:v})} required/>
                </div>
                <Input label="Admin Email" value={data.adminEmail} onChange={v=>update({adminEmail:v})} placeholder="admin@royallondon.nhs.uk" required type="email"/>
                <div className="form-grid-3" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                  <Input label="Total Beds" value={data.totalBeds} onChange={v=>update({totalBeds:v})} placeholder="500"/>
                  <Input label="Radiology Rooms" value={data.radBeds} onChange={v=>update({radBeds:v})} placeholder="12"/>
                  <Input label="Daily Scans (est.)" value={data.dailyScans} onChange={v=>update({dailyScans:v})} placeholder="150"/>
                </div>
              </div>
            )}

            {/* STEP 1 — Compliance */}
            {step === 1 && !data.launched && (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ padding:14, background:`${C.info}0A`, borderRadius:12, border:`1px solid ${C.info}30`, fontSize:12, color:C.textMd, lineHeight:1.6 }}>
                  ℹ️ SEWA XAI supports full compliance across all major healthcare regulations. Select all frameworks that apply to your institution.
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { key:'gdpr', label:'GDPR / UK DPA 2018', desc:'Required for UK and EU institutions. Data minimisation, right to erasure, DPIA.', regions:['uk','eu'] },
                    { key:'hipaa', label:'HIPAA Security Rule', desc:'Required for US institutions. BAA, audit controls, encryption at rest and in transit.', regions:['us'] },
                    { key:'nhs', label:'NHS DSPT 2024-25', desc:'Required for NHS institutions. IG training, data flows, penetration testing.', regions:['uk'] },
                    { key:'iso13485', label:'ISO 13485 — Medical Devices QMS', desc:'Quality management for SaMD. Applicable globally.', regions:['uk','eu','us','ng','ke','za','in'] },
                  ].map(f => (
                    <div key={f.key} style={{ padding:14, background:C.bg2, borderRadius:12, border:`1px solid ${(data as any)[f.key]?`${C.brand}40`:C.border}` }}>
                      <Checkbox
                        checked={(data as any)[f.key]}
                        onChange={v => update({ [f.key]:v } as any)}
                        label={f.label}
                        description={f.desc}
                      />
                    </div>
                  ))}
                </div>

                <div className="form-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Input label="Data Protection Officer (DPO)" value={data.dpo} onChange={v=>update({dpo:v})} placeholder="dpo@hospital.nhs.uk"/>
                  <Input label="Compliance Officer" value={data.complianceOfficer} onChange={v=>update({complianceOfficer:v})} placeholder="compliance@hospital.nhs.uk"/>
                </div>
              </div>
            )}

            {/* STEP 2 — Integrations */}
            {step === 2 && !data.launched && (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                {[
                  {
                    id:'pacs', label:'PACS Integration', icon:'🗄', required:true,
                    fields: (
                      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        <Select label="PACS Vendor" value={data.pacsVendor} onChange={v=>update({pacsVendor:v})}
                          options={[{value:'sectra',label:'Sectra'},{value:'agfa',label:'Agfa HealthCare'},{value:'philips',label:'Philips IntelliSpace'},{value:'ge',label:'GE Healthcare'},{value:'fuji',label:'Fujifilm Synapse'},{value:'orthanc',label:'Orthanc (open source)'},{value:'other',label:'Other'}]}/>
                        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:10 }}>
                          <Input label="PACS Host" value={data.pacsHost} onChange={v=>update({pacsHost:v})} placeholder="pacs.hospital.nhs.uk"/>
                          <Input label="Port" value={data.pacsPort} onChange={v=>update({pacsPort:v})} placeholder="104"/>
                          <Input label="AE Title" value={data.aeTitle} onChange={v=>update({aeTitle:v})} placeholder="SEWA_AI"/>
                        </div>
                      </div>
                    ),
                  },
                  {
                    id:'fhir', label:'FHIR R4 Server', icon:'🏥', required:false,
                    fields: (
                      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:10 }}>
                        <Input label="FHIR Base URL" value={data.fhirEndpoint} onChange={v=>update({fhirEndpoint:v})} placeholder="https://fhir.hospital.nhs.uk/R4"/>
                        <Select label="Version" value={data.fhirVersion} onChange={v=>update({fhirVersion:v})}
                          options={[{value:'R4',label:'FHIR R4'},{value:'R5',label:'FHIR R5'}]}/>
                      </div>
                    ),
                  },
                  {
                    id:'hl7', label:'HL7v2 Gateway', icon:'📡', required:false,
                    fields: (
                      <div className="form-grid-2" style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:10 }}>
                        <Input label="HL7 Gateway Host" value={data.hl7Host} onChange={v=>update({hl7Host:v})} placeholder="hl7.hospital.nhs.uk"/>
                        <Input label="MLLP Port" value={data.hl7Port} onChange={v=>update({hl7Port:v})} placeholder="2575"/>
                      </div>
                    ),
                  },
                ].map(intg => (
                  <div key={intg.id} style={{ padding:18, background:C.bg2, borderRadius:14, border:`1px solid ${C.border}` }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:18 }}>{intg.icon}</span>
                        <div>
                           <div style={{ fontSize:13, fontWeight:700, color:C.textHi }}>{intg.label}</div>
                           <div style={{ fontSize:10, color:C.textLo }}>{intg.required ? 'Required' : 'Optional'}</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        {integrationStatus[intg.id] === 'connected' && (
                          <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:C.normalBg, color:C.normal, border:'1px solid #0D2A1A', fontFamily:C.F }}>
                            ✓ Connected
                          </span>
                        )}
                        <button onClick={() => testIntegration(intg.id)} disabled={integrationStatus[intg.id]==='testing'}
                          style={{ padding:'5px 12px', borderRadius:8, background:C.bg3, border:`1px solid ${C.border}`, color:C.textMd, fontSize:11, cursor:'pointer', fontFamily:C.F }}>
                          {integrationStatus[intg.id]==='testing' ? 'Testing…' : 'Test Connection'}
                        </button>
                      </div>
                    </div>
                    {intg.fields}
                  </div>
                ))}
              </div>
            )}

            {/* STEP 3 — Environment */}
            {step === 3 && !data.launched && (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, color:C.textMd, marginBottom:10, fontFamily:C.F }}>Deployment Environment</label>
                  <div className="form-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {[
                      { key:'sandbox', label:'Sandbox', desc:'Safe testing environment. Synthetic data only. Free.', icon:'🧪' },
                      { key:'production', label:'Production', desc:'Live clinical environment. Real patient data. GDPR-compliant.', icon:'🏥' },
                    ].map(env => (
                      <div key={env.key} onClick={() => update({ env: env.key })}
                        style={{ padding:16, borderRadius:12, cursor:'pointer', border:`2px solid ${data.env===env.key?C.brand:C.border}`, background: data.env===env.key?`${C.brand}12`:C.bg2, transition:'all 150ms' }}>
                        <div style={{ fontSize:22, marginBottom:8 }}>{env.icon}</div>
                        <div style={{ fontSize:13, fontWeight:700, color: data.env===env.key?C.brand:C.textHi }}>{env.label}</div>
                        <div style={{ fontSize:11, color:C.textMd, marginTop:4, lineHeight:1.5 }}>{env.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, color:C.textMd, marginBottom:10, fontFamily:C.F }}>Service Tier</label>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {[
                      { key:'starter',    label:'Starter Clinic', price:'£549/mo',  scans:'Up to 500 scans/mo', support:'Email support (48h)' },
                      { key:'hospital',   label:'Hospital Pro',   price:'£2,199/mo', scans:'Up to 5,000 scans/mo', support:'Priority support + SLA (4h)' },
                      { key:'enterprise', label:'Enterprise',     price:'Custom',    scans:'Unlimited scans', support:'Dedicated CSM + 24/7 support' },
                    ].map(tier => (
                      <div key={tier.key} onClick={() => update({ tier: tier.key })}
                        style={{ padding:14, borderRadius:12, cursor:'pointer', border:`2px solid ${data.tier===tier.key?C.brand:C.border}`, background: data.tier===tier.key?`${C.brand}12`:C.bg2, display:'flex', alignItems:'center', justifyContent:'space-between', transition:'all 150ms' }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color: data.tier===tier.key?C.brand:C.textHi }}>{tier.label}</div>
                          <div style={{ fontSize:11, color:C.textMd, marginTop:2 }}>{tier.scans} · {tier.support}</div>
                        </div>
                        <div style={{ fontSize:15, fontWeight:800, color: data.tier===tier.key?C.brand:C.textMd, fontFamily:C.FM }}>{tier.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 — AI Benchmark */}
            {step === 4 && !data.launched && (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div style={{ padding:14, background:`${C.brand}0A`, borderRadius:12, border:`1px solid ${C.brand}30`, fontSize:12, color:C.textMd, lineHeight:1.6 }}>
                  🧠 The AI benchmark runs a set of anonymised test scans through SEWA's full pipeline to verify performance and latency on your infrastructure configuration.
                </div>

                {!data.benchmarkComplete ? (
                  <div style={{ padding:32, background:C.bg2, borderRadius:14, border:`1px solid ${C.border}`, textAlign:'center' }}>
                    {benchmarkRunning ? (
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:C.textHi, marginBottom:16 }}>Running AI benchmark… {benchmarkProgress}%</div>
                        <div style={{ height:6, background:C.bg4, borderRadius:3, overflow:'hidden', marginBottom:16, maxWidth:400, margin:'0 auto 16px' }}>
                          <div style={{ width:`${benchmarkProgress}%`, height:'100%', background:`linear-gradient(90deg,${C.brand},${C.brandLt})`, transition:'width 200ms', boxShadow:`0 0 8px ${C.brand}60` }}/>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:6, maxWidth:320, margin:'0 auto', textAlign:'left' }}>
                          {[
                            { label:'Uploading test scans (50)', done: benchmarkProgress>15 },
                            { label:'Running Triage Engine', done: benchmarkProgress>35 },
                            { label:'Running Uncertainty Engine', done: benchmarkProgress>55 },
                            { label:'Running VLM Report Generator', done: benchmarkProgress>75 },
                            { label:'Running Metacognition AI', done: benchmarkProgress>90 },
                          ].map(item => (
                            <div key={item.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ width:14, height:14, borderRadius:'50%', background: item.done?C.normal:C.bg4, border:`1.5px solid ${item.done?C.normal:C.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                {item.done && <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}><path d="m5 12 5 5L20 7"/></svg>}
                              </div>
                              <span style={{ fontSize:11, color: item.done?C.textMd:C.textLo, fontFamily:C.F }}>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize:32, marginBottom:12 }}>🧠</div>
                        <div style={{ fontSize:14, fontWeight:700, color:C.textHi, marginBottom:8 }}>Ready to benchmark</div>
                        <div style={{ fontSize:12, color:C.textMd, marginBottom:20 }}>50 anonymised test scans · ~4 minutes</div>
                        <button onClick={runBenchmark} style={{ padding:'10px 28px', background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, border:'none', borderRadius:10, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:C.F }}>
                          Run AI Benchmark
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ padding:24, background:C.normalBg, borderRadius:14, border:'1px solid #0D2A1A' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:C.normal, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}><path d="m5 12 5 5L20 7"/></svg>
                      </div>
                      <div style={{ fontSize:15, fontWeight:700, color:C.normal }}>Benchmark passed ✓</div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                      {[
                        { label:'AUC-ROC', value:(data.benchmarkAUC).toFixed(3), color:C.normal },
                        { label:'Avg Latency', value:`${data.benchmarkLatency}s`, color:C.brand },
                        { label:'Test Scans', value:'50/50', color:C.textHi },
                      ].map(r=>(
                        <div key={r.label} style={{ padding:'12px 14px', background:C.bg2, borderRadius:10 }}>
                          <div style={{ fontSize:9, color:C.textLo, marginBottom:4 }}>{r.label}</div>
                          <div style={{ fontSize:20, fontWeight:700, color:r.color, fontFamily:C.FM }}>{r.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 5 — Go Live */}
            {step === 5 && !data.launched && (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div style={{ padding:24, background:C.bg2, borderRadius:14, border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.textHi, marginBottom:16 }}>Configuration Summary</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {[
                      { label:'Institution',    value:data.name||'—' },
                      { label:'Region',         value:REGIONS.find(r=>r.key===data.region)?.label||'—' },
                      { label:'Environment',    value:data.env==='production'?'Production (Live)':'Sandbox (Testing)' },
                      { label:'Service Tier',   value:data.tier ? data.tier.charAt(0).toUpperCase()+data.tier.slice(1) : '—' },
                      { label:'PACS',           value:data.pacsHost||'Not configured' },
                      { label:'FHIR R4',        value:data.fhirEndpoint||'Not configured' },
                      { label:'Compliance',     value:[data.gdpr&&'GDPR',data.hipaa&&'HIPAA',data.nhs&&'NHS DSPT'].filter(Boolean).join(', ')||'—' },
                      { label:'AI Benchmark',   value:data.benchmarkComplete?`✓ AUC ${data.benchmarkAUC}`:'Not run' },
                    ].map(row=>(
                      <div key={row.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', background:C.bg3, borderRadius:8 }}>
                        <span style={{ fontSize:12, color:C.textMd }}>{row.label}</span>
                        <span style={{ fontSize:12, fontWeight:600, color:C.textHi }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding:16, background:`${C.normal}0A`, borderRadius:12, border:'1px solid #0D2A1A' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.normal, marginBottom:8 }}>Ready to launch</div>
                  <div style={{ fontSize:12, color:C.textMd, lineHeight:1.6 }}>
                    Your SEWA XAI instance will be provisioned on Azure {REGIONS.find(r=>r.key===data.region)?.label} infrastructure with full {REGIONS.find(r=>r.key===data.region)?.compliance} compliance. Provisioning takes approximately 5 minutes.
                  </div>
                </div>

                <button 
                  onClick={handleLaunch}
                  disabled={loading}
                  style={{ height:52, borderRadius:14, border:'none', cursor:loading?'not-allowed':'pointer', background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, color:'white', fontSize:15, fontWeight:800, fontFamily:C.F, boxShadow:loading?'none':`0 6px 24px ${C.brand}50`, letterSpacing:'0.02em', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                  {loading ? 'Provisioning...' : '🚀 Launch SEWA XAI Deployment'}
                </button>
              </div>
            )}

            {/* STEP 6 — SUCCESS / DEPLOYMENT DETAILS */}
            {data.launched && (
              <div style={{ display:'flex', flexDirection:'column', gap:20, animation:'fadeIn 500ms ease' }}>
                <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
                
                <div style={{ textAlign:'center', marginBottom:10 }}>
                  <div style={{ width:64, height:64, borderRadius:'50%', background:C.normal, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:`0 0 30px ${C.normal}40` }}>
                    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}><path d="m5 12 5 5L20 7"/></svg>
                  </div>
                  <h1 style={{ fontSize:24, fontWeight:800, color:C.textHi, margin:'0 0 8px' }}>Deployment Initialized!</h1>
                  <p style={{ fontSize:14, color:C.textMd, margin:0 }}>Your SEWA XAI instance for <b>{data.name}</b> is being provisioned.</p>
                </div>

                <div style={{ background:C.bg2, borderRadius:16, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', background:C.bg3, borderBottom:`1px solid ${C.border}`, fontSize:11, fontWeight:700, color:C.textMd, letterSpacing:'0.05em' }}>
                    TECHNICAL INTEGRATION PARAMETERS (NHS BLUEPRINT)
                  </div>
                  <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16 }}>
                    
                    <div>
                      <div style={{ fontSize:11, color:C.textLo, marginBottom:6, fontWeight:600 }}>1. DICOM / PACS CONFIGURATION</div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div style={{ background:C.bg1, padding:12, borderRadius:10, border:`1px solid ${C.border}` }}>
                          <div style={{ fontSize:9, color:C.textLo, marginBottom:2 }}>TARGET IP (VPN)</div>
                          <div style={{ fontSize:13, color:C.brand, fontWeight:700, fontFamily:C.FM }}>10.142.0.52</div>
                        </div>
                        <div style={{ background:C.bg1, padding:12, borderRadius:10, border:`1px solid ${C.border}` }}>
                          <div style={{ fontSize:9, color:C.textLo, marginBottom:2 }}>TARGET PORT</div>
                          <div style={{ fontSize:13, color:C.textHi, fontWeight:700, fontFamily:C.FM }}>11112</div>
                        </div>
                        <div style={{ background:C.bg1, padding:12, borderRadius:10, border:`1px solid ${C.border}` }}>
                          <div style={{ fontSize:9, color:C.textLo, marginBottom:2 }}>TARGET AE TITLE</div>
                          <div style={{ fontSize:13, color:C.textHi, fontWeight:700, fontFamily:C.FM }}>SEWA_AI_UK</div>
                        </div>
                        <div style={{ background:C.bg1, padding:12, borderRadius:10, border:`1px solid ${C.border}` }}>
                          <div style={{ fontSize:9, color:C.textLo, marginBottom:2 }}>SOURCE AE TITLE</div>
                          <div style={{ fontSize:13, color:C.textHi, fontWeight:700, fontFamily:C.FM }}>{data.aeTitle || 'ANY'}</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ height:1, background:C.border }} />

                    <div>
                      <div style={{ fontSize:11, color:C.textLo, marginBottom:6, fontWeight:600 }}>2. FHIR R4 WEBHOOK & API</div>
                      <div style={{ background:C.bg1, padding:12, borderRadius:10, border:`1px solid ${C.border}`, display:'flex', flexDirection:'column', gap:10 }}>
                        <div>
                          <div style={{ fontSize:9, color:C.textLo, marginBottom:2 }}>ENDPOINT URL</div>
                          <div style={{ fontSize:12, color:C.textHi, fontWeight:600, fontFamily:C.FM, wordBreak:'break-all' }}>https://api.sewaxai.health/api/v1/fhir/webhook</div>
                        </div>
                        <div>
                          <div style={{ fontSize:9, color:C.textLo, marginBottom:2 }}>X-API-KEY (SECRET)</div>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1, fontSize:12, color:C.critical, fontWeight:700, fontFamily:C.FM, background:C.bg0, padding:6, borderRadius:6, border:`1px solid ${C.critical}40` }}>
                              {data.launchedTenant?.apiKey || 'sk_live_****************'}
                            </div>
                            <button onClick={() => {
                              navigator.clipboard.writeText(data.launchedTenant?.apiKey || '');
                              setStatusMsg({ msg: 'API Key copied to clipboard', type: 'ok' });
                            }} style={{ background:C.bg3, border:`1px solid ${C.border}`, borderRadius:6, padding:'4px 8px', color:C.textHi, fontSize:10, cursor:'pointer' }}>Copy</button>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                <div style={{ padding:16, background:`${C.info}0A`, borderRadius:12, border:`1px solid ${C.info}40`, fontSize:12, color:C.textMd, lineHeight:1.6 }}>
                  <b style={{ color:C.info }}>Next Steps:</b> Share these parameters with your IT/PACS administrators to establish connectivity. Your admin setup link has been sent to <b>{data.adminEmail}</b>.
                </div>

                <button 
                  onClick={() => window.location.href = '/login'}
                  style={{ height:52, borderRadius:14, cursor:'pointer', background:C.bg3, border:`1px solid ${C.border}`, color:C.textHi, fontSize:15, fontWeight:700, fontFamily:C.F }}>
                  Go to Login Dashboard
                </button>
              </div>
            )}

            {/* Navigation */}
            {!data.launched && (
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:32, paddingTop:20, borderTop:`1px solid ${C.border}` }}>
                <button onClick={() => setStep(s => Math.max(0, s-1))} disabled={step === 0}
                  style={{ padding:'10px 20px', borderRadius:10, background:'transparent', border:`1px solid ${C.border}`, color:C.textMd, fontSize:13, cursor: step===0?'default':'pointer', fontFamily:C.F, opacity:step===0?0.4:1 }}>
                  ← Back
                </button>
                {!isLast && (
                  <button onClick={() => setStep(s => s+1)} disabled={!canProceed()}
                    style={{ padding:'10px 24px', borderRadius:10, border:'none', cursor: canProceed()?'pointer':'not-allowed', background:canProceed()?`linear-gradient(135deg,${C.brand},${C.brandDk})`:`${C.bg3}`, color:canProceed()?'white':C.textLo, fontSize:13, fontWeight:700, fontFamily:C.F, boxShadow:canProceed()?`0 4px 14px ${C.brand}40`:'none', opacity:canProceed()?1:0.6 }}>
                    Continue →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
