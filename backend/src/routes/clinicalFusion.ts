import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

const router = Router();

/**
 * POST /api/v1/clinical-fusion/evaluate/:scanId
 * Fuses patient clinical history (vitals, labs, medications) with AI Vision findings.
 * Calculates clinical adjustments to priority and urgency.
 */
router.post('/evaluate/:scanId',
  authenticate, authorize('radiologist', 'admin', 'superadmin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { scanId } = req.params;
      const { tenantId } = req.user!;
      const { clinicalHistory, labs, vitals } = req.body;
      
      // Labs structure: { troponin: number; dDimer: number; gcs: number }
      // Vitals: { heartRate: number; systolicBp: number }
      // ClinicalHistory: { onAnticoagulants: boolean; priorStroke: boolean }

      const scan = await prisma.scan.findFirst({
        where: { id: scanId, tenantId },
        include: { aiResult: true }
      });

      if (!scan) throw new AppError('Scan not found', 404);

      let urgency = scan.urgency || 'ROUTINE';
      const originalUrgency = urgency;
      const reasons: string[] = [];
      let contextFactor = 1.0;

      if (labs) {
        // High Troponin indicates active myocardial infarction risk
        if (labs.troponin > 0.4) {
          contextFactor += 0.3;
          reasons.push('Elevated Troponin (>0.4 ng/mL) indicates acute ischemic event risk');
        }
        // High D-Dimer indicates PE / thrombosis risk
        if (labs.dDimer > 500) {
          contextFactor += 0.25;
          reasons.push('Elevated D-Dimer (>500 ng/mL) indicates active thrombotic process');
        }
        // GCS < 9 is severe neurological compromise
        if (labs.gcs && labs.gcs < 9) {
          contextFactor += 0.4;
          reasons.push(`Low GCS score (${labs.gcs}) indicates acute altered mental status`);
        }
      }

      if (clinicalHistory) {
        if (clinicalHistory.onAnticoagulants && scan.bodyPart.toUpperCase().includes('HEAD')) {
          contextFactor += 0.35;
          reasons.push('Patient is active on anticoagulants (enhanced risk for intracranial hemorrhage expansion)');
        }
        if (clinicalHistory.priorStroke) {
          contextFactor += 0.15;
          reasons.push('Patient has a prior history of cerebrovascular accident (CVA)');
        }
      }

      // Upgrade Urgency based on contextFactor thresholds
      if (contextFactor >= 1.5) {
        if (urgency === 'NORMAL' || urgency === 'ROUTINE') urgency = 'URGENT';
        else if (urgency === 'URGENT') urgency = 'CRITICAL';
      } else if (contextFactor >= 1.8) {
        urgency = 'CRITICAL';
      }

      // Update scan record if urgency upgraded
      if (urgency !== originalUrgency) {
        await prisma.scan.update({
          where: { id: scanId },
          data: { urgency }
        });
      }

      res.json({
        scanId,
        originalUrgency,
        fusedUrgency: urgency,
        adjustmentFactor: parseFloat(contextFactor.toFixed(2)),
        reasons,
        multimodalSignals: {
          labs: labs || null,
          vitals: vitals || null,
          clinicalHistory: clinicalHistory || null
        }
      });
    } catch (err) { next(err); }
  }
);

export default router;
