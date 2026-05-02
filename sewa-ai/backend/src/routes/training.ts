// SEWA AI — backend/src/routes/training.ts
// Anonymized training cases for radiologists and students

import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const r = Router();

/**
 * GET /api/v1/training/student-cases (Public)
 */
r.get('/student-cases', async (req, res, next) => {
  try {
    const scans = await prisma.scan.findMany({
      where: { status: 'COMPLETED' },
      take: 10,
      include: { aiResult: true }
    });

    const cases = scans.map(s => ({
      id: s.id,
      type: `${s.modality} ${s.bodyPart}`,
      clinicalInfo: s.clinicalIndication || 'No clinical history provided.',
      findings: s.aiResult?.vlmFindings || 'Findings are being analyzed.',
      label: s.aiResult?.urgency?.toLowerCase() === 'critical' ? 'critical' : 'normal',
      diagnosis: s.aiResult?.primaryFinding || 'Normal'
    }));

    res.json(cases);
  } catch (err) { next(err); }
});

r.use(authenticate);

/**
 * GET /api/v1/training/cases (Authenticated)
 */
r.get('/cases', async (req, res, next) => {
  try {
    // In production, this would pull from a curated 'TrainingCase' table.
    // For now, we fetch a few completed scans and anonymize them for the simulator.
    const scans = await prisma.scan.findMany({
      where: { status: 'COMPLETED' },
      take: 5,
      include: { aiResult: true }
    });

    const cases = scans.map(s => ({
      id: s.id,
      modality: s.modality,
      bodyPart: s.bodyPart,
      groundTruth: s.aiResult?.primaryFinding || 'Normal',
      options: [
        'Normal',
        s.aiResult?.primaryFinding || 'Acute Finding',
        'Artifact / Quality issue',
        'Uncertain / Human review needed'
      ].sort(() => Math.random() - 0.5),
      difficulty: s.aiResult?.confidence && s.aiResult.confidence > 0.9 ? 'EASY' : 'MEDIUM',
      explanation: s.aiResult?.vlmImpression || 'The AI detected signs of pathology consistent with the primary finding.'
    }));

    res.json(cases);
  } catch (err) { next(err); }
});

export default r;
