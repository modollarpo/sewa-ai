"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// SEWA AI — backend/src/routes/notifications.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const r = (0, express_1.Router)();
r.use(auth_1.authenticate);
r.get('/', async (req, res, next) => {
    try {
        const notifs = await database_1.prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
        res.json(notifs);
    }
    catch (err) {
        next(err);
    }
});
r.patch('/:id/read', async (req, res, next) => {
    try {
        await database_1.prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
r.patch('/read-all', async (req, res, next) => {
    try {
        await database_1.prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
exports.default = r;
