import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';
import { sendEmail } from './emailService';

const DUNNING_STEPS = [
  { day: 1, subject: 'Reminder: Your SEWA XAI Payment is Due', template: 'dunning-1' },
  { day: 3, subject: 'Second Notice: Please Update Your Payment Method', template: 'dunning-2' },
  { day: 7, subject: 'Final Notice: Your Account Will Be Suspended Soon', template: 'dunning-3' }
];

export async function processDunning() {
  logger.info('[Dunning] Starting dunning process...');
  const now = new Date();

  try {
    // Find all tenants with past due subscriptions
    const pastDueTenants = await prisma.tenant.findMany({
      where: {
        subscriptionStatus: 'past_due',
        nextBillDate: { lte: now }
      },
      include: { users: { where: { role: 'admin' }, take: 1 } }
    });

    logger.info(`[Dunning] Found ${pastDueTenants.length} past due tenants`);

    for (const tenant of pastDueTenants) {
      const daysPastDue = Math.floor(
        (now.getTime() - (tenant.nextBillDate || now).getTime()) / (1000 * 60 * 60 * 24)
      );

      logger.debug(`[Dunning] Tenant ${tenant.id} is ${daysPastDue} days past due`);

      // Check which dunning step we should be on
      for (const step of DUNNING_STEPS) {
        if (daysPastDue >= step.day) {
          const lastDunning = await prisma.dunningLog.findFirst({
            where: { tenantId: tenant.id, step: step.day },
            orderBy: { createdAt: 'desc' }
          });

          if (!lastDunning || (now.getTime() - lastDunning.createdAt.getTime()) > 24 * 60 * 60 * 1000) {
            // Send email
            if (tenant.users[0]?.email) {
              try {
                await sendEmail({
                  to: tenant.users[0].email,
                  subject: step.subject,
                  template: step.template,
                  data: {
                    tenantName: tenant.name,
                    daysPastDue,
                    plan: tenant.plan
                  }
                });
                logger.info(`[Dunning] Sent step ${step.day} dunning email to tenant ${tenant.id}`);
              } catch (emailErr) {
                logger.error(`[Dunning] Failed to send dunning email to tenant ${tenant.id}`, emailErr);
              }
            }

            // Log the dunning attempt
            await prisma.dunningLog.create({
              data: {
                tenantId: tenant.id,
                step: step.day,
                sentAt: now
              }
            });
          }
        }
      }

      // If 14+ days past due, suspend the account
      // NOTE: BOTH status AND subscriptionStatus must be set — scanQuota.ts
      // enforceQuota() checks `tenant.status`, while other parts of the system
      // check `tenant.subscriptionStatus`. Writing only one field leaves the gate open.
      if (daysPastDue >= 14 && tenant.subscriptionStatus !== 'suspended') {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { status: 'suspended', subscriptionStatus: 'suspended' }
        });
        logger.warn(`[Dunning] Suspended tenant ${tenant.id} due to non-payment (both status fields set)`);

        // Send suspension email
        if (tenant.users[0]?.email) {
          try {
            await sendEmail({
              to: tenant.users[0].email,
              subject: 'Your SEWA XAI Account Has Been Suspended',
              template: 'suspension',
              data: {
                tenantName: tenant.name
              }
            });
          } catch (emailErr) {
            logger.error(`[Dunning] Failed to send suspension email to tenant ${tenant.id}`, emailErr);
          }
        }
      }
    }

    logger.info('[Dunning] Dunning process complete');
  } catch (err) {
    logger.error('[Dunning] Dunning process failed', err);
  }
}
