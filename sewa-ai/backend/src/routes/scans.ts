import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth';
import * as ctrl from '../controllers/scanController';
import { enforceQuota } from '../middleware/scanQuota';
import { uploadLimiter } from '../middleware/rateLimiter';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });
const r = Router();
r.use(authenticate);
r.get('/',           ctrl.getWorklist);
r.get('/:id',        ctrl.getScan);
// uploadLimiter (50/hr/IP) → enforceQuota (tenant monthly budget) → multer (memory buffer)
r.post('/upload',    uploadLimiter, enforceQuota, upload.single('file') as any, ctrl.uploadScan);
r.post('/sync-batch', ctrl.syncOfflineBatch);
r.post('/demo',      ctrl.generateDemoScan);
r.patch('/:id/status', authorize('radiologist','admin','superadmin'), ctrl.updateScanStatus);
r.post('/:id/notify', authorize('radiologist','admin','superadmin'), ctrl.notifyScan);
r.delete('/:id',     authorize('admin','superadmin'), ctrl.deleteScan);
export default r;
