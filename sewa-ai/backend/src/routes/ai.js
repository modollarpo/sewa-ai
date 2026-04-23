"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// SEWA AI — backend/src/routes/ai.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const aiService_1 = require("../services/aiService");
const database_1 = require("../config/database");
const AppError_1 = require("../utils/AppError");
const r = (0, express_1.Router)();
// Health Checks — Proxies or baseline status for AI engines (Publicly accessible for status page)
const aiHealthHandler = (engine) => async (req, res) => {
    try {
        res.json({ status: 'operational', engine, mode: 'cpu_fallback', timestamp: new Date() });
    }
    catch (e) {
        res.status(503).json({ status: 'down', engine });
    }
};
r.get('/triage/health', aiHealthHandler('triage'));
r.get('/vlm/health', aiHealthHandler('vlm'));
r.get('/uncertainty/health', aiHealthHandler('uncertainty'));
r.get('/metacognition/health', aiHealthHandler('metacognition'));
r.use(auth_1.authenticate);
r.post('/triage/:scanId', (0, auth_1.authorize)('admin', 'superadmin', 'radiologist'), async (req, res, next) => {
    try {
        const { tenantId } = req.user;
        await (0, aiService_1.triggerAITriage)(req.params.scanId, tenantId);
        res.json({ message: 'AI Triage triggered' });
    }
    catch (err) {
        next(err);
    }
});
r.get('/result/:scanId', async (req, res, next) => {
    try {
        const result = await database_1.prisma.aIResult.findUnique({ where: { scanId: req.params.scanId } });
        if (!result)
            throw new AppError_1.AppError('AI result not found', 404);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
r.get('/models', async (req, res, next) => {
    try {
        const models = await database_1.prisma.aIModel.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(models);
    }
    catch (err) {
        next(err);
    }
});
r.get('/ab-test/metrics', (0, auth_1.authorize)('admin', 'superadmin'), async (req, res, next) => {
    try {
        // A/B test metrics: compare model groups (Feature 7)
        const results = await database_1.prisma.aIResult.groupBy({
            by: ['abTestGroup', 'modelVersion'],
            _count: { id: true },
            _avg: { confidence: true, inferenceMs: true },
        });
        res.json(results);
    }
    catch (err) {
        next(err);
    }
});
exports.default = r;
