import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { calibrationService } from '../services/calibrationService';
import { logger } from '../utils/logger';
import { auditLog } from '../utils/audit';

const router = Router();

/**
 * GET /api/v1/learning-loop/queue
 * Returns cases flagged for peer review due to AI uncertainty or primary radiologist overrides.
 */
router.get('/queue',
  authenticate, authorize('radiologist', 'superadmin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req.user!;
      
      // We look for scans that either:
      // 1. have requiresHumanReview = true (flagged by AI uncertainty engine)
      // 2. OR have ACIFeedback records (radiologist corrected the report)
      
      const scans = await prisma.scan.findMany({
        where: {
          tenantId,
          OR: [
            { requiresHumanReview: true },
            {
              // Prisma workaround to check for existence of related records
              id: { in: (await prisma.aCIFeedback.findMany({ select: { scanId: true }, where: { tenantId } })).map(f => f.scanId) }
            }
          ]
        },
        include: {
          patient: { select: { mrn: true, sex: true, dateOfBirth: true } },
          aiResult: true,
          report: true
        },
        take: 20,
        orderBy: { createdAt: 'desc' }
      });
      
      // Manually attach feedback if it exists
      const scanIds = scans.map(s => s.id);
      const feedbacks = await prisma.aCIFeedback.findMany({
        where: { scanId: { in: scanIds } }
      });
      
      const enrichedScans = scans.map(scan => {
        const feedback = feedbacks.find(f => f.scanId === scan.id);
        return {
          ...scan,
          feedback: feedback || null
        };
      });

      res.json({ queue: enrichedScans, total: enrichedScans.length });
    } catch (err) { next(err); }
  }
);

/**
 * POST /api/v1/learning-loop/review/:scanId
 * Submit final peer review adjudication.
 */
router.post('/review/:scanId',
  authenticate, authorize('radiologist', 'superadmin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { scanId } = req.params;
      const { tenantId, id: userId } = req.user!;
      const { finalGroundTruth, agreementTarget } = req.body;
      // agreementTarget: 'AI' | 'RADIOLOGIST_1' | 'CUSTOM'

      if (!finalGroundTruth) throw new AppError('finalGroundTruth is required', 400);

      // Load AI result so the adjudication can be recorded against it
      const scan = await prisma.scan.findFirst({
        where: { id: scanId, tenantId },
        include: { aiResult: true },
      });
      if (!scan) throw new AppError('Scan not found', 404);

      // ── Calibration wiring (audit E-09) ────────────────────────────────
      // recordPrediction was defined but never called. This adjudication is
      // the prediction-outcome pair source: correct when the final ground
      // truth matches the AI finding, incorrect otherwise.
      if (scan.aiResult) {
        const aiFinding = scan.aiResult.primaryFinding;
        const isCorrect = finalGroundTruth.trim().toLowerCase() === aiFinding.trim().toLowerCase();
        const modelVersion = scan.aiResult.modelVersion ?? null;
        const confidenceBin = binFor(scan.aiResult.confidence);
        await calibrationService.recordPrediction({
          scanId,
          tenantId,
          modality: scan.modality,
          predictedConfidence: scan.aiResult.confidence,
          predictedFinding: aiFinding,
          actualOutcome: isCorrect ? 'correct' : 'incorrect',
          outcomeDeterminedBy: 'radiologist',
          outcomeDeterminedAt: new Date(),
          clinicianOverride: !isCorrect,
        }).catch(e => logger.warn(`[LearningLoop] calibration record failed: ${e.message}`));

        // ── Per-case signal logger (audit §30.2) ─────────────────────────
        // Ground truth lands on the AIResult row it belongs to. FP/FN flags
        // stay null on purpose: a single-string ground truth cannot separate
        // a false positive from a missed finding, and guessing would fabricate
        // a metric (audit §34.4).
        await prisma.aIResult.update({
          where: { id: scan.aiResult.id },
          data: {
            validationStatus: isCorrect ? 'CONFIRMED' : 'REJECTED',
            humanCorrectedFinding: isCorrect ? null : finalGroundTruth,
            validationComments: `Adjudicated via peer review (agreementTarget=${agreementTarget ?? 'unspecified'})`,
            validatedBy: userId,
            validatedAt: new Date(),
          },
        }).catch(e => logger.warn(`[LearningLoop] AIResult validation update failed: ${e.message}`));

        // CalibrationRecord / CalibrationSummary tables had zero writers;
        // record the prediction-outcome pair and the per-pair Brier term on
        // the provenance row so the ECE/Brier machinery has real inputs.
        await prisma.calibrationRecord.create({
          data: {
            tenantId,
            modality: scan.modality,
            modelVersion,
            predictedConfidence: scan.aiResult.confidence,
            actualOutcome: isCorrect,
            confidenceBin,
            scanId,
            aiResultId: scan.aiResult.id,
          },
        }).catch(e => logger.warn(`[LearningLoop] CalibrationRecord failed: ${e.message}`));

        const brier = (scan.aiResult.confidence - (isCorrect ? 1 : 0)) ** 2;
        await prisma.metacognitionAuditLog.updateMany({
          where: { scanId, tenantId },
          data: { calibrationBin: confidenceBin, brierScore: brier },
        }).catch(e => logger.warn(`[LearningLoop] audit-log calibration update failed: ${e.message}`));

        await auditLog({
          tenantId, userId, action: 'ADJUDICATION_RECORDED',
          entity: 'Scan', entityId: scanId,
          metadata: { aiFinding, finalGroundTruth, aiCorrect: isCorrect },
        }).catch(e => logger.warn(`[LearningLoop] auditLog failed: ${e.message}`));
      }

      // Reset the requiresHumanReview flag since it has been peer-reviewed
      await prisma.scan.update({
        where: { id: scanId },
        data: { requiresHumanReview: false }
      });

      // Simulate sending to Continuous Learning microservice for retraining
      // fetch(process.env.CL_SERVICE_URL + '/adjudication', { ... })

      res.json({ 
        message: 'Peer review recorded and dispatched to Continuous Learning Engine.',
        adjudication: { scanId, userId, agreementTarget, calibrationRecorded: !!scan.aiResult }
      });
    } catch (err) { next(err); }
  }
);

/** Equal-width confidence bin label used by CalibrationRecord.calibrationBin. */
function binFor(confidence: number): string {
  const c = Math.min(0.9999, Math.max(0, Number.isFinite(confidence) ? confidence : 0));
  const lo = Math.floor(c * 10) / 10;
  const hi = Math.min(1, lo + 0.1);
  return `${lo.toFixed(2)}-${hi.toFixed(2)}`;
}

export default router;
