"use strict";
// SEWA AI — backend/src/services/roadmap/strokeCodeService.ts
// Roadmap Feature 13: Real-Time Stroke Code Activation
// Sub-30-second door-to-alert for LVO, ICH, and acute ischaemic stroke
Object.defineProperty(exports, "__esModule", { value: true });
exports.strokeCodeService = void 0;
const database_1 = require("../../config/database");
const redis_1 = require("../../config/redis");
const notificationService_1 = require("../notifications/notificationService");
const index_1 = require("../../index");
const hl7Service_1 = require("../hl7Service");
const emailService_1 = require("../emailService");
const logger_1 = require("../../utils/logger");
const audit_1 = require("../../utils/audit");
// Active stroke codes per tenant (production: Redis + DB)
const activeCodes = new Map();
class StrokeCodeService {
    /** Activate stroke code — called immediately after metacognition passes */
    async activate(event) {
        const scanReceivedAt = await this.getScanReceivedAt(event.scanId);
        const now = new Date();
        const doorToAlert = now.getTime() - (scanReceivedAt?.getTime() ?? now.getTime());
        // Deduplication — prevent double-firing
        const dedupeKey = `stroke:active:${event.tenantId}:${event.patientId}`;
        const existing = await redis_1.redisClient.get(dedupeKey);
        if (existing) {
            logger_1.logger.warn(`Stroke code already active for patient ${event.patientId}`);
            return JSON.parse(existing);
        }
        const codeId = `SC-${Date.now()}-${event.codeType}`;
        const state = {
            codeId,
            scanId: event.scanId,
            codeType: event.codeType,
            activatedAt: now,
            alertsSent: [],
            doorToAlert,
        };
        // Lock for 6 hours
        await redis_1.redisClient.setex(dedupeKey, 21600, JSON.stringify(state));
        activeCodes.set(codeId, state);
        logger_1.logger.warn(`🚨 STROKE CODE ACTIVATED: ${event.codeType} | scan=${event.scanId} | door-to-alert=${doorToAlert}ms`);
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
        await (0, audit_1.auditLog)({
            tenantId: event.tenantId,
            action: 'STROKE_CODE_ACTIVATED',
            entity: 'Scan',
            entityId: event.scanId,
            metadata: { codeType: event.codeType, doorToAlert, codeId, aiConfidence: event.aiConfidence },
        });
        return state;
    }
    async alertRadiologists(event, codeId) {
        const radiologists = await database_1.prisma.user.findMany({
            where: { tenantId: event.tenantId, role: 'radiologist', status: 'active' },
        });
        return Promise.all(radiologists.map((r) => (0, notificationService_1.notifyUsers)({
            tenantId: event.tenantId,
            userIds: [r.id],
            type: 'critical_finding',
            title: `🚨 STROKE CODE: ${event.codeType}`,
            body: `${event.finding}${event.location ? ` — ${event.location}` : ''}. AI confidence: ${(event.aiConfidence * 100).toFixed(0)}%. Immediate review required.`,
            data: { scanId: event.scanId, codeId, codeType: event.codeType, gradcamUrl: event.gradcamUrl || '' },
        })));
    }
    async alertDoctors(event, codeId) {
        const doctors = await database_1.prisma.user.findMany({
            where: { tenantId: event.tenantId, role: 'doctor', status: 'active' },
        });
        return Promise.all(doctors.map((d) => (0, notificationService_1.notifyUsers)({
            tenantId: event.tenantId,
            userIds: [d.id],
            type: 'critical_finding',
            title: `🚨 STROKE CODE ACTIVATED`,
            body: `${event.codeType} detected. Neurology/Neurosurgery team activation. Code ID: ${codeId}`,
            data: { scanId: event.scanId, codeId },
        })));
    }
    async alertStrokeTeam(event, codeId, doorToAlert) {
        // Production: integrate with PagerDuty / NHS Airmid / hospital pager system
        // For now: email the on-call contact stored in tenant settings
        const tenant = await database_1.prisma.tenant.findUnique({ where: { id: event.tenantId } });
        const oncall = tenant?.settings?.strokeOnCallEmail;
        if (!oncall)
            return;
        const patient = await database_1.prisma.patient.findUnique({
            where: { id: event.patientId }, include: { user: true },
        });
        await (0, emailService_1.sendEmail)({
            to: oncall,
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
    async sendWebSocketBroadcast(event, codeId) {
        const ioInstance = index_1.io;
        if (!ioInstance)
            return;
        ioInstance.to(`tenant:${event.tenantId}`).emit('stroke_code', {
            codeId,
            codeType: event.codeType,
            scanId: event.scanId,
            finding: event.finding,
            confidence: event.aiConfidence,
            location: event.location,
            midlineShift: event.midlineShift,
            gradcamUrl: event.gradcamUrl,
            activatedAt: new Date().toISOString(),
        });
    }
    async sendHL7Transfer(event) {
        try {
            const scan = await database_1.prisma.scan.findUnique({ where: { id: event.scanId }, include: { patient: true } });
            const message = hl7Service_1.hl7Service.buildADT_A02(scan, 'STROKE_UNIT');
            await hl7Service_1.hl7Service.send(message, event.tenantId);
        }
        catch (err) {
            logger_1.logger.warn('Stroke code HL7 transfer failed', err);
        }
    }
    async orderCTAngiography(event) {
        if (event.codeType !== 'LVO')
            return;
        try {
            const scan = await database_1.prisma.scan.findUnique({ where: { id: event.scanId }, include: { patient: true } });
            const message = hl7Service_1.hl7Service.buildORM(scan, 'CTA_HEAD_NECK', 'STAT');
            await hl7Service_1.hl7Service.send(message, event.tenantId);
        }
        catch (err) {
            logger_1.logger.warn('CTA order failed', err);
        }
    }
    async updateScanPriority(scanId) {
        await database_1.prisma.scan.update({ where: { id: scanId }, data: { priority: 'STAT' } });
    }
    async getScanReceivedAt(scanId) {
        const scan = await database_1.prisma.scan.findUnique({ where: { id: scanId }, select: { receivedAt: true } });
        return scan?.receivedAt ?? null;
    }
    /** Resolve a stroke code after treatment decision */
    async resolve(codeId, userId, outcome) {
        const state = activeCodes.get(codeId);
        if (!state)
            throw new Error(`Stroke code ${codeId} not found`);
        state.resolvedAt = new Date();
        state.resolvedBy = userId;
        state.outcome = outcome;
        await (0, audit_1.auditLog)({
            tenantId: '', // get from state
            action: 'STROKE_CODE_RESOLVED',
            entity: 'Scan',
            entityId: state.scanId,
            userId,
            metadata: { codeId, outcome, timeToResolution: Date.now() - state.activatedAt.getTime() },
        });
        activeCodes.delete(codeId);
        logger_1.logger.info(`Stroke code ${codeId} resolved by ${userId}: ${outcome}`);
    }
    getActiveCodes() {
        return Array.from(activeCodes.values());
    }
}
exports.strokeCodeService = new StrokeCodeService();
