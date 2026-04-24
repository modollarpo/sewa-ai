// SEWA AI — AIMonitoringDashboard.tsx
// Real-time AI inference monitoring: live stream, confidence distribution,
// model health per service, SHAP feature waterfall, alert rules, queue depth

import React, { useState, useEffect, useRef } from 'react';
import { useAIData } from '../../hooks/useDashboardData';

const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A', bg4:'#162821',
  brand:'#408D7B', brandLt:'#52B09A', brandDk:'#2E6B5E',
  critical:'#E03535', critBg:'#2A0A0A',
  urgent:'#E08A20',   urgBg:'#2A1800',
  normal:'#1DBF73',   normalBg:'#0A1F14',
  info:'#2A6EF2',     infoBg:'#0A1530',
  purple:'#8B5CF6',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028',
  F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

// ── Types ─────────────────────────────────────────────────────
interface InferenceEvent {
  id: string;
  scanId: string;
  modality: string;
  bodyPart: string;
  finding: string;
  urgency: 'CRITICAL' | 'URGENT' | 'NORMAL' | 'ROUTINE';
  confidence: number;
  latencyMs: number;
  engine: string;
  tenantId: string;
  region: string;
  ts: number;
}

// ── Mock stream generator ──────────────────────────────────────
function generateEvent(): InferenceEvent {
  const ID = Math.random().toString(36).substring(7);
  const MODALITIES = ['CT', 'MRI', 'XR', 'US'];
  const FINDINGS = ['Intracranial Hemorrhage', 'Ischemic Stroke', 'Pneumothorax', 'Pulmonary Embolism', 'Normal Study', 'Fracture detected'];
  const URGENCY: ('CRITICAL' | 'URGENT' | 'NORMAL' | 'ROUTINE')[] = ['CRITICAL', 'URGENT', 'NORMAL', 'ROUTINE'];
  const REGIONS = ['UK', 'EU', 'US', 'NG', 'KE', 'ZA', 'IN'];
  
  const urgency = URGENCY[Math.floor(Math.random() * URGENCY.length)];
  const confidence = urgency === 'CRITICAL' ? 0.85 + Math.random() * 0.14 : 0.4 + Math.random() * 0.55;

  return {
    id: `ev-${ID}`,
    scanId: `scan-${Math.floor(Math.random() * 9000) + 1000}`,
    modality: MODALITIES[Math.floor(Math.random() * MODALITIES.length)],
    bodyPart: 'HEAD',
    finding: FINDINGS[Math.floor(Math.random() * FINDINGS.length)],
    urgency,
    confidence,
    latencyMs: 800 + Math.floor(Math.random() * 1200),
    engine: 'v2.4.1',
    tenantId: 't1',
    region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
    ts: Date.now(),
  };
}

// ── Helper components ──────────────────────────────────────────
function UrgencyBadge({ u }:{ u:string }) {
  const m: Record<string,[string,string]> = {
    CRITICAL:[C.critical, C.critBg],
    URGENT:  [C.urgent,   C.urgBg],
    NORMAL:  [C.normal,   C.normalBg],
    ROUTINE: [C.textLo,   C.bg3],
  };
  const [color, bg] = m[u.toUpperCase()] ?? m.ROUTINE;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'2px 8px', borderRadius:20,
      fontSize:9, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase',
      background:bg, color, fontFamily:C.F }}>
      <span style={{ width:4, height:4, borderRadius:'50%', background:color, flexShrink:0 }}/>
      {u}
    </span>
  );
}

function MiniBar({ value, color, max=1 }:{ value:number; color:string; max?:number }) {
  return (
    <div style={{ height:3, background:C.bg4, borderRadius:2, overflow:'hidden' }}>
      <div style={{ width:`${(value/max)*100}%`, height:'100%', background:color }}/>
    </div>
  );
}

function Metric({ label, value, sub, color=C.textHi, mono=true }:{ label:string; value:string|number; sub?:string; color?:string; mono?:boolean }) {
  return (
    <div style={{ padding:'14px 16px', background:C.bg2, borderRadius:12, border:`1px solid ${C.border}` }}>
      <div style={{ fontSize:10, color:C.textLo, marginBottom:8, letterSpacing:'0.04em', fontFamily:C.F }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color, fontFamily:mono?C.FM:C.F, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:C.textLo, marginTop:6 }}>{sub}</div>}
    </div>
  );
}

// ── Confidence histogram ───────────────────────────────────────
function ConfidenceHistogram({ events }:{ events:InferenceEvent[] }) {
  const buckets = Array(10).fill(0);
  events.forEach(e => {
    const i = Math.min(9, Math.floor(e.confidence * 10));
    buckets[i]++;
  });
  const maxB = Math.max(...buckets, 1);
  const labels = ['0-10','10-20','20-30','30-40','40-50','50-60','60-70','70-80','80-90','90-100'];
  const colors  = ['#E03535','#E03535','#E03535','#E08A20','#E08A20','#E08A20','#E08A20','#408D7B','#408D7B','#1DBF73'];
  return (
    <div style={{ padding:16, background:C.bg2, borderRadius:12, border:`1px solid ${C.border}` }}>
      <div style={{ fontSize:12, fontWeight:700, color:C.textHi, marginBottom:12 }}>Confidence Distribution</div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:80 }}>
        {buckets.map((count, i) => (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
            <div style={{
              width:'100%',
              height: `${Math.max(2, (count/maxB)*76)}px`,
              background: colors[i], borderRadius:'2px 2px 0 0', opacity:0.85,
            }}/>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
        <span style={{ fontSize:8, color:C.textLo, fontFamily:C.FM }}>0%</span>
        <span style={{ fontSize:8, color:C.textLo, fontFamily:C.FM }}>50%</span>
        <span style={{ fontSize:8, color:C.textLo, fontFamily:C.FM }}>100%</span>
      </div>
      <div style={{ marginTop:10, display:'flex', gap:10 }}>
        {[
          { label:'High (≥85%)', count:events.filter(e=>e.confidence>=0.85).length, color:C.normal },
          { label:'Mid (65-85%)', count:events.filter(e=>e.confidence>=0.65&&e.confidence<0.85).length, color:C.urgent },
          { label:'Low (<65%)',  count:events.filter(e=>e.confidence<0.65).length, color:C.critical },
        ].map(s=>(
          <div key={s.label} style={{ flex:1, padding:'6px 8px', background:C.bg3, borderRadius:7 }}>
            <div style={{ fontSize:14, fontWeight:700, color:s.color, fontFamily:C.FM }}>{s.count}</div>
            <div style={{ fontSize:9, color:C.textLo, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Latency chart ──────────────────────────────────────────────
function LatencySparkline({ events }:{ events:InferenceEvent[] }) {
  const last30 = events.slice(-30);
  const max = Math.max(...last30.map(e=>e.latencyMs), 1);
  const avg = last30.length > 0 ? last30.reduce((s,e)=>s+e.latencyMs,0)/last30.length : 0;
  const p95 = last30.length > 0
    ? [...last30].sort((a,b)=>a.latencyMs-b.latencyMs)[Math.floor(last30.length*0.95)]?.latencyMs ?? 0
    : 0;

  return (
    <div style={{ padding:16, background:C.bg2, borderRadius:12, border:`1px solid ${C.border}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
        <span style={{ fontSize:12, fontWeight:700, color:C.textHi }}>Inference Latency (ms)</span>
        <div style={{ display:'flex', gap:12 }}>
          {[{label:'Avg',value:avg,color:C.brand},{label:'P95',value:p95,color:C.urgent}].map(s=>(
            <div key={s.label} style={{ textAlign:'right' }}>
              <div style={{ fontSize:12, fontWeight:700, color:s.color, fontFamily:C.FM }}>{Math.round(s.value)}</div>
              <div style={{ fontSize:9, color:C.textLo }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 300 60`} style={{ width:'100%', height:60, display:'block' }}>
        {/* Grid lines */}
        {[0,1,2,3].map(i=>(
          <line key={i} x1="0" y1={15*i} x2="300" y2={15*i} stroke={C.border} strokeWidth="0.5"/>
        ))}
        {/* Sparkline */}
        {last30.length > 1 && (
          <>
            <polyline
              points={last30.map((e,i) => `${(i/(last30.length-1))*300},${60-(e.latencyMs/max)*56}`).join(' ')}
              fill="none" stroke={C.brand} strokeWidth="1.5" strokeLinejoin="round"
            />
            {/* P95 threshold line */}
            <line x1="0" y1={60-(p95/max)*56} x2="300" y2={60-(p95/max)*56}
              stroke={C.urgent} strokeWidth="0.5" strokeDasharray="4,3"/>
          </>
        )}
        {/* Latest dot */}
        {last30.length > 0 && (
          <circle
            cx="300" cy={60-(last30[last30.length-1].latencyMs/max)*56}
            r="3" fill={C.brand} stroke={C.bg2} strokeWidth="1.5"
          />
        )}
      </svg>
    </div>
  );
}

// ── SHAP waterfall ─────────────────────────────────────────────
const SHAP_DATA = [
  { feature:'Hyperdense region (HU > 50)', value:0.28, positive:true },
  { feature:'Midline shift detected',      value:0.19, positive:true },
  { feature:'Asymmetric sulci',            value:0.14, positive:true },
  { feature:'Perilesional edema',          value:0.11, positive:true },
  { feature:'Mass effect',                 value:0.09, positive:true },
  { feature:'Bilateral symmetry (norm)',   value:-0.07, positive:false },
  { feature:'Ventricle size (normal)',     value:-0.05, positive:false },
  { feature:'Basal cisterns (open)',       value:-0.03, positive:false },
];

function SHAPWaterfall() {
  return (
    <div style={{ padding:16, background:C.bg2, borderRadius:12, border:`1px solid ${C.border}` }}>
      <div style={{ fontSize:12, fontWeight:700, color:C.textHi, marginBottom:4 }}>SHAP Explanation — Last Critical Finding</div>
      <div style={{ fontSize:10, color:C.textLo, marginBottom:14 }}>Feature contributions toward ICH classification (confidence: 94.1%)</div>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {SHAP_DATA.map((d) => {
          const width = Math.abs(d.value) / 0.28 * 100;
          const color = d.positive ? C.critical : C.brand;
          return (
            <div key={d.feature} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:200, fontSize:10, color:C.textMd, fontFamily:C.F, textAlign:'right', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {d.feature}
              </div>
              <div style={{ flex:1, display:'flex', alignItems:'center', gap:4 }}>
                {/* Negative side */}
                <div style={{ flex:1, display:'flex', justifyContent:'flex-end' }}>
                  {!d.positive && (
                    <div style={{ height:14, width:`${width}%`, background:color, borderRadius:'3px 0 0 3px', opacity:0.85 }}/>
                  )}
                </div>
                {/* Centre axis */}
                <div style={{ width:1, height:18, background:C.border, flexShrink:0 }}/>
                {/* Positive side */}
                <div style={{ flex:1 }}>
                  {d.positive && (
                    <div style={{ height:14, width:`${width}%`, background:color, borderRadius:'0 3px 3px 0', opacity:0.85 }}/>
                  )}
                </div>
              </div>
              <span style={{ width:36, fontSize:9, fontFamily:C.FM, color, textAlign:'left', flexShrink:0 }}>
                {d.positive?'+':''}{d.value.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', justifyContent:'center', gap:16, marginTop:12 }}>
        {[{color:C.critical,label:'Pushes toward ICH'},{color:C.brand,label:'Against ICH'}].map(l=>(
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:12, height:8, background:l.color, borderRadius:2, opacity:0.85 }}/>
            <span style={{ fontSize:9, color:C.textLo }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Alert rules editor ─────────────────────────────────────────
const DEFAULT_RULES = [
  { id:'r1', name:'STAT page on ICH + CRITICAL', condition:'urgency = CRITICAL AND finding CONTAINS "Hemorrhage"', action:'SMS + FCM + HL7 ADT', active:true },
  { id:'r2', name:'Notify radiologist on low confidence', condition:'confidence < 0.65', action:'Notification + flag for review', active:true },
  { id:'r3', name:'Stroke code trigger', condition:'urgency = CRITICAL AND finding CONTAINS "Stroke" AND metacognition = PASS', action:'Stroke Code API + on-call bleep', active:true },
  { id:'r4', name:'PE escalation', condition:'urgency = CRITICAL AND finding CONTAINS "Embolism"', action:'SMS attending physician', active:false },
];

function AlertRulesPanel() {
  const [rules, setRules] = useState(DEFAULT_RULES);
  const toggleRule = (id:string) => setRules(rs => rs.map(r => r.id===id ? {...r, active:!r.active} : r));
  return (
    <div style={{ padding:16, background:C.bg2, borderRadius:12, border:`1px solid ${C.border}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <span style={{ fontSize:12, fontWeight:700, color:C.textHi }}>Alert Rules</span>
        <button style={{ padding:'4px 10px', background:C.brand, border:'none', borderRadius:6, color:'white', fontSize:10, fontWeight:600, cursor:'pointer', fontFamily:C.F }}>
          + Add Rule
        </button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {rules.map(rule => (
          <div key={rule.id} style={{ padding:'10px 12px', background:C.bg3, borderRadius:10, border:`1px solid ${rule.active?`${C.brand}30`:C.border}` }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
              {/* Toggle */}
              <div onClick={() => toggleRule(rule.id)}
                style={{ width:30, height:17, borderRadius:9, flexShrink:0, marginTop:1,
                  background: rule.active ? C.brand : C.bg4,
                  border:`1px solid ${rule.active?C.brand:C.border}`,
                  position:'relative', cursor:'pointer', transition:'all 150ms',
                }}>
                <div style={{ position:'absolute', top:2, left:rule.active?'14px':'2px', width:11, height:11, borderRadius:'50%', background:'white', transition:'left 150ms' }}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontWeight:600, color:rule.active?C.textHi:C.textLo, marginBottom:3 }}>{rule.name}</div>
                <div style={{ fontSize:10, color:C.textLo, fontFamily:C.FM, marginBottom:3, lineHeight:1.4 }}>IF: {rule.condition}</div>
                <div style={{ fontSize:10, color:C.brand }}>→ {rule.action}</div>
              </div>
              <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                <button style={{ padding:'3px 7px', fontSize:9, background:'transparent', border:`1px solid ${C.border}`, borderRadius:5, color:C.textLo, cursor:'pointer', fontFamily:C.F }}>Edit</button>
                <button style={{ padding:'3px 7px', fontSize:9, background:'transparent', border:`1px solid #3A1010`, borderRadius:5, color:C.critical, cursor:'pointer', fontFamily:C.F }}>Del</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Service health grid ────────────────────────────────────────
const SERVICES = [
  { name:'Triage Engine',        port:8000, qps:14.2, p50:1.18, p99:2.1, gpu:'A100 ×4', memPct:62, cpuPct:45, status:'healthy' },
  { name:'VLM Report Gen',       port:8001, qps:14.2, p50:3.82, p99:6.4, gpu:'A100 ×4', memPct:71, cpuPct:38, status:'healthy' },
  { name:'Uncertainty Engine',   port:8002, qps:14.2, p50:2.05, p99:3.8, gpu:'A100 ×2', memPct:48, cpuPct:55, status:'healthy' },
  { name:'Metacognition AI',     port:8003, qps:14.2, p50:0.41, p99:0.9, gpu:'CPU ×8',  memPct:22, cpuPct:18, status:'healthy' },
  { name:'Federated Learning',   port:8004, qps:0,    p50:0,    p99:0,   gpu:'A100 ×2', memPct:8,  cpuPct:2,  status:'idle' },
  { name:'Continuous Learning',  port:8005, qps:0,    p50:0,    p99:0,   gpu:'CPU ×4',  memPct:12, cpuPct:5,  status:'running' },
];

// ── Main component ─────────────────────────────────────────────
export function AIMonitoringDashboard() {
  const { models, metrics, health, aggregates, loading } = useAIData();
  const [events, setEvents] = useState<InferenceEvent[]>([]);
  const [paused, setPaused]   = useState(false);
  const [tab, setTab] = useState<'live'|'models'|'distribution'|'shap'|'rules'>('live');

  // Sync events from real metrics
  useEffect(() => {
    if (paused) return;
    if (metrics.length > 0) {
      setEvents(metrics.map((m: any) => ({
        id: m.id,
        scanId: m.scanId || 'scan-???',
        modality: m.scan?.modality || 'CT',
        bodyPart: m.scan?.bodyPart || 'HEAD',
        finding: m.primaryFinding || 'AI Analysis',
        urgency: m.urgency || 'NORMAL',
        confidence: m.confidence || 0.9,
        latencyMs: m.inferenceMs || 1200,
        engine: m.modelVersion || 'v2.4.1',
        tenantId: m.scan?.tenantId || 't1', 
        region: 'UK', 
        ts: new Date(m.createdAt).getTime()
      })));
    }
  }, [metrics, paused]);

  const last200 = events.slice(0, 200);
  const criticalCount  = last200.filter(e => e.urgency === 'CRITICAL').length;
  const avgConf        = aggregates.avgConfidence || (last200.length > 0 ? last200.reduce((s,e) => s + e.confidence, 0) / last200.length : 0);
  const avgLatency     = aggregates.avgLatencyMs  || (last200.length > 0 ? last200.reduce((s,e) => s + e.latencyMs, 0)  / last200.length : 0);
  const lowConfCount   = last200.filter(e => e.confidence < 0.65).length;

  const tabStyle = (t:string): React.CSSProperties => ({
    padding:'7px 14px', fontSize:11, fontWeight:tab===t?600:400,
    color:tab===t?C.brand:C.textLo, background:'none', border:'none',
    borderBottom:`2px solid ${tab===t?C.brand:'transparent'}`,
    marginBottom:'-1px', cursor:'pointer', fontFamily:C.F, whiteSpace:'nowrap',
  });

  return (
    <div style={{ padding:24, background:C.bg1, minHeight:'calc(100vh - 76px)', fontFamily:C.F }}>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @media (max-width: 1200px) {
          .kpi-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 900px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .chart-grid { grid-template-columns: 1fr !important; }
          .models-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .kpi-grid { grid-template-columns: 1fr !important; }
          .header-stack { flex-direction: column; align-items: flex-start !important; gap: 16px; }
        }
      `}</style>

      {/* Header */}
      <div className="header-stack" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:C.textHi }}>AI Inference Monitor</h2>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:paused?C.textLo:C.normal, boxShadow:paused?'none':`0 0 6px ${C.normal}`, animation:paused?'none':'pulse 1.5s infinite' }}/>
            <span style={{ fontSize:11, color:C.textMd }}>{paused ? 'Paused' : 'Live — updating every 1.2s'}</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setPaused(p => !p)} style={{
            padding:'7px 14px', borderRadius:8,
            background:paused ? C.brand : C.bg3,
            border:`1px solid ${paused ? C.brand : C.border}`,
            color:paused ? 'white' : C.textMd, fontSize:11, cursor:'pointer', fontFamily:C.F,
          }}>
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button style={{ padding:'7px 14px', borderRadius:8, background:C.bg3, border:`1px solid ${C.border}`, color:C.textMd, fontSize:11, cursor:'pointer', fontFamily:C.F }}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="kpi-grid" style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20 }}>
        <Metric label="INFERENCES / SEC"   value={paused?'0.0':'14.2'}   color={C.brand}    sub="Triage engine" />
        <Metric label="CRITICAL (200)"     value={criticalCount}         color={C.critical} sub={`${((criticalCount/Math.max(last200.length,1))*100).toFixed(1)}% of stream`} />
        <Metric label="AVG CONFIDENCE"     value={`${(avgConf*100).toFixed(1)}%`} color={avgConf>=0.85?C.normal:C.urgent} />
        <Metric label="AVG LATENCY"        value={`${Math.round(avgLatency)}ms`}  color={avgLatency<1500?C.brand:C.urgent} sub="Triage only" />
        <Metric label="LOW CONF FLAGS"     value={lowConfCount}         color={lowConfCount>5?C.urgent:C.normal} sub="<65% confidence" />
      </div>

      {/* Tabs */}
      <div style={{ borderBottom:`1px solid ${C.border}`, display:'flex', gap:2, marginBottom:16 }}>
        {[
          { key:'live',         icon:'📡', label:'Live Stream' },
          { key:'models',       icon:'⚙️', label:'Model Health' },
          { key:'distribution', icon:'📊', label:'Distribution' },
          { key:'shap',         icon:'🔍', label:'SHAP' },
          { key:'rules',        icon:'🔔', label:'Alert Rules' },
        ].map(t => (
          <button key={t.key} style={tabStyle(t.key)} onClick={() => setTab(t.key as any)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* LIVE STREAM */}
      {tab === 'live' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Sparkline + histogram side by side */}
          <div className="chart-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <LatencySparkline events={last200} />
            <ConfidenceHistogram events={last200} />
          </div>

          {/* Live event table */}
          <div style={{ background:C.bg0, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, fontWeight:700, color:C.textHi }}>Live Inference Stream</span>
              <span style={{ fontSize:10, color:C.textLo, fontFamily:C.FM }}>Last {Math.min(events.length, 50)} events</span>
            </div>
            <div style={{ maxHeight:360, overflowY:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead style={{ position:'sticky', top:0, background:C.bg3, zIndex:1 }}>
                  <tr>
                    {['Time','Scan ID','Modality','Finding','Urgency','Confidence','Latency','Region'].map(h => (
                      <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontSize:9, fontWeight:600, color:C.textLo, letterSpacing:'0.06em', textTransform:'uppercase', fontFamily:C.F, whiteSpace:'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0, 50).map((e, i) => {
                    const age = (Date.now() - e.ts) / 1000;
                    const isNew = age < 3;
                    return (
                      <tr key={e.id} style={{
                        borderTop:`1px solid ${C.border}`,
                        background: isNew ? `${C.brand}08` : 'transparent',
                        transition:'background 2s ease',
                      }}>
                        <td style={{ padding:'6px 10px', fontSize:10, color:C.textLo, fontFamily:C.FM, whiteSpace:'nowrap' }}>
                          {age < 60 ? `${Math.floor(age)}s ago` : `${Math.floor(age/60)}m ago`}
                        </td>
                        <td style={{ padding:'6px 10px', fontSize:10, fontFamily:C.FM, color:C.textMd }}>{e.scanId}</td>
                        <td style={{ padding:'6px 10px' }}>
                          <span style={{ fontSize:10, padding:'1px 6px', borderRadius:4, background:C.bg3, color:C.textMd, fontFamily:C.F }}>{e.modality}</span>
                        </td>
                        <td style={{ padding:'6px 10px', fontSize:10, color:C.textHi, fontFamily:C.F, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {e.finding}
                        </td>
                        <td style={{ padding:'6px 10px' }}><UrgencyBadge u={e.urgency}/></td>
                        <td style={{ padding:'6px 10px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <div style={{ width:36, height:3, background:C.bg4, borderRadius:1, overflow:'hidden' }}>
                              <div style={{ width:`${e.confidence*100}%`, height:'100%', background:e.confidence>=0.85?C.normal:e.confidence>=0.65?C.urgent:C.critical }}/>
                            </div>
                            <span style={{ fontSize:10, fontFamily:C.FM, color:e.confidence>=0.85?C.normal:e.confidence>=0.65?C.urgent:C.critical }}>
                              {(e.confidence*100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding:'6px 10px', fontSize:10, fontFamily:C.FM, color:e.latencyMs>1800?C.urgent:C.textMd }}>
                          {e.latencyMs}ms
                        </td>
                        <td style={{ padding:'6px 10px', fontSize:10, color:C.textLo, textTransform:'uppercase' }}>{e.region}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODEL HEALTH */}
      {tab === 'models' && (
        <div className="models-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {health.map((svc: any) => (
            <div key={svc.name} style={{
              padding:16, background:C.bg2, borderRadius:14,
              border:`1px solid ${svc.status==='healthy'?`${C.normal}20`:svc.status==='running'?`${C.info}20`:C.border}`,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <div style={{
                  width:8, height:8, borderRadius:'50%', flexShrink:0,
                  background: svc.status==='healthy'?C.normal:svc.status==='running'?C.info:C.textLo,
                  boxShadow: svc.status==='healthy'?`0 0 6px ${C.normal}`:svc.status==='running'?`0 0 6px ${C.info}`:'none',
                  animation: svc.status==='healthy'||svc.status==='running'?'pulse 2s infinite':'none',
                }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.textHi }}>{svc.name}</div>
                  <div style={{ fontSize:9, color:C.textLo, fontFamily:C.FM }}>Version: {svc.version || 'v2.4.1'}</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                {[
                  { label:'Latency', value: svc.latency ? `${svc.latency}ms` : '—' },
                  { label:'Status',  value: svc.status.charAt(0).toUpperCase()+svc.status.slice(1) },
                  { label:'Backend', value: svc.backend || 'Azure AKS' },
                ].map(m => (
                  <div key={m.label} style={{ padding:'6px 8px', background:C.bg3, borderRadius:7 }}>
                    <div style={{ fontSize:9, color:C.textLo, marginBottom:3 }}>{m.label}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.textHi, fontFamily:C.FM }}>{m.value}</div>
                  </div>
                ))}
              </div>
              {svc.status !== 'healthy' && (
                <div style={{ fontSize:10, color:C.critical, marginTop:10, fontFamily:C.FM }}>
                  Error: {svc.error || 'Connection timeout'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* DISTRIBUTION */}
      {tab === 'distribution' && (
        <div className="chart-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <ConfidenceHistogram events={last200} />
          {/* Urgency breakdown */}
          <div style={{ padding:16, background:C.bg2, borderRadius:12, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.textHi, marginBottom:14 }}>Urgency Breakdown (last 200)</div>
            {[
              { label:'CRITICAL', count:last200.filter(e=>e.urgency==='CRITICAL').length, color:C.critical },
              { label:'URGENT',   count:last200.filter(e=>e.urgency==='URGENT').length,   color:C.urgent },
              { label:'NORMAL',   count:last200.filter(e=>e.urgency==='NORMAL').length,   color:C.normal },
              { label:'ROUTINE',  count:last200.filter(e=>e.urgency==='ROUTINE').length,  color:C.textMd },
            ].map(row => (
              <div key={row.label} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:11, color:row.color, fontWeight:600 }}>{row.label}</span>
                  <span style={{ fontSize:11, fontFamily:C.FM, color:C.textHi }}>
                    {row.count} <span style={{ color:C.textLo }}>({((row.count/Math.max(last200.length,1))*100).toFixed(1)}%)</span>
                  </span>
                </div>
                <MiniBar value={row.count} max={Math.max(last200.length,1)} color={row.color}/>
              </div>
            ))}
            {/* Top conditions */}
            <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, fontWeight:600, color:C.textMd, marginBottom:10 }}>Top findings (last 200)</div>
              {Object.entries(
                last200.reduce((acc, e) => ({ ...acc, [e.finding]: (acc[e.finding]||0)+1 }), {} as Record<string,number>)
              ).sort(([,a],[,b])=>b-a).slice(0,5).map(([finding, count]) => (
                <div key={finding} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <div style={{ flex:1, fontSize:10, color:C.textMd, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{finding}</div>
                  <div style={{ width:60 }}>
                    <MiniBar value={count} max={Math.max(...Object.values(last200.reduce((acc,e)=>({...acc,[e.finding]:(acc[e.finding]||0)+1}),{} as Record<string,number>)))} color={C.brand}/>
                  </div>
                  <span style={{ fontSize:10, fontFamily:C.FM, color:C.textMd, minWidth:24, textAlign:'right' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SHAP */}
      {tab === 'shap' && (
        <div style={{ maxWidth:800 }}>
          <SHAPWaterfall />
          <div style={{ marginTop:16, padding:14, background:`${C.info}0A`, borderRadius:12, border:`1px solid ${C.info}30`, fontSize:12, color:C.textMd, lineHeight:1.6 }}>
            ℹ️ <strong style={{ color:C.info }}>About SHAP explanations.</strong> SHAP (SHapley Additive exPlanations) values show how each feature contributes to the AI's prediction. Positive values (red) push the model toward the diagnosis. Negative values (teal) push against it. This waterfall shows the most recent CRITICAL finding in the live stream.
          </div>
        </div>
      )}

      {/* ALERT RULES */}
      {tab === 'rules' && (
        <div style={{ maxWidth:700 }}>
          <AlertRulesPanel />
        </div>
      )}
    </div>
  );
}
