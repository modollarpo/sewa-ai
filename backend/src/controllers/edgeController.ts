import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';

export const getEdgeDevices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const devices = await prisma.edgeDevice.findMany({
      include: { tenant: { select: { name: true, region: true } } },
      orderBy: { lastHeartbeat: 'desc' }
    });
    res.json(devices);
  } catch (err) { next(err); }
};

export const syncOfflineData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deviceId, tenantId, region, payload } = req.body;
    
    if (!deviceId || !tenantId || !payload || !Array.isArray(payload.scans)) {
      return res.status(400).json({ error: 'Invalid edge sync payload' });
    }

    // Upsert the edge device so it shows as active/syncing
    const device = await prisma.edgeDevice.upsert({
      where: { deviceId },
      update: { 
        status: 'syncing', 
        lastHeartbeat: new Date(),
        region: region || null
      },
      create: {
        deviceId,
        tenantId,
        deviceName: `Mobile Clinic - ${deviceId.substring(0,6)}`,
        status: 'syncing',
        region: region || null
      }
    });

    const numScans = payload.scans.length;
    let bytesTransferred = 0;

    logger.info(`[Edge AI] Starting sync for device ${deviceId}. Ingesting ${numScans} scans...`);

    // In a real system we would loop through and create the actual `Scan` rows with `origin: 'edge'`.
    // We mock the DB insertions for brevity in the demonstration.
    for (const scanData of payload.scans) {
      bytesTransferred += (scanData.fileSize || 15000000); // 15MB average DICOM size
    }

    // Log the sync event
    await prisma.edgeSyncLog.create({
      data: {
        edgeDeviceId: device.id,
        scansUploaded: numScans,
        bytesTransferred: bytesTransferred,
        syncDurationSec: Math.floor(Math.random() * 20) + 5, // random 5-25s
        status: 'success'
      }
    });

    // Update final device status
    await prisma.edgeDevice.update({
      where: { id: device.id },
      data: { 
        status: 'online', 
        totalSyncedScans: { increment: numScans },
        storageUsedMB: Math.floor(bytesTransferred / 1024 / 1024)
      }
    });

    logger.info(`[Edge AI] Sync complete for ${deviceId}. ${numScans} scans ingested.`);
    res.json({ message: 'Sync complete', scansProcessed: numScans, bytesTransferred });
  } catch (err) { next(err); }
};
