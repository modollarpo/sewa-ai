// SEWA AI — backend/src/routes/onboarding.ts
// Secure institution onboarding & subscription handshake.
import { Router } from 'express';
import { prisma } from '../config/database';
import { createSubscription } from '../services/paymentService';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';
import bcrypt from 'bcryptjs';

const r = Router();

/**
 * POST /api/v1/onboarding/launch
 * Final handshake: creates tenant, admin user, and initiates payment.
 */
r.post('/launch', async (req, res, next) => {
  try {
    const { 
      name, region, tier, adminEmail, adminFirst, adminLast,
      pacsHost, aeTitle, fhirEndpoint 
    } = req.body;

    logger.info(`[Onboarding] Launching institution: ${name} (${region})`);

    // 1. Transactional creation of Tenant and Admin
    const result = await prisma.$transaction(async (tx) => {
      // Check if tenant exists
      const existing = await prisma.tenant.findFirst({ where: { name } });
      if (existing) throw new AppError('Institution already registered', 400);

      // Map region to currency
      const currencyMap: Record<string, string> = {
        uk: 'GBP', us: 'USD', eu: 'EUR', ng: 'NGN', ke: 'KES', za: 'ZAR', gh: 'GHS', in: 'INR'
      };
      const currency = currencyMap[region] || 'USD';

      // Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name,
          region,
          plan: tier || 'pro',
          currency,
          status: 'onboarding',
          pacsEndpoint: pacsHost,
          fhirBaseUrl: fhirEndpoint,
          // slug is name-based
          slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        }
      });

      // Create Admin User
      const hashedPassword = await bcrypt.hash('SewaTemporaryPassword2026!', 10);
      const user = await tx.user.create({
        data: {
          email: adminEmail,
          firstName: adminFirst,
          lastName: adminLast,
          password: hashedPassword,
          role: 'ADMIN',
          tenantId: tenant.id,
          status: 'active'
        }
      });

      return { tenant, user };
    });

    // 2. Initiate Payment Handshake (Async but required for response)
    // Map tier to internal plan names
    const plan = (tier || 'pro').toLowerCase();
    
    try {
      const paymentHandshake = await createSubscription(
        result.tenant.id,
        plan,
        region,
        result.tenant.currency
      );

      res.status(201).json({
        message: 'Onboarding initiated successfully',
        tenantId: result.tenant.id,
        payment: paymentHandshake,
        adminId: result.user.id
      });
    } catch (payErr: any) {
      logger.error(`[Onboarding] Payment initialization failed for ${name}: ${payErr.message}`);
      // Return success but with a payment error flag so frontend can handle it
      res.status(201).json({
        message: 'Institution created but payment failed to initialize',
        tenantId: result.tenant.id,
        paymentError: payErr.message,
        adminId: result.user.id
      });
    }

  } catch (err) {
    next(err);
  }
});

export default r;
