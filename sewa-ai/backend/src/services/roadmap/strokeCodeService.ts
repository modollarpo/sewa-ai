// SEWA AI — backend/src/services/roadmap/strokeCodeService.ts
// Roadmap Feature 13: Real-Time Stroke Code Activation
// Sub-30-second door-to-alert for LVO, ICH, and acute ischaemic stroke

import { prisma }              from '../../config/database';
import { redisClient }         from '../../config/redis';
import { notifyUsers } from '../notifications/notificationService';
import { io as serverIo } from '../../index';
import { hl7Service } from '../hl7Service';
import { sendEmail } from '../emailService';
import { logger }              from '../../utils/logger';
import { auditLog } from '../../utils/audit';

export type StrokeCodeType = 'LVO' | 'ICH' | 'AIS' | 'SAH' | 'CVST';

export type StrokeCodeEvent = {
  scanId:        string;
  patientId:     string;
  tenantId:      string;
  codeType:      StrokeCodeType;
  aiConfidence:  number;
  finding:       string;
  location?:     string;
  midlineShift?: string;
  nihssEstimate?: number;   // AI-estimated NIHSS score
  gradcamUrl?:   string;
};

export type StrokeCodeState = {
  codeId:         string;
  scanId:         string;
  codeType:       StrokeCodeType;
  activatedAt:    Date;
  alertsSent:     string[];
  doorToAlert:    number;     // ms from scan received to alert sent
  tenantId:       string;
  resolvedAt?:    Date;
  resolvedBy?:    string;
  outcome?:       string;
};

// Active stroke codes per tenant (production: Redis + DB)
const activeCodes = new Map<string, StrokeCodeState>();

class StrokeCodeService {

  /** Activate stroke code — called immediately after metacognition passes */
  async activate(event: StrokeCodeEvent): Promise<StrokeCodeState> {
    const scanReceivedAt = await this.getScanReceivedAt(event.scanId);
    const now            = new Date();
    const doorToAlert    = now.getTime() - (scanReceivedAt?.getTime() ?? now.getTime());

    // Deduplication — prevent double-firing
    const dedupeKey = `stroke:active:${event.tenantId}:${event.patientId}`;
    const existing  = await redisClient.get(dedupeKey);
    if (existing) {
      logger.warn(`Stroke code already active for patient ${event.patientId}`);
      return JSON.parse(existing);
    }

    const codeId = `SC-${Date.now()}-${event.codeType}`;
    const state: StrokeCodeState = {
      codeId,
      scanId:      event.scanId,
      codeType:    event.codeType,
      activatedAt: now,
      alertsSent:  [],
      doorToAlert,
      tenantId:    event.tenantId,
    };

    // Lock for 6 hours
    await redisClient.setex(dedupeKey, 21600, JSON.stringify(state));
    activeCodes.set(codeId, state);

    logger.warn(`🚨 STROKE CODE ACTIVATED: ${event.codeType} | scan=${event.scanId} | door-to-alert=${doorToAlert}ms`);

    // Fire all alerts in parallel for maximum speed
    const alertResults = await Promise.allSettled([
      this.alertRadiologists(event, codeId),
      this.alertDoctors(event, codeId),
      this.alertStrokeTeam(event, codeId, doorToAlert),
      this.sendWebSocketBroadcast(event, codeId),
      this.sendHL7Transfer(event),
      this.orderCTAngiography(event),
      this.updateScanPriority(event.scanId),
    ]);

    state.alertsSent = alertResults
      .map((r, i) => r.status === 'fulfilled' ? `alert_${i}` : `failed_${i}`)
      .filter(s => !s.startsWith('failed'));

    // Audit blockchain entry
    await auditLog({
      tenantId:     event.tenantId,
      action:       'STROKE_CODE_ACTIVATED',
      entity:       'Scan',
      entityId:     event.scanId,
      metadata:     { codeType: event.codeType, doorToAlert, codeId, aiConfidence: event.aiConfidence },
    });

    return state;
  }

  private async alertRadiologists(event: StrokeCodeEvent, codeId: string) {
    const radiologists = await prisma.user.findMany({
      where: { tenantId: event.tenantId, role: 'radiologist', status: 'active' },
    });

    return Promise.all(radiologists.map((r: { id: string }) =>
      notifyUsers({
        tenantId: event.tenantId,
        userIds: [r.id],
        type:    'critical_finding',
        title:   `🚨 STROKE CODE: ${event.codeType}`,
        body:    `${event.finding}${event.location ? ` — ${event.location}` : ''}. AI confidence: ${(event.aiConfidence * 100).toFixed(0)}%. Immediate review required.`,
        data:    { scanId: event.scanId, codeId, codeType: event.codeType, gradcamUrl: event.gradcamUrl || '' },
      })
    ));
  }

  private async alertDoctors(event: StrokeCodeEvent, codeId: string) {
    const doctors = await prisma.user.findMany({
      where: { tenantId: event.tenantId, role: 'doctor', status: 'active' },
    });

    return Promise.all(doctors.map((d: { id: string }) =>
      notifyUsers({
        tenantId: event.tenantId,
        userIds: [d.id],
        type:    'critical_finding',
        title:   `🚨 STROKE CODE ACTIVATED`,
        body:    `${event.codeType} detected. Neurology/Neurosurgery team activation. Code ID: ${codeId}`,
        data:    { scanId: event.scanId, codeId },
      })
    ));
  }

  private async alertStrokeTeam(event: StrokeCodeEvent, codeId: string, doorToAlert: number) {
    // Production: integrate with PagerDuty / NHS Airmid / hospital pager system
    // For now: email the on-call contact stored in tenant settings
    const tenant = await prisma.tenant.findUnique({ where: { id: event.tenantId } });
    const oncall  = (tenant as any)?.settings?.strokeOnCallEmail;
    if (!oncall) return;

    const patient = await prisma.patient.findUnique({
      where: { id: event.patientId }, include: { user: true },
    });

    await sendEmail({
      to:      oncall,
      subject: `🚨 STROKE CODE ${event.codeType} — ${tenant?.name}`,
      html: `
        <div style="background:#1a0000;color:#ffd0d0;padding:24px;border-radius:8px;font-family:monospace">
          <h2 style="color:#ff4444;margin:0 0 16px">⚡ STROKE CODE: ${event.codeType}</h2>
          <p><strong>Patient:</strong> ${patient?.user?.firstName} ${patient?.user?.lastName} (MRN: ${patient?.mrn})</p>
          <p><strong>Finding:</strong> ${event.finding}</p>
          ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
          ${event.midlineShift ? `<p><strong>Midline Shift:</strong> ${event.midlineShift}</p>` : ''}
          <p><strong>AI Confidence:</strong> ${(event.aiConfidence * 100).toFixed(1)}%</p>
          <p><strong>Door-to-Alert:</strong> ${(doorToAlert / 1000).toFixed(1)} seconds</p>
          <p><strong>Code ID:</strong> ${codeId}</p>
          ${event.gradcamUrl ? `<p><a href="${event.gradcamUrl}" style="color:#ff8888">View Grad-CAM Heatmap →</a></p>` : ''}
          <p style="color:#888;font-size:11px;margin-top:16px">SEWA AI — ${tenant?.name} | Activated: ${new Date().toISOString()}</p>
        </div>
      `,
    });
  }

  private async sendWebSocketBroadcast(event: StrokeCodeEvent, codeId: string) {
    const ioInstance = serverIo;
    if (!ioInstance) return;

    ioInstance.to(`tenant:${event.tenantId}`).emit('stroke_code', {
      codeId,
      codeType:     event.codeType,
      scanId:       event.scanId,
      finding:      event.finding,
      confidence:   event.aiConfidence,
      location:     event.location,
      midlineShift: event.midlineShift,
      gradcamUrl:   event.gradcamUrl,
      activatedAt:  new Date().toISOString(),
    });
  }

  private async sendHL7Transfer(event: StrokeCodeEvent) {
    try {
      const scan    = await prisma.scan.findUnique({ where: { id: event.scanId }, include: { patient: true } });
      const message = hl7Service.buildADT_A02(scan!, 'STROKE_UNIT');
      await hl7Service.send(message, event.tenantId);
    } catch (err) {
      logger.warn('Stroke code HL7 transfer failed', err);
    }
  }

  private async orderCTAngiography(event: StrokeCodeEvent) {
    if (event.codeType !== 'LVO') return;
    try {
      const scan    = await prisma.scan.findUnique({ where: { id: event.scanId }, include: { patient: true } });
      const message = hl7Service.buildORM(scan!, 'CTA_HEAD_NECK', 'STAT');
      await hl7Service.send(message, event.tenantId);
    } catch (err) {
      logger.warn('CTA order failed', err);
    }
  }

  private async updateScanPriority(scanId: string) {
    await prisma.scan.update({ where: { id: scanId }, data: { priority: 'STAT' } });
  }

  private async getScanReceivedAt(scanId: string): Promise<Date | null> {
    const scan = await prisma.scan.findUnique({ where: { id: scanId }, select: { receivedAt: true } });
    return scan?.receivedAt ?? null;
  }

  /** Resolve a stroke code after treatment decision */
  async resolve(codeId: string, userId: string, tenantId: string, outcome: string): Promise<void> {
    const state = activeCodes.get(codeId);
    if (!state) throw new Error(`Stroke code ${codeId} not found`);

    // Security Gap: verify code belongs to this tenant
    // Note: In production,event.tenantId would be saved in state.
    // Since we don't have event.tenantId in state yet, we'll need to fetch scan
    const scan = await prisma.scan.findUnique({ where: { id: state.scanId }, select: { tenantId: true } });
    if (scan?.tenantId !== tenantId) {
       throw new Error('Unauthorized to resolve this stroke code');
    }

    state.resolvedAt = new Date();
    state.resolvedBy = userId;
    state.outcome    = outcome;

    await auditLog({
      tenantId,
      action:       'STROKE_CODE_RESOLVED',
      entity:       'Scan',
      entityId:     state.scanId,
      userId,
      metadata:     { codeId, outcome, timeToResolution: Date.now() - state.activatedAt.getTime() },
    });

    activeCodes.delete(codeId);
    logger.info(`Stroke code ${codeId} resolved by ${userId}: ${outcome}`);
  }

  getActiveCodes(tenantId?: string): StrokeCodeState[] {
    const all = Array.from(activeCodes.values());
    if (!tenantId) return all; // For internal system use

    // In production, the state should include tenantId. 
    // For now, we'd need to filter by scan ownership if tenantId was in state.
    // Let's assume the state includes tenantId (adding it to StrokeCodeState type below)
    return all.filter((s: any) => s.tenantId === tenantId);
  }
}

export const strokeCodeService = new StrokeCodeService();
