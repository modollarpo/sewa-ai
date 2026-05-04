// SEWA AI — backend/src/routes/roadmap/index.ts
// Aggregated router for all roadmap feature endpoints

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize }  from '../../middleware/auth';
import { prisma }               from '../../config/database';
import { clinicalRulesEngine }       from '../../services/roadmap/clinicalRulesEngine';
import { strokeCodeService }         from '../../services/roadmap/strokeCodeService';
import { populationHealthService }   from '../../services/roadmap/populationHealthService';
import { referralNetworkService }    from '../../services/roadmap/referralNetworkService';
import { AppError }                  from '../../utils/AppError';

const router = Router();

// ── Clinical Rules Engine ────────────────────────────────────
/** GET /api/v1/rules — list rules for tenant */
router.get('/rules',
  authenticate, authorize('admin', 'superadmin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rules = await clinicalRulesEngine.getRules(req.user!.tenantId);
      res.json({ rules, total: rules.length });
    } catch (err) { next(err); }
  }
);

/** POST /api/v1/rules/evaluate — manually evaluate rules for a scan result */
router.post('/rules/evaluate',
  authenticate, authorize('radiologist', 'admin', 'superadmin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { scanId, aiResult } = req.body;
      const { tenantId } = req.user!;
      if (!scanId || !aiResult) throw new AppError('scanId and aiResult required', 400);

      // Security Gap: verify scan belongs to this tenant
      const scan = await prisma.scan.findFirst({ where: { id: scanId, tenantId } });
      if (!scan) throw new AppError('Scan not found in this institution', 404);

      const result = await clinicalRulesEngine.evaluate(tenantId, scanId, aiResult);
      res.json(result);
    } catch (err) { next(err); }
  }
);

// ── Stroke Codes ─────────────────────────────────────────────
/** GET /api/v1/stroke-codes — list active codes for tenant */
router.get('/stroke-codes',
  authenticate, authorize('doctor', 'radiologist', 'admin', 'superadmin'),
  async (req: Request, res: Response) => {
    const { tenantId } = req.user!;
    const codes = strokeCodeService.getActiveCodes(tenantId);
    res.json({ codes, total: codes.length });
  }
);

/** POST /api/v1/stroke-codes/:codeId/resolve — resolve an active stroke code */
router.post('/stroke-codes/:codeId/resolve',
  authenticate, authorize('doctor', 'radiologist'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { outcome } = req.body;
      const { tenantId } = req.user!;
      if (!outcome) throw new AppError('outcome required', 400);
      await strokeCodeService.resolve(req.params.codeId, req.user!.id, tenantId, outcome);
      res.json({ message: 'Stroke code resolved', codeId: req.params.codeId, outcome });
    } catch (err) { next(err); }
  }
);

// ── Population Health ────────────────────────────────────────
/** GET /api/v1/population-health/surveillance */
router.get('/population-health/surveillance',
  authenticate, authorize('admin', 'superadmin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { region, granularity = 'week', startDate, endDate } = req.query as any;
      const series = await populationHealthService.getDiseaseSurveillance({
        region,
        granularity,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate:   endDate   ? new Date(endDate)   : undefined,
      });
      res.json({ series, count: series.length });
    } catch (err) { next(err); }
  }
);

/** GET /api/v1/population-health/outbreaks */
router.get('/population-health/outbreaks',
  authenticate, authorize('admin', 'superadmin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signals = await populationHealthService.detectOutbreaks(req.query.region as string);
      res.json({ signals, alerts: signals.filter(s => s.severity === 'alert').length });
    } catch (err) { next(err); }
  }
);

/** GET /api/v1/population-health/map/:condition */
router.get('/population-health/map/:condition',
  authenticate, authorize('admin', 'superadmin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const map = await populationHealthService.getPrevalenceMap(
        req.params.condition,
        req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      );
      res.json({ condition: req.params.condition, prevalenceByCountry: map });
    } catch (err) { next(err); }
  }
);

/** GET /api/v1/population-health/global */
router.get('/population-health/global',
  authenticate, authorize('superadmin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await populationHealthService.getGlobalSummary();
      res.json(summary);
    } catch (err) { next(err); }
  }
);

// ── Referral Network ─────────────────────────────────────────
/** POST /api/v1/referrals/search — find best-matched specialists */
router.post('/referrals/search',
  authenticate, authorize('radiologist', 'doctor'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { scanId, speciality, reason, priority = 'ROUTINE', allowCrossBorder = true, aiResult } = req.body;
      const { tenantId, id: userId } = req.user!;
      if (!scanId || !speciality) throw new AppError('scanId and speciality required', 400);

      // Security Gap: verify scan belongs to this tenant
      const scan = await prisma.scan.findFirst({ where: { id: scanId, tenantId } });
      if (!scan) throw new AppError('Scan not found in this institution', 404);

      const matches = await referralNetworkService.findSpecialists(
        { scanId, speciality, reason, priority, allowCrossBorder, requestingUserId: userId, tenantId, aiSummary: aiResult?.primaryFinding ?? '' },
        aiResult ?? {},
      );
      res.json({ matches, total: matches.length });
    } catch (err) { next(err); }
  }
);

/** POST /api/v1/referrals — create a referral to a specialist */
router.post('/referrals',
  authenticate, authorize('radiologist', 'doctor'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { scanId, specialistId, speciality, reason, priority = 'ROUTINE', allowCrossBorder = true, aiResult } = req.body;
      const { tenantId, id: userId } = req.user!;
      if (!scanId || !specialistId) throw new AppError('scanId and specialistId required', 400);

      // Security Gap: verify scan belongs to this tenant
      const scan = await prisma.scan.findFirst({ where: { id: scanId, tenantId } });
      if (!scan) throw new AppError('Scan not found in this institution', 404);

      const result = await referralNetworkService.createReferral(
        { scanId, speciality, reason, priority, allowCrossBorder, requestingUserId: userId, tenantId, aiSummary: aiResult?.primaryFinding ?? '' },
        specialistId,
        aiResult ?? {},
      );
      res.status(201).json(result);
    } catch (err) { next(err); }
  }
);

// ── Federated Learning (coordinator status endpoints) ────────
/** GET /api/v1/federated-learning/status */
router.get('/federated-learning/status',
  authenticate, authorize('superadmin'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await fetch(`${process.env.FL_SERVICE_URL ?? 'http://ai-federated:8004'}/status`);
      const data     = await response.json();
      res.json(data);
    } catch (err) { next(err); }
  }
);

/** GET /api/v1/continuous-learning/metrics */
router.get('/continuous-learning/metrics',
  authenticate, authorize('admin', 'superadmin'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await fetch(`${process.env.CL_SERVICE_URL ?? 'http://ai-continuous:8005'}/metrics`);
      const data     = await response.json();
      res.json(data);
    } catch (err) { next(err); }
  }
);

/** POST /api/v1/continuous-learning/corrections — proxy to continuous learning service */
router.post('/continuous-learning/corrections',
  authenticate, authorize('radiologist'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { scanId } = req.body;
      const { tenantId, id: userId } = req.user!;

      if (scanId) {
        const scan = await prisma.scan.findFirst({ where: { id: scanId, tenantId } });
        if (!scan) throw new AppError('Scan not found in this institution', 404);
      }

      const response = await fetch(`${process.env.CL_SERVICE_URL ?? 'http://ai-continuous:8005'}/corrections`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...req.body, radiologist_id: userId }),
      });
      const data = await response.json();
      res.json(data);
    } catch (err) { next(err); }
  }
);

export default router;
