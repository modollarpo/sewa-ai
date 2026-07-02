// SEWA XAI — backend/src/routes/reports.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as ctrl from '../controllers/reportController';
const r = Router();
r.use(authenticate);
r.get('/',                ctrl.listReports);
r.get('/:id',             ctrl.getReport);
r.get('/:id/download',    ctrl.downloadReport);
r.post('/generate/:scanId', ctrl.generateReport);
r.post('/feedback/:scanId', ctrl.logFeedback);
r.patch('/:id',           ctrl.updateReport);
r.post('/:id/sign',       authorize('radiologist','admin','superadmin'), ctrl.signReport);
export default r;
