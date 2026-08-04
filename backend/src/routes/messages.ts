// SEWA XAI — backend/src/routes/messages.ts
// Patient portal secure messaging: patients ↔ clinicians within a tenant.
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../utils/prismaClient';
import { AppError } from '../utils/AppError';

const router = Router();
router.use(authenticate);

const STAFF_ROLES = ['doctor', 'radiologist', 'admin', 'superadmin'];

/** GET /api/v1/messages?role=patient — list thread messages.
 *  Patients see their own thread; staff see messages for the tenant's patients. */
router.get('/', async (req, res, next) => {
  try {
    const { tenantId, id: userId, role } = req.user!;

    if (role === 'patient' || req.query.role === 'patient') {
      const patient = await prisma.patient.findUnique({ where: { userId } });
      if (!patient) return res.json({ messages: [] });

      const messages = await prisma.message.findMany({
        where: { patientId: patient.id },
        orderBy: { createdAt: 'asc' },
      });
      return res.json({ messages });
    }

    if (!STAFF_ROLES.includes(role)) return res.json({ messages: [] });

    const messages = await prisma.message.findMany({
      where: { patient: { tenantId } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        patient: { select: { id: true, mrn: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });
    res.json({ messages });
  } catch (err) { next(err); }
});

/** POST /api/v1/messages — send a message.
 *  Body: { content, recipientRole?, patientId? } (patientId required for staff). */
router.post('/', async (req, res, next) => {
  try {
    const { tenantId, id: userId, role } = req.user!;
    const { content, body, patientId } = req.body as { content?: string; body?: string; patientId?: string };

    const text = (content ?? body ?? '').trim();
    if (!text) throw new AppError('Message content is required', 400);

    if (role === 'patient') {
      const patient = await prisma.patient.findUnique({ where: { userId } });
      if (!patient) throw new AppError('Patient profile not found', 404);

      const message = await prisma.message.create({
        data: { patientId: patient.id, fromUserId: userId, fromRole: 'patient', body: text },
      });
      return res.status(201).json({ message });
    }

    if (!STAFF_ROLES.includes(role)) throw new AppError('Forbidden', 403);
    if (!patientId) throw new AppError('patientId is required', 400);

    const patient = await prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new AppError('Patient not found in this tenant', 404);

    const message = await prisma.message.create({
      data: { patientId, fromUserId: userId, fromRole: role, body: text },
    });
    res.status(201).json({ message });
  } catch (err) { next(err); }
});

/** PATCH /api/v1/messages/read — mark a thread as read. */
router.patch('/read', async (req, res, next) => {
  try {
    const { tenantId, id: userId, role } = req.user!;
    const { patientId } = req.body as { patientId?: string };

    if (role === 'patient') {
      const patient = await prisma.patient.findUnique({ where: { userId } });
      if (!patient) return res.json({ ok: true });
      await prisma.message.updateMany({ where: { patientId: patient.id, read: false }, data: { read: true } });
      return res.json({ ok: true });
    }

    if (!patientId) throw new AppError('patientId is required', 400);
    const patient = await prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new AppError('Patient not found in this tenant', 404);
    await prisma.message.updateMany({ where: { patientId, read: false }, data: { read: true } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
