// SEWA AI — backend/src/services/smsService.ts
// Azure Communication Services (ACS) SMS dispatcher
import { SmsClient } from '@azure/communication-sms';
import { logger } from '../utils/logger';

import { config } from '../config/env';

const connectionString = config.AZURE_COMMUNICATION_CONNECTION_STRING || '';
const smsNumber = config.AZURE_COMMUNICATION_SMS_NUMBER || '';
const smsClient = connectionString ? new SmsClient(connectionString) : null;

export const smsService = {
  /**
   * Send a single SMS via Azure Communication Services
   */
  async send(to: string, message: string): Promise<boolean> {
    try {
      // ── 1. Try Azure Communication Services ──
      if (smsClient && smsNumber) {
        const sendResults = await smsClient.send({
          from: smsNumber, to: [to], message: message,
        });
        if (sendResults[0]?.successful) {
          logger.info(`[SMS] Delivered via ACS to ${to}`);
          return true;
        }
      }

      // ── 2. Fallback to Twilio (Roadmap 2026 - Task 6) ──
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        const twilio = await import('twilio');
        const client = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: to
        });
        logger.info(`[SMS] Delivered via Twilio to ${to}`);
        return true;
      }

      logger.warn('[SMS] No providers available or configured');
      return false;
    } catch (e: any) {
      logger.error(`[SMS] Provider failure for ${to}:`, e.message);
      return false;
    }
  },

  /**
   * Send bulk SMS (ACS handles individual delivery reports)
   */
  async sendBulk(targets: { phone: string; message: string }[]): Promise<void> {
    // ACS .send() supports multiple 'to' addresses but they get the SAME message.
    // Since alerts often include specific scan IDs or names, we send individually for now.
    await Promise.allSettled(targets.map(t => this.send(t.phone, t.message)));
  }
};
