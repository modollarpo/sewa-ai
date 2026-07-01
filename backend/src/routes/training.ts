// SEWA XAI — backend/src/routes/training.ts
// Anonymized training cases for radiologists and students

import { Router } from 'express';
import { prisma } from '../utils/prismaClient';
import { authenticate, authorize } from '../middleware/auth';

const r = Router();

// ── ALL training routes require authentication ─────────────────────────────
// PREVIOUSLY: /student-cases was unauthenticated and leaked real patient scan
// data (clinicalIndication, AI findings) to any anonymous internet request.
// GDPR Art. 9 violation — special category health data exposed without consent.
r.use(authenticate);

/**
 * GET /api/v1/training/student-cases (Authenticated — any role)
 * Returns anonymised scan cases filtered to this tenant only.
 */
r.get('/student-cases', async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const scans = await prisma.scan.findMany({
      where: { status: 'COMPLETED', tenantId },  // tenant-scoped
      take: 10,
      include: { aiResult: true },
    });

    const cases = scans.map((s: any) => ({
      id: s.id,
      type: `${s.modality} ${s.bodyPart}`,
      // Never expose clinicalIndication — it may contain patient-identifiable info
      clinicalInfo: 'Clinical history available to treating clinicians only.',
      findings: s.aiResult?.vlmFindings || 'Findings are being analyzed.',
      label: s.aiResult?.urgency?.toLowerCase() === 'critical' ? 'critical' : 'normal',
      diagnosis: s.aiResult?.primaryFinding || 'Normal',
    }));

    res.json(cases);
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/training/cases (Authenticated radiologist/doctor)
 */
r.get('/cases', authorize('radiologist', 'doctor', 'admin', 'superadmin'), async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const scans = await prisma.scan.findMany({
      where: { status: 'COMPLETED', tenantId },  // tenant-scoped
      take: 5,
      include: { aiResult: true },
    });

    const cases = scans.map((s: any) => ({
      id: s.id,
      modality: s.modality,
      bodyPart: s.bodyPart,
      groundTruth: s.aiResult?.primaryFinding || 'Normal',
      options: [
        'Normal',
        s.aiResult?.primaryFinding || 'Acute Finding',
        'Artifact / Quality issue',
        'Uncertain / Human review needed',
      ].sort(() => Math.random() - 0.5),
      difficulty: s.aiResult?.confidence && s.aiResult.confidence > 0.9 ? 'EASY' : 'MEDIUM',
      explanation: s.aiResult?.vlmImpression || 'The AI detected signs of pathology consistent with the primary finding.',
    }));

    res.json(cases);
  } catch (err) { next(err); }
});

export default r;
