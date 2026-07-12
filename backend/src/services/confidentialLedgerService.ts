import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';
import { config } from '../config/env';

const LEDGER_URL = config.AZURE_CONFIDENTIAL_LEDGER_URL;

export async function commitBlock(blockId: string): Promise<void> {
  const block = await prisma.auditBlock.findUnique({ where: { id: blockId } });
  if (!block) { logger.warn(`[Ledger] Block ${blockId} not found`); return; }
  if (block.committed) { logger.debug(`[Ledger] Block ${block.blockIndex} already committed`); return; }

  if (!LEDGER_URL) {
    logger.warn(`[Ledger] AZURE_CONFIDENTIAL_LEDGER_URL not set. Marking block ${block.blockIndex} as committed locally.`);
    await prisma.auditBlock.update({
      where: { id: blockId },
      data: {
        committed: true,
        ledgerTxId: `local-sim-${Date.now()}`,
        ledgerReceipt: { simulated: true, timestamp: new Date().toISOString() },
      },
    });
    return;
  }

  try {
    const payload = {
      blockIndex: block.blockIndex,
      merkleRoot: block.merkleRoot,
      entryCount: block.entryCount,
      previousBlockHash: block.previousBlockHash,
      blockHash: block.blockHash,
      entryIds: block.entryIds,
      timestamp: block.createdAt.toISOString(),
    };

    const response = await fetch(`${LEDGER_URL}/app/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: JSON.stringify(payload) }),
    });

    if (!response.ok) {
      throw new Error(`Ledger API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as any;
    const txId = response.headers.get('x-ms-ccf-transaction-id') || result?.transactionId || 'unknown';

    await prisma.auditBlock.update({
      where: { id: blockId },
      data: { committed: true, ledgerTxId: txId, ledgerReceipt: result },
    });

    logger.info(`[Ledger] Block ${block.blockIndex} committed to Confidential Ledger (tx: ${txId})`);
  } catch (err: any) {
    logger.error(`[Ledger] Failed to commit block ${block.blockIndex}: ${err.message}`);
  }
}

export async function commitAllPendingBlocks(): Promise<void> {
  const pending = await prisma.auditBlock.findMany({
    where: { committed: false },
    orderBy: { blockIndex: 'asc' },
  });
  for (const block of pending) {
    await commitBlock(block.id);
  }
  logger.info(`[Ledger] Committed ${pending.length} pending blocks`);
}

export async function verifyLedgerBlock(blockIndex: number): Promise<{ valid: boolean; ledgerTxId?: string }> {
  const block = await prisma.auditBlock.findUnique({ where: { blockIndex } });
  if (!block) return { valid: false };
  if (!block.committed || !block.ledgerTxId) return { valid: false };

  if (!LEDGER_URL) return { valid: block.committed, ledgerTxId: block.ledgerTxId || undefined };

  try {
    const response = await fetch(`${LEDGER_URL}/app/transactions/${block.ledgerTxId}/receipt`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return { valid: false, ledgerTxId: block.ledgerTxId || undefined };

    return { valid: true, ledgerTxId: block.ledgerTxId || undefined };
  } catch (err: any) {
    logger.error(`[Ledger] Verify failed for block ${blockIndex}: ${err.message}`);
    return { valid: false, ledgerTxId: block.ledgerTxId || undefined };
  }
}
