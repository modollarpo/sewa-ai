"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReport = generateReport;
exports.updateReport = updateReport;
exports.signReport = signReport;
exports.listReports = listReports;
exports.getReport = getReport;
const database_1 = require("../config/database");
const aiService_1 = require("../services/aiService");
const fhirService_1 = require("../services/fhirService");
const hl7Service_1 = require("../services/hl7Service");
const audit_1 = require("../utils/audit");
const AppError_1 = require("../utils/AppError");
const index_1 = require("../index");
// POST /api/v1/reports/generate/:scanId
async function generateReport(req, res, next) {
    try {
        const { tenantId, id: userId } = req.user;
        const { scanId } = req.params;
        const { templateId } = req.body;
        const scan = await database_1.prisma.scan.findFirst({ where: { id: scanId, tenantId }, include: { aiResult: true } });
        if (!scan)
            throw new AppError_1.AppError('Scan not found', 404);
        if (!scan.aiResult)
            throw new AppError_1.AppError('AI result not available yet. Try again shortly.', 422);
        // Call VLM Report Generator (Python FastAPI)
        const vlm = await (0, aiService_1.generateVLMReport)(scanId, tenantId);
        // Upsert report record
        const report = await database_1.prisma.report.upsert({
            where: { scanId },
            update: { findings: vlm.findings, impression: vlm.impression, technique: vlm.technique, fullText: vlm.fullText, vlmGenerated: true, vlmVersion: 'vlm-v1.8.0', status: 'draft', updatedAt: new Date() },
            create: { tenantId, scanId, authorId: userId, templateId: templateId || null, technique: vlm.technique, findings: vlm.findings, impression: vlm.impression, fullText: vlm.fullText, vlmGenerated: true, vlmVersion: 'vlm-v1.8.0', status: 'draft' },
        });
        await (0, audit_1.auditLog)({ tenantId, userId, action: 'REPORT_GENERATED', entity: 'Report', entityId: report.id, metadata: { scanId, vlmVersion: 'vlm-v1.8.0' } });
        res.status(201).json({ report });
    }
    catch (err) {
        next(err);
    }
}
// PATCH /api/v1/reports/:id
async function updateReport(req, res, next) {
    try {
        const { tenantId, id: userId } = req.user;
        const { id } = req.params;
        const { technique, findings, impression, recommendation, fullText } = req.body;
        const report = await database_1.prisma.report.update({
            where: { id, tenantId },
            data: { technique, findings, impression, recommendation, fullText, editedByHuman: true, status: 'draft' },
        });
        await (0, audit_1.auditLog)({ tenantId, userId, action: 'REPORT_EDITED', entity: 'Report', entityId: id });
        res.json({ report });
    }
    catch (err) {
        next(err);
    }
}
// POST /api/v1/reports/:id/sign — Final sign & approve
async function signReport(req, res, next) {
    try {
        const { tenantId, id: userId, role } = req.user;
        if (!['radiologist', 'admin', 'superadmin'].includes(role))
            throw new AppError_1.AppError('Only radiologists can sign reports', 403);
        const { id } = req.params;
        const report = await database_1.prisma.report.findFirst({ where: { id, tenantId }, include: { scan: { include: { patient: { include: { user: true } }, tenant: true } } } });
        if (!report)
            throw new AppError_1.AppError('Report not found', 404);
        if (report.status === 'approved')
            throw new AppError_1.AppError('Report already signed', 409);
        const signed = await database_1.prisma.report.update({
            where: { id },
            data: { status: 'approved', signedAt: new Date(), signedBy: userId },
        });
        await database_1.prisma.scan.update({ where: { id: report.scanId }, data: { status: 'reported' } });
        // FHIR DiagnosticReport (Feature 4)
        const fhirId = await (0, fhirService_1.createFHIRDiagnosticReport)(signed, report.scan).catch((e) => { console.warn('FHIR DiagReport failed:', e.message); return null; });
        if (fhirId)
            await database_1.prisma.report.update({ where: { id }, data: { fhirDiagnosticReportId: fhirId } });
        // HL7v2 ORU dispatch (Feature 9)
        const hl7Id = await (0, hl7Service_1.sendHL7ORU)({ ...report.scan, ...signed }).catch((e) => { console.warn('HL7 ORU failed:', e.message); return null; });
        if (hl7Id)
            await database_1.prisma.report.update({ where: { id }, data: { hl7OruMessageId: hl7Id } });
        // Notify patient (Feature 6)
        index_1.io.to(`tenant:${tenantId}`).emit('report:signed', { reportId: id, scanId: report.scanId });
        await (0, audit_1.auditLog)({ tenantId, userId, action: 'REPORT_SIGNED', entity: 'Report', entityId: id, metadata: { fhirId, hl7Id } });
        res.json({ report: signed, fhirDiagnosticReportId: fhirId, hl7OruMessageId: hl7Id });
    }
    catch (err) {
        next(err);
    }
}
// GET /api/v1/reports
async function listReports(req, res, next) {
    try {
        const { tenantId, role, id: userId } = req.user;
        const { status, page = '1', limit = '20' } = req.query;
        const where = { tenantId };
        if (status)
            where.status = status;
        if (role === 'radiologist')
            where.authorId = userId; // doctors see their own
        const [reports, total] = await Promise.all([
            database_1.prisma.report.findMany({
                where, take: parseInt(limit), skip: (parseInt(page) - 1) * parseInt(limit),
                orderBy: { createdAt: 'desc' },
                include: { scan: { select: { modality: true, bodyPart: true, priority: true, patient: { include: { user: { select: { firstName: true, lastName: true } } } } } }, author: { select: { firstName: true, lastName: true } } },
            }),
            database_1.prisma.report.count({ where }),
        ]);
        res.json({ reports, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    }
    catch (err) {
        next(err);
    }
}
// GET /api/v1/reports/:id
async function getReport(req, res, next) {
    try {
        const { tenantId } = req.user;
        const report = await database_1.prisma.report.findFirst({
            where: { id: req.params.id, tenantId },
            include: {
                scan: { include: { aiResult: true, patient: { include: { user: true } }, annotations: true } },
                author: { select: { firstName: true, lastName: true, speciality: true, licenseNumber: true } },
                template: true,
                secondOpinions: { include: { reviewer: { select: { firstName: true, lastName: true } } } },
            },
        });
        if (!report)
            throw new AppError_1.AppError('Report not found', 404);
        res.json(report);
    }
    catch (err) {
        next(err);
    }
}
