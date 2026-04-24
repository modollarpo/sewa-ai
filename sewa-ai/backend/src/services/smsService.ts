// SEWA AI — backend/src/services/smsService.ts
// Azure Communication Services (ACS) SMS dispatcher
import { SmsClient } from '@azure/communication-sms';
import { logger } from '../utils/logger';

const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING || '';
const smsNumber = process.env.AZURE_COMMUNICATION_SMS_NUMBER || '';
const smsClient = connectionString ? new SmsClient(connectionString) : null;

export const smsService = {
  /**
   * Send a single SMS via Azure Communication Services
   */
  async send(to: string, message: string): Promise<boolean> {
    if (!smsClient || !smsNumber) {
      logger.warn('[SMS] ACS not configured — skipping message');
      return false;
    }

    try {
      const sendResults = await smsClient.send({
        from: smsNumber,
        to: [to],
        message: message,
      });

      for (const res of sendResults) {
        if (res.successful) {
          logger.info(`[SMS] Delivered to ${to} (ID: ${res.messageId})`);
        } else {
          logger.error(`[SMS] Failed for ${to}: ${res.errorMessage}`);
          return false;
        }
      }
      return true;
    } catch (e: any) {
      logger.error(`[SMS] Critical failure sending to ${to}:`, e.message);
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
