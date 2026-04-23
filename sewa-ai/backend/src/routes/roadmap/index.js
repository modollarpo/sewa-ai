"use strict";
// SEWA AI — backend/src/routes/roadmap/index.ts
// Aggregated router for all roadmap feature endpoints
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const clinicalRulesEngine_1 = require("../../services/roadmap/clinicalRulesEngine");
const strokeCodeService_1 = require("../../services/roadmap/strokeCodeService");
const populationHealthService_1 = require("../../services/roadmap/populationHealthService");
const referralNetworkService_1 = require("../../services/roadmap/referralNetworkService");
const AppError_1 = require("../../utils/AppError");
const router = (0, express_1.Router)();
// ── Clinical Rules Engine ────────────────────────────────────
/** GET /api/v1/rules — list rules for tenant */
router.get('/rules', auth_1.authenticate, (0, auth_1.authorize)('admin', 'superadmin'), async (req, res, next) => {
    try {
        const rules = await clinicalRulesEngine_1.clinicalRulesEngine.getRules(req.user.tenantId);
        res.json({ rules, total: rules.length });
    }
    catch (err) {
        next(err);
    }
});
/** POST /api/v1/rules/evaluate — manually evaluate rules for a scan result */
router.post('/rules/evaluate', auth_1.authenticate, (0, auth_1.authorize)('radiologist', 'admin', 'superadmin'), async (req, res, next) => {
    try {
        const { scanId, aiResult } = req.body;
        if (!scanId || !aiResult)
            throw new AppError_1.AppError('scanId and aiResult required', 400);
        const result = await clinicalRulesEngine_1.clinicalRulesEngine.evaluate(req.user.tenantId, scanId, aiResult);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// ── Stroke Codes ─────────────────────────────────────────────
/** GET /api/v1/stroke-codes — list active codes for tenant */
router.get('/stroke-codes', auth_1.authenticate, (0, auth_1.authorize)('doctor', 'radiologist', 'admin', 'superadmin'), async (req, res) => {
    const codes = strokeCodeService_1.strokeCodeService.getActiveCodes();
    res.json({ codes, total: codes.length });
});
/** POST /api/v1/stroke-codes/:codeId/resolve — resolve an active stroke code */
router.post('/stroke-codes/:codeId/resolve', auth_1.authenticate, (0, auth_1.authorize)('doctor', 'radiologist'), async (req, res, next) => {
    try {
        const { outcome } = req.body;
        if (!outcome)
            throw new AppError_1.AppError('outcome required', 400);
        await strokeCodeService_1.strokeCodeService.resolve(req.params.codeId, req.user.id, outcome);
        res.json({ message: 'Stroke code resolved', codeId: req.params.codeId, outcome });
    }
    catch (err) {
        next(err);
    }
});
// ── Population Health ────────────────────────────────────────
/** GET /api/v1/population-health/surveillance */
router.get('/population-health/surveillance', auth_1.authenticate, (0, auth_1.authorize)('admin', 'superadmin'), async (req, res, next) => {
    try {
        const { region, granularity = 'week', startDate, endDate } = req.query;
        const series = await populationHealthService_1.populationHealthService.getDiseaseSurveillance({
            region,
            granularity,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        });
        res.json({ series, count: series.length });
    }
    catch (err) {
        next(err);
    }
});
/** GET /api/v1/population-health/outbreaks */
router.get('/population-health/outbreaks', auth_1.authenticate, (0, auth_1.authorize)('admin', 'superadmin'), async (req, res, next) => {
    try {
        const signals = await populationHealthService_1.populationHealthService.detectOutbreaks(req.query.region);
        res.json({ signals, alerts: signals.filter(s => s.severity === 'alert').length });
    }
    catch (err) {
        next(err);
    }
});
/** GET /api/v1/population-health/map/:condition */
router.get('/population-health/map/:condition', auth_1.authenticate, (0, auth_1.authorize)('admin', 'superadmin'), async (req, res, next) => {
    try {
        const map = await populationHealthService_1.populationHealthService.getPrevalenceMap(req.params.condition, req.query.startDate ? new Date(req.query.startDate) : undefined);
        res.json({ condition: req.params.condition, prevalenceByCountry: map });
    }
    catch (err) {
        next(err);
    }
});
/** GET /api/v1/population-health/global */
router.get('/population-health/global', auth_1.authenticate, (0, auth_1.authorize)('superadmin'), async (req, res, next) => {
    try {
        const summary = await populationHealthService_1.populationHealthService.getGlobalSummary();
        res.json(summary);
    }
    catch (err) {
        next(err);
    }
});
// ── Referral Network ─────────────────────────────────────────
/** POST /api/v1/referrals/search — find best-matched specialists */
router.post('/referrals/search', auth_1.authenticate, (0, auth_1.authorize)('radiologist', 'doctor'), async (req, res, next) => {
    try {
        const { scanId, speciality, reason, priority = 'ROUTINE', allowCrossBorder = true, aiResult } = req.body;
        if (!scanId || !speciality)
            throw new AppError_1.AppError('scanId and speciality required', 400);
        const matches = await referralNetworkService_1.referralNetworkService.findSpecialists({ scanId, speciality, reason, priority, allowCrossBorder, requestingUserId: req.user.id, tenantId: req.user.tenantId, aiSummary: aiResult?.primaryFinding ?? '' }, aiResult ?? {});
        res.json({ matches, total: matches.length });
    }
    catch (err) {
        next(err);
    }
});
/** POST /api/v1/referrals — create a referral to a specialist */
router.post('/referrals', auth_1.authenticate, (0, auth_1.authorize)('radiologist', 'doctor'), async (req, res, next) => {
    try {
        const { scanId, specialistId, speciality, reason, priority = 'ROUTINE', allowCrossBorder = true, aiResult } = req.body;
        if (!scanId || !specialistId)
            throw new AppError_1.AppError('scanId and specialistId required', 400);
        const result = await referralNetworkService_1.referralNetworkService.createReferral({ scanId, speciality, reason, priority, allowCrossBorder, requestingUserId: req.user.id, tenantId: req.user.tenantId, aiSummary: aiResult?.primaryFinding ?? '' }, specialistId, aiResult ?? {});
        res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
});
// ── Federated Learning (coordinator status endpoints) ────────
/** GET /api/v1/federated-learning/status */
router.get('/federated-learning/status', auth_1.authenticate, (0, auth_1.authorize)('superadmin'), async (_req, res, next) => {
    try {
        const response = await fetch(`${process.env.FL_SERVICE_URL ?? 'http://ai-federated:8004'}/status`);
        const data = await response.json();
        res.json(data);
    }
    catch (err) {
        next(err);
    }
});
/** GET /api/v1/continuous-learning/metrics */
router.get('/continuous-learning/metrics', auth_1.authenticate, (0, auth_1.authorize)('admin', 'superadmin'), async (_req, res, next) => {
    try {
        const response = await fetch(`${process.env.CL_SERVICE_URL ?? 'http://ai-continuous:8005'}/metrics`);
        const data = await response.json();
        res.json(data);
    }
    catch (err) {
        next(err);
    }
});
/** POST /api/v1/continuous-learning/corrections — proxy to continuous learning service */
router.post('/continuous-learning/corrections', auth_1.authenticate, (0, auth_1.authorize)('radiologist'), async (req, res, next) => {
    try {
        const response = await fetch(`${process.env.CL_SERVICE_URL ?? 'http://ai-continuous:8005'}/corrections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...req.body, radiologist_id: req.user.id }),
        });
        const data = await response.json();
        res.json(data);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
