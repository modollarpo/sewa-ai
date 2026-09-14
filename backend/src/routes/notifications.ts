// SEWA XAI — backend/src/routes/notifications.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../utils/prismaClient';
import { AppError } from '../utils/AppError';
import { sendAzureNotificationHubPush } from '../services/notifications/notificationService';
const r = Router();
r.use(authenticate);

// ── Push Subscription ──
r.post('/push/subscribe', async (req, res, next) => {
  try {
    const { fcmToken, platform, categories } = req.body;
    const userId = req.user!.id;
    if (!fcmToken) throw new AppError('FCM token required', 400);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const existingTokens = user.fcmTokens ?? [];
    const filteredTokens = existingTokens.filter((t: string) => t !== fcmToken);
    const updatedTokens = [...filteredTokens, fcmToken].slice(0, 10);

    await prisma.user.update({ where: { id: userId }, data: { fcmTokens: updatedTokens } });
    res.json({ message: 'Push subscription registered', platform });
  } catch (err) { next(err); }
});

// ── Azure Notification Hubs (Secondary Channel) ──
r.post('/push/azure-nh', async (req, res, next) => {
  try {
    const { title, body, tags, urgency } = req.body;
    await sendAzureNotificationHubPush({ title, body, tags, urgency });
    res.json({ message: 'Azure Notification Hubs push sent' });
  } catch (err) { next(err); }
});

// ── Existing Notification Endpoints ──
r.get('/', async (req, res, next) => {
  try {
    const notifs = await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 50 });
    res.json(notifs);
  } catch (err) { next(err); }
});
r.patch('/:id/read', async (req, res, next) => {
  try {
    const { id: userId } = req.user!;
    const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notif) throw new AppError('Notification not found', 404);
    if (notif.userId !== userId) throw new AppError('Access denied', 403);
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
