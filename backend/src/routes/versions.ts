// SEWA XAI — backend/src/routes/versions.ts
// Report versioning API — tamper-evident snapshot management
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { listReportVersions, getReportVersion, verifyReportVersion } from '../services/reportVersionService';

const r = Router();
r.use(authenticate);

/**
 * GET /api/v1/versions/report/:reportId/versions
 * @summary List all versions of a report
 * @tags Versions
 * @param {string} reportId.path - Report ID
 * @return {object} 200 - { versions: ReportVersion[] }
 * @return {object} 401 - Unauthorized
 */
r.get('/report/:reportId/versions', async (req, res, next) => {
  try {
    const versions = await listReportVersions(req.params.reportId);
    res.json({ versions });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/versions/report/:reportId/versions/:version
 * @summary Get a specific report version with full content
 * @tags Versions
 * @param {string} reportId.path - Report ID
 * @param {number} version.path - Version number
 * @return {object} 200 - ReportVersion
 * @return {object} 404 - Version not found
 */
r.get('/report/:reportId/versions/:version', async (req, res, next) => {
  try {
    const v = await getReportVersion(req.params.reportId, parseInt(req.params.version));
    if (!v) return res.status(404).json({ error: 'Version not found' });
    res.json(v);
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/versions/report/:reportId/versions/:version/verify
 * @summary Verify SHA-256 integrity of a report version
 * @tags Versions
 * @param {string} reportId.path - Report ID
 * @param {number} version.path - Version number
 * @return {object} 200 - { valid: boolean, version: number }
 */
r.get('/report/:reportId/versions/:version/verify', async (req, res, next) => {
  try {
    const valid = await verifyReportVersion(req.params.reportId, parseInt(req.params.version));
    res.json({ valid, version: parseInt(req.params.version) });
  } catch (err) { next(err); }
});

export default r;
