// SEWA XAI — Scan Queue Bridge (Go → BullMQ)
// Listens to "sewa:scan:queue" (LPUSHed by Go service) and enqueues to BullMQ
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { scanQueue, enqueueScanProcessing } from './scanQueue';
import { prisma } from '../utils/prismaClient';

// Parse the ScanJob from Go (matches services/dicom-ingestion-go/internal/queue/redis.go ScanJob)
interface GoScanJob {
  scanId: string;
  tenantId: string;
  storageUrl: string;
  modality: string;
  bodyPart: string;
  fileSize: number;
  pixelHash: string;
  anonUid: string;
  receivedAt: string;
  region: string;
  priority: 'STAT' | 'URGENT' | 'ROUTINE';
}

// Start the bridge worker that consumes from "sewa:scan:queue"
export async function startScanQueueBridge() {
  logger.info('Starting scan queue bridge (Go Redis List → BullMQ)');
  
  // Create a dedicated connection for blocking commands
  const bridgeClient = redisClient.duplicate();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      // BRPOP: block until a job is available (ioredis signature: brpop(...keys, timeoutSeconds))
      const result = await bridgeClient.brpop('sewa:scan:queue', 0);
      if (!result || !result[1]) continue;

      const rawJob = result[1];
      logger.debug('Received job from Go ingestion queue', { rawJob });

      let goJob: GoScanJob;
      try {
        goJob = JSON.parse(rawJob);
      } catch (parseErr) {
        logger.error('Failed to parse Go scan job', { rawJob, error: parseErr });
        // Move to dead-letter (we'll use the same key as Go service for consistency)
        await bridgeClient.lpush('sewa:scan:dead', rawJob);
        continue;
      }

      // First, create the scan record in the database (since Go service may not have done it yet)
      try {
        await prisma.scan.create({
          data: {
            id: goJob.scanId,
            tenantId: goJob.tenantId,
            modality: goJob.modality,
            bodyPart: goJob.bodyPart,
            priority: goJob.priority,
            storageUrl: goJob.storageUrl,
            dicomInstanceUid: goJob.anonUid,
            status: 'processing',
            receivedAt: new Date(goJob.receivedAt),
          },
        });
      } catch (dbErr: any) {
        // If scan already exists (idempotency), that's okay!
        if (dbErr.code !== 'P2002') {
          logger.error('Failed to create scan in database', { scanId: goJob.scanId, error: dbErr });
          await bridgeClient.lpush('sewa:scan:dead', rawJob);
          continue;
        }
      }

      // Enqueue into BullMQ with appropriate priority
      // Map Go priorities to BullMQ priorities (1 = highest, 5 = lowest)
      const bullPriority: 1 | 2 | 3 =
        goJob.priority === 'STAT' ? 1 :
        goJob.priority === 'URGENT' ? 2 :
        3;

      await scanQueue.add(
        'process-scan' as any,
        { scanId: goJob.scanId, tenantId: goJob.tenantId } as any,
        {
          priority: bullPriority,
          jobId: goJob.scanId,
        }
      );

      logger.info('Bridged Go scan job to BullMQ', {
        scanId: goJob.scanId,
        tenantId: goJob.tenantId,
        priority: goJob.priority,
        bullPriority,
      });

    } catch (err: any) {
      logger.error('Scan queue bridge error', { error: err });
      // Exponential backoff to avoid spamming logs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
