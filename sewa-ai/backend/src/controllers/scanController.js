"use strict";
// SEWA AI — src/controllers/scanController.ts
// Feature 3: AI Triage Engine | Feature 4: FHIR R4, HL7v2, DICOM/PACS
// POST /api/v1/scans/upload | GET /api/v1/scans | GET /api/v1/scans/:id
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadScan = uploadScan;
exports.getWorklist = getWorklist;
exports.getScan = getScan;
exports.updateScanStatus = updateScanStatus;
exports.deleteScan = deleteScan;
exports.generateDemoScan = generateDemoScan;
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
const storageService_1 = require("../services/storageService");
const aiService_1 = require("../services/aiService");
const fhirService_1 = require("../services/fhirService");
const hl7Service_1 = require("../services/hl7Service");
const audit_1 = require("../utils/audit");
const AppError_1 = require("../utils/AppError");
const scanQuota_1 = require("../middleware/scanQuota");
const index_1 = require("../index");
// POST /api/v1/scans/upload
async function uploadScan(req, res, next) {
    try {
        const { tenantId, id: userId, role } = req.user;
        const file = req.file;
        const { patientId, modality, bodyPart, priority = 'ROUTINE', clinicalIndication, technique, referringDoctorId, dicomStudyUid, dicomSeriesUid, dicomInstanceUid, } = req.body;
        // Upload DICOM to Azure Blob / S3
        let storageUrl;
        if (file) {
            storageUrl = await (0, storageService_1.uploadToStorage)({
                tenantId, file: file.buffer,
                fileName: file.originalname,
                contentType: file.mimetype,
                folder: `scans/${tenantId}`,
            });
        }
        // Create scan record
        const scan = await database_1.prisma.scan.create({
            data: {
                tenantId, patientId: patientId || null,
                referringDoctorId: referringDoctorId || userId,
                modality, bodyPart, priority, clinicalIndication, technique,
                dicomStudyUid, dicomSeriesUid, dicomInstanceUid,
                storageUrl, status: 'processing',
                fileSize: file?.size,
            },
            include: { patient: { include: { user: true } }, tenant: true },
        });
        // FHIR ImagingStudy creation (Feature 4)
        const fhirStudyId = await (0, fhirService_1.createFHIRImagingStudy)(scan).catch((err) => {
            // Non-fatal — log and continue
            console.warn('FHIR ImagingStudy creation failed:', err.message);
            return null;
        });
        if (fhirStudyId) {
            await database_1.prisma.scan.update({ where: { id: scan.id }, data: { fhirImagingStudyId: fhirStudyId } });
        }
        // HL7v2 ORM message (Feature 9)
        const hl7OrderId = await (0, hl7Service_1.sendHL7ORM)(scan).catch((err) => {
            console.warn('HL7 ORM failed:', err.message);
            return null;
        });
        if (hl7OrderId) {
            await database_1.prisma.scan.update({ where: { id: scan.id }, data: { hl7OrderId } });
        }
        // Trigger AI Triage Engine asynchronously (Feature 3)
        (0, aiService_1.triggerAITriage)(scan.id, tenantId).catch(err => {
            console.error('AI Triage trigger failed:', err.message);
        });
        // Increment monthly quota counter (and charge overage if applicable)
        (0, scanQuota_1.incrementQuota)(tenantId, req.body._overage ?? false, req.body._overageRate ?? 0)
            .catch(err => console.error('Quota increment failed:', err.message));
        await (0, audit_1.auditLog)({
            tenantId, userId, action: 'SCAN_UPLOADED',
            entityId: scan.id, entity: 'Scan',
            metadata: { modality, bodyPart, priority, fileSize: file?.size },
        });
        // Real-time WebSocket notification to radiologists in tenant (Feature 6)
        index_1.io.to(`tenant:${tenantId}`).emit('scan:new', {
            scanId: scan.id, modality, bodyPart, priority,
            patientName: scan.patient?.user ? `${scan.patient.user.firstName} ${scan.patient.user.lastName}` : 'Unknown',
        });
        res.status(201).json({ scan, message: 'Scan uploaded. AI Triage Engine processing.' });
    }
    catch (err) {
        next(err);
    }
}
// GET /api/v1/scans — Worklist
async function getWorklist(req, res, next) {
    try {
        const { tenantId, role } = req.user;
        const { status, priority, modality, page = '1', limit = '50', search } = req.query;
        const cacheKey = `worklist:${tenantId}:${status}:${priority}:${page}:${limit}:${search}`;
        const cached = await redis_1.redisClient.get(cacheKey);
        if (cached)
            return res.json(JSON.parse(cached));
        const where = { tenantId };
        if (status)
            where.status = status;
        if (priority)
            where.priority = priority;
        if (modality)
            where.modality = modality;
        if (search) {
            where.OR = [
                { patient: { user: { OR: [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }] } } },
                { id: { contains: search, mode: 'insensitive' } },
                { aiResult: { primaryFinding: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const [scans, total] = await Promise.all([
            database_1.prisma.scan.findMany({
                where, take: parseInt(limit), skip: (parseInt(page) - 1) * parseInt(limit),
                orderBy: [
                    { priority: 'asc' }, // STAT first
                    { receivedAt: 'asc' },
                ],
                include: {
                    patient: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
                    aiResult: true,
                    report: { select: { id: true, status: true, signedAt: true } },
                    referringDoctor: { select: { firstName: true, lastName: true } },
                },
            }),
            database_1.prisma.scan.count({ where }),
        ]);
        const result = { scans, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) };
        await redis_1.redisClient.setex(cacheKey, 30, JSON.stringify(result)); // 30s cache
        res.json(result);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/v1/scans/:id
async function getScan(req, res, next) {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const scan = await database_1.prisma.scan.findFirst({
            where: { id, tenantId },
            include: {
                patient: { include: { user: true } },
                aiResult: true,
                report: { include: { author: { select: { firstName: true, lastName: true } }, template: true } },
                annotations: true,
                secondOpinions: { include: { reviewer: { select: { firstName: true, lastName: true, speciality: true } } } },
                referringDoctor: { select: { firstName: true, lastName: true, speciality: true } },
            },
        });
        if (!scan)
            throw new AppError_1.AppError('Scan not found', 404);
        res.json(scan);
    }
    catch (err) {
        next(err);
    }
}
// PATCH /api/v1/scans/:id/status
async function updateScanStatus(req, res, next) {
    try {
        const { tenantId, id: userId } = req.user;
        const { id } = req.params;
        const { status } = req.body;
        const scan = await database_1.prisma.scan.update({
            where: { id, tenantId }, data: { status },
        });
        await (0, audit_1.auditLog)({ tenantId, userId, action: 'SCAN_STATUS_UPDATED', entity: 'Scan', entityId: id, metadata: { status } });
        index_1.io.to(`tenant:${tenantId}`).emit('scan:updated', { scanId: id, status });
        res.json(scan);
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/v1/scans/:id (GDPR right to erasure)
async function deleteScan(req, res, next) {
    try {
        const { tenantId, id: userId, role } = req.user;
        if (!['admin', 'superadmin'].includes(role))
            throw new AppError_1.AppError('Forbidden', 403);
        const { id } = req.params;
        await database_1.prisma.scan.delete({ where: { id, tenantId } });
        await (0, audit_1.auditLog)({ tenantId, userId, action: 'SCAN_DELETED_GDPR', entity: 'Scan', entityId: id });
        res.json({ message: 'Scan deleted in compliance with GDPR right to erasure' });
    }
    catch (err) {
        next(err);
    }
}
// POST /api/v1/scans/demo (Technician Test Path)
async function generateDemoScan(req, res, next) {
    try {
        const { tenantId, id: userId } = req.user;
        // Create a high-fidelity synthetic STAT scan
        const scan = await database_1.prisma.scan.create({
            data: {
                tenantId,
                patientId: null, // Anonymous test patient
                modality: 'CT',
                bodyPart: 'HEAD',
                priority: 'STAT',
                clinicalIndication: 'Demo: Query Intracranial Hemorrhage',
                status: 'processing',
                fileName: 'DEMO_ICH_CT_HEAD.dcm',
                fileSize: 45 * 1024 * 1024,
            },
        });
        // Trigger AI Triage with a delayed mock result
        setTimeout(async () => {
            try {
                await database_1.prisma.aiResult.create({
                    data: {
                        scanId: scan.id,
                        tenantId,
                        urgency: 'CRITICAL',
                        primaryFinding: 'Acute Intracranial Hemorrhage Detected',
                        confidence: 0.984,
                        summary: 'Large hyperdense area in left basal ganglia compatible with acute ICH. Significant midline shift (4mm).',
                        uncertaintyScore: 0.021,
                    },
                });
                await database_1.prisma.scan.update({ where: { id: scan.id }, data: { status: 'COMPLETED' } });
                index_1.io.to(`tenant:${tenantId}`).emit('scan:updated', { scanId: scan.id, status: 'COMPLETED' });
            }
            catch (err) {
                console.error('Demo AI result failed:', err);
            }
        }, 5000);
        res.status(201).json({ scan, message: 'Synthetic demo scan generated. AI processing in progress.' });
    }
    catch (err) {
        next(err);
    }
}
