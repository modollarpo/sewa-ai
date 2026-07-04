// SEWA XAI — backend/src/routes/longitudinal.ts
import { Router } from 'express';
import { prisma } from '../utils/prismaClient';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
import { findPriorScan, performDeformableRegistration } from '../services/longitudinalService';

const router = Router();
router.use(authenticate);

// Get all prior scans for a patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const patientId = req.params.patientId;

    const scans = await prisma.scan.findMany({
      where: {
        patientId,
        status: 'COMPLETED',
        aiResult: { isNot: null }
      },
      include: { patient: true, aiResult: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json(scans);
  } catch (err) {
    logger.error('[LONGITUDINAL_GET_ERROR]:', err);
    res.status(500).json({ error: 'Failed to load longitudinal scans' });
  }
});

// Get prior scan info for comparison
router.get('/prior/:scanId', async (req, res) => {
  try {
    const currentScan = await prisma.scan.findUnique({
      where: { id: req.params.scanId },
      include: { patient: true }
    });

    if (!currentScan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    if (!currentScan.patientId) {
      return res.status(400).json({ error: 'Scan has no patient ID' });
    }

    const priorScan = await findPriorScan(
      currentScan.patientId,
      currentScan.id,
      currentScan.modality,
      currentScan.bodyPart
    );

    res.json({ currentScan, priorScan });
  } catch (err) {
    logger.error('[LONGITUDINAL_PRIOR_ERROR]:', err);
    res.status(500).json({ error: 'Failed to load prior scan' });
  }
});

// Initiate deformable registration
router.post('/register', async (req, res) => {
  try {
    const { currentScanId, priorScanId } = req.body;

    if (!currentScanId || !priorScanId) {
      return res.status(400).json({ error: 'currentScanId and priorScanId are required' });
    }

    const result = await performDeformableRegistration(currentScanId, priorScanId);

    res.json(result);
  } catch (err) {
    logger.error('[LONGITUDINAL_REGISTER_ERROR]:', err);
    res.status(500).json({ error: 'Failed to perform registration' });
  }
});

export default router;
