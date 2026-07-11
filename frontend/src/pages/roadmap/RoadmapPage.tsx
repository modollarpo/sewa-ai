// SEWA XAI — RoadmapPage.tsx
// Public-facing internal product roadmap: Q1-Q4 2026, feature voting, release notes

import React, { useState } from 'react';
import { dashboardColors as C } from '../../design-system/tokens';

type Status = 'shipped' | 'in_progress' | 'planned' | 'researching';
type Category = 'ai' | 'clinical' | 'platform' | 'compliance' | 'mobile' | 'integrations';

interface RoadmapItem {
  id: string;
  title: string;
  desc: string;
  status: Status;
  category: Category;
  votes: number;
  quarter: string;
  impact: 'high' | 'medium' | 'low';
}

const STATUS_CFG: Record<Status, { color:string; bg:string; border:string; label:string; icon:string }> = {
  shipped:     { color:C.normal,  bg:C.normalBg,  border:'#0D2A1A', label:'Shipped',    icon:'✅' },
  in_progress: { color:C.info,    bg:C.infoBg,    border:'#152040', label:'In Progress',icon:'🔄' },
  planned:     { color:C.brand,   bg:`${C.brand}12`, border:`${C.brand}30`, label:'Planned', icon:'📅' },
  researching: { color:C.purple,  bg:C.purpleBg,  border:'#3A1A60', label:'Researching',icon:'🔬' },
};

const CAT_CFG: Record<Category, { color:string; label:string; icon:string }> = {
  ai:           { color:C.critical,  label:'AI / ML',        icon:'🧠' },
  clinical:     { color:C.normal,    label:'Clinical',       icon:'🏥' },
  platform:     { color:C.brand,     label:'Platform',       icon:'⚙️' },
  compliance:   { color:C.amber,     label:'Compliance',     icon:'🔒' },
  mobile:       { color:C.info,      label:'Mobile',         icon:'📱' },
  integrations: { color:C.purple,    label:'Integrations',   icon:'🔗' },
};

const ROADMAP: RoadmapItem[] = [
  // Q1 2025 - Q1 2026 (shipped / in progress)
  { id:'r1',  title:'Edge AI (Africa)', desc:'Fully offline SEWA on ruggedised tablets for zero-connectivity environments.', status:'shipped', category:'ai', votes:356, quarter:'Q1 2025', impact:'high' },
  { id:'r2',  title:'Triage AI v2.4', desc:'CT/MRI/XR triage with 98% sensitivity for critical findings — ONNX Runtime, CPU-optimised.', status:'shipped', category:'ai', votes:421, quarter:'Q1 2025', impact:'high' },
  { id:'r3',  title:'Uncertainty Quantification', desc:'AI confidence scores with uncertainty bounds and out-of-distribution detection.', status:'shipped', category:'ai', votes:287, quarter:'Q2 2025', impact:'high' },
  { id:'r4',  title:'VLM Report Generator', desc:'Vision-language model to auto-generate radiology reports from scan findings.', status:'shipped', category:'ai', votes:298, quarter:'Q2 2025', impact:'high' },
  { id:'r5',  title:'Clinical Rules Engine', desc:'Configurable CDS rules for stroke, PE, trauma — auto-alert, order entry, pathway activation.', status:'shipped', category:'clinical', votes:312, quarter:'Q2 2025', impact:'high' },
  { id:'r6',  title:'Federated Learning v1', desc:'Cross-institution model training with ε-DP privacy guarantees.', status:'shipped', category:'ai', votes:167, quarter:'Q2 2025', impact:'high' },
  { id:'r7',  title:'Metacognition Safety Layer', desc:'AI self-monitoring, hallucination detection, and contradiction checks.', status:'shipped', category:'ai', votes:245, quarter:'Q3 2025', impact:'high' },
  { id:'r8',  title:'Continuous Learning Loop', desc:'Radiologist corrections auto-fed to model retraining pipeline with A/B testing.', status:'shipped', category:'ai', votes:198, quarter:'Q3 2025', impact:'high' },
  { id:'r9',  title:'Referral Network', desc:'AI-powered specialist marketplace with secure DICOM sharing and SLA tracking.', status:'shipped', category:'clinical', votes:223, quarter:'Q3 2025', impact:'high' },
  { id:'r10', title:'Population Health Dashboard', desc:'Disease prevalence maps, outbreak detection, and public health data exports.', status:'shipped', category:'platform', votes:178, quarter:'Q4 2025', impact:'high' },
  { id:'r11', title:'Stroke Code Activation', desc:'Auto-activate stroke code on LVO detection with multi-channel alerts.', status:'shipped', category:'clinical', votes:341, quarter:'Q4 2025', impact:'high' },
  { id:'r12', title:'Pathology slide analysis (WSI)', desc:'Whole Slide Image analysis for histopathology — cancer grading, Ki-67, HER2.', status:'shipped', category:'ai', votes:389, quarter:'Q4 2025', impact:'high' },
  { id:'r13', title:'Zero-Knowledge Consent', desc:'Cryptographic consent verification without revealing patient identity.', status:'shipped', category:'compliance', votes:156, quarter:'Q1 2026', impact:'medium' },
  { id:'r14', title:'Multimodal Clinical Fusion', desc:'Fuse imaging with labs, vitals, and EHR data for improved diagnostic accuracy.', status:'shipped', category:'ai', votes:412, quarter:'Q1 2026', impact:'high' },
  { id:'r15', title:'EU AI Act Registration Portal', desc:'Automated submission to the EU AI Act EUDR database for High-Risk AI classification.', status:'in_progress', category:'compliance', votes:142, quarter:'Q1 2026', impact:'high' },
  { id:'r16', title:'VLM Report Generator v1.8', desc:'Improved impression generation with structured DSM-5 / ACR Rad-Lex terminology mapping.', status:'shipped', category:'ai', votes:298, quarter:'Q1 2026', impact:'high' },
  { id:'r17', title:'Multi-tenant billing — Africa region', desc:'Paystack, Flutterwave and M-Pesa payment gateway integration for NG, KE, GH, ZA.', status:'shipped', category:'platform', votes:89, quarter:'Q1 2026', impact:'high' },
  { id:'r18', title:'Doctor mobile app — iOS/Android', desc:'React Native clinical app with scan inbox, voice dictation, and AI report drafts.', status:'in_progress', category:'mobile', votes:214, quarter:'Q1 2026', impact:'high' },
  { id:'r19', title:'Federated Learning Round 50+', desc:'Cross-institution FL training with ε-DP privacy guarantees.', status:'shipped', category:'ai', votes:167, quarter:'Q1 2026', impact:'medium' },
  { id:'r20', title:'DICOM SR structured reports', desc:'Export AI findings as DICOM Structured Reports (SR) for direct PACS archiving.', status:'shipped', category:'integrations', votes:122, quarter:'Q1 2026', impact:'medium' },
  { id:'r21', title:'Radiology Training Simulator', desc:'Gamified training platform with AI feedback and CME credits.', status:'in_progress', category:'clinical', votes:367, quarter:'Q1 2026', impact:'high' },
  { id:'r22', title:'Longitudinal Patient Tracking', desc:'Compare current/historic scans, auto-track lesion growth and RECIST criteria.', status:'shipped', category:'clinical', votes:254, quarter:'Q1 2026', impact:'high' },

  // Q2 2026
  { id:'r23', title:'Prostate MRI (PI-RADS) scoring', desc:'AI-assisted PI-RADS v2.1 scoring for mpMRI with lesion localisation.', status:'shipped', category:'ai', votes:441, quarter:'Q2 2026', impact:'high' },
  { id:'r24', title:'Mammography AI (ACR BI-RADS)', desc:'Automated BI-RADS classification with calcification and mass detection.', status:'shipped', category:'ai', votes:378, quarter:'Q2 2026', impact:'high' },
  { id:'r25', title:'NHS Spine integration', desc:'Direct integration with NHS Spine APIs: PDS, EMIS, SystmOne.', status:'planned', category:'integrations', votes:205, quarter:'Q2 2026', impact:'high' },
  { id:'r26', title:'Second opinion workflow', desc:'Formal second-opinion request system with audit trail, specialist matching and SLA tracking.', status:'shipped', category:'clinical', votes:187, quarter:'Q2 2026', impact:'medium' },
  { id:'r27', title:'Pen testing — CREST certified', desc:'External penetration test for NHS DSPT and Cyber Essentials Plus.', status:'planned', category:'compliance', votes:56, quarter:'Q2 2026', impact:'high' },
  { id:'r28', title:'Ambient Clinical Intelligence', desc:'Real-time voice transcription + gaze tracking for auto-reporting.', status:'shipped', category:'clinical', votes:423, quarter:'Q2 2026', impact:'high' },

  // Q3 2026
  { id:'r29', title:'Retinal fundus AI (DR screening)', desc:'Diabetic retinopathy grading from fundus photographs.', status:'shipped', category:'ai', votes:512, quarter:'Q3 2026', impact:'high' },
  { id:'r30', title:'FDA 510(k) De Novo submission', desc:'Submit De Novo classification request for SEWA XAI as SaMD.', status:'planned', category:'compliance', votes:134, quarter:'Q3 2026', impact:'high' },
  { id:'r31', title:'Natural language query for imaging', desc:'Ask plain English questions about scan findings.', status:'shipped', category:'clinical', votes:445, quarter:'Q3 2026', impact:'medium' },
  { id:'r32', title:'Epic & Cerner EHR deep integration', desc:'Bi-directional Epic FHIR and Cerner Millennium integration.', status:'shipped', category:'integrations', votes:312, quarter:'Q3 2026', impact:'high' },

  // Q4 2026
  { id:'r33', title:'Federated Learning v2 — cross-country', desc:'Secure aggregation across UK, EU, and Africa nodes.', status:'researching', category:'ai', votes:198, quarter:'Q4 2026', impact:'high' },
  { id:'r34', title:'Universal Health ID Integration', desc:'NHS Number, NHIA, NHIF, NIN cross-reference with QR scan support.', status:'shipped', category:'integrations', votes:267, quarter:'Q2 2026', impact:'high' },
  { id:'r35', title:'Population health API', desc:'RESTful API for anonymised health trend exports (surveillance, outbreaks, prevalence).', status:'shipped', category:'platform', votes:143, quarter:'Q2 2026', impact:'medium' },
  { id:'r36', title:'AWS GovCloud deployment', desc:'US federal/VA deployment with FedRAMP authorization.', status:'researching', category:'platform', votes:89, quarter:'Q4 2026', impact:'high' },
];

const QUARTERS = ['Q1 2025','Q2 2025','Q3 2025','Q4 2025','Q1 2026','Q2 2026','Q3 2026','Q4 2026'];
const ALL_CATS: Category[] = ['ai','clinical','platform','compliance','mobile','integrations'];

function StatusBadge({ status }: { status:Status }) {
  const cfg = STATUS_CFG[status];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:20,
      fontSize:10, fontWeight:700, letterSpacing:'0.03em', fontFamily:C.F,
      background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, whiteSpace:'nowrap' }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function ImpactDot({ impact }: { impact:'high'|'medium'|'low' }) {
  const c = impact === 'high' ? C.critical : impact === 'medium' ? C.urgent : C.textLo;
  return (
    <span style={{ fontSize:9, fontWeight:600, color:c, fontFamily:C.F, letterSpacing:'0.04em', textTransform:'uppercase' }}>
      ● {impact} impact
    </span>
  );
}

function RoadmapCard({ item, onVote }: { item:RoadmapItem; onVote:(id:string)=>void }) {
  const cat = CAT_CFG[item.category];
  return (
    <div style={{
      padding:16, background:C.bg2, borderRadius:14, border:`1px solid ${C.border}`,
      transition:'border-color 150ms, transform 150ms',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor=`${C.brand}40`; e.currentTarget.style.transform='translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.transform='none'; }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:10 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:6 }}>
            <StatusBadge status={item.status}/>
            <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background:`${cat.color}14`, color:cat.color, border:`1px solid ${cat.color}30`, fontFamily:C.F, fontWeight:600 }}>
              {cat.icon} {cat.label}
            </span>
            <ImpactDot impact={item.impact}/>
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:C.textHi, marginBottom:5, lineHeight:1.3 }}>{item.title}</div>
          <div style={{ fontSize:12, color:C.textMd, lineHeight:1.55 }}>{item.desc}</div>
        </div>
        {/* Vote button */}
        <button onClick={() => onVote(item.id)} style={{
          display:'flex', flexDirection:'column', alignItems:'center', gap:2,
          padding:'6px 10px', borderRadius:10, border:`1px solid ${C.border}`,
          background:C.bg3, cursor:'pointer', flexShrink:0, transition:'all 120ms',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor=C.brand; e.currentTarget.style.background=`${C.brand}12`; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.bg3; }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth={2.5}>
            <path d="m18 15-6-6-6 6"/>
          </svg>
          <span style={{ fontSize:12, fontWeight:700, color:C.brand, fontFamily:C.FM }}>{item.votes}</span>
        </button>
      </div>
    </div>
  );
}

export function RoadmapPage() {
  const [items, setItems] = useState(ROADMAP);
  const [filterCat, setFilterCat] = useState<Category|'all'>('all');
  const [filterStatus, setFilterStatus] = useState<Status|'all'>('all');
  const [view, setView] = useState<'board'|'list'>('board');

  const handleVote = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, votes: item.votes + 1 } : item));
  };

  const filtered = items.filter(item => {
    if (filterCat !== 'all' && item.category !== filterCat) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    return true;
  });

  const tabStyle = (t:string, active:boolean): React.CSSProperties => ({
    padding:'5px 12px', fontSize:11, fontWeight:active?600:400,
    color:active?C.brand:C.textLo, background:active?`${C.brand}14`:'transparent',
    border:`1px solid ${active?`${C.brand}40`:C.border}`, borderRadius:20,
    cursor:'pointer', fontFamily:C.F, transition:'all 120ms',
  });

  return (
    <div style={{ padding:24, background:C.bg1, minHeight:'calc(100vh - 76px)', fontFamily:C.F }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
          <div>
            <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:C.textHi, letterSpacing:'-0.02em' }}>Product Roadmap</h2>
            <p style={{ margin:'4px 0 0', fontSize:13, color:C.textMd }}>
              SEWA XAI 2026 — {items.filter(i=>i.status==='shipped').length} shipped · {items.filter(i=>i.status==='in_progress').length} in progress · {items.filter(i=>i.status==='planned').length} planned · {items.filter(i=>i.status==='researching').length} researching
            </p>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => setView('board')} style={tabStyle('board', view==='board')}>⊞ Board</button>
            <button onClick={() => setView('list')}  style={tabStyle('list',  view==='list')}>☰ List</button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <button onClick={() => setFilterCat('all')}
            style={{ padding:'4px 12px', fontSize:10, borderRadius:20, border:`1px solid ${filterCat==='all'?C.brand:C.border}`, background:filterCat==='all'?`${C.brand}14`:'transparent', color:filterCat==='all'?C.brand:C.textLo, cursor:'pointer', fontFamily:C.F, fontWeight:filterCat==='all'?600:400 }}>
            All categories
          </button>
          {ALL_CATS.map(cat => {
            const cfg = CAT_CFG[cat];
            const active = filterCat === cat;
            return (
              <button key={cat} onClick={() => setFilterCat(active ? 'all' : cat)}
                style={{ padding:'4px 12px', fontSize:10, borderRadius:20, border:`1px solid ${active?cfg.color:C.border}`, background:active?`${cfg.color}14`:'transparent', color:active?cfg.color:C.textLo, cursor:'pointer', fontFamily:C.F, fontWeight:active?600:400 }}>
                {cfg.icon} {cfg.label}
              </button>
            );
          })}
          <div style={{ width:1, height:20, background:C.border, alignSelf:'center' }}/>
          {(['shipped','in_progress','planned','researching'] as Status[]).map(s => {
            const cfg = STATUS_CFG[s];
            const active = filterStatus === s;
            return (
              <button key={s} onClick={() => setFilterStatus(active ? 'all' : s)}
                style={{ padding:'4px 12px', fontSize:10, borderRadius:20, border:`1px solid ${active?cfg.color:C.border}`, background:active?cfg.bg:'transparent', color:active?cfg.color:C.textLo, cursor:'pointer', fontFamily:C.F, fontWeight:active?600:400 }}>
                {cfg.icon} {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* BOARD VIEW */}
      {view === 'board' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14, alignItems:'start' }}>
          {QUARTERS.map(q => {
            const qItems = filtered.filter(i => i.quarter === q);
            return (
              <div key={q}>
                <div style={{ padding:'8px 12px', marginBottom:10, background:C.bg2, borderRadius:10, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:C.textHi }}>{q}</span>
                  <span style={{ fontSize:10, color:C.textLo, fontFamily:C.FM }}>{qItems.length} items</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {qItems.length === 0 ? (
                    <div style={{ padding:20, textAlign:'center', color:C.textLo, fontSize:11, background:C.bg2, borderRadius:10, border:`1px dashed ${C.border}` }}>
                      No items match filters
                    </div>
                  ) : (
                    qItems.map(item => <RoadmapCard key={item.id} item={item} onVote={handleVote}/>)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {QUARTERS.map(q => {
            const qItems = filtered.filter(i => i.quarter === q);
            if (!qItems.length) return null;
            return (
              <div key={q}>
                <div style={{ fontSize:11, fontWeight:700, color:C.textMd, padding:'10px 0 6px', letterSpacing:'0.04em', textTransform:'uppercase' }}>{q}</div>
                {qItems.map(item => {
                  const cat = CAT_CFG[item.category];
                  return (
                    <div key={item.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:C.bg2, borderRadius:10, border:`1px solid ${C.border}`, marginBottom:4 }}>
                      <StatusBadge status={item.status}/>
                      <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20, background:`${cat.color}14`, color:cat.color, fontFamily:C.F, fontWeight:600, flexShrink:0 }}>
                        {cat.icon} {cat.label}
                      </span>
                      <span style={{ flex:1, fontSize:12, fontWeight:600, color:C.textHi }}>{item.title}</span>
                      <span style={{ fontSize:11, color:C.textMd, maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.desc}</span>
                      <ImpactDot impact={item.impact}/>
                      <button onClick={() => handleVote(item.id)}
                        style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:7, border:`1px solid ${C.border}`, background:'transparent', color:C.brand, fontSize:11, cursor:'pointer', fontFamily:C.FM, flexShrink:0 }}>
                        ▲ {item.votes}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom note */}
      <div style={{ marginTop:28, padding:'12px 16px', background:C.bg2, borderRadius:10, border:`1px solid ${C.border}`, fontSize:11, color:C.textLo, lineHeight:1.6 }}>
        📌 Roadmap items are subject to change. Voting influences prioritisation. For urgent feature requests or enterprise commitments, contact <span style={{ color:C.brand }}>product@sewaxai.health</span> · Roadmap last updated: {new Date().toLocaleDateString('en-GB', { year:'numeric', month:'long', day:'numeric' })}
      </div>
    </div>
  );
}
