// SEWA XAI — Azure Service Bus Bridge for Async MLOps
// Bridges BullMQ scan-ai-pipeline queue to Azure Service Bus
// for cross-region async embedding reindex and continuous learning.
// Uses REST API via axios (no SDK dependency needed).
// Free tier: 80 GB messages/month, 1000 operations/day.
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { scanQueue } from './scanQueue';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import crypto from 'crypto';

const SB_CONN = config.AZURE_SERVICEBUS_CONNECTION_STRING;
const SB_MLOPS_QUEUE = 'sewa-mlops-embedding';

// ── SAS Token Generation ────────────────────────────────────
function generateSAS(): string {
  if (!SB_CONN) return '';
  const parts = Object.fromEntries(SB_CONN.split(';').map(p => { const [k, v] = p.split('='); return [k, v]; }));
  const hostname = parts['Endpoint']?.replace('sb://', '');
  const keyName = parts['SharedAccessKeyName'];
  const key = parts['SharedAccessKey'];
  if (!hostname || !keyName || !key) return '';

  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const url = encodeURIComponent(hostname);
  const stringToSign = `${url}\n${expiry}`;
  const sig = crypto.createHmac('sha256', key).update(stringToSign).digest('base64');
  return `SharedAccessSignature sr=${url}&sig=${encodeURIComponent(sig)}&se=${expiry}&skn=${keyName}`;
}

// ── REST API Sender ────────────────────────────────────────
async function sendToServiceBus(queueName: string, body: any, opts?: { priority?: string; ttlMs?: number; messageId?: string }): Promise<void> {
  if (!SB_CONN) {
    logger.warn('[SB-MLOps] Azure Service Bus not configured — queuing locally only.');
    await scanQueue.add('fallback-reindex', body);
    return;
  }

  const hostname = SB_CONN.split(';').find(p => p.startsWith('Endpoint='))?.replace('sb://', '').replace('Endpoint=', '');
  const sas = generateSAS();
  const url = `https://${hostname}/${queueName}/messages`;

  await axios.post(url, JSON.stringify(body), {
    headers: {
      Authorization: sas,
      'Content-Type': 'application/atom+xml;type=entry;charset=utf-8',
    },
    params: { 'api-version': '2015-01' },
    timeout: 10000,
  });
}

/**
 * Send an embedding reindex job to the Azure Service Bus MLOps queue.
 * This replaces inline reindexProducts() with async processing.
 */
export async function sendEmbeddingReindexJob(opts: {
  scanId: string;
  tenantId: string;
  modelType: string;
  embeddingVector: number[];
  priority?: 'low' | 'normal' | 'high';
}): Promise<void> {
  try {
    await sendToServiceBus(SB_MLOPS_QUEUE, {
      type: 'embedding-reindex',
      ...opts,
      timestamp: new Date().toISOString(),
    }, { priority: opts.priority });
    logger.info(`[SB-MLOps] Embedding reindex job sent for scan ${opts.scanId} (model: ${opts.modelType})`);
  } catch (err: any) {
    logger.error(`[SB-MLOps] Failed to send embedding reindex job: ${err.message}`);
    await scanQueue.add('embedding-reindex-fallback', opts as any);
  }
}

/**
 * Send a federated learning round aggregation job to Azure Service Bus.
 */
export async function sendFederatedRoundJob(opts: {
  roundId: string;
  tenantId: string;
  modelWeights: Record<string, number[]>;
  globalModelVersion: string;
}): Promise<void> {
  try {
    await sendToServiceBus(SB_MLOPS_QUEUE, {
      type: 'federated-round',
      ...opts,
      timestamp: new Date().toISOString(),
    }, { priority: 'high' });
    logger.info(`[SB-MLOps] Federated round job sent for round ${opts.roundId}`);
  } catch (err: any) {
    logger.error(`[SB-MLOps] Failed to send federated round job: ${err.message}`);
    await scanQueue.add('federated-round-fallback', opts as any);
  }
}

export const azureServiceBusBridge = {
  sendEmbeddingReindexJob,
  sendFederatedRoundJob,
};
