import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { listReportVersions, getReportVersion, verifyReportVersion } from '../services/reportVersionService';

const r = Router();
r.use(authenticate);

r.get('/report/:reportId/versions', async (req, res, next) => {
  try {
    const versions = await listReportVersions(req.params.reportId);
    res.json({ versions });
  } catch (err) { next(err); }
});

r.get('/report/:reportId/versions/:version', async (req, res, next) => {
  try {
    const v = await getReportVersion(req.params.reportId, parseInt(req.params.version));
    if (!v) return res.status(404).json({ error: 'Version not found' });
    res.json(v);
  } catch (err) { next(err); }
});

r.get('/report/:reportId/versions/:version/verify', async (req, res, next) => {
  try {
    const valid = await verifyReportVersion(req.params.reportId, parseInt(req.params.version));
    res.json({ valid, version: parseInt(req.params.version) });
  } catch (err) { next(err); }
});

export default r;
