// SEWA XAI — backend/src/routes/audit.ts
// HIPAA/GDPR compliant audit log with Merkle-chain and Confidential Ledger verification
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../utils/prismaClient';
import { verifyChain } from '../utils/audit';
import { sealAuditBlock, verifyBlockChain, getBlockByIndex, getLatestBlock } from '../services/merkleBlockService';
const r = Router();
r.use(authenticate, authorize('admin','superadmin'));

/**
 * GET /api/v1/audit
 * @summary List audit log entries with pagination
 * @tags Audit
 * @param {string} userId.query - Filter by user ID
 * @param {string} action.query - Filter by action (case-insensitive)
 * @param {number} page.query - Page number (default 1)
 * @param {number} limit.query - Results per page (default 100)
 * @return {object} 200 - { logs: AuditLog[], total: number }
 */
r.get('/', async (req, res, next) => {
  try {
    const { page='1', limit='100', userId, action } = req.query as Record<string,string>;
    const where: any = {};
    if (req.user!.role !== 'superadmin') where.tenantId = req.user!.tenantId;
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt:'desc' }, take: parseInt(limit), skip: (parseInt(page)-1)*parseInt(limit) }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ logs, total });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/audit/verify
 * @summary Verify Merkle chain integrity of all audit entries
 * @tags Audit
 * @return {object} 200 - { valid: boolean, brokenId?: string }
 */
r.get('/verify', async (req, res, next) => {
  try { res.json(await verifyChain()); } catch (err) { next(err); }
});

/**
 * GET /api/v1/audit/blocks
 * @summary List Merkle audit blocks (most recent 20)
 * @tags Audit
 * @return {object} 200 - { blocks: AuditBlock[] }
 */
r.get('/blocks', async (req, res, next) => {
  try {
    const blocks = await prisma.auditBlock.findMany({ orderBy: { blockIndex: 'desc' }, take: 20 });
    res.json({ blocks });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/audit/blocks/latest
 * @summary Get the most recent audit block
 * @tags Audit
 * @return {object} 200 - AuditBlock
 */
r.get('/blocks/latest', async (req, res, next) => {
  try { res.json(await getLatestBlock()); } catch (err) { next(err); }
});

/**
 * GET /api/v1/audit/blocks/{blockIndex}
 * @summary Get a specific audit block by index
 * @tags Audit
 * @param {number} blockIndex.path - Block index
 * @return {object} 200 - AuditBlock
 * @return {object} 404 - Block not found
 */
r.get('/blocks/:blockIndex', async (req, res, next) => {
  try {
    const block = await getBlockByIndex(parseInt(req.params.blockIndex));
    if (!block) return res.status(404).json({ error: 'Block not found' });
    res.json(block);
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/audit/blocks/seal
 * @summary Seal pending audit entries into a new Merkle block
 * @tags Audit
 * @return {object} 200 - { sealed: boolean, blockHash: string|null }
 */
r.post('/blocks/seal', async (req, res, next) => {
  try {
    const hash = await sealAuditBlock();
    res.json({ sealed: !!hash, blockHash: hash });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/audit/blocks/verify-chain
 * @summary Verify the integrity of the Merkle block chain
 * @tags Audit
 * @return {object} 200 - { valid: boolean, brokenBlock?: number }
 */
r.get('/blocks/verify-chain', async (req, res, next) => {
  try { res.json(await verifyBlockChain()); } catch (err) { next(err); }
});

/**
 * POST /api/v1/audit/blocks/{blockIndex}/commit
 * @summary Commit an audit block to Azure Confidential Ledger
 * @tags Audit
 * @param {number} blockIndex.path - Block index
 * @return {object} 200 - { message: string, blockIndex: number }
 */
r.post('/blocks/:blockIndex/commit', async (req, res, next) => {
  try {
    const { commitBlock } = await import('../services/confidentialLedgerService');
    const block = await prisma.auditBlock.findUnique({ where: { blockIndex: parseInt(req.params.blockIndex) } });
    if (!block) return res.status(404).json({ error: 'Block not found' });
    await commitBlock(block.id);
    res.json({ message: 'Block committed to ledger', blockIndex: block.blockIndex });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/audit/blocks/commit-all
 * @summary Commit all pending audit blocks to Confidential Ledger
 * @tags Audit
 * @return {object} 200 - { message: string }
 */
r.post('/blocks/commit-all', async (req, res, next) => {
  try {
    const { commitAllPendingBlocks } = await import('../services/confidentialLedgerService');
    await commitAllPendingBlocks();
    res.json({ message: 'All pending blocks committed' });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/audit/blocks/{blockIndex}/ledger-verify
 * @summary Verify a block was committed to Confidential Ledger
 * @tags Audit
 * @param {number} blockIndex.path - Block index
 * @return {object} 200 - { valid: boolean, ledgerTxId?: string }
 */
r.get('/blocks/:blockIndex/ledger-verify', async (req, res, next) => {
  try {
    const { verifyLedgerBlock } = await import('../services/confidentialLedgerService');
    const result = await verifyLedgerBlock(parseInt(req.params.blockIndex));
    res.json(result);
  } catch (err) { next(err); }
});
export default r;
