"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// SEWA AI — backend/src/routes/analytics.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const r = (0, express_1.Router)();
r.use(auth_1.authenticate);
r.get('/', async (req, res, next) => {
    try {
        const { tenantId } = req.user;
        const [totalScans, criticalScans, approvedReports, totalPatients] = await Promise.all([
            database_1.prisma.scan.count({ where: { tenantId } }),
            database_1.prisma.scan.count({ where: { tenantId, aiResult: { urgency: 'CRITICAL' } } }),
            database_1.prisma.report.count({ where: { tenantId, status: 'approved' } }),
            database_1.prisma.patient.count({ where: { tenantId } }),
        ]);
        const avgConfidence = await database_1.prisma.aIResult.aggregate({
            where: { scan: { tenantId } }, _avg: { confidence: true, inferenceMs: true },
        });
        res.json({ totalScans, criticalScans, approvedReports, totalPatients, avgAIConfidence: avgConfidence._avg.confidence, avgInferenceMs: avgConfidence._avg.inferenceMs });
    }
    catch (err) {
        next(err);
    }
});
r.get('/scan-volume', async (req, res, next) => {
    try {
        const { tenantId } = req.user;
        // Last 7 days scan volume by day
        const rows = await database_1.prisma.$queryRaw `
      SELECT DATE(received_at) as day, COUNT(*) as count, priority
      FROM "Scan"
      WHERE tenant_id = ${tenantId}
        AND received_at >= NOW() - INTERVAL '7 days'
      GROUP BY day, priority
      ORDER BY day ASC
    `;
        res.json(rows);
    }
    catch (err) {
        next(err);
    }
});
exports.default = r;
