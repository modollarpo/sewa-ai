import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';
import { splitReferralFee, chargePatientForReferral, chargeHospitalForReferral } from '../services/paymentService';

// ── GET /referrals — List referrals for current user ──────────────
export const getReferrals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { status, priority } = req.query;

    const where: any = {};
    if (status)   where.status   = status;
    if (priority) where.priority = priority;

    // Doctors see their outbound requests. Specialists see inbound assignments.
    if (user.role === 'doctor') where.requesterId = user.id;
    else if (user.role === 'radiologist') where.assignedToId = user.id;
    else if (user.role === 'admin' || user.role === 'superadmin') {
      where.scan = { tenantId: user.tenantId };
    }

    const referrals = await prisma.secondOpinion.findMany({
      where,
      include: {
        scan:       { select: { modality: true, bodyPart: true, priority: true, accessionNumber: true, storageUrl: true } },
        report:     { select: { impression: true, createdAt: true } },
        requester:  { select: { firstName: true, lastName: true, email: true, role: true } },
        assignedTo: { select: { firstName: true, lastName: true, email: true, role: true, stripeAccountId: true } },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });

    res.json(referrals);
  } catch (err) { next(err); }
};

// ── POST /referrals — Submit a referral request ────────────────────
export const createReferral = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { scanId, reason, priority, specialistId, billingType } = req.body;

    if (!scanId || !reason) {
      return res.status(400).json({ error: 'scanId and reason are required' });
    }

    const scan = await prisma.scan.findFirst({
      where: { id: scanId, tenantId: user.tenantId },
      include: { tenant: true }
    });
    if (!scan) return res.status(404).json({ error: 'Scan not found' });

    // Set SLA based on priority
    const slaHours: Record<string, number> = { STAT: 2, URGENT: 8, ROUTINE: 72 };
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + (slaHours[priority] ?? 72));

    const type = billingType === 'patient' ? 'patient' : 'hospital';

    const referral = await prisma.secondOpinion.create({
      data: {
        scanId,
        requesterId:  user.id,
        assignedToId: specialistId || null,
        status:       'draft', // temporary status during payment setup
        priority:     priority || 'ROUTINE',
        reason,
        slaDeadline,
        billingType:  type
      },
      include: {
        scan:      { select: { modality: true, bodyPart: true } },
        requester: { select: { firstName: true, lastName: true } },
        assignedTo: { select: { firstName: true, lastName: true, email: true } },
      }
    });

    let initialStatus = 'pending';
    let paymentLinkId = null;
    let paymentStatus = 'unpaid';

    try {
      if (type === 'patient') {
        const session = await chargePatientForReferral(referral.id, scan.tenant);
        paymentLinkId = session.url;
        initialStatus = 'pending_payment';
      } else {
        await chargeHospitalForReferral(referral.id, scan.tenant);
        initialStatus = specialistId ? 'assigned' : 'pending';
        paymentStatus = 'paid';
      }
    } catch (e: any) {
      await prisma.secondOpinion.delete({ where: { id: referral.id } });
      return res.status(400).json({ error: `Payment setup failed: ${e.message}` });
    }

    const updatedReferral = await prisma.secondOpinion.update({
      where: { id: referral.id },
      data: { status: initialStatus, paymentLinkId, paymentStatus },
      include: {
        scan:      { select: { modality: true, bodyPart: true } },
        requester: { select: { firstName: true, lastName: true } },
        assignedTo: { select: { firstName: true, lastName: true, email: true } },
      }
    });

    logger.info(`[Referral] New ${priority} referral created by ${user.email} for scan ${scanId}`);
    res.status(201).json(updatedReferral);
  } catch (err) { next(err); }
};

// ── PATCH /referrals/:id — Update referral (assign specialist, add notes, resolve) ──
export const updateReferral = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, assignedToId, reviewNotes, agreedWithAI } = req.body;

    const referral = await prisma.secondOpinion.update({
      where: { id },
      data: {
        ...(status        && { status }),
        ...(assignedToId  && { assignedToId }),
        ...(reviewNotes   && { reviewNotes }),
        ...(agreedWithAI  !== undefined && { agreedWithAI }),
        ...(status === 'assigned' && { escalatedAt: null }),
      },
      include: {
        scan:       { select: { modality: true, bodyPart: true } },
        assignedTo: { select: { firstName: true, lastName: true, email: true } },
        requester:  { select: { firstName: true, lastName: true } },
      }
    });

    // If completed and paid, trigger payout
    if (status === 'completed' && referral.paymentStatus === 'paid') {
      try {
        await splitReferralFee(referral.scanId, referral.id);
      } catch (err: any) {
        logger.error(`[Referral] Payout failed for ${id}: ${err.message}`);
      }
    }

    logger.info(`[Referral] Referral ${id} updated to status: ${status || 'unchanged'}`);
    res.json(referral);
  } catch (err) { next(err); }
};

// ── GET /referrals/specialists — Available specialists on the network ──
export const getSpecialists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { specialty, region } = req.query;

    const where: any = {
      role: { in: ['radiologist', 'doctor'] },
      status: 'active',
    };
    if (region) where.tenant = { region };

    const specialists = await prisma.user.findMany({
      where,
      select: {
        id: true, firstName: true, lastName: true, email: true, role: true, tenant: { select: { region: true } },
        stripeAccountId: true, // indicates they can receive payments
        secondAssigned: {
          select: { status: true },
          where: { status: { in: ['assigned', 'pending'] } },
          take: 50,
        },
      },
      take: 50,
    });

    // Compute current workload for each specialist
    const enriched = specialists.map(s => ({
      ...s,
      displayName: `${s.firstName} ${s.lastName}`.trim(),
      activeReferrals: s.secondAssigned.length,
      availability:    s.secondAssigned.length < 5 ? 'available' : s.secondAssigned.length < 10 ? 'busy' : 'full',
      consultationFee: s.stripeAccountId ? 75 : null,
      region: s.tenant?.region,
      tenant: undefined,
      secondAssigned: undefined,
    }));

    res.json(enriched);
  } catch (err) { next(err); }
};

// ── GET /referrals/stats — Referral network stats for admin dashboard ──
export const getReferralStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [total, pending, completed, avgSlaOverrun] = await Promise.all([
      prisma.secondOpinion.count(),
      prisma.secondOpinion.count({ where: { status: 'pending' } }),
      prisma.secondOpinion.count({ where: { status: 'completed' } }),
      prisma.secondOpinion.count({ where: { slaDeadline: { lt: new Date() }, status: { not: 'completed' } } }),
    ]);

    res.json({ total, pending, completed, slaBreaches: avgSlaOverrun });
  } catch (err) { next(err); }
};
