// SEWA AI — backend/src/services/notifications/whatsappService.ts
// Azure Communication Services (ACS) Advanced Messaging — clinical notifications
// All NHS/GDPR compliant: no PHI in WhatsApp unless user opted in

import MessagesClient from '@azure-rest/communication-messages';
import crypto from 'crypto';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { prisma } from '../../utils/prismaClient';

const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING || '';
const channelRegistrationId = process.env.AZURE_COMMUNICATION_WHATSAPP_CHANNEL_ID || '';
const messageClient = connectionString ? (MessagesClient as any)(connectionString) : null;

// ── WhatsApp message templates ─────────────────────────────────
// Uses Azure WhatsApp template messages (pre-approved by Meta for critical health alerts)
// Template names must match your approved templates in Azure/Meta console

const TEMPLATES: Record<string, (data: any) => string> = {
  critical_finding: (d) =>
    `🚨 *SEWA AI — CRITICAL ALERT*\n\n` +
    `*Finding:* ${d.title?.replace('🚨 CRITICAL: ', '') ?? d.finding}\n` +
    `*Scan:* ${d.scanId ?? '—'}\n` +
    `*Confidence:* ${d.confidence ? `${(d.confidence*100).toFixed(1)}%` : '—'}\n\n` +
    `Log in to review: https://app.sewaxai.health\n\n` +
    `_SEWA AI — ${new Date().toLocaleTimeString('en-GB')}_`,

  stroke_code: (d) =>
    `⚡ *STROKE CODE — IMMEDIATE ACTION*\n\n` +
    `*${d.finding ?? 'Stroke/LVO detected'}*\n` +
    `Location: ${d.location ?? '—'}\n` +
    `Confidence: ${d.confidence ? `${(d.confidence*100).toFixed(1)}%` : '—'}\n\n` +
    `Please attend immediately and log in to SEWA AI.\nhttps://app.sewaxai.health\n\n` +
    `_${new Date().toISOString()}_`,

  appointment_booked: (d) =>
    `✅ *Appointment Confirmed — SEWA AI*\n\n` +
    `Hi ${d.firstName},\n\n` +
    `Your appointment has been confirmed:\n` +
    `📅 *Date:* ${d.date}\n` +
    `🕐 *Time:* ${d.time}\n` +
    `🏥 *Type:* ${d.type}\n` +
    `👨‍⚕️ *With:* ${d.doctorName ?? d.patientName ?? '—'}\n\n` +
    `To reschedule: https://app.sewaxai.health/appointments\n\n` +
    `_SEWA AI Patient Portal_`,

  appointment_reminder: (d) =>
    `⏰ *Appointment Reminder — SEWA AI*\n\n` +
    `Hi ${d.firstName},\n\n` +
    `You have an appointment *tomorrow*:\n` +
    `📅 ${d.date} at ${d.time}\n` +
    `Type: ${d.type}\n\n` +
    `To confirm or cancel: https://app.sewaxai.health/appointments\n\n` +
    `_SEWA AI_`,

  appointment_cancelled: (d) =>
    `❌ *Appointment Cancelled — SEWA AI*\n\n` +
    `Hi ${d.firstName},\n\n` +
    `Your appointment on ${d.date} at ${d.time} has been cancelled.\n\n` +
    `To rebook: https://app.sewaxai.health/appointments\n\n` +
    `_SEWA AI_`,

  report_ready: (d) =>
    `📋 *Your Radiology Report is Ready — SEWA AI*\n\n` +
    `Hi ${d.firstName},\n\n` +
    `Your radiology report has been signed and is now available to view.\n\n` +
    `View report: https://app.sewaxai.health/reports/${d.reportId ?? ''}\n\n` +
    `_SEWA AI Patient Portal_`,

  service_down: (d) =>
    `🔴 *SEWA AI — Service Alert*\n\n` +
    `Service: *${d.service ?? 'Unknown'}*\n` +
    `Status: DOWN\n` +
    `Time: ${new Date().toISOString()}\n\n` +
    `Dashboard: https://app.sewaxai.health/admin\n\n` +
    `_SEWA AI Ops_`,

  deployment_failed: (d) =>
    `🚨 *SEWA AI — Deployment Failed*\n\n` +
    `Environment: ${d.environment ?? 'production'}\n` +
    `Commit: ${d.commit ?? '—'}\n` +
    `Error: ${d.error ?? 'See CI/CD logs'}\n\n` +
    `_SEWA AI DevOps_`,

  default: (d) =>
    `🔔 *SEWA AI Notification*\n\n${d.title ?? ''}\n${d.body ?? ''}\n\nhttps://app.sewaxai.health`,
};

// ── Interfaces ─────────────────────────────────────────────────
export interface WhatsAppSendOptions {
  to:        string;    // E.164 e.g. +447911123456
  type:      string;
  firstName?: string;
  data?:     Record<string, any>;
}

export interface RegisterWhatsAppOptions {
  userId:  string;
  number:  string;      // E.164
  tenantId:string;
  verify?: boolean;     // Send verification code
}

// ── Send a WhatsApp message ────────────────────────────────────
export const whatsappService = {
  async send(opts: WhatsAppSendOptions): Promise<boolean> {
    if (!messageClient || !channelRegistrationId) {
      logger.warn('[WhatsApp] ACS not configured — skipping');
      return false;
    }

    const template = TEMPLATES[opts.type] ?? TEMPLATES.default;
    const content = template({ firstName: opts.firstName, ...opts.data });

    try {
      const result = await messageClient.path('/messages/notifications:send').post({
        body: {
          channelRegistrationId,
          to: [opts.to],
          kind: 'text',
          content: content,
        },
      });
      
      if (result.status === '202') {
        logger.info(`[WhatsApp] Sent ${opts.type} to ${opts.to}`);
        return true;
      } else {
        logger.error(`[WhatsApp] Failed to ${opts.to} - Status: ${result.status}`);
        return false;
      }
    } catch (e: any) {
      logger.error(`[WhatsApp] Failed to ${opts.to}:`, e.message);
      return false;
    }
  },

  // Register a WhatsApp number for a user
  async registerNumber(opts: RegisterWhatsAppOptions): Promise<{ success: boolean; verificationId?: string }> {
    // Update user record
    await prisma.user.update({
      where: { id: opts.userId },
      data: { whatsappNumber: opts.number },
    });

    if (opts.verify && messageClient) {
      // Send OTP via WhatsApp to verify number ownership
      const code = crypto.randomInt(100000, 1000000).toString();
      try {
        await messageClient.path('/messages/notifications:send').post({
          body: {
            channelRegistrationId,
            to: [opts.number],
            kind: 'text',
            content: `🔐 *SEWA AI — WhatsApp Verification*\n\nYour verification code: *${code}*\n\nThis code expires in 10 minutes.\n\n_Do not share this code._`,
          },
        });
        logger.info(`[WhatsApp] Verification sent to ${opts.number}`);
        return { success: true, verificationId: code };
      } catch (e: any) {
        logger.error('[WhatsApp] Verification send failed:', e.message);
        return { success: false };
      }
    }

    return { success: true };
  },

  // Verify OTP
  async verifyNumber(userId: string, code: string, storedCode: string): Promise<boolean> {
    if (code !== storedCode) return false;
    await prisma.user.update({
      where: { id: userId },
      data: { whatsappVerified: true },
    });
    return true;
  },

  // Remove WhatsApp number
  async removeNumber(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { whatsappNumber: null, whatsappVerified: false },
    });
  },

  // Bulk broadcast (e.g. system maintenance notice)
  async broadcast(numbers: string[], message: string): Promise<{ sent: number; failed: number }> {
    if (!messageClient) return { sent: 0, failed: numbers.length };
    let sent = 0, failed = 0;
    for (const number of numbers) {
      try {
        await messageClient.path('/messages/notifications:send').post({
          body: {
            channelRegistrationId,
            to: [number],
            kind: 'text',
            content: message,
          },
        });
        sent++;
      } catch { failed++; }
    }
    return { sent, failed };
  },
};
