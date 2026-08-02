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
            ].filter((cond): cond is { accessionNumber: string } | { dicomInstanceUid: string } =>
              !!(cond.accessionNumber || cond.dicomInstanceUid)
            )
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

// ── Edge AI Pre-processed Scan Ingestion ──────────────────────────────
router.post('/preprocessed', async (req, res) => {
  try {
    const { scans, edgeDeviceId, siteId } = req.body;
    if (!Array.isArray(scans) || scans.length === 0) {
      return res.status(400).json({ error: 'scans array is required' });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const { EdgeAIBridge } = await import('../services/edgeAIBridge');
    const bridge = new EdgeAIBridge(prisma);

    const result = await bridge.batchProcess(
      scans.map((s: Record<string, unknown>) => ({
        scanId: s.scanId as string,
        siteId: (s.siteId as string) || siteId as string,
        tenantId: req.user?.tenantId || 'default',
        edgeDeviceId: edgeDeviceId as string,
        modality: (s.modality as string) || 'Unknown',
        bodyPart: s.bodyPart as string | undefined,
        storageUrl: s.storageUrl as string | undefined,
        priority: s.priority as string | undefined,
        edgePreProcessing: (s.edgePreProcessing as Record<string, unknown>) || {},
        offlineQueued: s.offlineQueued as boolean | undefined,
      }))
    );

    await prisma.$disconnect();

    return res.json({
      message: 'Edge pre-processed scans accepted',
      acceptedCount: result.accepted,
      rejectedCount: result.rejected,
      scanIds: result.scanIds,
    });
  } catch (err) {
    console.error('[EdgeSync] preprocessed error:', err);
    return res.status(500).json({ error: 'Failed to process edge scans' });
  }
});

// ── Edge Site Configuration ───────────────────────────────────────────
router.get('/config', async (req, res) => {
  try {
    const siteId = req.query.siteId as string;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId query param required' });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const site = await prisma.edgeSite.findUnique({
      where: { siteId },
    });

    await prisma.$disconnect();

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    return res.json({
      siteId: site.siteId,
      supportedModalities: site.supportedModalities,
      enabledFeatures: site.enabledFeatures,
      maxOfflineQueueSizeMB: site.maxOfflineQueueSizeMB,
      heartbeatIntervalSec: site.heartbeatIntervalSec,
      aiModels: {
        quality: { version: '1.0.0', sha256: 'pending' },
        triage: { version: '1.0.0', sha256: 'pending' },
      },
    });
  } catch (err) {
    console.error('[EdgeSync] config error:', err);
    return res.status(500).json({ error: 'Failed to fetch site config' });
  }
});

// ── Edge Sync Status ──────────────────────────────────────────────────
router.get('/status/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const site = await prisma.edgeSite.findUnique({
      where: { siteId },
    });

    const recentScans = await prisma.edgePreProcessing.count({
      where: {
        siteId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    await prisma.$disconnect();

    return res.json({
      siteId,
      status: site?.status ?? 'unknown',
      totalScansProcessed: site?.totalScansProcessed ?? 0,
      scansLast24h: recentScans,
      lastHeartbeat: site?.lastHeartbeat?.toISOString() ?? null,
      totalDevices: site?.totalDevices ?? 0,
    });
  } catch (err) {
    console.error('[EdgeSync] status error:', err);
    return res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

export default router;
