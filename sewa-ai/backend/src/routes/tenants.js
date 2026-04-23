"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// SEWA AI — backend/src/routes/tenants.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const validate_1 = require("../middleware/validate");
const validators_1 = require("../utils/validators");
const r = (0, express_1.Router)();
r.use(auth_1.authenticate);
r.get('/me', async (req, res, next) => {
    try {
        const t = await database_1.prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
        res.json(t);
    }
    catch (err) {
        next(err);
    }
});
r.post('/', (0, auth_1.authorize)('superadmin'), (0, validate_1.validate)(validators_1.TenantOnboardSchema), async (req, res, next) => {
    try {
        const t = await database_1.prisma.tenant.create({ data: req.body });
        res.status(201).json(t);
    }
    catch (err) {
        next(err);
    }
});
exports.default = r;
