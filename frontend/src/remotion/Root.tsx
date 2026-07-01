// SEWA XAI — frontend/src/remotion/Root.tsx
// Registers all video compositions for Remotion Studio and CLI rendering

import React from 'react';
import { Composition } from 'remotion';
import {
  AIResultExplainer,
  ClinicalReportSummary,
  PlatformIntro,
  OnboardingWalkthrough,
} from './compositions';

export const RemotionRoot: React.FC = () => (
  <>
    {/* 5-second AI triage result video — 1920×1080, 30fps */}
    <Composition
      id="AIResultExplainer"
      component={AIResultExplainer as any}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        scanId:      'SCAN-4821',
        modality:    'CT',
        bodyPart:    'Head',
        diagnosis:   'Intracranial Haemorrhage (ICH)',
        confidence:  0.97,
        urgency:     'CRITICAL',
        gradcamUrl:  '',
        patientRef:  'PT-00123',
        hospital:    'Royal London Hospital',
      }}
    />

    {/* 7-second clinical report summary video */}
    <Composition
      id="ClinicalReportSummary"
      component={ClinicalReportSummary as any}
      durationInFrames={210}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        reportId:       'RPT-2026-0001',
        scanId:         'SCAN-4821',
        patientRef:     'PT-00123',
        radiologist:    'Sarah Chen',
        signedAt:       '18 Mar 2026 14:32 GMT',
        modality:       'CT Head',
        findings:       [
          'Hyperdense region right basal ganglia — consistent with ICH',
          'Volume estimated 18mL — moderate bleed',
          'No midline shift detected',
          'Ventricles appear normal in size',
        ],
        impression:     'Right basal ganglia haemorrhage, moderate volume. No herniation. Urgent neurosurgical review warranted.',
        recommendation: 'Urgent neurosurgical referral. Repeat CT in 6 hours. Monitor GCS.',
        urgency:        'CRITICAL',
      }}
    />

    {/* 10-second platform marketing intro */}
    <Composition
      id="PlatformIntro"
      component={PlatformIntro as any}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{}}
    />

    {/* 6-second role onboarding video — radiologist example */}
    <Composition
      id="OnboardingWalkthrough"
      component={OnboardingWalkthrough as any}
      durationInFrames={180}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        role:      'radiologist',
        firstName: 'Sarah',
        hospital:  'Royal London Hospital',
      }}
    />
  </>
);
