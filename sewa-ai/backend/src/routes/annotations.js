"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// SEWA AI — backend/src/routes/annotations.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const r = (0, express_1.Router)();
r.use(auth_1.authenticate);
r.get('/:scanId', async (req, res, next) => {
    try {
        res.json(await database_1.prisma.annotation.findMany({ where: { scanId: req.params.scanId } }));
    }
    catch (e) {
        next(e);
    }
});
r.post('/', async (req, res, next) => {
    try {
        const a = await database_1.prisma.annotation.create({ data: { ...req.body, userId: req.user.id } });
        res.status(201).json(a);
    }
    catch (err) {
        next(err);
    }
});
r.delete('/:id', async (req, res, next) => {
    try {
        await database_1.prisma.annotation.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (e) {
        next(e);
    }
});
exports.default = r;
