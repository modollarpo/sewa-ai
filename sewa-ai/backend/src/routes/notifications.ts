// SEWA AI — backend/src/routes/notifications.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';
const r = Router();
r.use(authenticate);
r.get('/', async (req, res, next) => {
  try {
    const notifs = await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 50 });
    res.json(notifs);
  } catch (err) { next(err); }
});
r.patch('/:id/read', async (req, res, next) => {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
    res.json({ success: true });
  } catch (err) { next(err); }
});
r.patch('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } });
    res.json({ success: true });
  } catch (err) { next(err); }
});
export default r;
