// SEWA AI — src/services/alertService.ts
// Multi-channel clinical alert dispatch: FCM, WebSocket, Email, HL7 ORU^R01
// Stroke Code: + HL7 ADT^A02 + HL7 ORM^O01
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).

import axios from 'axios';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { auditLog } from '../utils/audit';
import { sendHL7ORU, sendHL7ADT, sendHL7ORM } from './hl7Service';
import { sendFCMPush } from './fcmService';
import { sendEmail } from './emailService';
import { smsService } from './smsService';
import { config } from '../config/env';
import { io } from '../index';

const STROKE_CODE_CONDITIONS = new Set([
  'ICH', 'Ischemic Stroke', 'Hemorrhagic Stroke', 'Subarachnoid Hemorrhage',
  'LVO', 'Aortic Dissection', 'Massive PE',
]);

const TWILIO_ACCOUNT_SID = config.MPESA_CONSUMER_KEY; // Reusing keys or just use process.env if not in config
const TWILIO_AUTH_TOKEN  = config.MPESA_CONSUMER_SECRET;
const TWILIO_FROM_NUMBER = config.AZURE_COMMUNICATION_SMS_NUMBER || '+15017122661';

interface ClinicalUser {
  id: string;
  email: string | null;
  role: string;
  fcmToken?: string | null;
  phone?: string | null;
  name?: string | null;
}

interface AlertPayload {
  tenantId: string;
  scanId: string;
  aiResultId: string;
  urgency: 'CRITICAL' | 'URGENT' | 'NORMAL' | 'ROUTINE';
  primaryFinding: string;
  confidence: number;
  gradCamUrl?: string;
  doorToAlertMs: number;
}

interface AlertChannel {
  channel: string;
  status: 'delivered' | 'failed' | 'skipped';
  ms?: number;
  error?: string;
}

class AlertService {

  async dispatch(payload: AlertPayload): Promise<void> {
    const { tenantId, scanId, urgency, primaryFinding, confidence, gradCamUrl, doorToAlertMs } = payload;
    const dispatchStart = Date.now();
    const channels: AlertChannel[] = [];

    if (urgency === 'ROUTINE' || urgency === 'NORMAL') {
      // No immediate alert for non-urgent — worklist update already sent via WS
      logger.info(`[Alert] ${scanId}: ${urgency} — no active alert (worklist updated)`);
      return;
    }

    // Get tenant config and clinical users
    const [tenant, users, scan] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.user.findMany({
        where: { tenantId, role: { in: ['radiologist', 'doctor', 'admin'] }, isActive: true },
        select: { id: true, email: true, role: true, fcmToken: true, phone: true, name: true },
      }),
      prisma.scan.findUnique({
        where: { id: scanId },
        include: { patient: { select: { nhsNumber: true, dateOfBirth: true, sex: true } } },
      }),
    ]);

    const radiologists = (users as unknown as ClinicalUser[]).filter(u => u.role === 'radiologist');
    const doctors = (users as unknown as ClinicalUser[]).filter(u => u.role === 'doctor');

    // ── 1. WebSocket (always first — fastest) ────────────────────────────
    const wsStart = Date.now();
    try {
      io.to(`tenant:${tenantId}`).emit('critical:alert', {
        scanId, urgency, primaryFinding, confidence,
        gradCamUrl, doorToAlertMs,
        timestamp: new Date().toISOString(),
      });
      channels.push({ channel: 'websocket', status: 'delivered', ms: Date.now() - wsStart });
    } catch (e: any) {
      channels.push({ channel: 'websocket', status: 'failed', error: e.message });
    }

    // ── 2–N: Parallel dispatch ────────────────────────────────────────────
    const parallelTasks: Promise<void>[] = [];

    // FCM Push Notifications
    const fcmTargets = [...radiologists, ...doctors].filter(u => u.fcmToken);
    if (fcmTargets.length > 0) {
      parallelTasks.push(
        this.sendFCM(fcmTargets, payload, channels),
      );
    }

    // Email
    const emailTargets = [...radiologists, ...doctors].filter(u => u.email);
    if (emailTargets.length > 0) {
      parallelTasks.push(
        this.sendEmailAlerts(emailTargets, payload, channels),
      );
    }

    // HL7 ORU^R01
    if (tenant?.hl7Endpoint) {
      parallelTasks.push(
        this.sendHL7Alert(scan, payload, tenant, channels),
      );
    }

    // WhatsApp (CRITICAL only)
    if (urgency === 'CRITICAL' && tenant?.whatsappEnabled) {
      const whatsappTargets = [...radiologists].filter(u => u.phone);
      if (whatsappTargets.length > 0) {
        parallelTasks.push(
          this.sendWhatsApp(whatsappTargets, payload, channels),
        );
      }
    }

    // SMS fallback (edge/Africa mode or WhatsApp fallback)
    if (urgency === 'CRITICAL' && tenant?.smsEnabled) {
      const smsTargets = [...radiologists, ...doctors.slice(0, 2)].filter(u => u.phone);
      if (smsTargets.length > 0) {
        parallelTasks.push(
          this.sendSMS(smsTargets, payload, channels),
        );
      }
    }

    await Promise.allSettled(parallelTasks);

    // ── Stroke Code ──────────────────────────────────────────────────────
    if (urgency === 'CRITICAL' && STROKE_CODE_CONDITIONS.has(payload.primaryFinding)) {
      await this.activateStrokeCode(scan, payload, tenant, channels);
    }

    const totalMs = Date.now() - dispatchStart;

    // ── Save alert record ────────────────────────────────────────────────
    await prisma.notification.createMany({
      data: (users as unknown as ClinicalUser[]).map(u => ({
        userId: u.id, tenantId, type: urgency === 'CRITICAL' ? 'CRITICAL_ALERT' : 'URGENT_ALERT',
        title: `${urgency}: ${primaryFinding}`,
        message: `Confidence ${(confidence * 100).toFixed(0)}% · Door-to-alert ${doorToAlertMs}ms`,
        scanId, aiResultId: payload.aiResultId,
        channels: channels.map(c => c.channel),
        read: false,
      })),
      skipDuplicates: true,
    });

    await auditLog({
      tenantId, userId: 'SYSTEM', action: 'ALERT_DISPATCHED',
      entity: 'Scan', entityId: scanId,
      metadata: { urgency, primaryFinding, confidence, channels, doorToAlertMs, totalMs },
    });

    logger.info(`[Alert] ${scanId}: ${urgency} dispatched via ${channels.map(c=>c.channel).join(', ')} in ${totalMs}ms`);
  }

  // ── FCM Push ────────────────────────────────────────────────────────────
  private async sendFCM(users: ClinicalUser[], payload: AlertPayload, channels: AlertChannel[]): Promise<void> {
    const start = Date.now();
    try {
      await Promise.all(users.map(u =>
        sendFCMPush({
          token: u.fcmToken || '',
          title: `🚨 ${payload.urgency}: ${payload.primaryFinding}`,
          body: `Confidence ${(payload.confidence * 100).toFixed(0)}% · Tap to review scan`,
          data: { scanId: payload.scanId, urgency: payload.urgency, type: 'CRITICAL_ALERT' },
        })
      ));
      channels.push({ channel: 'fcm_push', status: 'delivered', ms: Date.now() - start });
    } catch (e: any) {
      channels.push({ channel: 'fcm_push', status: 'failed', error: e.message });
    }
  }

  // ── Email ───────────────────────────────────────────────────────────────
  private async sendEmailAlerts(users: ClinicalUser[], payload: AlertPayload, channels: AlertChannel[]): Promise<void> {
    const start = Date.now();
    try {
      await Promise.all(users.map(u =>
        sendEmail({
          to: u.email || '', name: u.name || '',
          subject: `🚨 ${payload.urgency} Alert — ${payload.primaryFinding}`,
          template: 'critical-alert',
          data: { ...payload, recipientName: u.name },
        })
      ));
      channels.push({ channel: 'email', status: 'delivered', ms: Date.now() - start });
    } catch (e: any) {
      channels.push({ channel: 'email', status: 'failed', error: e.message });
    }
  }

  // ── HL7 ORU^R01 ─────────────────────────────────────────────────────────
  private async sendHL7Alert(scan: any, payload: AlertPayload, tenant: any, channels: AlertChannel[]): Promise<void> {
    const start = Date.now();
    try {
      await sendHL7ORU({
        ...scan, finding: payload.primaryFinding, urgency: payload.urgency,
        confidence: payload.confidence, endpoint: tenant.hl7Endpoint,
      });
      channels.push({ channel: 'hl7_oru_r01', status: 'delivered', ms: Date.now() - start });
    } catch (e: any) {
      channels.push({ channel: 'hl7_oru_r01', status: 'failed', error: e.message });
    }
  }

  // ── WhatsApp ─────────────────────────────────────────────────────────────
  private async sendWhatsApp(users: ClinicalUser[], payload: AlertPayload, channels: AlertChannel[]): Promise<void> {
    const start = Date.now();
    try {
      const msg = `🚨 SEWA AI CRITICAL ALERT\n*${payload.primaryFinding}*\nConfidence: ${(payload.confidence * 100).toFixed(0)}%\nScan: ${payload.scanId}\nOpen SEWA AI to review.`;
      await Promise.all(users.map(u =>
        axios.post(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
          new URLSearchParams({ From: `whatsapp:${TWILIO_FROM_NUMBER}`, To: `whatsapp:${u.phone}`, Body: msg }),
          { auth: { username: TWILIO_ACCOUNT_SID!, password: TWILIO_AUTH_TOKEN! } }
        )
      ));
      channels.push({ channel: 'whatsapp', status: 'delivered', ms: Date.now() - start });
    } catch (e: any) {
      channels.push({ channel: 'whatsapp', status: 'failed', error: e.message });
    }
  }

  // ── SMS (edge/Africa fallback) ───────────────────────────────────────────
  private async sendSMS(users: ClinicalUser[], payload: AlertPayload, channels: AlertChannel[]): Promise<void> {
    const start = Date.now();
    try {
      const msg = `SEWA AI CRITICAL: ${payload.primaryFinding} (${(payload.confidence * 100).toFixed(0)}%). Scan ${payload.scanId.slice(-8)}. Open app now.`;
      await Promise.all(users.map(u =>
        smsService.send(u.phone || '', msg)
      ));
      channels.push({ channel: 'sms', status: 'delivered', ms: Date.now() - start });
    } catch (e: any) {
      channels.push({ channel: 'sms', status: 'failed', error: e.message });
    }
  }

  // ── Stroke Code Activation ───────────────────────────────────────────────
  private async activateStrokeCode(scan: any, payload: AlertPayload, tenant: any, channels: AlertChannel[]): Promise<void> {
    logger.warn(`[STROKE CODE] Activating for scan ${payload.scanId} — ${payload.primaryFinding}`);

    const tasks: Promise<void>[] = [];

    // HL7 ADT^A02 — transfer to stroke unit
    if (tenant?.hl7Endpoint) {
      tasks.push(
        sendHL7ADT({
          patient: scan.patient, patientId: scan.patientId,
          destinationUnit: 'STROKE_UNIT',
          endpoint: tenant.hl7Endpoint,
        }).then(() => { channels.push({ channel: 'hl7_adt_a02', status: 'delivered' }); })
          .catch(e => { channels.push({ channel: 'hl7_adt_a02', status: 'failed', error: e.message }); })
      );

      // HL7 ORM^O01 — CTA order
      tasks.push(
        sendHL7ORM({
          ...scan, orderType: 'CTA_HEAD_NECK', priority: 'STAT',
          clinicalIndication: `STROKE CODE: ${payload.primaryFinding}`,
        }).then(() => { channels.push({ channel: 'hl7_orm_cta', status: 'delivered' }); })
          .catch(e => { channels.push({ channel: 'hl7_orm_cta', status: 'failed', error: e.message }); })
      );
    }

    // Broadcast stroke code to ALL users in tenant
    io.to(`tenant:${payload.tenantId}`).emit('stroke:code', {
      scanId: payload.scanId,
      finding: payload.primaryFinding,
      urgency: payload.urgency,
      confidence: payload.confidence,
      doorToAlertMs: payload.doorToAlertMs,
      timestamp: new Date().toISOString(),
      strokeCodeActivated: true,
    });

    await Promise.allSettled(tasks);
    logger.warn(`[STROKE CODE] ${payload.scanId}: fully activated`);
  }
}

export const alertService = new AlertService();
