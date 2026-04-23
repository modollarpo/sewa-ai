"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// SEWA AI — backend/src/routes/secondOpinions.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const audit_1 = require("../utils/audit");
const r = (0, express_1.Router)();
r.use(auth_1.authenticate);
r.post('/', async (req, res, next) => {
    try {
        const { tenantId, id: userId } = req.user;
        const so = await database_1.prisma.secondOpinion.create({ data: { ...req.body, requesterId: userId } });
        await (0, audit_1.auditLog)({ tenantId, userId, action: 'SECOND_OPINION_REQUESTED', entity: 'SecondOpinion', entityId: so.id });
        res.status(201).json(so);
    }
    catch (err) {
        next(err);
    }
});
r.patch('/:id', async (req, res, next) => {
    try {
        const so = await database_1.prisma.secondOpinion.update({ where: { id: req.params.id }, data: req.body });
        res.json(so);
    }
    catch (err) {
        next(err);
    }
});
r.get('/pending', async (req, res, next) => {
    try {
        const items = await database_1.prisma.secondOpinion.findMany({ where: { reviewerId: req.user.id, status: 'pending' }, include: { scan: { include: { aiResult: true } } } });
        res.json(items);
    }
    catch (err) {
        next(err);
    }
});
exports.default = r;
