// SEWA XAI — frontend/src/components/public/ClinicalDemoModal.tsx
// Interactive in-browser clinical demo: animates the full scan-to-alert pipeline
// Shows triage → uncertainty → VLM → metacognition → stroke code alert
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).

import React, { useState, useEffect, useCallback, useRef } from 'react';

const C = {
  bg0: '#020C08', bg1: '#050F0C', bg2: '#08160F', bg3: '#0C1D17',
  brand: '#408D7B', brandLt: '#52B09A', brandDk: '#2E6B5E', brandDim: 'rgba(64,141,123,0.10)',
  critical: '#E03535', critBg: 'rgba(224,53,53,0.10)', critBorder: 'rgba(224,53,53,0.35)',
  green: '#1DBF73', greenBg: 'rgba(29,191,115,0.10)',
  amber: '#F59E0B', amberBg: 'rgba(245,158,11,0.10)',
  textHi: '#D0ECE6', textMd: '#6FA898', textLo: '#3A6055',
  border: '#1B3028',
  F: "'IBM Plex Sans', system-ui, sans-serif",
  FM: "'IBM Plex Mono', monospace",
};

// ── Demo case data ─────────────────────────────────────────────
const DEMO_CASE = {
  scanId:    'DEMO-2026-ICH-001',
  modality:  'CT',
  bodyPart:  'Head',
  hospital:  'Royal London Hospital NHS Trust',
  patient:   'Patient PT-00421 · Age 67 · Male',
  finding:   'Intracranial Haemorrhage (ICH)',
  condition: 'ICH',
  confidence: 0.942,
  urgency:   'CRITICAL',
  shapFeatures: [
    { label: 'Hyperdense region (R basal ganglia)', value: 0.42 },
    { label: 'Midline shift',                       value: 0.31 },
    { label: 'Perilesional oedema',                 value: 0.15 },
    { label: 'Sulcal effacement',                   value: 0.08 },
    { label: 'Ventricular compression',              value: 0.04 },
  ],
  uncertainty: { epistemic: 0.031, aleatoric: 0.058, composite: 0.042 },
  metacog: {
    layer1: 'PASS', layer2: 'PASS', layer3: 'PASS', layer4: 'PASS',
    layer5: 'PASS', layer6: 'PASS', layer7: 'PASS',
    hallucinationRisk: 0.08, safe_to_alert: true,
  },
  vlmReport: {
    technique:      'Non-contrast CT head performed per emergency protocol.',
    findings:       'Hyperdense region (57 HU) measuring 18 × 22 mm in the right basal ganglia, consistent with acute haematoma. Surrounding perilesional oedema. 3 mm midline shift to the left. Bilateral ventricles appear mildly compressed.',
    impression:     'CRITICAL: Acute right basal ganglia intracerebral haemorrhage with mass effect and midline shift.',
    recommendation: 'Urgent neurosurgical review. Repeat CT in 6 hours or sooner if clinical deterioration. Consider MRI for underlying lesion characterisation.',
  },
  doorToAlertMs: 1842,
};

// ── Step definitions ───────────────────────────────────────────
const STEPS = [
  { id: 0, label: 'Scan received',    icon: '📥', durationMs: 800  },
  { id: 1, label: 'Triage Engine',    icon: '🧠', durationMs: 1400 },
  { id: 2, label: 'Uncertainty',      icon: '📊', durationMs: 900  },
  { id: 3, label: 'VLM Report',       icon: '📝', durationMs: 1200 },
  { id: 4, label: 'Metacognition',    icon: '🔍', durationMs: 700  },
  { id: 5, label: 'Alert dispatched', icon: '🚨', durationMs: 0    },
];

// ── Animated number counter ────────────────────────────────────
function Counter({ target, suffix = '', decimals = 0, color = C.brandLt }: { target: number; suffix?: string; decimals?: number; color?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const steps = 40;
    const inc = target / steps;
    const t = setInterval(() => {
      start += inc;
      if (start >= target) { setVal(target); clearInterval(t); }
      else setVal(start);
    }, 20);
    return () => clearInterval(t);
  }, [target]);
  return <span style={{ color, fontFamily: C.FM, fontWeight: 700 }}>{val.toFixed(decimals)}{suffix}</span>;
}

// ── Thin progress bar ──────────────────────────────────────────
function ProgressBar({ pct, color = C.brand }: { pct: number; color?: string }) {
  return (
    <div style={{ width: '100%', height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 80ms linear' }} />
    </div>
  );
}

// ── SHAP bar chart ─────────────────────────────────────────────
function ShapChart({ features, visible }: { features: typeof DEMO_CASE['shapFeatures']; visible: boolean }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { if (visible) setTimeout(() => setAnimated(true), 200); }, [visible]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {features.map((f, i) => (
        <div key={f.label} style={{ opacity: animated ? 1 : 0, transform: animated ? 'none' : 'translateX(-10px)', transition: `all 300ms ${i * 80}ms` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: C.textMd, fontFamily: C.F }}>{f.label}</span>
            <span style={{ fontSize: 11, color: C.brandLt, fontFamily: C.FM }}>{f.value.toFixed(2)}</span>
          </div>
          <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: animated ? `${f.value * 210}%` : '0%', height: '100%', background: `linear-gradient(90deg,${C.brand},${C.brandLt})`, borderRadius: 3, transition: `width 600ms ${i * 100}ms ease-out` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Alert channel chip ─────────────────────────────────────────
function AlertChip({ icon, label, delay, fired }: { icon: string; label: string; delay: number; fired: boolean }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (fired) setTimeout(() => setVisible(true), delay); }, [fired, delay]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: visible ? C.critBg : C.bg2, border: `1px solid ${visible ? C.critical : C.border}`, opacity: visible ? 1 : 0.4, transition: 'all 300ms', fontFamily: C.F }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 12, color: visible ? '#FF8080' : C.textMd, fontWeight: visible ? 700 : 400 }}>{label}</span>
      {visible && <span style={{ fontSize: 10, color: C.green, fontFamily: C.FM, marginLeft: 'auto' }}>✓ sent</span>}
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────
interface Props { onClose: () => void; }

export function ClinicalDemoModal({ onClose }: Props) {
  const [activeStep, setActiveStep] = useState(-1);
  const [stepProgress, setStepProgress] = useState(0);
  const [running, setRunning]     = useState(false);
  const [complete, setComplete]   = useState(false);
  const [elapsed, setElapsed]     = useState(0);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef<number | null>(null);

  const runDemo = useCallback(() => {
    setActiveStep(-1); setStepProgress(0);
    setRunning(true);  setComplete(false); setElapsed(0);

    const startTime = Date.now();
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    elapsedRef.current = window.setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 50);

    let stepIdx = 0;
    const runStep = () => {
      if (stepIdx >= STEPS.length) {
        setRunning(false); setComplete(true);
        if (elapsedRef.current) clearInterval(elapsedRef.current);
        return;
      }
      const step = STEPS[stepIdx];
      setActiveStep(stepIdx);
      setStepProgress(0);
      if (step.durationMs === 0) { stepIdx++; runStep(); return; }
      const frames = 60;
      const frameMs = step.durationMs / frames;
      let f = 0;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        f++;
        setStepProgress(Math.min((f / frames) * 100, 100));
        if (f >= frames) {
          if (timerRef.current) clearInterval(timerRef.current);
          stepIdx++;
          setTimeout(runStep, 80);
        }
      }, frameMs);
    };
    runStep();
  }, []);

  useEffect(() => {
    setTimeout(runDemo, 400);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [runDemo]);

  // Keyboard close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const stepDone = (idx: number) => activeStep > idx || complete;
  const stepActive = (idx: number) => activeStep === idx && !complete;
  const alertsFired = complete || activeStep >= 5;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'env(safe-area-inset-top) 16px env(safe-area-inset-bottom)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true" aria-label="SEWA XAI Clinical Demo"
    >
      <style>{`
        @media (max-width: 768px) {
          .demo-modal-container { height: 100% !important; border-radius: 0 !important; max-height: 100vh !important; }
          .demo-body { flex-direction: column !important; }
          .demo-sidebar { width: 100% !important; border-right: none !important; border-bottom: 1px solid ${C.border} !important; height: auto !important; padding: 12px 16px !important; flex-direction: row !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
          .demo-sidebar-items { flex-direction: row !important; display: flex !important; gap: 8px !important; }
          .demo-sidebar-item { min-width: 140px !important; flex-shrink: 0 !important; }
          .demo-sidebar-label { display: none !important; }
          .demo-door-to-alert { margin-top: 0 !important; min-width: 100px !important; }
          .demo-content { padding: 16px !important; }
        }
        @media (max-width: 480px) {
          .demo-header { padding: 12px 16px !important; }
          .demo-header-tag { display: none !important; }
          .demo-footer { padding: 12px 16px !important; justify-content: center !important; }
          .demo-footer button { flex: 1 !important; padding: 8px 12px !important; font-size: 11px !important; }
          .demo-sidebar { display: none !important; }
        }
      `}</style>
      <div className="demo-modal-container" style={{ background: C.bg1, borderRadius: 20, border: `1px solid ${C.border}`, width: '100%', maxWidth: 920, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>

        {/* ── Header ── */}
        <div className="demo-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.border}`, background: C.bg0, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: running ? '#1DBF73' : complete ? '#1DBF73' : C.textLo, boxShadow: running ? '0 0 8px #1DBF73' : 'none' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: C.textHi, fontFamily: C.F }}>Clinical Demo</span>
            <span className="demo-header-tag" style={{ fontSize: 11, color: C.textLo, fontFamily: C.FM, padding: '2px 8px', background: C.bg2, borderRadius: 6, border: `1px solid ${C.border}` }}>{DEMO_CASE.hospital}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {(running || complete) && (
              <div style={{ fontFamily: C.FM, fontSize: 13, color: complete ? C.green : C.brandLt }}>
                {complete ? `✓ ${(DEMO_CASE.doorToAlertMs / 1000).toFixed(2)}s` : `${(elapsed / 1000).toFixed(1)}s`}
              </div>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textLo, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }} aria-label="Close demo">✕</button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="demo-body" style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Left: pipeline steps */}
          <div className="demo-sidebar" style={{ width: 200, flexShrink: 0, borderRight: `1px solid ${C.border}`, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 6, background: C.bg0, overflowY: 'auto' }}>
            <div className="demo-sidebar-label" style={{ fontSize: 10, color: C.textLo, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: C.F, marginBottom: 8 }}>4-Engine Pipeline</div>
            <div className="demo-sidebar-items" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {STEPS.map((step, idx) => (
                <div key={step.id} className="demo-sidebar-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: stepActive(idx) ? C.brandDim : stepDone(idx) ? 'rgba(29,191,115,0.08)' : 'transparent', border: `1px solid ${stepActive(idx) ? C.brand + '60' : stepDone(idx) ? '#1DBF7340' : C.border}`, transition: 'all 250ms' }}>
                  <span style={{ fontSize: 16 }}>{stepDone(idx) ? '✅' : step.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: stepActive(idx) ? C.textHi : stepDone(idx) ? C.green : C.textMd, fontFamily: C.F, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{step.label}</div>
                    {stepActive(idx) && !complete && <ProgressBar pct={stepProgress} />}
                  </div>
                </div>
              ))}
            </div>

            {/* Door-to-alert timer */}
            <div className="demo-door-to-alert" style={{ marginTop: 12, padding: '12px', borderRadius: 10, background: complete ? 'rgba(224,53,53,0.10)' : C.bg2, border: `1px solid ${complete ? C.critBorder : C.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: C.textLo, fontFamily: C.F, marginBottom: 4 }}>Door-to-Alert</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: complete ? C.critical : C.textLo, fontFamily: C.FM }}>
                {complete ? `${(DEMO_CASE.doorToAlertMs / 1000).toFixed(2)}s` : running ? `${(elapsed / 1000).toFixed(1)}s` : '—'}
              </div>
            </div>
          </div>

          {/* Right: content panels */}
          <div className="demo-content" style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Scan info card */}
            <div style={{ padding: 16, background: C.bg2, borderRadius: 14, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[['Modality', DEMO_CASE.modality], ['Body Part', DEMO_CASE.bodyPart], ['Patient', DEMO_CASE.patient], ['Scan ID', DEMO_CASE.scanId]].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 10, color: C.textLo, fontFamily: C.F, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                    <div style={{ fontSize: 13, color: C.textHi, fontFamily: l === 'Scan ID' ? C.FM : C.F, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Engine 1: Triage ── */}
            {(activeStep >= 1 || complete) && (
              <div style={{ padding: 18, background: C.bg2, borderRadius: 14, border: `1px solid ${stepDone(1) && !stepActive(1) ? C.critBorder : C.brand + '40'}`, transition: 'border-color 400ms' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 16 }}>🧠</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.textHi, fontFamily: C.F }}>Engine 1 — Triage (ONNX Runtime)</span>
                  {stepDone(1) && <span style={{ marginLeft: 'auto', fontSize: 10, color: C.green, fontFamily: C.FM }}>380ms</span>}
                </div>
                {stepActive(1) && <ProgressBar pct={stepProgress} />}
                {stepDone(1) && (
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 140, padding: 14, background: C.critBg, borderRadius: 10, border: `1px solid ${C.critBorder}`, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: C.textMd, marginBottom: 6, fontFamily: C.F }}>Primary Finding</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#FF8080', fontFamily: C.F }}>{DEMO_CASE.finding}</div>
                      <div style={{ fontSize: 11, color: C.critical, marginTop: 4, fontWeight: 700, fontFamily: C.FM }}>⚡ CRITICAL</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 140, padding: 14, background: C.bg3, borderRadius: 10, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11, color: C.textMd, marginBottom: 6, fontFamily: C.F }}>AI Confidence</div>
                      <div style={{ fontSize: 28, fontWeight: 900, fontFamily: C.FM, color: C.brandLt }}>
                        <Counter target={94.2} decimals={1} suffix="%" color={C.brandLt} />
                      </div>
                      <div style={{ fontSize: 10, color: C.textLo, marginTop: 4, fontFamily: C.F }}>Illustrative demo figure — not a measured result</div>
                    </div>
                    <div style={{ flex: 2, minWidth: 180, padding: 14, background: C.bg3, borderRadius: 10, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11, color: C.textMd, marginBottom: 10, fontFamily: C.F }}>SHAP Attribution</div>
                      <ShapChart features={DEMO_CASE.shapFeatures} visible={stepDone(1)} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Engine 2: Uncertainty ── */}
            {(activeStep >= 2 || complete) && (
              <div style={{ padding: 18, background: C.bg2, borderRadius: 14, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 16 }}>📊</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.textHi, fontFamily: C.F }}>Engine 2 — Uncertainty (MC-Dropout ×20)</span>
                  {stepDone(2) && <span style={{ marginLeft: 'auto', fontSize: 10, color: C.green, fontFamily: C.FM }}>280ms</span>}
                </div>
                {stepActive(2) && <ProgressBar pct={stepProgress} />}
                {stepDone(2) && (
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Epistemic Uncertainty', value: DEMO_CASE.uncertainty.epistemic, desc: 'Model uncertainty — reducible with more data', color: C.brandLt },
                      { label: 'Aleatoric Uncertainty', value: DEMO_CASE.uncertainty.aleatoric, desc: 'Irreducible noise in scan', color: C.amber },
                      { label: 'Composite Score',       value: DEMO_CASE.uncertainty.composite,  desc: 'Below 0.25 threshold ✓', color: C.green },
                    ].map(u => (
                      <div key={u.label} style={{ flex: 1, minWidth: 120, padding: 12, background: C.bg3, borderRadius: 10, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 10, color: C.textMd, fontFamily: C.F, marginBottom: 6 }}>{u.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: u.color, fontFamily: C.FM }}>
                          <Counter target={u.value * 100} decimals={1} suffix="%" color={u.color} />
                        </div>
                        <div style={{ fontSize: 10, color: C.textLo, marginTop: 4, fontFamily: C.F }}>{u.desc}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Engine 3: VLM Report ── */}
            {(activeStep >= 3 || complete) && (
              <div style={{ padding: 18, background: C.bg2, borderRadius: 14, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 16 }}>📝</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.textHi, fontFamily: C.F }}>Engine 3 — VLM Report Generator</span>
                  {stepDone(3) && <span style={{ marginLeft: 'auto', fontSize: 10, color: C.green, fontFamily: C.FM }}>900ms</span>}
                </div>
                {stepActive(3) && <ProgressBar pct={stepProgress} />}
                {stepDone(3) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(DEMO_CASE.vlmReport).map(([key, text]) => (
                      <div key={key} style={{ padding: '10px 14px', background: C.bg3, borderRadius: 10, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 9, color: C.textLo, fontFamily: C.FM, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>{key}</div>
                        <div style={{ fontSize: 12, color: key === 'impression' ? '#FFB3B3' : C.textMd, lineHeight: 1.65, fontFamily: C.F }}>{text}</div>
                      </div>
                    ))}
                    <div style={{ fontSize: 11, color: C.textLo, fontFamily: C.F }}>Editable by radiologist · All changes tracked (synthetic demo)</div>
                  </div>
                )}
              </div>
            )}

            {/* ── Engine 4: Metacognition ── */}
            {(activeStep >= 4 || complete) && (
              <div style={{ padding: 18, background: C.bg2, borderRadius: 14, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 16 }}>🔍</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.textHi, fontFamily: C.F }}>Engine 4 — Metacognition (9-Layer Safety Audit)</span>
                  {stepDone(4) && <span style={{ marginLeft: 'auto', fontSize: 10, color: C.green, fontFamily: C.FM }}>120ms</span>}
                </div>
                {stepActive(4) && <ProgressBar pct={stepProgress} />}
                {stepDone(4) && (
                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {(['Modality plausibility','Urgency consistency','Confidence floor','SHAP coherence','Uncertainty conflict','Report concordance','Demographics','Hallucination risk','Safe-to-alert'] as const).map((layer, i) => (
                        <div key={layer} style={{ padding: '5px 11px', borderRadius: 8, background: i === 7 ? 'rgba(29,191,115,0.10)' : 'rgba(29,191,115,0.08)', border: '1px solid rgba(29,191,115,0.30)', fontSize: 11, color: C.green, fontFamily: C.F, fontWeight: 600 }}>
                          {i === 7 ? `H = ${DEMO_CASE.metacog.hallucinationRisk}` : i === 8 ? '✅ SAFE TO ALERT' : `L${i+1} PASS`}
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '10px 14px', background: 'rgba(29,191,115,0.08)', borderRadius: 10, border: '1px solid rgba(29,191,115,0.30)', fontSize: 12, color: C.green, fontFamily: C.F }}>
                      ✅ All 9 layers passed · Hallucination risk H = 0.08 (threshold: 0.30) · <strong>Safe-to-alert: APPROVED</strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Alert Dispatch ── */}
            {alertsFired && (
              <div style={{ padding: 18, background: C.critBg, borderRadius: 14, border: `1px solid ${C.critBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 18 }}>🚨</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#FF8080', fontFamily: C.F }}>STROKE CODE ACTIVATED — {DEMO_CASE.finding}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: C.textMd, fontFamily: C.FM }}>{DEMO_CASE.doorToAlertMs}ms door-to-alert</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(175px,1fr))', gap: 8 }}>
                  <AlertChip icon="📱" label="FCM Push (radiologist)" delay={0}    fired={alertsFired} />
                  <AlertChip icon="💬" label="WebSocket (all sessions)" delay={80}  fired={alertsFired} />
                  <AlertChip icon="📧" label="Email (on-call team)"   delay={200}  fired={alertsFired} />
                  <AlertChip icon="🏥" label="HL7 ORU^R01 → EMR"     delay={350}  fired={alertsFired} />
                  <AlertChip icon="🔄" label="HL7 ADT^A02 (transfer)" delay={500}  fired={alertsFired} />
                  <AlertChip icon="📋" label="HL7 ORM (CTA order)"   delay={650}  fired={alertsFired} />
                </div>
                <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(0,0,0,0.20)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 12, color: C.textMd, fontFamily: C.F }}>Illustrative synthetic case · ~1.84s door-to-alert (demo figure, not a measured result)</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── Footer ── */}
        <div className="demo-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderTop: `1px solid ${C.border}`, background: C.bg0, flexShrink: 0, flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 11, color: C.textLo, fontFamily: C.F }}>Synthetic demo data only — no patient information. © 2026 SEWA XAI.</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={runDemo} disabled={running}
              style={{ padding: '8px 20px', background: running ? C.bg2 : C.brandDim, border: `1px solid ${running ? C.border : C.brand}`, borderRadius: 10, color: running ? C.textLo : C.brandLt, fontSize: 13, fontWeight: 600, cursor: running ? 'not-allowed' : 'pointer', fontFamily: C.F }}>
              {running ? 'Running…' : '▶ Run Again'}
            </button>
            <button
              onClick={() => window.open('mailto:info@sewaxai.health?subject=SEWA XAI Demo Request', '_blank')}
              style={{ padding: '8px 20px', background: `linear-gradient(135deg,${C.brand},${C.brandDk})`, border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: C.F }}>
              Request Live Demo →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
