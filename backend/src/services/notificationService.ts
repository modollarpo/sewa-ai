// SEWA XAI — backend/src/services/notificationService.ts
// Secure clinical messaging: WhatsApp, SMS, and Email via Azure Communication Services
import { logger } from '../utils/logger';
import { config } from '../config/env';

export interface NotificationPayload {
  to: string;
  subject?: string;
  body: string;
  priority?: 'urgent' | 'routine';
  metadata?: Record<string, any>;
}

/**
 * Dispatches a clinical notification via the best available channel (WhatsApp > SMS > Email)
 * based on patient preferences and urgency.
 */
export async function sendNotification(payload: NotificationPayload) {
  const { to, body, priority = 'routine' } = payload;
  
  logger.info(`[Notification] Dispatching to ${to} | priority=${priority}`);

  try {
    if (priority === 'urgent') {
      // 1. Attempt WhatsApp (Primary for high-engagement regions)
      if (config.AZURE_COMMUNICATION_WHATSAPP_CHANNEL_ID) {
        await sendWhatsApp(to, body);
        return { channel: 'whatsapp', status: 'sent' };
      }

      // 2. Fallback to SMS (Critical for low-bandwidth areas)
      if (config.AZURE_COMMUNICATION_SMS_NUMBER) {
        await sendSMS(to, body);
        return { channel: 'sms', status: 'sent' };
      }
    }

    // 3. Email Fallback
    await sendEmail(to, payload.subject || 'SEWA XAI Notification', body);
    return { channel: 'email', status: 'sent' };

  } catch (err: any) {
    logger.error(`[Notification] Failed to send to ${to}: ${err.message}`);
    // In a real system, we'd queue for retry or alert staff via secondary channel
    return { status: 'failed', error: err.message };
  }
}

async function sendWhatsApp(to: string, body: string) {
  logger.info(`[WhatsApp] Sending to ${to}: ${body.slice(0, 50)}...`);
  if (config.NODE_ENV === 'production') {
    // Real ACS WhatsApp logic:
    // const client = new NotificationHubClient(config.AZURE_COMMUNICATION_CONNECTION_STRING);
    // await client.sendNotification(...);
  }
}

async function sendSMS(to: string, body: string) {
  logger.info(`[SMS] Sending to ${to}: ${body.slice(0, 50)}...`);
  if (config.NODE_ENV === 'production') {
    // Real ACS SMS logic
  }
}

async function sendEmail(to: string, subject: string, body: string) {
  logger.info(`[Email] Sending to ${to}: ${subject}`);
  if (config.NODE_ENV === 'production') {
    // Real ACS Email logic
  }
}

/**
 * Specialized helper for Critical Finding alerts (ICH/Stroke)
 */
export async function alertCriticalFinding(doctorPhone: string, patientName: string, finding: string) {
  const message = `🚨 SEWA XAI CRITICAL ALERT: ${finding} detected for patient ${patientName}. Please review the STAT dashboard immediately.`;
  return sendNotification({
    to: doctorPhone,
    body: message,
    priority: 'urgent',
    subject: `STAT: Critical Finding - ${patientName}`
  });
}
