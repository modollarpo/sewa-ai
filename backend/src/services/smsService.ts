// SEWA XAI — backend/src/services/smsService.ts
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
        try {
          const sendResults = await smsClient.send({
            from: smsNumber, to: [to], message: message,
          });
          if (sendResults[0]?.successful) {
            logger.info(`[SMS] Delivered via ACS to ${to}`);
            return true;
          }
        } catch (acsErr) {
          logger.warn(`[SMS] ACS failed for ${to}, attempting fallback...`);
        }
      }

      // ── 2. Fallback to Africa's Talking (For African Prefixes) ──
      const isAfricanPrefix = /^(\+234|\+254|\+27|\+233|\+256|\+251)/.test(to);
      if (isAfricanPrefix && process.env.AFRICASTALKING_API_KEY && process.env.AFRICASTALKING_USERNAME) {
        try {
          const axios = (await import('axios')).default;
          await axios.post(
            'https://api.africastalking.com/version1/messaging',
            new URLSearchParams({
              username: process.env.AFRICASTALKING_USERNAME,
              to: to,
              message: message,
              from: process.env.AFRICASTALKING_SENDER_ID || 'SEWA_AI'
            }),
            {
              headers: {
                'apiKey': process.env.AFRICASTALKING_API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
              }
            }
          );
          logger.info(`[SMS] Delivered via Africa's Talking to ${to}`);
          return true;
        } catch (atErr) {
          logger.warn(`[SMS] Africa's Talking failed for ${to}, attempting Twilio...`);
        }
      }

      // ── 3. Fallback to Twilio (Global Fallback) ──
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        try {
          const axios = (await import('axios')).default;
          const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
          
          await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
            new URLSearchParams({
              To: to,
              From: process.env.TWILIO_PHONE_NUMBER || 'SEWA_AI',
              Body: message
            }),
            {
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            }
          );
          logger.info(`[SMS] Delivered via Twilio to ${to}`);
          return true;
        } catch (twErr) {
          logger.error(`[SMS] Twilio failed for ${to}`);
        }
      }

      logger.warn('[SMS] No providers available, configured, or successful');
      return false;
    } catch (e: any) {
      logger.error(`[SMS] Unhandled provider failure for ${to}:`, e.message);
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
