import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { idempotent } from '../middleware/idempotency';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

const router = Router();

/**
 * POST /api/v1/edge-sync/sync
 * Receives batched local scans from an Edge Node (tablet/offline gateway)
 */
router.post('/sync',
  authenticate, authorize('admin', 'superadmin', 'technician'), idempotent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { edgeDeviceId, scans } = req.body;
      const { tenantId } = req.user!;

      if (!edgeDeviceId || !Array.isArray(scans)) {
        throw new AppError('edgeDeviceId and scans array are required', 400);
      }

      // Fetch or update the edge device status
      await prisma.edgeDevice.upsert({
        where: { deviceId: edgeDeviceId },
        update: { 
          status: 'online', 
          lastHeartbeat: new Date(), 
          totalSyncedScans: { increment: scans.length } 
        },
        create: {
          deviceId: edgeDeviceId,
          deviceName: `Edge Node ${edgeDeviceId.slice(0, 4)}`,
          tenantId,
          status: 'online',
          totalSyncedScans: scans.length
        }
      });

      const syncedIds: string[] = [];
      const skippedIds: string[] = [];

      for (const edgeScan of scans) {
        // De-duplicate using accessionNumber or DICOM Instance UID
        const existing = await prisma.scan.findFirst({
          where: {
            tenantId,
            OR: [
              { accessionNumber: edgeScan.accessionNumber },
              { dicomInstanceUid: edgeScan.dicomInstanceUid }
            ].filter(cond => cond.accessionNumber || cond.dicomInstanceUid) as any
          }
        });

        if (existing) {
          skippedIds.push(edgeScan.localId);
          continue;
        }

        // Find or create patient
        let patient = await prisma.patient.findFirst({
          where: { tenantId, mrn: edgeScan.patientMrn }
        });

        if (!patient) {
          // Create dummy user for the patient records
          const user = await prisma.user.create({
            data: {
              email: `patient-${edgeScan.patientMrn}@sewaxai.health`,
              firstName: 'Offline',
              lastName: 'Sync-Patient',
              role: 'patient',
              tenantId,
              passwordHash: '$2b$10$offline.dummy.hash.value.so.its.set.properly'
            }
          });
          patient = await prisma.patient.create({
            data: {
              userId: user.id,
              tenantId,
              mrn: edgeScan.patientMrn,
              dateOfBirth: new Date(edgeScan.patientDob || '1980-01-01'),
              sex: edgeScan.patientSex || 'O'
            }
          });
        }

        // Insert new scan
        await prisma.scan.create({
          data: {
            tenantId,
            patientId: patient.id,
            modality: edgeScan.modality,
            bodyPart: edgeScan.bodyPart || 'Unspecified',
            priority: edgeScan.priority || 'ROUTINE',
            accessionNumber: edgeScan.accessionNumber,
            dicomInstanceUid: edgeScan.dicomInstanceUid,
            origin: 'edge',
            status: 'ai_complete'
          }
        });

        syncedIds.push(edgeScan.localId);
      }

      // Log the sync event
      await prisma.edgeSyncLog.create({
        data: {
          edgeDeviceId,
          scansUploaded: syncedIds.length,
          status: syncedIds.length > 0 ? 'success' : 'partial'
        }
      });

      res.json({
        message: 'Edge Node batch synchronization completed.',
        syncedCount: syncedIds.length,
        skippedCount: skippedIds.length,
        syncedIds,
        skippedIds
      });
    } catch (err) { next(err); }
  }
);

export default router;
