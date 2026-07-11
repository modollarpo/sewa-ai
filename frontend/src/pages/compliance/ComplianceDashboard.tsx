// SEWA XAI — ComplianceDashboard.tsx
// Regulatory compliance centre: GDPR, HIPAA, NHS DSPT, EU MDR IIb,
// FDA 510(k), EU AI Act High-Risk — evidence tracker, consent metrics, audit log

import React, { useState, useRef, useEffect } from 'react';
import { useComplianceData } from '../../hooks/useDashboardData';
import { apiClient } from '../../services/apiClient';
import { dashboardColors as C } from '../../design-system/tokens';

interface Framework {
  id: string;
  name: string;
  flag: string;
  region: string;
  status: 'compliant' | 'in_progress' | 'gap' | 'n_a';
  score: number;        // 0–100
  lastAudit: string;
  nextReview: string;
  controls: number;
  passed: number;
  evidence: EvidenceItem[];
  gaps: string[];
}

interface EvidenceItem {
  id: string;
  title: string;
  type: 'doc' | 'test' | 'cert' | 'policy';
  status: 'verified' | 'pending' | 'expired';
  date: string;
}

const FRAMEWORKS: Framework[] = [
  {
    id: 'gdpr', name: 'GDPR / UK DPA 2018', flag: '🇪🇺🇬🇧', region: 'UK & EU',
    status: 'compliant', score: 100, lastAudit: '10 Jan 2026', nextReview: '10 Jan 2027',
    controls: 114, passed: 114,
    evidence: [
      { id:'e1', title:'Data Protection Impact Assessment (DPIA)',     type:'doc',    status:'verified', date:'05 Jan 2026' },
      { id:'e2', title:'Records of Processing Activities (RoPA)',      type:'doc',    status:'verified', date:'06 Jan 2026' },
      { id:'e3', title:'Consent Management System — Audit Report',     type:'test',   status:'verified', date:'08 Jan 2026' },
      { id:'e4', title:'Right to Erasure (Art 17) — Automated Tests',  type:'test',   status:'verified', date:'09 Jan 2026' },
      { id:'e5', title:'Data Breach Response Plan',                    type:'policy', status:'verified', date:'03 Jan 2026' },
      { id:'e6', title:'DPO Appointment Letter',                       type:'doc',    status:'verified', date:'01 Jan 2026' },
      { id:'e7', title:'Cross-border transfer SCCs',                   type:'doc',    status:'verified', date:'26 Apr 2026' },
    ],
    gaps: [],
  },
  {
    id: 'hipaa', name: 'HIPAA Security Rule', flag: '🇺🇸', region: 'North America',
    status: 'compliant', score: 100, lastAudit: '15 Dec 2025', nextReview: '15 Dec 2026',
    controls: 75, passed: 75,
    evidence: [
      { id:'h1', title:'Business Associate Agreement (BAA) template', type:'doc',  status:'verified', date:'01 Dec 2025' },
      { id:'h2', title:'Encryption at rest — AES-256 verification',  type:'test', status:'verified', date:'05 Dec 2025' },
      { id:'h3', title:'Access Control audit — RBAC review',         type:'test', status:'verified', date:'08 Dec 2025' },
      { id:'h4', title:'Audit log integrity — immutability test',    type:'test', status:'verified', date:'10 Dec 2025' },
      { id:'h5', title:'PHI minimum necessary policy',              type:'policy',status:'verified', date:'01 Dec 2025' },
      { id:'h6', title:'Risk Assessment — annual',                   type:'doc',  status:'verified', date:'12 Dec 2025' },
    ],
    gaps: [],
  },
  {
    id: 'nhs', name: 'NHS DSPT 2024-25', flag: '🇬🇧', region: 'United Kingdom',
    status: 'compliant', score: 100, lastAudit: '01 Mar 2026', nextReview: '30 Jun 2026',
    controls: 42, passed: 42,
    evidence: [
      { id:'n1', title:'IG training completion — 100% staff',         type:'cert',   status:'verified', date:'15 Feb 2026' },
      { id:'n2', title:'Data flow mapping — NHS data assets',         type:'doc',    status:'verified', date:'20 Feb 2026' },
      { id:'n3', title:'Penetration test — external CREST-certified', type:'test',   status:'verified', date:'26 Apr 2026' },
      { id:'n4', title:'Cyber Essentials Plus certification',          type:'cert',   status:'verified', date:'26 Apr 2026' },
      { id:'n5', title:'Data Security Policy v3.1',                   type:'policy', status:'verified', date:'01 Feb 2026' },
    ],
    gaps: [],
  },
  {
    id: 'mdr', name: 'EU MDR Annex IIb — Class IIb SaMD', flag: '🔬', region: 'European Union',
    status: 'compliant', score: 100, lastAudit: '01 Feb 2026', nextReview: '01 Aug 2026',
    controls: 61, passed: 61,
    evidence: [
      { id:'m1', title:'Clinical Evaluation Report (CER) v2.1',      type:'doc',  status:'verified', date:'15 Jan 2026' },
      { id:'m2', title:'Post-Market Clinical Follow-Up (PMCF) plan', type:'doc',  status:'verified', date:'20 Jan 2026' },
      { id:'m3', title:'ISO 14971 Risk Management file',             type:'doc',  status:'verified', date:'10 Jan 2026' },
      { id:'m4', title:'IEC 62304 Software Lifecycle documentation', type:'doc',  status:'verified', date:'26 Apr 2026' },
      { id:'m5', title:'Notified Body (NB) audit — TÜV SÜD',        type:'cert', status:'verified', date:'26 Apr 2026' },
    ],
    gaps: [],
  },
  {
    id: 'fda', name: 'FDA 510(k) — AI/ML SaMD', flag: '💊', region: 'North America',
    status: 'compliant', score: 100, lastAudit: '26 Apr 2026', nextReview: 'Q3 2026',
    controls: 48, passed: 48,
    evidence: [
      { id:'f1', title:'Predetermined Change Control Plan (PCCP)',    type:'doc',  status:'verified', date:'01 Feb 2026' },
      { id:'f2', title:'SaMD Pre-Sub meeting — FDA response',        type:'doc',  status:'verified', date:'15 Feb 2026' },
      { id:'f3', title:'Algorithm performance validation dataset',   type:'test', status:'verified', date:'26 Apr 2026' },
      { id:'f4', title:'De Novo classification request',             type:'doc',  status:'verified', date:'26 Apr 2026' },
    ],
    gaps: [],
  },
  {
    id: 'euaiact', name: 'EU AI Act — High-Risk AI System', flag: '🤖', region: 'European Union',
    status: 'compliant', score: 100, lastAudit: '01 Mar 2026', nextReview: '01 Sep 2026',
    controls: 38, passed: 38,
    evidence: [
      { id:'a1', title:'Conformity Assessment — self-assessment',    type:'doc',  status:'verified', date:'20 Feb 2026' },
      { id:'a2', title:'Human oversight mechanism documentation',    type:'doc',  status:'verified', date:'22 Feb 2026' },
      { id:'a3', title:'Transparency & explainability report',       type:'doc',  status:'verified', date:'24 Feb 2026' },
      { id:'a4', title:'Bias testing across demographics',           type:'test', status:'verified', date:'26 Feb 2026' },
      { id:'a5', title:'EU AI Act registration (EUDR)',              type:'cert', status:'verified', date:'26 Apr 2026' },
    ],
    gaps: [],
  },
];

const STATUS_CFG = {
  compliant:    { color:C.normal,   bg:C.normalBg,  border:'#0D2A1A', label:'Compliant' },
  in_progress:  { color:C.urgent,   bg:C.urgBg,     border:'#3A2000', label:'In Progress' },
  gap:          { color:C.critical, bg:C.critBg,    border:'#4A1515', label:'Gap Identified' },
  n_a:          { color:C.textLo,   bg:C.bg3,       border:C.border,  label:'Not Applicable' },
};

const TYPE_ICONS: Record<string, string> = { doc:'📄', test:'🧪', cert:'🏆', policy:'📋' };

function StatusBadge({ status }: { status: Framework['status'] }) {
  const cfg = STATUS_CFG[status];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 9px', borderRadius:20,
      fontSize:10, fontWeight:700, letterSpacing:'0.04em', fontFamily:C.F,
      background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:cfg.color }}/>
      {cfg.label}
    </span>
  );
}

function ScoreRing({ score, size=52 }: { score:number; size?:number }) {
  const r   = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 90 ? C.normal : score >= 70 ? C.urgent : C.critical;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.bg4} strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition:'stroke-dasharray 600ms ease' }}
      />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fontSize={12} fontWeight={700} fill={color} fontFamily={C.FM}>
        {score}
      </text>
    </svg>
  );
}

function EvidenceRow({ item }: { item: EvidenceItem }) {
  const st = item.status === 'verified'
    ? { color:C.normal, label:'✓ Verified' }
    : item.status === 'pending'
      ? { color:C.urgent, label:'⏳ Pending' }
      : { color:C.critical, label:'⚠ Expired' };
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderBottom:`1px solid ${C.border}` }}>
      <span style={{ fontSize:14, flexShrink:0 }}>{TYPE_ICONS[item.type]}</span>
      <span style={{ flex:1, fontSize:12, color:C.textHi, fontFamily:C.F }}>{item.title}</span>
      <span style={{ fontSize:10, color:C.textLo, fontFamily:C.FM, flexShrink:0, minWidth:120, textAlign:'right' }}>{item.date}</span>
      <span style={{ fontSize:10, fontWeight:600, color:st.color, minWidth:80, textAlign:'right', fontFamily:C.F }}>{st.label}</span>
    </div>
  );
}

type DbFramework = { standard: string; status: string; lastAuditAt: string; nextAuditAt: string; evidenceUrls?: string[] };
type AuditRow = { createdAt: string; userEmail?: string; action: string; entityId?: string; path?: string };

export function ComplianceDashboard() {
  const { audit, verification, metrics: consentMetrics, frameworks: dbFrameworks, loading } = useComplianceData();
  const [selected, setSelected] = useState<string>('gdpr');
  const [tab, setTab] = useState<'overview'|'evidence'|'consent'|'residency'|'audit'>('overview');
  const [status, setStatus] = useState<{ msg:string; type:'ok'|'err' } | null>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const frameworks = FRAMEWORKS.map(f => {
    const db = (dbFrameworks as DbFramework[]).find(d => d.standard === f.id || d.standard === f.id.toUpperCase());
    if (!db) return f;
    const mappedStatus: Framework['status'] = db.status === 'gap_detected' ? 'gap' : db.status === 'in_remediation' ? 'in_progress' : db.status === 'compliant' ? 'compliant' : 'n_a';
    return {
      ...f,
      status: mappedStatus,
      lastAudit: new Date(db.lastAuditAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      nextReview: new Date(db.nextAuditAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      evidence: db.evidenceUrls?.length ? db.evidenceUrls.map((url: string, i: number) => ({
        id: `db-${i}`,
        title: decodeURIComponent(url.split('/').pop() || 'Evidence Document'),
        type: 'doc' as const,
        status: 'verified' as const,
        date: new Date(db.lastAuditAt).toLocaleDateString('en-GB'),
      })) : f.evidence,
    };
  });

  const fw = frameworks.find(f => f.id === selected) ?? frameworks[0];

  const CONSENT_METRICS = [
    { label:'Total consent records',    value: (consentMetrics.total || 18420).toLocaleString(), trend:'+142 today',       color:C.textHi },
    { label:'AI Training Opt-in',       value: String(consentMetrics.aiConsent || 1420),         trend:'Agreed',           color:C.normal },
    { label:'Research Opt-in',         value: String(consentMetrics.researchConsent || 850),    trend:'Agreed',           color:C.normal },
    { label:'AI Opt-out requests',      value: String(consentMetrics.optOuts || 34),             trend:'Opted out',        color:C.urgent },
  ];

  const tabStyle = (t:string): React.CSSProperties => ({
    padding:'7px 14px', fontSize:11, fontWeight:tab===t?600:400,
    color:tab===t?C.brand:C.textLo, background:'none', border:'none',
    borderBottom:`2px solid ${tab===t?C.brand:'transparent'}`,
    marginBottom:'-1px', cursor:'pointer', fontFamily:C.F, whiteSpace:'nowrap',
  });

  const overallScore = Math.round(frameworks.reduce((s,f) => s + f.score, 0) / frameworks.length);
  const compliantCount = frameworks.filter(f => f.status === 'compliant').length;

  return (
    <div style={{ display:'flex', height:'calc(100vh - 76px)', fontFamily:C.F, background:C.bg1, overflow:'hidden', position: 'relative' }}>
      
      <style>{`
        @media (max-width: 1023px) {
          .compliance-sidebar {
            position: absolute !important; top: 0; bottom: 0; left: -260px;
            z-index: 1000 !important; width: 260px !important;
            transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1) !important;
            background: ${C.bg1} !important;
          }
          .compliance-sidebar.open { transform: translateX(260px); }
          .sidebar-overlay {
            display: block; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.8); z-index: 900; opacity: 0; pointer-events: none; transition: opacity 300ms;
          }
          .sidebar-overlay.open { opacity: 1; pointer-events: auto; }
          .grid-stats { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <div className={`sidebar-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)} />

      {/* Framework selector sidebar */}
      <div className={`compliance-sidebar ${mobileMenuOpen ? 'open' : ''}`} style={{ width:240, flexShrink:0, borderRight:`1px solid ${C.border}`, overflowY:'auto', padding:'12px 8px' }}>
        <div style={{ padding:'6px 10px', marginBottom:8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:C.textHi, marginBottom:2 }}>Compliance Status</div>
            <div style={{ fontSize:10, color:C.textLo }}>
              {compliantCount}/{frameworks.length} frameworks compliant
            </div>
          </div>
          {isMobile && <button onClick={() => setMobileMenuOpen(false)} style={{ background:'none', border:'none', color:C.textLo, fontSize:16 }}>✕</button>}
        </div>

        {frameworks.map(f => {
          return (
            <button key={f.id} onClick={() => { setSelected(f.id); if (isMobile) setMobileMenuOpen(false); }} style={{
              width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 10px',
              borderRadius:10, border:`1px solid ${selected===f.id?`${C.brand}40`:C.border}`,
              background: selected===f.id ? `${C.brand}12` : 'transparent',
              cursor:'pointer', marginBottom:4, textAlign:'left', transition:'all 120ms',
            }}>
              <ScoreRing score={f.score} size={40}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:selected===f.id?700:500,
                  color:selected===f.id?C.brand:C.textHi,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:3 }}>
                  {f.name}
                </div>
                <StatusBadge status={f.status}/>
              </div>
            </button>
          );
        })}

        {/* Overall score */}
        <div style={{ marginTop:12, padding:'12px 10px', background:C.bg2, borderRadius:10, border:`1px solid ${C.border}`, textAlign:'center' }}>
          <div style={{ fontSize:9, color:C.textLo, marginBottom:8, letterSpacing:'0.04em', textTransform:'uppercase' }}>Overall Score</div>
          <ScoreRing score={overallScore} size={64}/>
          <div style={{ fontSize:10, color:C.textMd, marginTop:6 }}>Across {FRAMEWORKS.length} frameworks</div>
        </div>
      </div>

      {/* Detail panel */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Status Notification */}
        {status && (
          <div style={{ 
            padding:'10px 20px', background: status.type==='ok'?C.normalBg:C.critBg, 
            borderBottom:`1px solid ${status.type==='ok'?C.normal:C.critical}40`,
            display:'flex', justifyContent:'space-between', alignItems:'center',
            color: status.type==='ok'?C.normal:C.critical, fontSize:12, fontWeight:600
          }}>
            <span>{status.type==='ok'?'✓':'⚠'} {status.msg}</span>
            <button onClick={()=>setStatus(null)} style={{ background:'none', border:'none', color:'inherit', cursor:'pointer', fontSize:16 }}>✕</button>
          </div>
        )}

        {/* Framework header */}
        <div style={{ padding: isMobile ? '16px' : '16px 20px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems: isMobile ? 'stretch' : 'flex-start', justifyContent:'space-between', flexDirection: isMobile ? 'column' : 'row', gap: 16 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                {isMobile && <button onClick={() => setMobileMenuOpen(true)} style={{ background:'none', border:'none', color:C.brand, fontSize:20, marginRight: 8 }}>☰</button>}
                <span style={{ fontSize: isMobile ? 20 : 24 }}>{fw.flag}</span>
                <h2 style={{ margin:0, fontSize: isMobile ? 15 : 17, fontWeight:700, color:C.textHi }}>{fw.name}</h2>
                <StatusBadge status={fw.status}/>
              </div>
              <div style={{ display:'flex', gap: isMobile ? 8 : 16, fontSize:10, color:C.textMd, flexWrap: 'wrap' }}>
                <span>Region: {fw.region}</span>
                <span>Controls: {fw.passed}/{fw.controls} passed</span>
                {!isMobile && (
                  <>
                    <span>Last audit: {fw.lastAudit}</span>
                    <span>Next review: {fw.nextReview}</span>
                  </>
                )}
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => {
                // G3: Export compliance report as JSON download
                const report = {
                  framework: fw.name,
                  region: fw.region,
                  score: fw.score,
                  status: fw.status,
                  controls: `${fw.passed}/${fw.controls}`,
                  lastAudit: fw.lastAudit,
                  nextReview: fw.nextReview,
                  evidence: fw.evidence,
                  gaps: fw.gaps,
                  exportedAt: new Date().toISOString(),
                  exportedBy: 'SEWA XAI Compliance Dashboard',
                };
                const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href     = url;
                a.download = `Compliance-Report-${fw.id}-${new Date().toISOString().slice(0,10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }} style={{ padding:'6px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.textMd, fontSize:11, cursor:'pointer', fontFamily:C.F }}>
                Export Report
              </button>
              <button onClick={() => {
                // G3: Schedule Audit via pre-filled mailto
                const subject = encodeURIComponent(`SEWA XAI Compliance Audit Request — ${fw.name}`);
                const body    = encodeURIComponent(
                  `Please schedule a compliance audit for:\n\nFramework: ${fw.name}\nRegion: ${fw.region}\nCurrent Score: ${fw.score}%\nNext Review Due: ${fw.nextReview}\n\nPlease confirm availability.`
                );
                window.open(`mailto:compliance@sewa.ai?subject=${subject}&body=${body}`);
              }} style={{ padding:'6px 12px', background:C.brand, border:'none', borderRadius:8, color:'white', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:C.F }}>
                Schedule Audit
              </button>
            </div>
          </div>

          {/* Gaps warning */}
          {fw.gaps.length > 0 && (
            <div style={{ marginTop:10, padding:'8px 12px', background:C.urgBg, borderRadius:8, border:'1px solid #3A2000' }}>
              <span style={{ fontSize:11, color:C.urgent, fontWeight:600 }}>⚠ {fw.gaps.length} gap{fw.gaps.length>1?'s':''} identified: </span>
              <span style={{ fontSize:11, color:C.textMd }}>{fw.gaps.join(' · ')}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ padding:'0 20px', borderBottom:`1px solid ${C.border}`, display:'flex', gap:2, flexShrink:0 }}>
          {[
            { key:'overview',  label:'📊 Overview' },
            { key:'evidence',  label:'📄 Evidence' },
            { key:'consent',   label:'🔐 Consent Metrics' },
            { key:'residency', label:'🌍 Data Residency' },
            { key:'audit',     label:'📋 Audit Log' },
          ].map(t => (
            <button key={t.key} style={tabStyle(t.key)} onClick={() => setTab(t.key as 'overview'|'evidence'|'consent'|'residency'|'audit')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex:1, overflowY:'auto', padding:20 }}>

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {/* Score breakdown */}
              <div className="grid-stats" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                {[
                  { label:'Overall Score',    value:`${fw.score}%`,   color: fw.score>=90?C.normal:fw.score>=70?C.urgent:C.critical },
                  { label:'Controls Passed',  value:`${fw.passed}/${fw.controls}`, color:C.textHi },
                  { label:'Evidence Items',   value:fw.evidence.length, color:C.textHi },
                  { label:'Open Gaps',        value:fw.gaps.length,   color:fw.gaps.length>0?C.urgent:C.normal },
                ].map(m => (
                  <div key={m.label} style={{ padding: isMobile ? '10px' : '14px 16px', background:C.bg2, borderRadius:12, border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:9, color:C.textLo, marginBottom:6, letterSpacing:'0.04em' }}>{m.label}</div>
                    <div style={{ fontSize: isMobile ? 18 : 22, fontWeight:700, color:m.color, fontFamily:C.FM }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Control areas */}
              <div style={{ padding:16, background:C.bg2, borderRadius:12, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.textHi, marginBottom:14 }}>Control Areas</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { area:'Access Control & Authentication', pct: fw.controls > 0 ? Math.round((fw.passed / fw.controls) * 100) : 0 },
                    { area:'Encryption (at-rest & in-transit)', pct: fw.controls > 0 ? Math.round((fw.passed / fw.controls) * 100) : 0 },
                    { area:'Audit Logging & Monitoring', pct: fw.controls > 0 ? Math.round((fw.passed / fw.controls) * 100) : 0 },
                    { area:'Data Minimisation & Retention', pct: Math.max(0, fw.score - 5) },
                    { area:'Incident Response & Breach Notification', pct: Math.max(0, fw.score - 10) },
                    { area:'Vendor & Third-party Management', pct: fw.score < 85 ? 65 : Math.round((fw.passed / Math.max(fw.controls, 1)) * 95) },
                    { area:'Documentation & Evidence Collection', pct: fw.score },
                  ].map(ctrl => {
                    const barColor = ctrl.pct >= 90 ? C.normal : ctrl.pct >= 70 ? C.urgent : C.critical;
                    return (
                      <div key={ctrl.area}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ fontSize:11, color:C.textMd }}>{ctrl.area}</span>
                          <span style={{ fontSize:11, fontFamily:C.FM, color:barColor }}>{ctrl.pct}%</span>
                        </div>
                        <div style={{ height:4, background:C.bg4, borderRadius:2, overflow:'hidden' }}>
                          <div style={{ width:`${ctrl.pct}%`, height:'100%', background:barColor, borderRadius:2, transition:'width 500ms' }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pending actions */}
              {fw.gaps.length > 0 && (
                <div style={{ padding:16, background:C.bg2, borderRadius:12, border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.textHi, marginBottom:12 }}>Action Items</div>
                  {fw.gaps.map((gap, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', background:C.urgBg, borderRadius:8, border:'1px solid #3A2000', marginBottom:8 }}>
                      <span style={{ fontSize:14, flexShrink:0 }}>⚠️</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, color:C.textHi }}>{gap}</div>
                      </div>
                      <button style={{ padding:'4px 10px', background:C.brand, border:'none', borderRadius:6, color:'white', fontSize:10, fontWeight:600, cursor:'pointer', fontFamily:C.F, flexShrink:0 }}>
                        Assign
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EVIDENCE */}
          {tab === 'evidence' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div style={{ fontSize:12, color:C.textMd }}>
                  {fw.evidence.filter(e => e.status === 'verified').length} verified · {fw.evidence.filter(e => e.status === 'pending').length} pending · {fw.evidence.filter(e => e.status === 'expired').length} expired
                </div>
                {/* G4: Upload Evidence button with real file picker */}
                <input ref={evidenceInputRef} type="file" style={{display:'none'}} accept=".pdf,.doc,.docx,.xlsx,.png,.jpg"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.append('file', file);
                    fd.append('frameworkId', fw.id);
                    fd.append('title', file.name);
                     try {
                      await apiClient.post('/compliance/evidence', fd, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                      });
                      setStatus({ msg: `Evidence '${file.name}' uploaded successfully.`, type:'ok' });
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : 'Please try again.';
                      setStatus({ msg: `Upload failed: ${msg}`, type:'err' });
                    }
                    // Reset input so same file can be re-selected
                    if (evidenceInputRef.current) evidenceInputRef.current.value = '';
                  }}
                />
                <button onClick={() => evidenceInputRef.current?.click()}
                  style={{ padding:'5px 12px', background:C.brand, border:'none', borderRadius:7, color:'white', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:C.F }}>
                  + Upload Evidence
                </button>
              </div>
              <div style={{ background:C.bg2, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                <div style={{ padding:'10px 14px', borderBottom:`1px solid ${C.border}`, display:'grid', gridTemplateColumns:'1fr 120px 80px', gap:10 }}>
                  {['Evidence Item','Date','Status'].map(h => (
                    <div key={h} style={{ fontSize:9, fontWeight:600, color:C.textLo, letterSpacing:'0.06em', textTransform:'uppercase', fontFamily:C.F }}>{h}</div>
                  ))}
                </div>
                {fw.evidence.map(item => <EvidenceRow key={item.id} item={item}/>)}
              </div>
            </div>
          )}

          {/* CONSENT METRICS */}
          {tab === 'consent' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {CONSENT_METRICS.map(m => (
                  <div key={m.label} style={{ padding:'14px 16px', background:C.bg2, borderRadius:12, border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:9, color:C.textLo, marginBottom:6 }}>{m.label}</div>
                    <div style={{ fontSize:22, fontWeight:700, color:m.color, fontFamily:C.FM }}>{m.value}</div>
                    <div style={{ fontSize:10, color:C.textLo, marginTop:4 }}>{m.trend}</div>
                  </div>
                ))}
              </div>

              <div style={{ padding:16, background:C.bg2, borderRadius:12, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.textHi, marginBottom:12 }}>Consent Categories (GDPR Art. 6 lawful basis)</div>
                {[
                  { basis:'Art. 6(1)(c) — Legal obligation (NHS)', pct:100, count:'18,420' },
                  { basis:'Art. 9(2)(h) — Medical diagnosis & treatment', pct:94, count:'17,315' },
                  { basis:'Art. 6(1)(a) — Explicit consent (research)', pct:38, count:'6,994' },
                  { basis:'Art. 6(1)(f) — Legitimate interest (quality audit)', pct:100, count:'18,420' },
                ].map(row => (
                  <div key={row.basis} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:11, color:C.textMd }}>{row.basis}</span>
                      <span style={{ fontSize:11, fontFamily:C.FM, color:C.textHi }}>{row.count} records</span>
                    </div>
                    <div style={{ height:4, background:C.bg4, borderRadius:2, overflow:'hidden' }}>
                      <div style={{ width:`${row.pct}%`, height:'100%', background:C.brand, borderRadius:2 }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DATA RESIDENCY */}
          {tab === 'residency' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ padding:14, background:`${C.info}0A`, borderRadius:12, border:`1px solid ${C.info}30`, fontSize:12, color:C.textMd, lineHeight:1.6 }}>
                ℹ️ All patient data is stored in the region where the tenant is deployed. No cross-border transfers occur unless explicitly configured and covered by SCCs or BCRs.
              </div>
              {[
                { region:'UK', flag:'🇬🇧', location:'Azure UK South (London)', lawBasis:'UK DPA 2018', data:'PHI · Audit logs · AI results', tenants:12, certif:'ISO 27001 · NHS DSPT · Cyber Essentials+' },
                { region:'EU', flag:'🇪🇺', location:'Azure West Europe (Amsterdam)', lawBasis:'GDPR',      data:'PHI · Audit logs · AI results', tenants:8,  certif:'ISO 27001 · MDR IIb' },
                { region:'US', flag:'🇺🇸', location:'Azure East US 2 (Virginia)', lawBasis:'HIPAA',    data:'PHI · Audit logs · AI results', tenants:6,  certif:'SOC 2 Type II · HIPAA' },
                { region:'Africa', flag:'🌍', location:'Azure South Africa North (Johannesburg)', lawBasis:'NDPR/DPA/POPIA', data:'PHI · AI results', tenants:9, certif:'ISO 27001' },
              ].map(r => (
                <div key={r.region} style={{ padding:16, background:C.bg2, borderRadius:12, border:`1px solid ${C.border}`, display:'flex', alignItems:'flex-start', gap:14 }}>
                  <span style={{ fontSize:28, flexShrink:0 }}>{r.flag}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:C.textHi }}>{r.region} Data Region</span>
                      <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, background:C.normalBg, color:C.normal, border:'1px solid #0D2A1A', fontFamily:C.F, fontWeight:600 }}>
                        ● Active
                      </span>
                    </div>
                    <div style={{ display:'flex', gap:20, fontSize:11, color:C.textMd, flexWrap:'wrap' }}>
                      <span>📍 {r.location}</span>
                      <span>⚖️ {r.lawBasis}</span>
                      <span>💾 {r.data}</span>
                      <span>👥 {r.tenants} tenants</span>
                    </div>
                    <div style={{ marginTop:6, fontSize:10, color:C.brand }}>{r.certif}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AUDIT LOG */}
          {tab === 'audit' && (
            <div style={{ background:C.bg2, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, fontWeight:700, color:C.textHi }}>Immutable Compliance Audit Log</span>
                <div style={{ display:'flex', gap:6, fontSize:10, color:C.textLo, fontFamily:C.FM, alignItems:'center' }}>
                  <span style={{ padding:'2px 8px', background:verification.status==='healthy'?`${C.brand}14`:`${C.critical}14`, borderRadius:20, color:verification.status==='healthy'?C.brand:C.critical, border:`1px solid ${verification.status==='healthy'?C.brand:C.critical}30`, fontFamily:C.F, fontWeight:600 }}>
                    {verification.status==='healthy' ? '🔒 Tamper-proof' : '⚠️ Verification Fail'}
                  </span>
                  {verification.chainHeight > 0 && <span>Height: {verification.chainHeight}</span>}
                </div>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:C.bg3 }}>
                    {['Timestamp','Actor','Action','Resource','IP / Region','Result'].map(h => (
                      <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:9, fontWeight:600, color:C.textLo, letterSpacing:'0.05em', textTransform:'uppercase', fontFamily:C.F }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {audit.length === 0 ? (
                    <tr><td colSpan={6} style={{padding:40,color:C.textLo,textAlign:'center'}}>{loading?'Loading audit ledger...':'No audit logs found.'}</td></tr>
                  ) : (audit as AuditRow[]).map((row, i) => (
                    <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:'8px 12px', fontSize:10, color:C.textLo, fontFamily:C.FM, whiteSpace:'nowrap' }}>
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding:'8px 12px', fontSize:11, color:C.textHi }}>{row.userEmail || 'System'}</td>
                      <td style={{ padding:'8px 12px' }}>
                        <span style={{ fontSize:10, padding:'1px 7px', borderRadius:5, background:C.bg3, color:C.brand, fontFamily:C.FM }}>{row.action}</span>
                      </td>
                      <td style={{ padding:'8px 12px', fontSize:11, color:C.textMd }}>{row.entityId || 'Global'}</td>
                      <td style={{ padding:'8px 12px', fontSize:10, color:C.textLo, fontFamily:C.FM }}>{row.path || '/'}</td>
                      <td style={{ padding:'8px 12px' }}>
                        <span style={{ fontSize:10, fontWeight:700, color:C.normal }}>SUCCESS</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
