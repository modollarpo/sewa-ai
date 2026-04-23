"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// SEWA AI — backend/src/routes/users.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const r = (0, express_1.Router)();
r.use(auth_1.authenticate);
r.get('/me', async (req, res, next) => {
    try {
        const u = await database_1.prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, email: true, firstName: true, lastName: true, role: true, speciality: true, licenseNumber: true, language: true, mfaEnabled: true, lastLoginAt: true, tenant: { select: { name: true, region: true, currency: true, plan: true } } } });
        res.json(u);
    }
    catch (err) {
        next(err);
    }
});
r.patch('/me', async (req, res, next) => {
    try {
        const { firstName, lastName, language, timezone, speciality } = req.body;
        const u = await database_1.prisma.user.update({ where: { id: req.user.id }, data: { firstName, lastName, language, timezone, speciality } });
        res.json(u);
    }
    catch (err) {
        next(err);
    }
});
r.post('/fcm-token', async (req, res, next) => {
    try {
        // Store FCM token for push notifications (Feature 14)
        const { token, platform } = req.body;
        await database_1.prisma.user.update({ where: { id: req.user.id }, data: { biometricKey: token /* reuse field */ } });
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
r.get('/', (0, auth_1.authorize)('admin', 'superadmin'), async (req, res, next) => {
    try {
        const users = await database_1.prisma.user.findMany({ where: { tenantId: req.user.tenantId }, select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, lastLoginAt: true, mfaEnabled: true } });
        res.json(users);
    }
    catch (err) {
        next(err);
    }
});
exports.default = r;
