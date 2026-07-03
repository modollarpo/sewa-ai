// SEWA XAI — backend/src/routes/training.ts
import { Router } from 'express';
import { prisma } from '../utils/prismaClient';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
router.use(authenticate);

const SAMPLE_CASES = [
  {
    id: 'case-1',
    modality: 'CT',
    bodyPart: 'HEAD',
    groundTruth: 'Acute Intracranial Hemorrhage',
    options: ['Normal', 'Acute Intracranial Hemorrhage', 'Ischemic Stroke', 'Meningioma'],
    difficulty: 'MEDIUM',
    explanation: 'The hyperdense (bright white) lesion in the left basal ganglia is consistent with acute bleeding.'
  },
  {
    id: 'case-2',
    modality: 'CT',
    bodyPart: 'CHEST',
    groundTruth: 'Pneumonia',
    options: ['Normal', 'Pneumonia', 'Pulmonary Embolism', 'Pleural Effusion'],
    difficulty: 'EASY',
    explanation: 'Consolidation in the right lower lobe with air bronchograms is classic for bacterial pneumonia.'
  },
  {
    id: 'case-3',
    modality: 'MRI',
    bodyPart: 'HEAD',
    groundTruth: 'Ischemic Stroke',
    options: ['Normal', 'Ischemic Stroke', 'Tumor', 'MS Plaque'],
    difficulty: 'HARD',
    explanation: 'Diffusion-weighted imaging shows restricted diffusion in the left MCA territory indicating acute infarction.'
  },
  {
    id: 'case-4',
    modality: 'MAMMOGRAPHY',
    bodyPart: 'BREAST',
    groundTruth: 'Benign Calcifications',
    options: ['Normal', 'Benign Calcifications', 'Malignant Mass', 'Fibroadenoma'],
    difficulty: 'MEDIUM',
    explanation: 'Round, punctate, smooth-edged calcifications with uniform distribution are typically benign.'
  },
  {
    id: 'case-5',
    modality: 'RETINAL',
    bodyPart: 'EYE',
    groundTruth: 'Diabetic Retinopathy (Moderate NPDR)',
    options: ['Normal', 'Diabetic Retinopathy (Moderate NPDR)', 'Glaucoma', 'AMD (Dry)'],
    difficulty: 'MEDIUM',
    explanation: 'Microaneurysms, dot hemorrhages, and hard exudates consistent with moderate non-proliferative diabetic retinopathy.'
  }
];

router.get('/cases', async (req, res) => {
  try {
    // In a real app, you'd pull from the database with anonymized cases
    return res.status(200).json(SAMPLE_CASES);
  } catch (err) {
    logger.error('[TRAINING_CASES_ERROR:', err);
    res.status(500).json({ error: 'Failed to load training cases' });
  }
});

// Save training attempt
router.post('/attempt', async (req, res) => {
  try {
    // In real app, save attempt to database
    return res.status(201).json({ success: true });
  } catch (err) {
    logger.error('[TRAINING_ATTEMPT_ERROR:', err);
    res.status(500).json({ error: 'Failed to save attempt' });
  }
});

export default router;
