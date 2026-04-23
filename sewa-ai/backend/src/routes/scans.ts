// SEWA AI — backend/src/routes/scans.ts
import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth';
import * as ctrl from '../controllers/scanController';
import { enforceQuota } from '../middleware/scanQuota';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });
const r = Router();
r.use(authenticate);
r.get('/',           ctrl.getWorklist);
r.get('/:id',        ctrl.getScan);
// enforceQuota MUST come before multer — quota check before file is buffered into memory
r.post('/upload',    enforceQuota, upload.single('file') as any, ctrl.uploadScan);
r.post('/demo',      ctrl.generateDemoScan);
r.patch('/:id/status', authorize('radiologist','admin','superadmin'), ctrl.updateScanStatus);
r.delete('/:id',     authorize('admin','superadmin'), ctrl.deleteScan);
export default r;
