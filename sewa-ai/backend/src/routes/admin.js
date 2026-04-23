"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// SEWA AI — backend/src/routes/admin.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const r = (0, express_1.Router)();
r.use(auth_1.authenticate, (0, auth_1.authorize)('admin', 'superadmin'));
r.get('/dashboard', async (req, res, next) => {
    try {
        const [tenants, totalScans, criticalToday, totalRevenue] = await Promise.all([
            database_1.prisma.tenant.count(),
            database_1.prisma.scan.count(),
            database_1.prisma.scan.count({ where: { aiResult: { urgency: 'CRITICAL' }, receivedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
            database_1.prisma.payment.aggregate({ where: { status: 'succeeded' }, _sum: { amount: true } }),
        ]);
        res.json({ tenants, totalScans, criticalToday, totalRevenueUSD: totalRevenue._sum.amount ?? 0 });
    }
    catch (err) {
        next(err);
    }
});
r.get('/tenants', async (req, res, next) => {
    try {
        const tenants = await database_1.prisma.tenant.findMany({ include: { _count: { select: { users: true, scans: true } } }, orderBy: { createdAt: 'desc' } });
        res.json(tenants);
    }
    catch (err) {
        next(err);
    }
});
r.patch('/tenants/:id/status', async (req, res, next) => {
    try {
        const t = await database_1.prisma.tenant.update({ where: { id: req.params.id }, data: { status: req.body.status } });
        res.json(t);
    }
    catch (err) {
        next(err);
    }
});
exports.default = r;
