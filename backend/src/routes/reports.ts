// SEWA XAI — backend/src/routes/reports.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as ctrl from '../controllers/reportController';
import { prisma } from '../utils/prismaClient';
const r = Router();
r.use(authenticate);
r.get('/',                ctrl.listReports);
r.get('/:id',             ctrl.getReport);
r.get('/:id/download',    ctrl.downloadReport);
r.post('/generate/:scanId', ctrl.generateReport);
r.post('/feedback/:scanId', ctrl.logFeedback);
r.patch('/:id',           ctrl.updateReport);
r.post('/:id/sign',       authorize('radiologist','admin','superadmin'), ctrl.signReport);

/**
 * POST /api/v1/reports
 * Save a draft report (RadiologistWorkspace "Save Report" action)
 */
r.post('/', authorize('radiologist', 'admin', 'superadmin'), async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const { scanId, findings, impression, technique, recommendation } = req.body;

    if (!scanId) {
      return res.status(400).json({ error: 'scanId is required' });
    }

    const report = await prisma.report.create({
      data: {
        tenantId,
        scanId,
        authorId: userId,
        findings: findings || '',
        impression: impression || '',
        technique: technique || '',
        recommendation: recommendation || '',
        status: 'DRAFT',
      }
    });

    res.status(201).json(report);
  } catch (err) { next(err); }
});
export default r;
