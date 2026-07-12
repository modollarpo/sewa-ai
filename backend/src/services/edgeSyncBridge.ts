// SEWA XAI — Edge Sync Bridge Service
// BRPOPs pre-processed scans from per-site Redis queues, creates Scan + EdgePreProcessing
// records, and enqueues to BullMQ with edge hints for downstream pipeline.

import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';
import { scanQueue, enqueueScanProcessing } from './scanQueue';

interface EdgeScanJob {
  scanId: string;
  siteId: string;
  tenantId: string;
  storageUrl: string;
  modality: string;
  bodyPart?: string;
  receivedAt: string;
  edgePreProcessing: {
    qualityScore: number;
    qualityFlags: string[];
    blurScore: number;
    noiseEstimate: number;
    motionArtifact: boolean;
    urgencyHint: string;
    urgencyConfidence: number;
    urgencyMethod: string;
    anonymizationComplete: boolean;
    phiStrippedTags: string[];
    processingMs: number;
  };
  priority: string;
  edgeDeviceId: string;
}

const POLL_INTERVAL_MS = parseInt(process.env.EDGE_SYNC_POLL_INTERVAL_MS || '5000', 10);
const DEAD_LETTER_KEY = 'sewa:edge:dead';
const SITE_KEY_PREFIX = 'sewa:edge:queue:';

let running = false;
let bridgeClients: Redis[] = [];

function mapPriorityToBullMQ(priority: string, urgencyHint?: string): 1 | 2 | 3 | 4 {
  const urgency = (urgencyHint || '').toUpperCase();
  if (urgency === 'CRITICAL') return 1;
  if (priority === 'STAT' || urgency === 'URGENT') return 2;
  if (priority === 'URGENT') return 2;
  return 3;
}

async function fetchActiveSiteIds(): Promise<string[]> {
  try {
    const sites = await prisma.edgeSite.findMany({
      where: { status: 'active' },
      select: { siteId: true },
    });
    return sites.map(s => s.siteId);
  } catch (err: any) {
    logger.error('[EdgeSyncBridge] Failed to fetch active sites', { error: err.message });
    return [];
  }
}

async function processJob(client: Redis, rawJob: string, siteId: string): Promise<void> {
  let job: EdgeScanJob;
  try {
    job = JSON.parse(rawJob);
  } catch (parseErr) {
    logger.error('[EdgeSyncBridge] Failed to parse edge scan job', { rawJob, siteId, error: parseErr });
    await client.lpush(DEAD_LETTER_KEY, rawJob);
    return;
  }

  // 1. Create or find existing Scan record
  let scan;
  try {
    scan = await prisma.scan.upsert({
      where: { id: job.scanId },
      update: {},
      create: {
        id: job.scanId,
        tenantId: job.tenantId,
        modality: job.modality,
        bodyPart: job.bodyPart || 'Unspecified',
        storageUrl: job.storageUrl,
        origin: 'edge',
        status: 'received',
        priority: job.priority || 'ROUTINE',
        receivedAt: new Date(job.receivedAt),
      },
    });
  } catch (dbErr: any) {
    logger.error('[EdgeSyncBridge] Failed to upsert scan', { scanId: job.scanId, error: dbErr.message });
    await client.lpush(DEAD_LETTER_KEY, rawJob);
    return;
  }

  // 2. Create EdgePreProcessing record
  const ep = job.edgePreProcessing;
  try {
    await prisma.edgePreProcessing.create({
      data: {
        scanId: job.scanId,
        edgeDeviceId: job.edgeDeviceId,
        siteId: job.siteId,
        qualityScore: ep.qualityScore,
        qualityFlags: ep.qualityFlags || [],
        blurScore: ep.blurScore,
        noiseEstimate: ep.noiseEstimate,
        motionArtifact: ep.motionArtifact,
        urgencyHint: ep.urgencyHint,
        urgencyConfidence: ep.urgencyConfidence,
        urgencyMethod: ep.urgencyMethod,
        anonymizationVersion: 'hipaa-safe-harbour-v2',
        anonymizationComplete: ep.anonymizationComplete,
        phiStrippedTags: ep.phiStrippedTags || [],
        processingMs: ep.processingMs,
      },
    });
  } catch (epErr: any) {
    if (epErr.code !== 'P2002') {
      logger.error('[EdgeSyncBridge] Failed to create EdgePreProcessing', {
        scanId: job.scanId,
        error: epErr.message,
      });
    }
  }

  // 3. If qualityScore > 0.8, update scan directly
  if (ep.qualityScore != null && ep.qualityScore > 0.8) {
    try {
      await prisma.scan.update({
        where: { id: job.scanId },
        data: {
          qualityScore: ep.qualityScore,
          qualityFlags: ep.qualityFlags || [],
        },
      });
    } catch (err: any) {
      logger.warn('[EdgeSyncBridge] Failed to set scan qualityScore', { scanId: job.scanId, error: err.message });
    }
  }

  // 4. If urgencyHint is CRITICAL/URGENT, update scan priority and urgency
  const urgency = (ep.urgencyHint || '').toUpperCase();
  if (urgency === 'CRITICAL' || urgency === 'URGENT') {
    try {
      await prisma.scan.update({
        where: { id: job.scanId },
        data: {
          priority: urgency === 'CRITICAL' ? 'STAT' : 'URGENT',
          urgency: ep.urgencyHint,
        },
      });
    } catch (err: any) {
      logger.warn('[EdgeSyncBridge] Failed to update scan urgency', { scanId: job.scanId, error: err.message });
    }
  }

  // 5. Enqueue to BullMQ with edge hints in metadata
  try {
    const bullPriority = mapPriorityToBullMQ(job.priority, ep.urgencyHint);
    await scanQueue.add(
      'process-scan' as any,
      {
        scanId: job.scanId,
        tenantId: job.tenantId,
        edgeHints: {
          siteId: job.siteId,
          edgeDeviceId: job.edgeDeviceId,
          qualityScore: ep.qualityScore,
          qualityFlags: ep.qualityFlags,
          urgencyHint: ep.urgencyHint,
          urgencyConfidence: ep.urgencyConfidence,
          blurScore: ep.blurScore,
          noiseEstimate: ep.noiseEstimate,
          motionArtifact: ep.motionArtifact,
          anonymizationComplete: ep.anonymizationComplete,
          skipQualityAssessment: (ep.qualityScore ?? 0) > 0.8,
          edgeProcessingMs: ep.processingMs,
        },
      } as any,
      {
        priority: bullPriority,
        jobId: job.scanId,
      },
    );
    logger.info('[EdgeSyncBridge] Enqueued edge scan to BullMQ', {
      scanId: job.scanId,
      tenantId: job.tenantId,
      siteId: job.siteId,
      bullPriority,
    });
  } catch (enqueueErr: any) {
    logger.error('[EdgeSyncBridge] Failed to enqueue to BullMQ', {
      scanId: job.scanId,
      error: enqueueErr.message,
    });
  }
}

async function pollSite(client: Redis, siteId: string): Promise<void> {
  const key = `${SITE_KEY_PREFIX}${siteId}`;
  try {
    const result = await client.brpop(key, 1);
    if (!result || !result[1]) return;
    await processJob(client, result[1], siteId);
  } catch (err: any) {
    logger.error('[EdgeSyncBridge] Poll error', { siteId, error: err.message });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function bridgeLoop(): Promise<void> {
  logger.info('[EdgeSyncBridge] Bridge loop started', { pollIntervalMs: POLL_INTERVAL_MS });

  while (running) {
    const siteIds = await fetchActiveSiteIds();
    if (siteIds.length === 0) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    for (const siteId of siteIds) {
      if (!running) break;
      await pollSite(bridgeClients[0], siteId);
    }

    // Small sleep between full poll cycles
    await sleep(Math.min(POLL_INTERVAL_MS, 1000));
  }

  logger.info('[EdgeSyncBridge] Bridge loop stopped');
}

export function startEdgeSyncBridge(): void {
  if (running) {
    logger.warn('[EdgeSyncBridge] Already running');
    return;
  }
  running = true;

  // Create dedicated Redis connections for blocking commands
  const client = (scanQueue as any).connection?.duplicate?.() || new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    retryStrategy: (times: number) => Math.min(times * 200, 30_000),
  });
  bridgeClients = [client];

  logger.info('[EdgeSyncBridge] Starting edge sync bridge');
  bridgeLoop().catch(err => {
    logger.error('[EdgeSyncBridge] Fatal error in bridge loop', { error: err.message });
  });
}

export function stopEdgeSyncBridge(): void {
  if (!running) return;
  running = false;
  logger.info('[EdgeSyncBridge] Stopping edge sync bridge');

  for (const client of bridgeClients) {
    client.quit().catch(() => {});
  }
  bridgeClients = [];
}

export type { EdgeScanJob };
