"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// SEWA AI — backend/src/routes/templates.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const r = (0, express_1.Router)();
r.use(auth_1.authenticate);
r.get('/', async (req, res, next) => {
    try {
        const { specialty, modality } = req.query;
        const where = { tenantId: req.user.tenantId, isActive: true };
        if (specialty)
            where.specialty = specialty;
        if (modality)
            where.modality = modality;
        res.json(await database_1.prisma.reportTemplate.findMany({ where }));
    }
    catch (err) {
        next(err);
    }
});
r.post('/', (0, auth_1.authorize)('admin', 'superadmin', 'radiologist'), async (req, res, next) => {
    try {
        const t = await database_1.prisma.reportTemplate.create({ data: { ...req.body, tenantId: req.user.tenantId } });
        res.status(201).json(t);
    }
    catch (err) {
        next(err);
    }
});
exports.default = r;
