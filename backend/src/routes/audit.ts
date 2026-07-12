// SEWA XAI — backend/src/routes/audit.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../utils/prismaClient';
import { verifyChain } from '../utils/audit';
import { sealAuditBlock, verifyBlockChain, getBlockByIndex, getLatestBlock } from '../services/merkleBlockService';
const r = Router();
r.use(authenticate, authorize('admin','superadmin'));
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
r.get('/verify', async (req, res, next) => {
  try { res.json(await verifyChain()); } catch (err) { next(err); }
});
r.get('/blocks', async (req, res, next) => {
  try {
    const blocks = await prisma.auditBlock.findMany({ orderBy: { blockIndex: 'desc' }, take: 20 });
    res.json({ blocks });
  } catch (err) { next(err); }
});
r.get('/blocks/latest', async (req, res, next) => {
  try { res.json(await getLatestBlock()); } catch (err) { next(err); }
});
r.get('/blocks/:blockIndex', async (req, res, next) => {
  try {
    const block = await getBlockByIndex(parseInt(req.params.blockIndex));
    if (!block) return res.status(404).json({ error: 'Block not found' });
    res.json(block);
  } catch (err) { next(err); }
});
r.post('/blocks/seal', async (req, res, next) => {
  try {
    const hash = await sealAuditBlock();
    res.json({ sealed: !!hash, blockHash: hash });
  } catch (err) { next(err); }
});
r.get('/blocks/verify-chain', async (req, res, next) => {
  try { res.json(await verifyBlockChain()); } catch (err) { next(err); }
});
export default r;
