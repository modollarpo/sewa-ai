import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';
import { auditLog } from '../utils/audit';
import { AppError } from '../utils/AppError';
import axios from 'axios';

// ── Zendesk & Slack ticket dispatch ─────────────────────────────
// Calls Zendesk v2 API when ZENDESK_SUBDOMAIN is set.
// Falls back to Slack webhook when SUPPORT_SLACK_WEBHOOK is set.
// Logs only if neither is configured (dev / staging).
async function createZendeskTicket(ticket: any): Promise<{ id: string }> {
  const subdomain = process.env.ZENDESK_SUBDOMAIN;
  const email     = process.env.ZENDESK_EMAIL;
  const token     = process.env.ZENDESK_API_TOKEN;

  if (subdomain && email && token) {
    try {
      const res = await axios.post(
        `https://${subdomain}.zendesk.com/api/v2/tickets.json`,
        {
          ticket: {
            subject:     ticket.subject,
            comment:     { body: ticket.description },
            priority:    ticket.priority || 'normal',
            tags:        ticket.tags || [],
            external_id: ticket.id,
          },
        },
        {
          auth: { username: `${email}/token`, password: token },
          headers: { 'Content-Type': 'application/json' },
          timeout: 8000,
        }
      );
      const zdId = String(res.data?.ticket?.id || `zd-${ticket.id}`);
      logger.info(`[Support] Zendesk ticket created: ${zdId} for ticket ${ticket.id}`);
      return { id: zdId };
    } catch (err: any) {
      logger.error(`[Support] Zendesk API error: ${err.message} — falling back to Slack`);
    }
  }

  // Slack fallback
  const slackWebhook = process.env.SUPPORT_SLACK_WEBHOOK;
  if (slackWebhook) {
    try {
      await axios.post(slackWebhook, {
        text: [
          `🎫 *New Support Ticket* [${ticket.priority?.toUpperCase() || 'MEDIUM'}]`,
          `*Subject:* ${ticket.subject}`,
          `*Category:* ${ticket.category || 'general'}`,
          `*Description:* ${ticket.description?.slice(0, 500)}`,
          `*Tenant:* ${ticket.tenantId}`,
          `*Ticket ID:* \`${ticket.id}\``,
        ].join('\n'),
      }, { timeout: 5000 });
      logger.info(`[Support] Ticket ${ticket.id} dispatched to Slack`);
    } catch (err: any) {
      logger.error(`[Support] Slack dispatch failed: ${err.message}`);
    }
  } else {
    logger.info('[Support] No Zendesk or Slack configured — ticket stored in DB only', { ticketId: ticket.id });
  }

  return { id: `local-${ticket.id}` };
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
