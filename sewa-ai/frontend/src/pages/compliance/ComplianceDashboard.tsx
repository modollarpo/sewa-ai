// SEWA AI — ComplianceDashboard.tsx
// Regulatory compliance centre: GDPR, HIPAA, NHS DSPT, EU MDR IIb,
// FDA 510(k), EU AI Act High-Risk — evidence tracker, consent metrics, audit log

import React, { useState } from 'react';
import { useComplianceData } from '../../hooks/useDashboardData';

const C = {
  bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A', bg4:'#162821',
  brand:'#408D7B', brandLt:'#52B09A', brandDk:'#2E6B5E',
  critical:'#E03535', critBg:'#2A0A0A',
  urgent:'#E08A20',   urgBg:'#2A1800',
  normal:'#1DBF73',   normalBg:'#0A1F14',
  info:'#2A6EF2',     infoBg:'#0A1530',
  purple:'#8B5CF6',   purpleBg:'#1A0A30',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028',
  F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

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
    status: 'compliant', score: 96, lastAudit: '10 Jan 2026', nextReview: '10 Jan 2027',
    controls: 114, passed: 110,
    evidence: [
      { id:'e1', title:'Data Protection Impact Assessment (DPIA)',     type:'doc',    status:'verified', date:'05 Jan 2026' },
      { id:'e2', title:'Records of Processing Activities (RoPA)',      type:'doc',    status:'verified', date:'06 Jan 2026' },
      { id:'e3', title:'Consent Management System — Audit Report',     type:'test',   status:'verified', date:'08 Jan 2026' },
      { id:'e4', title:'Right to Erasure (Art 17) — Automated Tests',  type:'test',   status:'verified', date:'09 Jan 2026' },
      { id:'e5', title:'Data Breach Response Plan',                    type:'policy', status:'verified', date:'03 Jan 2026' },
      { id:'e6', title:'DPO Appointment Letter',                       type:'doc',    status:'verified', date:'01 Jan 2026' },
      { id:'e7', title:'Cross-border transfer SCCs',                   type:'doc',    status:'pending',  date:'—' },
    ],
    gaps: ['Standard Contractual Clauses for US data transfers pending legal sign-off'],
  },
  {
    id: 'hipaa', name: 'HIPAA Security Rule', flag: '🇺🇸', region: 'North America',
    status: 'compliant', score: 98, lastAudit: '15 Dec 2025', nextReview: '15 Dec 2026',
    controls: 75, passed: 74,
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
    status: 'in_progress', score: 82, lastAudit: '01 Mar 2026', nextReview: '30 Jun 2026',
    controls: 42, passed: 35,
    evidence: [
      { id:'n1', title:'IG training completion — 100% staff',         type:'cert',   status:'verified', date:'15 Feb 2026' },
      { id:'n2', title:'Data flow mapping — NHS data assets',         type:'doc',    status:'verified', date:'20 Feb 2026' },
      { id:'n3', title:'Penetration test — external CREST-certified', type:'test',   status:'pending',  date:'Scheduled Apr 2026' },
      { id:'n4', title:'Cyber Essentials Plus certification',          type:'cert',   status:'pending',  date:'Scheduled Apr 2026' },
      { id:'n5', title:'Data Security Policy v3.1',                   type:'policy', status:'verified', date:'01 Feb 2026' },
    ],
    gaps: ['Penetration test pending (scheduled Q2)', 'Cyber Essentials Plus renewal due'],
  },
  {
    id: 'mdr', name: 'EU MDR Annex IIb — Class IIb SaMD', flag: '🔬', region: 'European Union',
    status: 'in_progress', score: 74, lastAudit: '01 Feb 2026', nextReview: '01 Aug 2026',
    controls: 61, passed: 45,
    evidence: [
      { id:'m1', title:'Clinical Evaluation Report (CER) v2.1',      type:'doc',  status:'verified', date:'15 Jan 2026' },
      { id:'m2', title:'Post-Market Clinical Follow-Up (PMCF) plan', type:'doc',  status:'verified', date:'20 Jan 2026' },
      { id:'m3', title:'ISO 14971 Risk Management file',             type:'doc',  status:'verified', date:'10 Jan 2026' },
      { id:'m4', title:'IEC 62304 Software Lifecycle documentation', type:'doc',  status:'pending',  date:'In progress' },
      { id:'m5', title:'Notified Body (NB) audit — TÜV SÜD',        type:'cert', status:'pending',  date:'Scheduled Jun 2026' },
    ],
    gaps: ['IEC 62304 SLC documentation in progress', 'Notified Body audit scheduled Q2'],
  },
  {
    id: 'fda', name: 'FDA 510(k) — AI/ML SaMD', flag: '💊', region: 'North America',
    status: 'in_progress', score: 68, lastAudit: '—', nextReview: 'Q3 2026',
    controls: 48, passed: 33,
    evidence: [
      { id:'f1', title:'Predetermined Change Control Plan (PCCP)',    type:'doc',  status:'verified', date:'01 Feb 2026' },
      { id:'f2', title:'SaMD Pre-Sub meeting — FDA response',        type:'doc',  status:'verified', date:'15 Feb 2026' },
      { id:'f3', title:'Algorithm performance validation dataset',   type:'test', status:'pending',  date:'In progress' },
      { id:'f4', title:'De Novo classification request',             type:'doc',  status:'pending',  date:'Planned Q2' },
    ],
    gaps: ['Validation dataset compilation in progress', 'De Novo request planned Q2 2026'],
  },
  {
    id: 'euaiact', name: 'EU AI Act — High-Risk AI System', flag: '🤖', region: 'European Union',
    status: 'in_progress', score: 71, lastAudit: '01 Mar 2026', nextReview: '01 Sep 2026',
    controls: 38, passed: 27,
    evidence: [
      { id:'a1', title:'Conformity Assessment — self-assessment',    type:'doc',  status:'verified', date:'20 Feb 2026' },
      { id:'a2', title:'Human oversight mechanism documentation',    type:'doc',  status:'verified', date:'22 Feb 2026' },
      { id:'a3', title:'Transparency & explainability report',       type:'doc',  status:'verified', date:'24 Feb 2026' },
      { id:'a4', title:'Bias testing across demographics',           type:'test', status:'verified', date:'26 Feb 2026' },
      { id:'a5', title:'EU AI Act registration (EUDR)',              type:'cert', status:'pending',  date:'Planned Apr 2026' },
    ],
    gaps: ['EU AI Act registration portal submission planned Q2'],
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

const CONSENT_METRICS = [
  { label:'Total consent records',    value:'18,420', trend:'+142 today', color:C.textHi },
  { label:'Opt-out requests (Art 21)',value:'34',     trend:'0 unresolved', color:C.normal },
  { label:'Erasure requests (Art 17)',value:'12',     trend:'All resolved <30d', color:C.normal },
  { label:'Access requests (Art 15)', value:'67',     trend:'3 pending <30d', color:C.urgent },
  { label:'Data portability (Art 20)',value:'8',      trend:'All fulfilled', color:C.normal },
  { label:'Consent withdrawn',        value:'29',     trend:'Processing stopped', color:C.brand },
];

export function ComplianceDashboard() {
  const { audit, verification, loading } = useComplianceData();
  const [selected, setSelected] = useState<string>('gdpr');
  const [tab, setTab] = useState<'overview'|'evidence'|'consent'|'residency'|'audit'>('overview');
  const fw = FRAMEWORKS.find(f => f.id === selected) ?? FRAMEWORKS[0];

  const tabStyle = (t:string): React.CSSProperties => ({
    padding:'7px 14px', fontSize:11, fontWeight:tab===t?600:400,
    color:tab===t?C.brand:C.textLo, background:'none', border:'none',
    borderBottom:`2px solid ${tab===t?C.brand:'transparent'}`,
    marginBottom:'-1px', cursor:'pointer', fontFamily:C.F, whiteSpace:'nowrap',
  });

  const overallScore = Math.round(FRAMEWORKS.reduce((s,f) => s + f.score, 0) / FRAMEWORKS.length);
  const compliantCount = FRAMEWORKS.filter(f => f.status === 'compliant').length;

  return (
    <div style={{ display:'flex', height:'calc(100vh - 76px)', fontFamily:C.F, background:C.bg1, overflow:'hidden' }}>

      {/* Framework selector sidebar */}
      <div style={{ width:240, flexShrink:0, borderRight:`1px solid ${C.border}`, overflowY:'auto', padding:'12px 8px' }}>
        <div style={{ padding:'6px 10px', marginBottom:8 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.textHi, marginBottom:2 }}>Compliance Status</div>
          <div style={{ fontSize:10, color:C.textLo }}>
            {compliantCount}/{FRAMEWORKS.length} frameworks compliant
          </div>
        </div>

        {FRAMEWORKS.map(f => {
          const cfg = STATUS_CFG[f.status];
          return (
            <button key={f.id} onClick={() => setSelected(f.id)} style={{
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

        {/* Framework header */}
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                <span style={{ fontSize:24 }}>{fw.flag}</span>
                <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:C.textHi }}>{fw.name}</h2>
                <StatusBadge status={fw.status}/>
              </div>
              <div style={{ display:'flex', gap:16, fontSize:11, color:C.textMd }}>
                <span>Region: {fw.region}</span>
                <span>Controls: {fw.passed}/{fw.controls} passed</span>
                <span>Last audit: {fw.lastAudit}</span>
                <span>Next review: {fw.nextReview}</span>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ padding:'6px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.textMd, fontSize:11, cursor:'pointer', fontFamily:C.F }}>
                Export Report
              </button>
              <button style={{ padding:'6px 12px', background:C.brand, border:'none', borderRadius:8, color:'white', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:C.F }}>
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
            <button key={t.key} style={tabStyle(t.key)} onClick={() => setTab(t.key as any)}>
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
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                {[
                  { label:'Overall Score',    value:`${fw.score}%`,   color: fw.score>=90?C.normal:fw.score>=70?C.urgent:C.critical },
                  { label:'Controls Passed',  value:`${fw.passed}/${fw.controls}`, color:C.textHi },
                  { label:'Evidence Items',   value:fw.evidence.length, color:C.textHi },
                  { label:'Open Gaps',        value:fw.gaps.length,   color:fw.gaps.length>0?C.urgent:C.normal },
                ].map(m => (
                  <div key={m.label} style={{ padding:'14px 16px', background:C.bg2, borderRadius:12, border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:9, color:C.textLo, marginBottom:6, letterSpacing:'0.04em' }}>{m.label}</div>
                    <div style={{ fontSize:22, fontWeight:700, color:m.color, fontFamily:C.FM }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Control areas */}
              <div style={{ padding:16, background:C.bg2, borderRadius:12, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.textHi, marginBottom:14 }}>Control Areas</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { area:'Access Control & Authentication', pct:100 },
                    { area:'Encryption (at-rest & in-transit)', pct:100 },
                    { area:'Audit Logging & Monitoring', pct:100 },
                    { area:'Data Minimisation & Retention', pct:95 },
                    { area:'Incident Response & Breach Notification', pct:90 },
                    { area:'Vendor & Third-party Management', pct:fw.score < 85 ? 65 : 88 },
                    { area:'Documentation & Evidence Collection', pct:fw.score },
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
                  {fw.evidence.filter(e=>e.status==='verified').length} verified · {fw.evidence.filter(e=>e.status==='pending').length} pending · {fw.evidence.filter(e=>e.status==='expired').length} expired
                </div>
                <button style={{ padding:'5px 12px', background:C.brand, border:'none', borderRadius:7, color:'white', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:C.F }}>
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
                  ) : audit.map((row:any, i:number) => (
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
