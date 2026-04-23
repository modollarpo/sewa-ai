// SEWA AI — frontend/src/remotion/compositions.tsx
// Remotion video compositions for SEWA AI platform.
//
// Use cases:
//   1. AIResultExplainer  — animated video showing triage result + Grad-CAM heatmap reveal
//   2. ClinicalReportSummary — 30s video summary of a signed radiology report
//   3. PlatformIntro     — public-facing 60s product explainer for marketing site
//   4. OnboardingWalkthrough — role-specific onboarding video for new clinicians
//
// Usage (in-browser player):
//   import { Player } from '@remotion/player';
//   import { AIResultExplainer } from './remotion/compositions';
//   <Player component={AIResultExplainer} durationInFrames={150} fps={30} compositionWidth={1920} compositionHeight={1080} inputProps={{ ... }} />
//
// Usage (server-side render to MP4):
//   npx remotion render src/remotion/index.ts AIResultExplainer output.mp4
//
// Usage (still/thumbnail export):
//   npx remotion still src/remotion/index.ts PlatformIntro --frame=0 thumbnail.png

import React from 'react';
import {
  AbsoluteFill, Sequence, spring, useCurrentFrame,
  useVideoConfig, interpolate, Easing,
} from 'remotion';

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
  F:       "'IBM Plex Sans', sans-serif",
  FM:      "'IBM Plex Mono', monospace",
};

// ── Shared animated components ─────────────────────────────────
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 100 } });
  return <div style={{ opacity }}>{children}</div>;
}

function SlideUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
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
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 30, stiffness: 40 } });
  const value = interpolate(progress, [0, 1], [0, target]);
  return <span>{value.toFixed(decimals)}{suffix}</span>;
}

function ProgressBar({ value, delay = 0, color = B.brand, height = 8 }: {
  value: number; delay?: number; color?: string; height?: number;
}) {
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
}) => {
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
              <div style={{ fontSize: 28, fontWeight: 800, color: B.textHi, letterSpacing: '-0.5px' }}>SEWA AI</div>
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
                  <div style={{ width: 360, height: 280, background: B.bg1, borderRadius: 16, border: `2px solid ${urgencyColor}40`, overflow: 'hidden', position: 'relative' }}>
                    <img src={gradcamUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.8)', borderRadius: 8, padding: '6px 12px' }}>
                      <span style={{ fontSize: 12, color: B.textMd }}>Grad-CAM Heatmap</span>
                    </div>
                  </div>
                </FadeIn>
              </Sequence>
            )}
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
}) => {
  return (
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
                <div style={{ fontSize: 22, fontWeight: 800, color: B.textHi }}>SEWA AI</div>
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
  );
};

// ══════════════════════════════════════════════════════════════
// 3. PLATFORM INTRO (300 frames @ 30fps = 10 seconds)
//    Public-facing product explainer — for marketing & pitch
// ══════════════════════════════════════════════════════════════
export const PlatformIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { value: 97.1, label: 'AUC-ROC ICH', suffix: '%', color: B.critical },
    { value: 2,    label: 'Triage time', suffix: 's', color: B.amber },
    { value: 47,   label: 'Hospitals',   suffix: '+', color: B.brand },
    { value: 7,    label: 'Countries',   suffix: '',  color: B.normal },
  ];

  const engines = [
    { icon: '⚡', label: 'Triage Engine',    color: B.critical },
    { icon: '🎯', label: 'Uncertainty',      color: B.amber },
    { icon: '🧠', label: 'Metacognition',    color: B.info },
    { icon: '📋', label: 'VLM Reports',      color: B.normal },
  ];

  return (
    <AbsoluteFill style={{ background: B.bg0, fontFamily: B.F }}>

      {/* Opening — logo + tagline */}
      <Sequence from={0} durationInFrames={90}>
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <FadeIn>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 80, height: 80, background: `linear-gradient(135deg,${B.brand},${B.brandLt})`, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <div style={{ fontSize: 72, fontWeight: 900, color: B.textHi, letterSpacing: '-3px', marginBottom: 16 }}>SEWA AI</div>
              <div style={{ fontSize: 24, color: B.textMd, maxWidth: 600, lineHeight: 1.5, margin: '0 auto' }}>
                From Hours to Seconds: Autonomous AI-Powered<br/>Diagnostic Intelligence for Global Healthcare.
              </div>
            </div>
          </FadeIn>
        </AbsoluteFill>
      </Sequence>

      {/* Stats section */}
      <Sequence from={90} durationInFrames={120}>
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
          <SlideUp>
            <div style={{ fontSize: 36, fontWeight: 800, color: B.textHi, textAlign: 'center', marginBottom: 60 }}>
              Clinical performance you can measure
            </div>
          </SlideUp>
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center' }}>
            {stats.map((stat, i) => (
              <Sequence key={i} from={i * 18}>
                <SlideUp>
                  <div style={{ padding: '32px 40px', background: B.bg2, border: `2px solid ${stat.color}40`, borderRadius: 20, textAlign: 'center', minWidth: 180 }}>
                    <div style={{ fontSize: 56, fontWeight: 900, color: stat.color, fontFamily: B.FM, lineHeight: 1 }}>
                      <CountUp target={stat.value} suffix={stat.suffix} decimals={stat.value % 1 !== 0 ? 1 : 0} />
                    </div>
                    <div style={{ fontSize: 15, color: B.textMd, marginTop: 12 }}>{stat.label}</div>
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
          <SlideUp>
            <div style={{ fontSize: 36, fontWeight: 800, color: B.textHi, textAlign: 'center', marginBottom: 48 }}>
              4-Engine Safety Architecture
            </div>
          </SlideUp>
          <div style={{ display: 'flex', gap: 24 }}>
            {engines.map((e, i) => (
              <Sequence key={i} from={i * 15}>
                <SlideUp>
                  <div style={{ padding: '28px 32px', background: B.bg2, border: `2px solid ${e.color}50`, borderRadius: 20, textAlign: 'center', minWidth: 160 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>{e.icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: e.color }}>{e.label}</div>
                  </div>
                </SlideUp>
              </Sequence>
            ))}
          </div>
          <Sequence from={80}>
            <FadeIn>
              <div style={{ marginTop: 48, fontSize: 18, color: B.textMd, textAlign: 'center' }}>
                NHS · FDA 510(k) · EU MDR IIb · ISO 13485 · GDPR · HIPAA
              </div>
            </FadeIn>
          </Sequence>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
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

export const OnboardingWalkthrough: React.FC<OnboardingWalkthroughProps> = ({ role, firstName, hospital }) => {
  const rc = ROLE_CONFIG[role];

  return (
    <AbsoluteFill style={{ background: B.bg0, fontFamily: B.F, padding: 80 }}>
      <Sequence from={0} durationInFrames={60}>
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <FadeIn>
            <div style={{ fontSize: 28, color: B.textMd, marginBottom: 12 }}>Welcome to SEWA AI,</div>
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
