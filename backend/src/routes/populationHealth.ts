// SEWA XAI — backend/src/routes/populationHealth.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { populationHealthService } from '../services/roadmap/populationHealthService';
import { auditLog } from '../utils/audit';
import { AppError } from '../utils/AppError';

const router = Router();
router.use(authenticate);

/** Get disease surveillance time-series data (k-anonymised) */
router.get('/surveillance', async (req, res, next) => {
  try {
    const { startDate, endDate, region, granularity = 'day' } = req.query;
    const data = await populationHealthService.getDiseaseSurveillance({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      region: region as string,
      granularity: granularity as 'day' | 'week' | 'month',
    });
    res.json(data);
  } catch (err) { next(err); }
});

/** Detect outbreaks with Z-score anomaly detection */
router.get('/outbreaks', async (req, res, next) => {
  try {
    const { region } = req.query;
    const outbreaks = await populationHealthService.detectOutbreaks(region as string);
    res.json(outbreaks);
  } catch (err) { next(err); }
});

/** Get prevalence map by country */
router.get('/prevalence', async (req, res, next) => {
  try {
    const { condition, startDate, endDate } = req.query;
    if (!condition) throw new AppError('Condition is required', 400);
    const map = await populationHealthService.getPrevalenceMap(
      condition as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json(map);
  } catch (err) { next(err); }
});

/** Get global summary stats (super-admin only) */
router.get('/summary', authorize(['superadmin']), async (req, res, next) => {
  try {
    const summary = await populationHealthService.getGlobalSummary();
    res.json(summary);
  } catch (err) { next(err); }
});

export default router;
