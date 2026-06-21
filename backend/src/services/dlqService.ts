// SEWA AI — src/services/dlqService.ts
// Dead-Letter Queue (DLQ) for failed AI pipeline jobs.
// BG1/BG2 fix: provides retry escalation for scans whose runAIPipeline() threw.
// Uses Redis sorted-set as the queue (score = next retry timestamp in epoch ms).
// The DLQ cron runs every 5 minutes and re-queues eligible scans.
//
// Flow:
//   runAIPipeline() throws  →  dlq.enqueue(scanId, tenantId)
//   every 5 min             →  dlq.process() picks up due entries
//   after 3 failures        →  scan permanently marked 'failed', ops alerted
//
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).

import { redisClient } from '../config/redis';
import { prisma }      from '../config/database';
import { logger }      from '../utils/logger';
import { auditLog }    from '../utils/audit';
import { io }          from '../index';

const DLQ_KEY       = 'dlq:ai_pipeline';          // Redis sorted-set key
const MAX_ATTEMPTS  = 3;                           // max retries before permanent failure
const BASE_DELAY_MS = 5 * 60 * 1000;              // 5 min base delay (exponential backoff)

export interface DLQEntry {
  scanId:    string;
  tenantId:  string;
  attempts:  number;
  lastError: string;
  enqueuedAt: string;
}

export const dlq = {
  /**
   * Push a failed scan into the DLQ.
   * score = epoch ms for next retry attempt (with exponential backoff).
   */
  async enqueue(scanId: string, tenantId: string, error: string, attempt = 0): Promise<void> {
    try {
      const entry: DLQEntry = {
        scanId, tenantId,
        attempts:   attempt,
        lastError:  error.slice(0, 500),
        enqueuedAt: new Date().toISOString(),
      };
      const delayMs   = BASE_DELAY_MS * Math.pow(2, attempt);   // 5m, 10m, 20m
      const retryAt   = Date.now() + delayMs;
      await redisClient.zadd(DLQ_KEY, retryAt.toString(), JSON.stringify(entry));
      logger.warn(
        `[DLQ] Scan ${scanId} enqueued (attempt ${attempt + 1}/${MAX_ATTEMPTS}), ` +
        `retry in ${Math.round(delayMs / 60000)}min`
      );
    } catch (e: any) {
      logger.error(`[DLQ] Failed to enqueue scan ${scanId}: ${e.message}`);
    }
  },

  /**
   * Process due DLQ entries.
   * Called by the cron job every 5 minutes.
   * Re-imports runAIPipeline lazily to avoid circular dep at startup.
   */
  async process(): Promise<void> {
    try {
      const now = Date.now().toString();
      // Fetch all entries whose retry timestamp is <= now
      const raw = await redisClient.zrangebyscore(DLQ_KEY, '-inf', now);
      if (raw.length === 0) return;

      logger.info(`[DLQ] Processing ${raw.length} due entries`);

      // Remove them from the queue first (before retry to avoid double-processing)
      await redisClient.zremrangebyscore(DLQ_KEY, '-inf', now);

      const { runAIPipeline } = await import('./aiOrchestrator');

      for (const rawEntry of raw) {
        let entry: DLQEntry;
        try { entry = JSON.parse(rawEntry); }
        catch { continue; }

        const { scanId, tenantId, attempts, lastError } = entry;

        if (attempts >= MAX_ATTEMPTS) {
          // Permanently failed — mark in DB and alert ops
          logger.error(`[DLQ] Scan ${scanId} exhausted ${MAX_ATTEMPTS} retries. Marking permanent failure.`);
          await prisma.scan.update({
            where: { id: scanId },
            data:  { status: 'failed', errorMessage: `DLQ: max retries exceeded. Last: ${lastError}` },
          }).catch(() => {});

          await auditLog({
            tenantId, action: 'SCAN_PIPELINE_PERMANENT_FAILURE',
            entity: 'Scan', entityId: scanId,
            metadata: { attempts, lastError },
          }).catch(() => {});

          // Notify ops via Socket.IO superadmin room
          io.to('role:superadmin').emit('dlq:permanent_failure', { scanId, tenantId, attempts, lastError });
          continue;
        }

        // Re-run the pipeline
        try {
          logger.info(`[DLQ] Retrying scan ${scanId} (attempt ${attempts + 1}/${MAX_ATTEMPTS})`);
          await runAIPipeline(scanId, tenantId);
          logger.info(`[DLQ] Scan ${scanId} succeeded on retry ${attempts + 1}`);
        } catch (retryErr: any) {
          logger.error(`[DLQ] Scan ${scanId} retry ${attempts + 1} failed: ${retryErr.message}`);
          // Re-enqueue with incremented attempt counter
          await dlq.enqueue(scanId, tenantId, retryErr.message, attempts + 1);
        }
      }
    } catch (e: any) {
      logger.error(`[DLQ] Processor error: ${e.message}`);
    }
  },

  /** Return queue depth for monitoring dashboards */
  async depth(): Promise<number> {
    try { return await redisClient.zcard(DLQ_KEY); }
    catch { return -1; }
  },
};
