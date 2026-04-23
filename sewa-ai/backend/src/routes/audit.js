"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// SEWA AI — backend/src/routes/audit.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const audit_1 = require("../utils/audit");
const r = (0, express_1.Router)();
r.use(auth_1.authenticate, (0, auth_1.authorize)('admin', 'superadmin'));
r.get('/', async (req, res, next) => {
    try {
        const { page = '1', limit = '100', userId, action } = req.query;
        const where = {};
        if (req.user.role !== 'superadmin')
            where.tenantId = req.user.tenantId;
        if (userId)
            where.userId = userId;
        if (action)
            where.action = { contains: action, mode: 'insensitive' };
        const [logs, total] = await Promise.all([
            database_1.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: parseInt(limit), skip: (parseInt(page) - 1) * parseInt(limit) }),
            database_1.prisma.auditLog.count({ where }),
        ]);
        res.json({ logs, total });
    }
    catch (err) {
        next(err);
    }
});
r.get('/verify', async (req, res, next) => {
    try {
        res.json(await (0, audit_1.verifyChain)());
    }
    catch (err) {
        next(err);
    }
});
exports.default = r;
