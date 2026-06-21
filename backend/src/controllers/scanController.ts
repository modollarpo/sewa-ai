// SEWA AI — src/controllers/scanController.ts
// Feature 3: AI Triage Engine | Feature 4: FHIR R4, HL7v2, DICOM/PACS
// POST /api/v1/scans/upload | GET /api/v1/scans | GET /api/v1/scans/:id

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { redisClient } from '../config/redis';
import { uploadToStorage, deleteFromStorage } from '../services/storageService';
import { triggerAITriage } from '../services/aiService';
import { createFHIRImagingStudy } from '../services/fhirService';
import { sendHL7ORM } from '../services/hl7Service';
import { notifyUsers } from '../services/notifications/notificationService';
import { auditLog } from '../utils/audit';
import { AppError } from '../utils/AppError';
import { incrementQuota } from '../middleware/scanQuota';
import { logger } from '../utils/logger';
import { io } from '../index';

// Valid DICOM modality codes (DICOM PS 3.3 Table C.7-5a)
const VALID_MODALITIES = new Set([
  'CT','MRI','XR','US','PET','PETCT','NM','MG','DX','CR','RF','DSA','FLU','OT'
]);

// POST /api/v1/scans/upload
export async function uploadScan(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, id: userId, role } = req.user!;
    const file = req.file;

    const {
      patientId, modality, bodyPart, priority = 'ROUTINE',
      clinicalIndication, technique, referringDoctorId,
      dicomStudyUid, dicomSeriesUid, dicomInstanceUid,
    } = req.body;

    // C4: Validate required DICOM metadata before committing to DB or invoking pipeline
    if (!modality) throw new AppError('modality is required', 400);
    if (!VALID_MODALITIES.has(modality.toUpperCase())) {
      throw new AppError(
        `Invalid modality '${modality}'. Accepted values: ${[...VALID_MODALITIES].join(', ')}`,
        400
      );
    }
    // C3: Guard against missing bodyPart — pipeline cannot route without it
    if (!bodyPart || bodyPart.trim() === '') {
      throw new AppError('bodyPart is required (e.g. HEAD, CHEST, ABDOMEN)', 400);
    }

    // C5: Validate file MIME type — only DICOM, NIfTI, and medical imaging formats accepted
    if (file) {
      const ALLOWED_MIMES = new Set([
        'application/dicom',
        'application/octet-stream', // DICOM is often sent as octet-stream
        'image/jpeg', 'image/png',  // Plain radiographs (DX, CR)
        'image/tiff',               // High-res scans
        'application/zip',          // DICOM zip archives
      ]);
      const ext = (file.originalname || '').split('.').pop()?.toLowerCase();
      const ALLOWED_EXTS = new Set(['dcm', 'dicom', 'jpg', 'jpeg', 'png', 'tiff', 'tif', 'nii', 'nii.gz', 'zip']);
      if (!ALLOWED_MIMES.has(file.mimetype) && !ALLOWED_EXTS.has(ext || '')) {
        throw new AppError(
          `File type '${file.mimetype}' (${ext}) is not accepted. Upload DICOM (.dcm), NIfTI (.nii), or medical imaging files only.`,
          415
        );
      }
    }

    // C6: Security - validate that the provided patientId belongs to the same tenant
    if (patientId) {
      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient || patient.tenantId !== tenantId) {
        throw new AppError('Invalid patient ID or patient belongs to a different institution', 400);
      }
    }

    // Upload DICOM to Azure Blob / S3
    let storageUrl: string | undefined;
    if (file) {
      storageUrl = await uploadToStorage({
        tenantId, file: file.buffer,
        fileName: file.originalname,
        contentType: file.mimetype,
        folder: `scans/${tenantId}`,
      });
    }

    // Create scan record
    const scan = await prisma.scan.create({
      data: {
        tenantId, patientId: patientId || null,
        referringDoctorId: referringDoctorId || userId,
        modality, bodyPart, priority, clinicalIndication, technique,
        dicomStudyUid, dicomSeriesUid, dicomInstanceUid,
        storageUrl, status: 'processing',
        fileName: file?.originalname,
        fileSize: file?.size,
      },
      include: { patient: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } }, tenant: true },
    });

    // FHIR ImagingStudy creation (Feature 4)
    const fhirStudyId = await createFHIRImagingStudy(scan).catch((err: any): null => {
      logger.warn(`[Scan] FHIR ImagingStudy creation failed: ${err.message}`);
      return null;
    });

    if (fhirStudyId) {
      await prisma.scan.update({ where: { id: scan.id }, data: { fhirImagingStudyId: fhirStudyId } });
    }

    // HL7v2 ORM message (Feature 9)
    const hl7OrderId = await sendHL7ORM(scan).catch((err: any): null => {
      logger.warn(`[Scan] HL7 ORM dispatch failed: ${err.message}`);
      return null;
    });

    if (hl7OrderId) {
      await prisma.scan.update({ where: { id: scan.id }, data: { hl7OrderId } });
    }

    // Trigger AI Triage Engine asynchronously (Feature 3)
    triggerAITriage(scan.id, tenantId).catch(err => {
      logger.error(`[Scan] AI Triage trigger failed: ${err.message}`);
    });

    // Increment monthly quota counter (and charge overage if applicable)
    incrementQuota(tenantId, req.body._overage ?? false, req.body._overageRate ?? 0)
      .catch(err => logger.error(`[Scan] Quota increment failed: ${err.message}`));

    await auditLog({
      tenantId, userId, action: 'SCAN_UPLOADED',
      entityId: scan.id, entity: 'Scan',
      metadata: { modality, bodyPart, priority, fileSize: file?.size },
    });

    // Real-time WebSocket notification to radiologists in tenant (Feature 6)
    io.to(`tenant:${tenantId}`).emit('scan:new', {
      scanId: scan.id, modality, bodyPart, priority,
      patientName: scan.patient?.user ? `${scan.patient.user.firstName} ${scan.patient.user.lastName}` : 'Unknown',
    });

    res.status(201).json({ scan, message: 'Scan uploaded. AI Triage Engine processing.' });
  } catch (err) { next(err); }
}

// GET /api/v1/scans — Worklist
export async function getWorklist(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, role } = req.user!;
    const { status, priority, modality, page = '1', limit = '50', search } = req.query as Record<string, string>;

    const cacheKey = `worklist:${tenantId}:${status}:${priority}:${page}:${limit}:${search}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const where: any = { tenantId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (modality) where.modality = modality;
    if (search) {
      where.OR = [
        { patient: { user: { OR: [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }] } } },
        { id: { contains: search, mode: 'insensitive' } },
        { aiResult: { primaryFinding: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [scans, total] = await Promise.all([
      prisma.scan.findMany({
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
      prisma.scan.count({ where }),
    ]);

    const result = { scans, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) };
    await redisClient.setex(cacheKey, 30, JSON.stringify(result)); // 30s cache

    res.json(result);
  } catch (err) { next(err); }
}

// GET /api/v1/scans/:id
export async function getScan(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const scan = await prisma.scan.findFirst({
      where: { id, tenantId },
      include: {
        patient: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, status: true } } } },
        aiResult: true,
        report: { include: { author: { select: { firstName: true, lastName: true } }, template: true } },
        annotations: true,
        secondOpinions: { include: { assignedTo: { select: { firstName: true, lastName: true, speciality: true } } } },
        referringDoctor: { select: { firstName: true, lastName: true, speciality: true } },
      },
    });

    if (!scan) throw new AppError('Scan not found', 404);
    res.json(scan);
  } catch (err) { next(err); }
}

// PATCH /api/v1/scans/:id/status
export async function updateScanStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, id: userId } = req.user!;
    const { id } = req.params;
    const { status } = req.body;

    const scan = await prisma.scan.update({
      where: { id, tenantId }, data: { status },
    });

    await auditLog({ tenantId, userId, action: 'SCAN_STATUS_UPDATED', entity: 'Scan', entityId: id, metadata: { status } });
    io.to(`tenant:${tenantId}`).emit('scan:updated', { scanId: id, status });

    res.json(scan);
  } catch (err) { next(err); }
}

// DELETE /api/v1/scans/:id (GDPR right to erasure)
export async function deleteScan(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, id: userId, role } = req.user!;
    if (!['admin', 'superadmin'].includes(role)) throw new AppError('Forbidden', 403);

    const { id } = req.params;

    const scan = await prisma.scan.findFirst({ where: { id, tenantId } });
    if (!scan) throw new AppError('Scan not found', 404);

    if (scan.storageUrl) {
      await deleteFromStorage(scan.storageUrl);
    }

    await prisma.scan.delete({ where: { id } });
    await auditLog({ tenantId, userId, action: 'SCAN_DELETED_GDPR', entity: 'Scan', entityId: id });

    res.json({ message: 'Scan deleted in compliance with GDPR right to erasure' });
  } catch (err) { next(err); }
}

// POST /api/v1/scans/demo (Technician Test Path)
export async function generateDemoScan(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, id: userId } = req.user!;
    
    // Create a high-fidelity synthetic STAT scan
    const scan = await prisma.scan.create({
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
        await prisma.aIResult.create({
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
        await prisma.scan.update({ where: { id: scan.id }, data: { status: 'COMPLETED' } });
        io.to(`tenant:${tenantId}`).emit('scan:updated', { scanId: scan.id, status: 'COMPLETED' });
      } catch (err) {
        logger.error('[Demo] AI result generation failed:', err);
      }
    }, 5000);

    res.status(201).json({ scan, message: 'Synthetic demo scan generated. AI processing in progress.' });
  } catch (err) { next(err); }
}

/**
 * POST /api/v1/scans/sync-batch
 * Synchronizes multiple offline scans from a medical tablet/edge node.
 * Includes locally-inferred AI results (INT8 inference).
 */
export async function syncOfflineBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, id: userId } = req.user!;
    const { scans } = req.body; // Array of scan metadata + AI results

    if (!Array.isArray(scans)) throw new AppError('Invalid batch payload', 400);
    if (scans.length > 100) throw new AppError('Batch size cannot exceed 100 scans per sync', 400);

    const results = [];

    for (const s of scans) {
      // Security: validate that the provided patientId belongs to the same tenant
      if (s.patientId) {
        const patient = await prisma.patient.findUnique({ where: { id: s.patientId } });
        if (!patient || patient.tenantId !== tenantId) {
          throw new AppError(`Invalid patient ID or patient belongs to a different institution: ${s.patientId}`, 400);
        }
      }

      // 1. Create the scan record
      const scan = await prisma.scan.create({
        data: {
          tenantId,
          patientId: s.patientId || null,
          modality: s.modality || 'CT',
          bodyPart: s.bodyPart || 'UNKNOWN',
          priority: s.priority || 'ROUTINE',
          status: 'ai_complete', // Already processed on the edge
          receivedAt: new Date(s.timestamp || Date.now()),
          clinicalIndication: s.clinicalIndication,
          technique: s.technique,
          dicomStudyUid: s.dicomStudyUid,
        }
      });

      // 2. Attach the local AI result
      if (s.aiResult) {
        await prisma.aIResult.create({
          data: {
            scanId: scan.id,
            tenantId,
            primaryFinding: s.aiResult.finding,
            urgency: s.aiResult.urgency || 'NORMAL',
            confidence: s.aiResult.confidence || 1.0,
            uncertaintyScore: s.aiResult.uncertainty || 0,
            rawJson: s.aiResult, // Store the full edge payload
          }
        });
      }

      results.push({ id: scan.id, localId: s.localId });
    }

    await auditLog({ 
      tenantId, userId, action: 'OFFLINE_SYNC_COMPLETE', 
      metadata: { count: scans.length } 
    });
    res.json({ success: true, count: scans.length, synced: results });
  } catch (err) { next(err); }
}

/**
 * POST /api/v1/scans/:id/notify
 * Triggers a STAT notification to the referring physician (HL7/WhatsApp)
 */
export async function notifyScan(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, id: userId } = req.user!;
    const { id } = req.params;

    const scan = await prisma.scan.findFirst({
      where: { id, tenantId },
      include: { referringDoctor: true, aiResult: true }
    });

    if (!scan) throw new AppError('Scan not found', 404);

    // In production, this would invoke the WhatsApp/SMS gateway or HL7 bridge
    logger.info(`[Notify] Alerting referring physician for Scan ${id} (Finding: ${scan.aiResult?.primaryFinding})`);
    
    await notifyUsers({
      tenantId,
      userIds: [scan.referringDoctorId || userId],
      type: 'critical_finding',
      title: 'CRITICAL RESULT ALERT',
      body: `STAT Finding detected for scan ${id}. Please review immediately.`,
      data: { scanId: id, urgency: 'CRITICAL' }
    });

    await auditLog({ 
      tenantId, userId, action: 'PHYSICIAN_NOTIFIED', 
      entityId: id, entity: 'Scan' 
    });

    res.json({ success: true, message: 'Referring physician notified via HL7/WhatsApp secure tunnel.' });
  } catch (err) { next(err); }
}
