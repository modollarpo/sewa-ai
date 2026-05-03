// SEWA AI — backend/src/controllers/reportController.ts
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { generateVLMReport } from '../services/aiService';
import { createFHIRDiagnosticReport, createFHIRObservation } from '../services/fhirService';
import { sendHL7ORU } from '../services/hl7Service';
import { auditLog } from '../utils/audit';
import { AppError } from '../utils/AppError';
import { io } from '../index';
import { generateClinicalPDF } from '../services/reportGenerationService';
import { logger } from '../utils/logger';
import { config } from '../config/env';

// POST /api/v1/reports/generate/:scanId
export async function generateReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, id: userId } = req.user!;
    const { scanId } = req.params;
    const { templateId } = req.body;

    const scan = await prisma.scan.findFirst({ where: { id: scanId, tenantId }, include: { aiResult: true } });
    if (!scan) throw new AppError('Scan not found', 404);
    if (!scan.aiResult) throw new AppError('AI result not available yet. Try again shortly.', 422);

    // Call VLM Report Generator (Python FastAPI)
    const vlm = await generateVLMReport(scanId, tenantId);

    // Upsert report record
    const report = await prisma.report.upsert({
      where: { scanId },
      update: { findings: vlm.findings, impression: vlm.impression, technique: vlm.technique, fullText: vlm.fullText, vlmGenerated: true, vlmVersion: 'vlm-v1.8.0', status: 'draft', updatedAt: new Date() },
      create: { tenantId, scanId, authorId: userId, templateId: templateId || null, technique: vlm.technique, findings: vlm.findings, impression: vlm.impression, fullText: vlm.fullText, vlmGenerated: true, vlmVersion: 'vlm-v1.8.0', status: 'draft' },
    });

    await auditLog({ tenantId, userId, action: 'REPORT_GENERATED', entity: 'Report', entityId: report.id, metadata: { scanId, vlmVersion: 'vlm-v1.8.0' } });
    res.status(201).json({ report });
  } catch (err) { next(err); }
}

// PATCH /api/v1/reports/:id
export async function updateReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, id: userId } = req.user!;
    const { id } = req.params;
    const { technique, findings, impression, recommendation, fullText } = req.body;

    const existing = await prisma.report.findFirst({ where: { id, tenantId } });
    if (!existing) throw new AppError('Report not found', 404);
    if (existing.status === 'approved') throw new AppError('Cannot modify a signed report. An addendum must be created instead.', 403);

    const report = await prisma.report.update({
      where: { id },
      data: { technique, findings, impression, recommendation, fullText, editedByHuman: true, status: 'draft' },
    });
    await auditLog({ tenantId, userId, action: 'REPORT_EDITED', entity: 'Report', entityId: id });
    res.json({ report });
  } catch (err) { next(err); }
}

// POST /api/v1/reports/:id/sign — Final sign & approve
export async function signReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, id: userId, role } = req.user!;
    if (!['radiologist', 'admin', 'superadmin'].includes(role)) throw new AppError('Only radiologists can sign reports', 403);

    const { id } = req.params;
    const report = await prisma.report.findFirst({ where: { id, tenantId }, include: { scan: { include: { patient: { include: { user: true } }, tenant: true } } } });
    if (!report) throw new AppError('Report not found', 404);
    if (report.status === 'approved') throw new AppError('Report already signed', 409);

    const signed = await prisma.report.update({
      where: { id },
      data: { status: 'approved', signedAt: new Date(), signedBy: userId },
    });

    // Generate Final High-Fidelity Report (Feature 36)
    await generateClinicalPDF(id).catch(e => logger.warn(`[ReportGen] Failed for ${id}: ${e.message}`));

    await prisma.scan.update({ where: { id: report.scanId }, data: { status: 'reported' } });

    // FHIR Integration (Feature 4) — R4 Compliance
    let fhirId: string | null = null;
    try {
      const scanWithAI = await prisma.scan.findUnique({ 
        where: { id: report.scanId }, 
        include: { aiResult: true, patient: { include: { user: true } } } 
      });

      if (scanWithAI?.aiResult) {
        // 1. Create atomic observation for the AI finding
        const obsId = await createFHIRObservation(scanWithAI, scanWithAI.aiResult);
        // 2. Link observation to the final DiagnosticReport
        fhirId = await createFHIRDiagnosticReport(signed, scanWithAI, obsId ? [obsId] : []);
      } else {
        fhirId = await createFHIRDiagnosticReport(signed, report.scan);
      }
    } catch (e: any) {
      logger.warn(`[FHIR] Sync failed during signing: ${e.message}`);
    }
    if (fhirId) await prisma.report.update({ where: { id }, data: { fhirDiagnosticReportId: fhirId } });

    // HL7v2 ORU dispatch (Feature 9)
    const hl7Id = await sendHL7ORU({ ...report.scan, ...signed }).catch((e: any): null => { logger.warn(`HL7 ORU failed: ${e.message}`); return null; });
    if (hl7Id) await prisma.report.update({ where: { id }, data: { hl7OruMessageId: hl7Id } });

    // Notify patient (Feature 6)
    io.to(`tenant:${tenantId}`).emit('report:signed', { reportId: id, scanId: report.scanId });

    // Send WhatsApp/SMS alert (only if patient and user exist)
    if (report.scan.patient?.user?.phoneNumber) {
      const { sendNotification } = await import('../services/notificationService');
      await sendNotification({
        to: report.scan.patient.user.phoneNumber,
        priority: 'urgent',
        subject: 'Your SEWA AI Report is Ready',
        body: `Hello ${report.scan.patient.user.firstName}, your clinical report from ${report.scan.tenant.name} is now available in your patient portal. View it here: ${config.FRONTEND_URL}/portal/scans/${report.scanId}`
      }).catch(e => logger.warn(`[Notify] Patient alert failed: ${e.message}`));
    }

    await auditLog({ tenantId, userId, action: 'REPORT_SIGNED', entity: 'Report', entityId: id, metadata: { fhirId, hl7Id } });
    res.json({ report: signed, fhirDiagnosticReportId: fhirId, hl7OruMessageId: hl7Id });
  } catch (err) { next(err); }
}

// GET /api/v1/reports
export async function listReports(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, role, id: userId } = req.user!;
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (role === 'radiologist') where.authorId = userId; // doctors see their own

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where, take: parseInt(limit), skip: (parseInt(page) - 1) * parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { scan: { select: { modality: true, bodyPart: true, priority: true, patient: { include: { user: { select: { firstName: true, lastName: true } } } } } }, author: { select: { firstName: true, lastName: true } } },
      }),
      prisma.report.count({ where }),
    ]);
    res.json({ reports, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
}

// GET /api/v1/reports/:id
export async function getReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!;
    const report = await prisma.report.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        scan: { include: { aiResult: true, patient: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, status: true } } } }, annotations: true } },
        author: { select: { firstName: true, lastName: true, speciality: true, licenseNumber: true } },
        template: true,
        secondOpinions: { include: { reviewer: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!report) throw new AppError('Report not found', 404);
    res.json(report);
  } catch (err) { next(err); }
}
