// SEWA XAI — src/controllers/supportController.ts
// Customer Support Ticket Management (Zendesk Integration)

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';
import { auditLog } from '../utils/audit';
import { AppError } from '../utils/AppError';

// Helper to create a Zendesk ticket (stub for now; would use Zendesk API in production)
async function createZendeskTicket(ticket: any) {
  // In production:
  // import zendesk from 'node-zendesk';
  // const client = zendesk.createClient({ ... });
  // return client.tickets.create({ ... });
  logger.info('[Support] Creating Zendesk ticket stub', { ticket });
  return { id: `zd-${Math.random().toString(36).substring(2, 10)}` };
}

// GET /api/v1/support/tickets
export async function getTickets(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const { status, category } = req.query;

    const where: any = { tenantId };

    // If user is not admin/superadmin, only show their own tickets
    if (!['admin', 'superadmin'].includes(req.user!.role)) {
      where.userId = userId;
    }

    if (status) where.status = status;
    if (category) where.category = category;

    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    res.json(tickets);
  } catch (err) { next(err); }
}

// GET /api/v1/support/tickets/:id
export async function getTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const ticketId = req.params.id;

    const where: any = { id: ticketId, tenantId };

    // If user is not admin/superadmin, only allow access to their own tickets
    if (!['admin', 'superadmin'].includes(req.user!.role)) {
      where.userId = userId;
    }

    const ticket = await prisma.supportTicket.findUnique({
      where,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    if (!ticket) throw new AppError('Ticket not found', 404);
    res.json(ticket);
  } catch (err) { next(err); }
}

// POST /api/v1/support/tickets
export async function createTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const { subject, description, category, priority, tags = [] } = req.body;

    const ticket = await prisma.supportTicket.create({
      data: {
        tenantId,
        userId,
        subject,
        description,
        category: category || 'general',
        priority: priority || 'medium',
        tags,
      },
    });

    // Create Zendesk ticket (optional, based on env)
    if (process.env.ZENDESK_SUBDOMAIN) {
      const zdTicket = await createZendeskTicket(ticket);
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { zendeskId: zdTicket.id },
      });
    }

    await auditLog({
      tenantId,
      userId,
      action: 'SUPPORT_TICKET_CREATED',
      entity: 'SupportTicket',
      entityId: ticket.id,
    });

    res.status(201).json(ticket);
  } catch (err) { next(err); }
}

// PATCH /api/v1/support/tickets/:id
export async function updateTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const ticketId = req.params.id;
    const { status, assignedTo, priority, tags } = req.body;

    const existingTicket = await prisma.supportTicket.findUnique({
      where: { id: ticketId, tenantId },
    });
    if (!existingTicket) throw new AppError('Ticket not found', 404);

    // Only admin/superadmin can update status, assign, etc.
    if (!['admin', 'superadmin'].includes(req.user!.role)) {
      throw new AppError('Not authorized to update this ticket', 403);
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status, assignedTo, priority, tags },
    });

    await auditLog({
      tenantId,
      userId,
      action: 'SUPPORT_TICKET_UPDATED',
      entity: 'SupportTicket',
      entityId: ticket.id,
      metadata: { status, assignedTo },
    });

    res.json(ticket);
  } catch (err) { next(err); }
}
