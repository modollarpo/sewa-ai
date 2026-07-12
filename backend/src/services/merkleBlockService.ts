import crypto from 'crypto';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';

const BLOCK_SIZE = 50;

function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return crypto.createHash('sha256').update('empty').digest('hex');
  let layer = hashes.map(h => h);
  while (layer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 < layer.length) {
        nextLayer.push(crypto.createHash('sha256').update(layer[i] + layer[i + 1]).digest('hex'));
      } else {
        nextLayer.push(layer[i]);
      }
    }
    layer = nextLayer;
  }
  return layer[0];
}

export async function sealAuditBlock(): Promise<string | null> {
  try {
    const unsealed = await prisma.auditLog.findMany({
      where: { blockIndex: null },
      orderBy: { createdAt: 'asc' },
      take: BLOCK_SIZE,
      select: { id: true, sha256Hash: true, createdAt: true },
    });
    if (unsealed.length === 0) return null;

    const entryIds = unsealed.map(e => e.id);
    const entryHashes = unsealed.map(e => e.sha256Hash || '');
    const merkleRoot = computeMerkleRoot(entryHashes);

    const lastBlock = await prisma.auditBlock.findFirst({
      orderBy: { blockIndex: 'desc' },
      select: { blockIndex: true, blockHash: true },
    });
    const blockIndex = (lastBlock?.blockIndex ?? 0) + 1;
    const previousBlockHash = lastBlock?.blockHash ?? 'genesis';
    const blockHash = crypto.createHash('sha256')
      .update(previousBlockHash + merkleRoot)
      .digest('hex');

    await prisma.auditBlock.create({
      data: { blockIndex, merkleRoot, entryCount: entryIds.length, entryIds, previousBlockHash, blockHash },
    });

    await prisma.auditLog.updateMany({
      where: { id: { in: entryIds } },
      data: { blockIndex, merkleRoot },
    });

    logger.info(`[MerkleBlock] Sealed block #${blockIndex} with ${entryIds.length} entries, root=${merkleRoot.slice(0, 12)}...`);
    return blockHash;
  } catch (err: any) {
    logger.error(`[MerkleBlock] Failed to seal block: ${err.message}`);
    return null;
  }
}

export async function verifyBlockChain(): Promise<{ valid: boolean; brokenBlock?: number }> {
  const blocks = await prisma.auditBlock.findMany({
    orderBy: { blockIndex: 'asc' },
  });

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const expectedPrev = i === 0 ? 'genesis' : blocks[i - 1].blockHash;
    if (block.previousBlockHash !== expectedPrev) {
      return { valid: false, brokenBlock: block.blockIndex };
    }
    const expectedBlockHash = crypto.createHash('sha256')
      .update(block.previousBlockHash + block.merkleRoot)
      .digest('hex');
    if (block.blockHash !== expectedBlockHash) {
      return { valid: false, brokenBlock: block.blockIndex };
    }
  }
  return { valid: true };
}

export async function getBlockByIndex(blockIndex: number) {
  return prisma.auditBlock.findUnique({ where: { blockIndex } });
}

export async function getLatestBlock() {
  return prisma.auditBlock.findFirst({ orderBy: { blockIndex: 'desc' } });
}
