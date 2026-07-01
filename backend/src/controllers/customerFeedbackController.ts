// SEWA XAI — Customer Feedback Controller
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prismaClient';
import { auditLog } from '../utils/audit';
import { AppError } from '../utils/AppError';

// GET /api/v1/feedback
export async function getFeedback(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const { feedbackType, status, category } = req.query;

    const where: any = { tenantId };
    // Non-admin only see their own feedback
    if (!['admin', 'superadmin'].includes(req.user!.role)) {
      where.userId = userId;
    }
    if (feedbackType) where.feedbackType = feedbackType;
    if (status) where.status = status;
    if (category) where.category = category;

    const feedback = await prisma.customerFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    res.json(feedback);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/feedback/:id
export async function getFeedbackById(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const { id } = req.params;

    const feedback = await prisma.customerFeedback.findUnique({
      where: { tenantId_id: { tenantId, id } },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    if (!feedback) throw new AppError('Feedback not found', 404);
    // Check if non-admin user owns feedback
    if (!['admin', 'superadmin'].includes(req.user!.role) && feedback.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }
    res.json(feedback);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/feedback
export async function createFeedback(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const { feedbackType, score, subject, description, category, metadata } = req.body;

    const feedback = await prisma.customerFeedback.create({
      data: {
        tenantId,
        userId,
        feedbackType,
        score,
        subject,
        description,
        category,
        metadata,
      },
    });

    await auditLog({
      tenantId,
      userId,
      action: 'FEEDBACK_CREATED',
      entity: 'CustomerFeedback',
      entityId: feedback.id,
    });

    res.status(201).json(feedback);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/feedback/:id
export async function updateFeedback(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const { id } = req.params;
    const { status, prioritized } = req.body;

    // Only admin can update status/prioritize
    if (!['admin', 'superadmin'].includes(req.user!.role)) {
      throw new AppError('Not authorized', 403);
    }

    // Now we can use the composite unique constraint
    const feedback = await prisma.customerFeedback.update({
      where: { tenantId_id: { tenantId, id } },
      data: { status, prioritized },
    });

    await auditLog({
      tenantId,
      userId,
      action: 'FEEDBACK_UPDATED',
      entity: 'CustomerFeedback',
      entityId: feedback.id,
    });

    res.json(feedback);
  } catch (err) {
    next(err);
  }
}
