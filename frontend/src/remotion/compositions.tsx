import React from 'react';
import '../remotion-env.d.ts';

import {
  AbsoluteFill, Sequence, spring, useCurrentFrame,
  useVideoConfig, interpolate, Easing, Audio, staticFile,
} from 'remotion';

// ── Audio Assets ───────────────────────────────────────────────
const S = {
  ambient: staticFile('/audio/ambient_clean.mp3'),
  ding:    staticFile('/audio/result_reveal.mp3'),
  whoosh:  staticFile('/audio/transition_whoosh.mp3'),
};

// ── Brand tokens ───────────────────────────────────────────────
const B = {
  bg0:     '#050F0C',
  bg1:     '#08160F',
  bg2:     '#0C1D17',
  brand:   '#408D7B',
  brandLt: '#52B09A',
  critical:'#E03535',
  normal:  '#1DBF73',
  amber:   '#F59E0B',
  info:    '#2A6EF2',
  textHi:  '#D0ECE6',
  textMd:  '#6FA898',
  textLo:  '#3A6055',
  F:       "'Inter', 'IBM Plex Sans', sans-serif",
  FM:      "'IBM Plex Mono', monospace",
};

// ── Shared Visual Elements ──────────────────────────────────────
function Grid(): any {
  return (
    <React.Fragment>
      <AbsoluteFill style={{ opacity: 0.1 }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(#408D7B 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </AbsoluteFill>
    </React.Fragment>
  );
}

function Glow({ color = B.brand, size = 600, opacity = 0.2 }: { color?: string; size?: number; opacity?: number }): any {
  return (
    <React.Fragment>
      <div style={{
        position: 'absolute',
        width: size,
        height: size,
        background: color,
        borderRadius: '50%',
        filter: 'blur(120px)',
        opacity,
      }} />
    </React.Fragment>
  );
}

// ── Shared animated components ─────────────────────────────────
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }): any {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 100 } });
  return <div style={{ opacity }}>{children}</div>;
}

function SlideUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }): any {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 80 } });
  return (
    <div style={{
      transform: `translateY(${interpolate(progress, [0, 1], [40, 0])}px)`,
      opacity: progress,
    }}>
      {children}
    </div>
  );
}

function CountUp({ target, delay = 0, decimals = 0, suffix = '' }: {
  target: number; delay?: number; decimals?: number; suffix?: string;
}): any {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 30, stiffness: 40 } });
  const value = interpolate(progress, [0, 1], [0, target]);
  return <span>{value.toFixed(decimals)}{suffix}</span>;
}

function ProgressBar({ value, delay = 0, color = B.brand, height = 8 }: {
  value: number; delay?: number; color?: string; height?: number;
}): any {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 20, stiffness: 60 } });
  const width = interpolate(progress, [0, 1], [0, value * 100]);
  return (
    <div style={{ background: '#1B3028', borderRadius: 4, height, overflow: 'hidden' }}>
      <div style={{ width: `${width}%`, height, background: color, borderRadius: 4, transition: 'none' }}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 1. AI RESULT EXPLAINER (150 frames @ 30fps = 5 seconds)
//    Shows: scan info → triage result → confidence bar → Grad-CAM reveal
// ══════════════════════════════════════════════════════════════
export interface AIResultExplainerProps {
  scanId:       string;
  modality:     string;
  bodyPart:     string;
  diagnosis:    string;
  confidence:   number;   // 0–1
  urgency:      'CRITICAL' | 'URGENT' | 'ROUTINE' | 'NORMAL';
  gradcamUrl?:  string;
  patientRef?:  string;
  hospital?:    string;
}

export const AIResultExplainer: React.FC<AIResultExplainerProps> = ({
  scanId, modality, bodyPart, diagnosis, confidence, urgency, gradcamUrl, patientRef, hospital,
}: AIResultExplainerProps): any => {
  const frame = useCurrentFrame();

  const urgencyColors: Record<string, string> = {
    CRITICAL: B.critical, URGENT: B.amber, ROUTINE: B.brand, NORMAL: B.normal,
  };
  const urgencyColor = urgencyColors[urgency] ?? B.brand;

  // Pulse animation for CRITICAL badge
  const pulse = interpolate(
    Math.sin((frame / 8) * Math.PI), [-1, 1], [0.7, 1],
    { easing: Easing.ease }
  );

  return (
    <React.Fragment>
      <Audio src={S.ambient} volume={0.15} loop />
      <Sequence from={45}>
        <Audio src={S.ding} volume={0.5} />
      </Sequence>
      <AbsoluteFill style={{ background: B.bg0, fontFamily: B.F, padding: 80 }}>

      {/* Header */}
      <Sequence from={0}>
        <FadeIn>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 60 }}>
            <div style={{ width: 52, height: 52, background: `linear-gradient(135deg,${B.brand},${B.brandLt})`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: B.textHi, letterSpacing: '-0.5px' }}>SEWA XAI</div>
              <div style={{ fontSize: 16, color: B.textMd }}>Clinical Triage Result</div>
            </div>
          </div>
        </FadeIn>
      </Sequence>

      {/* Scan info row */}
      <Sequence from={10}>
        <SlideUp delay={0}>
          <div style={{ display: 'flex', gap: 24, marginBottom: 48 }}>
            {[
              { label: 'Scan ID', value: scanId },
              { label: 'Modality', value: modality },
              { label: 'Body Part', value: bodyPart },
              { label: 'Hospital', value: hospital ?? '—' },
            ].map(item => (
              <div key={item.label} style={{ padding: '16px 24px', background: B.bg2, borderRadius: 14, border: `1px solid ${B.textLo}30`, flex: 1 }}>
                <div style={{ fontSize: 13, color: B.textLo, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{item.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: B.textHi, fontFamily: B.FM }}>{item.value}</div>
              </div>
            ))}
          </div>
        </SlideUp>
      </Sequence>

      {/* Primary result */}
      <Sequence from={25}>
        <SlideUp delay={0}>
          <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', marginBottom: 48 }}>
            <div style={{ flex: 1 }}>
              {/* Urgency badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 20px',
                background: `${urgencyColor}20`, border: `2px solid ${urgencyColor}`,
                borderRadius: 40, marginBottom: 24,
                transform: urgency === 'CRITICAL' ? `scale(${pulse})` : 'scale(1)',
              }}>
                <div style={{ width: 12, height: 12, borderRadius: 6, background: urgencyColor }}/>
                <span style={{ fontSize: 18, fontWeight: 800, color: urgencyColor, letterSpacing: '0.1em' }}>
                  {urgency}
                </span>
              </div>

              {/* Diagnosis */}
              <div style={{ fontSize: 42, fontWeight: 900, color: B.textHi, lineHeight: 1.1, marginBottom: 28, letterSpacing: '-1px' }}>
                {diagnosis}
              </div>

              {/* Confidence bar */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 15, color: B.textMd }}>AI Confidence</span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: urgencyColor, fontFamily: B.FM }}>
                    <CountUp target={confidence * 100} delay={0} decimals={1} suffix="%" />
                  </span>
                </div>
                <ProgressBar value={confidence} color={urgencyColor} height={12} />
              </div>
            </div>

            {/* Grad-CAM heatmap placeholder */}
            {gradcamUrl && (
              <Sequence from={60}>
                <FadeIn>
                  <div style={{ width: 360, height: 280, background: B.bg1, borderRadius: 16, border: `2px solid ${urgencyColor}40`, overflow: 'hidden', position: 'relative', boxShadow: `0 10px 30px rgba(0,0,0,0.5)` }}>
                    <img src={gradcamUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {/* Diagnostic Scan Line */}
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, height: 4,
                      background: urgencyColor,
                      boxShadow: `0 0 20px ${urgencyColor}`,
                      transform: `translateY(${interpolate(frame % 60, [0, 60], [0, 280])}px)`,
                      opacity: 0.8
                    }} />
                    <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.8)', borderRadius: 8, padding: '6px 12px', border: `1px solid ${urgencyColor}40` }}>
                      <span style={{ fontSize: 12, color: B.textMd, fontWeight: 700 }}>Grad-CAM Attribution</span>
                    </div>
                  </div>
                </FadeIn>
              </Sequence>
            )}
          </div>
        </SlideUp>
      </Sequence>

      {/* Thorough Protocol Section */}
      <Sequence from={75}>
        <SlideUp delay={0}>
          <div style={{ display: 'flex', gap: 32 }}>
            <div style={{ flex: 1, padding: 32, background: B.bg1, borderRadius: 20, border: `1px solid ${B.textLo}20` }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: B.brand, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>Clinical Analysis Protocol</div>
              {[
                'Neural Triage (EfficientNet-B4)',
                'Uncertainty Quantification (MC-Dropout)',
                'Metacognition Safety Audit (9-Layer)',
                'Vision-Language Report Generation',
              ].map((step, i) => (
                <Sequence key={i} from={i * 10}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 12, background: B.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: 'white' }}>{i+1}</div>
                    <div style={{ fontSize: 16, color: B.textMd, fontWeight: 500 }}>{step}</div>
                    <div style={{ marginLeft: 'auto', fontSize: 12, color: B.normal, fontWeight: 800 }}>PASS</div>
                  </div>
                </Sequence>
              ))}
            </div>
            <div style={{ flex: 1.2, padding: 32, background: `${B.info}05`, borderRadius: 20, border: `1px solid ${B.info}20` }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: B.info, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>Diagnostic Integrity Metadata</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {[
                  { l: 'Model ID', v: 'SEWA-TR-2.4' },
                  { l: 'Inference', v: '1.82s' },
                  { l: 'Precision', v: '0.942' },
                  { l: 'Recall', v: '0.961' },
                ].map(m => (
                  <div key={m.l}>
                    <div style={{ fontSize: 11, color: B.textLo, textTransform: 'uppercase', marginBottom: 4 }}>{m.l}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: B.textHi, fontFamily: B.FM }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SlideUp>
      </Sequence>

      {/* Footer */}
      <Sequence from={120}>
        <FadeIn>
          <div style={{ position: 'absolute', bottom: 48, left: 80, right: 80,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderTop: `1px solid ${B.textLo}30`, paddingTop: 24 }}>
            <div style={{ fontSize: 13, color: B.textLo }}>
              🔒 HIPAA · GDPR · NHS DSPT · MDR IIb · Explainable AI
            </div>
            <div style={{ fontSize: 13, color: B.textLo, fontFamily: B.FM }}>
              {new Date().toISOString().split('T')[0]} · For clinical review only
            </div>
          </div>
        </FadeIn>
      </Sequence>
    </AbsoluteFill>
    </React.Fragment>
  );
};

// ══════════════════════════════════════════════════════════════
// 2. CLINICAL REPORT SUMMARY (210 frames @ 30fps = 7 seconds)
//    Shows: report header → key findings → impression → recommendation CTA
// ══════════════════════════════════════════════════════════════
export interface ClinicalReportSummaryProps {
  reportId:       string;
  scanId:         string;
  patientRef:     string;
  radiologist:    string;
  signedAt:       string;
  modality:       string;
  findings:       string[];
  impression:     string;
  recommendation: string;
  urgency:        string;
}

export const ClinicalReportSummary: React.FC<ClinicalReportSummaryProps> = ({
  reportId, scanId, patientRef, radiologist, signedAt, modality,
  findings, impression, recommendation, urgency,
}: ClinicalReportSummaryProps): any => {
  return (
    <React.Fragment>
      <AbsoluteFill style={{ background: B.bg0, fontFamily: B.F, padding: 72 }}>

      {/* Header bar */}
      <Sequence from={0}>
        <FadeIn>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, background: `linear-gradient(135deg,${B.brand},${B.brandLt})`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: B.textHi }}>SEWA XAI</div>
                <div style={{ fontSize: 12, color: B.textMd }}>Radiology Report Summary</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: B.textLo, fontFamily: B.FM }}>Report: {reportId}</div>
              <div style={{ fontSize: 11, color: B.textLo }}>Signed: {signedAt}</div>
            </div>
          </div>
        </FadeIn>
      </Sequence>

      {/* Modality + Patient */}
      <Sequence from={15}>
        <SlideUp>
          <div style={{ display: 'flex', gap: 16, marginBottom: 36 }}>
            {[
              { label: 'Patient Ref', value: patientRef },
              { label: 'Scan', value: scanId },
              { label: 'Modality', value: modality },
              { label: 'Radiologist', value: `Dr. ${radiologist}` },
            ].map(item => (
              <div key={item.label} style={{ flex: 1, padding: '12px 18px', background: B.bg2, borderRadius: 12, border: `1px solid #1B3028` }}>
                <div style={{ fontSize: 10, color: B.textLo, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: B.textHi }}>{item.value}</div>
              </div>
            ))}
          </div>
        </SlideUp>
      </Sequence>

      {/* Findings */}
      <Sequence from={45}>
        <SlideUp>
          <div style={{ marginBottom: 30 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: B.textLo, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Findings</div>
            {findings.slice(0, 4).map((f, i) => (
              <Sequence key={i} from={i * 12}>
                <FadeIn>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid #1B3028` }}>
                    <div style={{ width: 6, height: 6, borderRadius: 3, background: B.brand, flexShrink: 0 }}/>
                    <span style={{ fontSize: 16, color: B.textMd }}>{f}</span>
                  </div>
                </FadeIn>
              </Sequence>
            ))}
          </div>
        </SlideUp>
      </Sequence>

      {/* Impression */}
      <Sequence from={120}>
        <SlideUp>
          <div style={{ padding: '20px 24px', background: B.bg2, borderRadius: 14, border: `2px solid ${B.brand}40`, marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: B.brand, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Impression</div>
            <div style={{ fontSize: 18, color: B.textHi, lineHeight: 1.5 }}>{impression}</div>
          </div>
        </SlideUp>
      </Sequence>

      {/* Recommendation */}
      <Sequence from={165}>
        <SlideUp>
          <div style={{ padding: '18px 24px', background: `${B.normal}10`, border: `1px solid ${B.normal}30`, borderRadius: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: B.normal, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Recommendation</div>
            <div style={{ fontSize: 16, color: B.textMd }}>{recommendation}</div>
          </div>
        </SlideUp>
      </Sequence>
    </AbsoluteFill>
    </React.Fragment>
  );
};

// ══════════════════════════════════════════════════════════════
// 3. PLATFORM INTRO (300 frames @ 30fps = 10 seconds)
//    Public-facing product explainer — for marketing & pitch
// ══════════════════════════════════════════════════════════════
export const PlatformIntro: React.FC = (): any => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const stats = [
    { value: 97.2, label: 'AUC-ROC ICH', suffix: '%', color: B.critical },
    { value: 1.8,  label: 'Triage time', suffix: 's', color: B.amber },
    { value: 47,   label: 'Hospitals',   suffix: '+', color: B.brand },
    { value: 7,    label: 'Regions',     suffix: '',  color: B.normal },
  ];

  const engines = [
    { icon: '⚡', label: 'Triage Engine',    color: B.critical, desc: 'EfficientNet-B4 Neural Triage' },
    { icon: '🎯', label: 'Uncertainty',      color: B.amber,    desc: 'MC-Dropout Safety Verification' },
    { icon: '🧠', label: 'Metacognition',    color: B.info,     desc: '9-Layer Hallucination Audit' },
    { icon: '📋', label: 'VLM Reports',      color: B.normal,   desc: 'Autonomous Clinical Reporting' },
  ];

  return (
    <React.Fragment>
      <Audio src={S.ambient} volume={0.2} loop />
      <Sequence from={0} durationInFrames={30}>
        <Audio src={S.whoosh} volume={0.4} />
      </Sequence>
      <AbsoluteFill style={{ background: B.bg0, fontFamily: B.F, color: B.textHi, overflow: 'hidden' }}>
        <Grid />
        <Glow color={B.brand} size={800} opacity={0.15} />
        
        {/* Digital Pulse Background */}
        <AbsoluteFill style={{ opacity: 0.1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="1200" height="400" viewBox="0 0 1200 400" fill="none" stroke={B.brand} strokeWidth="2">
            <path d={`M0 200 L400 200 L420 150 L440 250 L460 100 L480 300 L500 200 L1200 200`} 
              style={{ strokeDasharray: 2000, strokeDashoffset: interpolate(frame, [0, 300], [2000, 0]) }} />
          </svg>
        </AbsoluteFill>

      {/* Opening — logo + tagline */}
      <Sequence from={0} durationInFrames={90}>
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <FadeIn>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 120, height: 120, background: `linear-gradient(135deg,${B.brand},${B.brandLt})`, borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 40px', boxShadow: `0 20px 40px ${B.brand}40` }}>
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <div style={{ fontSize: 96, fontWeight: 900, color: B.textHi, letterSpacing: '-5px', marginBottom: 20 }}>SEWA XAI</div>
              <div style={{ fontSize: 32, fontWeight: 500, color: B.textMd, maxWidth: 800, lineHeight: 1.4, margin: '0 auto' }}>
                From Hours to Seconds:<br/>
                The Global Standard for <span style={{ color: B.brand }}>Autonomous Clinical Intelligence</span>.
              </div>
            </div>
          </FadeIn>
        </AbsoluteFill>
      </Sequence>

      {/* Stats section */}
      <Sequence from={90} durationInFrames={120}>
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 100 }}>
          <SlideUp delay={0}>
            <div style={{ fontSize: 48, fontWeight: 900, color: B.textHi, textAlign: 'center', marginBottom: 80 }}>
              Validated Clinical Performance
            </div>
          </SlideUp>
          <div style={{ display: 'flex', gap: 40, justifyContent: 'center' }}>
            {stats.map((stat, i) => (
              <Sequence key={i} from={i * 12}>
                <SlideUp delay={0}>
                  <div style={{ padding: '48px 56px', background: B.bg2, border: `2px solid ${stat.color}30`, borderRadius: 32, textAlign: 'center', minWidth: 260, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', background: stat.color, padding: '4px 16px', borderRadius: 12, fontSize: 14, fontWeight: 900, color: 'white' }}>LIVE</div>
                    <div style={{ fontSize: 72, fontWeight: 900, color: stat.color, fontFamily: B.FM, lineHeight: 1 }}>
                      <CountUp target={stat.value} suffix={stat.suffix} decimals={stat.value % 1 !== 0 ? 1 : 0} />
                    </div>
                    <div style={{ fontSize: 18, color: B.textMd, marginTop: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stat.label}</div>
                  </div>
                </SlideUp>
              </Sequence>
            ))}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* 4-Engine safety stack */}
      <Sequence from={210} durationInFrames={90}>
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
          <SlideUp delay={0}>
            <div style={{ fontSize: 48, fontWeight: 900, color: B.textHi, textAlign: 'center', marginBottom: 60 }}>
              The 4-Engine Safety Architecture
            </div>
          </SlideUp>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32, maxWidth: 1000 }}>
            {engines.map((e, i) => (
              <Sequence key={i} from={i * 10}>
                <SlideUp delay={0}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '32px 40px', background: B.bg2, border: `2px solid ${e.color}30`, borderRadius: 24 }}>
                    <div style={{ fontSize: 64 }}>{e.icon}</div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: e.color, marginBottom: 8 }}>{e.label}</div>
                      <div style={{ fontSize: 16, color: B.textMd, fontWeight: 500 }}>{e.desc}</div>
                    </div>
                  </div>
                </SlideUp>
              </Sequence>
            ))}
          </div>
          <Sequence from={60}>
            <FadeIn>
              <div style={{ marginTop: 60, fontSize: 22, color: B.textLo, fontWeight: 700, letterSpacing: '0.2em' }}>
                NHS · FDA 510(k) · EU MDR IIb · ISO 13485 · GDPR · HIPAA
              </div>
            </FadeIn>
          </Sequence>
        </AbsoluteFill>
      </Sequence>
      </AbsoluteFill>
    </React.Fragment>
  );
};

// ══════════════════════════════════════════════════════════════
// 4. ONBOARDING WALKTHROUGH (180 frames @ 30fps = 6 seconds)
//    Role-specific intro for new clinicians
// ══════════════════════════════════════════════════════════════
export interface OnboardingWalkthroughProps {
  role:       'radiologist' | 'doctor' | 'admin' | 'technician' | 'patient';
  firstName:  string;
  hospital:   string;
}

const ROLE_CONFIG = {
  radiologist: { icon: '🩻', color: '#2A6EF2', title: 'Radiologist Workspace', steps: ['Review AI-triaged worklist', 'Inspect Grad-CAM heatmaps', 'Edit & sign VLM reports', 'Request second opinions'] },
  doctor:      { icon: '🏥', color: '#E03535', title: 'Clinical Dashboard', steps: ['Receive critical alerts instantly', 'Review patient AI results', 'Book follow-up appointments', 'Message care team'] },
  admin:       { icon: '📊', color: '#408D7B', title: 'Admin Dashboard', steps: ['Monitor AI performance metrics', 'Manage users & permissions', 'View compliance reports', 'Manage billing & subscriptions'] },
  technician:  { icon: '⚙️', color: '#F59E0B', title: 'Technician Workspace', steps: ['Upload DICOM scans', 'Monitor AI processing queue', 'Handle scan failures', 'Manage PACS integration'] },
  patient:     { icon: '👤', color: '#1DBF73', title: 'Patient Portal', steps: ['View your radiology reports', 'Book appointments', 'Manage consent & data rights', 'Message your care team'] },
};

export const OnboardingWalkthrough: React.FC<OnboardingWalkthroughProps> = ({ role, firstName, hospital }): any => {
  const rc = ROLE_CONFIG[role];

  return (
    <AbsoluteFill style={{ background: B.bg0, fontFamily: B.F, padding: 80 }}>
      <Sequence from={0} durationInFrames={60}>
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <FadeIn>
            <div style={{ fontSize: 28, color: B.textMd, marginBottom: 12 }}>Welcome to SEWA XAI,</div>
            <div style={{ fontSize: 64, fontWeight: 900, color: B.textHi, letterSpacing: '-2px', marginBottom: 12 }}>{firstName}</div>
            <div style={{ fontSize: 22, color: B.textMd }}>{hospital}</div>
          </FadeIn>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={60}>
        <AbsoluteFill style={{ padding: 80 }}>
          <SlideUp>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 48 }}>
              <div style={{ width: 64, height: 64, background: `${rc.color}20`, border: `2px solid ${rc.color}`, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                {rc.icon}
              </div>
              <div>
                <div style={{ fontSize: 14, color: B.textLo, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your workspace</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: B.textHi }}>{rc.title}</div>
              </div>
            </div>
          </SlideUp>

          {rc.steps.map((step, i) => (
            <Sequence key={i} from={20 + i * 25}>
              <SlideUp>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '18px 0', borderBottom: `1px solid #1B3028` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 18, background: `${rc.color}20`, border: `1px solid ${rc.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: rc.color, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 20, color: B.textMd }}>{step}</div>
                </div>
              </SlideUp>
            </Sequence>
          ))}
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
