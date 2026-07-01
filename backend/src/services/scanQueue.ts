// SEWA XAI — Scan Queue (BullMQ)
// Manages AI pipeline job queuing for 1000+ concurrent scan support
import { Queue, Worker, Job } from 'bullmq';
import { redisClient } from '../config/redis';
import { runAIPipeline } from './aiOrchestrator';
import { logger } from '../utils/logger';

// Job interface
interface ScanJobData {
  scanId: string;
  tenantId: string;
}

// Queue name
const QUEUE_NAME = 'scan-ai-pipeline';

// Create the queue
export const scanQueue = new Queue<ScanJobData, any, string>(QUEUE_NAME, {
  connection: redisClient as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000,
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 1 day
    },
  },
});

// Enqueue a scan for AI processing
export async function enqueueScanProcessing(
  scanId: string,
  tenantId: string,
  priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
): Promise<Job<ScanJobData, any, string>> {
  // Map priority to BullMQ priority (lower numbers = higher priority)
  const bullPriority = priority === 'critical' ? 1 :
                      priority === 'high' ? 2 :
                      priority === 'normal' ? 3 : 4;

  const job = await scanQueue.add(
    'process-scan' as any,
    { scanId, tenantId },
    {
      priority: bullPriority,
      jobId: scanId, // Use scanId as jobId to prevent duplicates
    }
  );

  logger.info(`[Scan Queue] Enqueued scan ${scanId} (tenant: ${tenantId}, priority: ${priority}, job: ${job.id})`);
  return job as Job<ScanJobData, any, string>;
}

// Worker function to process scan jobs
export async function processScanJob(job: Job<ScanJobData, any, string>): Promise<void> {
  const { scanId, tenantId } = job.data;
  logger.info(`[Scan Queue] Processing job ${job.id} for scan ${scanId} (tenant: ${tenantId})`);
  await runAIPipeline(scanId, tenantId);
  logger.info(`[Scan Queue] Job ${job.id} completed successfully for scan ${scanId}`);
}

// Start the worker
export function startScanWorker(concurrency: number = 10): Worker<ScanJobData, any, string> {
  const worker = new Worker<ScanJobData, any, string>(
    QUEUE_NAME,
    processScanJob,
    {
      connection: redisClient as any,
      concurrency,
    }
  );

  worker.on('completed', (job) => {
    logger.info(`[Scan Queue] Job ${job?.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[Scan Queue] Job ${job?.id} failed: ${err.message}`);
  });

  logger.info(`[Scan Queue] Worker started with concurrency: ${concurrency}`);
  return worker;
}
