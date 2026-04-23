"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// SEWA AI — backend/src/routes/patients.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const AppError_1 = require("../utils/AppError");
const validate_1 = require("../middleware/validate");
const validators_1 = require("../utils/validators");
const r = (0, express_1.Router)();
r.use(auth_1.authenticate);
r.post('/', (0, validate_1.validate)(validators_1.PatientSchema), async (req, res, next) => {
    try {
        const { tenantId } = req.user;
        const { mrn, dateOfBirth, sex, firstName, lastName, email } = req.body;
        const patient = await database_1.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: { firstName, lastName, email, role: 'patient' }
            });
            return tx.patient.create({
                data: { tenantId, mrn, dateOfBirth: new Date(dateOfBirth), sex, userId: user.id }
            });
        });
        res.status(201).json(patient);
    }
    catch (err) {
        next(err);
    }
});
r.get('/', async (req, res, next) => {
    try {
        const { tenantId } = req.user;
        const { search, page = '1', limit = '50' } = req.query;
        const where = { tenantId };
        if (search)
            where.user = { OR: [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }] };
        const [patients, total] = await Promise.all([
            database_1.prisma.patient.findMany({ where, take: parseInt(limit), skip: (parseInt(page) - 1) * parseInt(limit), include: { user: { select: { firstName: true, lastName: true, email: true } }, scans: { take: 3, orderBy: { receivedAt: 'desc' }, include: { aiResult: true } } } }),
            database_1.prisma.patient.count({ where }),
        ]);
        res.json({ patients, total });
    }
    catch (err) {
        next(err);
    }
});
r.get('/:id', async (req, res, next) => {
    try {
        const { tenantId } = req.user;
        const patient = await database_1.prisma.patient.findFirst({
            where: { id: req.params.id, tenantId },
            include: { user: true, scans: { include: { aiResult: true, report: { select: { id: true, status: true, signedAt: true } } }, orderBy: { receivedAt: 'desc' } }, messages: { take: 20, orderBy: { createdAt: 'desc' } } },
        });
        if (!patient)
            throw new AppError_1.AppError('Patient not found', 404);
        res.json(patient);
    }
    catch (err) {
        next(err);
    }
});
r.patch('/:id/consent', (0, validate_1.validate)(validators_1.PatientConsentSchema), async (req, res, next) => {
    try {
        const { tenantId } = req.user;
        const { consentAI, consentResearch, consentThirdParty } = req.body;
        const patient = await database_1.prisma.patient.updateMany({ where: { id: req.params.id, tenantId }, data: { consentAI, consentResearch, consentThirdParty } });
        res.json({ updated: patient.count });
    }
    catch (err) {
        next(err);
    }
});
exports.default = r;
