"use strict";
// SEWA AI — src/services/alertService.ts
// Multi-channel clinical alert dispatch: FCM, WebSocket, Email, HL7 ORU^R01
// Stroke Code: + HL7 ADT^A02 + HL7 ORM^O01
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertService = void 0;
const axios_1 = __importDefault(require("axios"));
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
const audit_1 = require("../utils/audit");
const hl7Service_1 = require("./hl7Service");
const fcmService_1 = require("./fcmService");
const emailService_1 = require("./emailService");
const index_1 = require("../index");
const STROKE_CODE_CONDITIONS = new Set([
    'ICH', 'Ischemic Stroke', 'Hemorrhagic Stroke', 'Subarachnoid Hemorrhage',
    'LVO', 'Aortic Dissection', 'Massive PE',
]);
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || '+15017122661';
class AlertService {
    async dispatch(payload) {
        const { tenantId, scanId, urgency, primaryFinding, confidence, gradCamUrl, doorToAlertMs } = payload;
        const dispatchStart = Date.now();
        const channels = [];
        if (urgency === 'ROUTINE' || urgency === 'NORMAL') {
            // No immediate alert for non-urgent — worklist update already sent via WS
            logger_1.logger.info(`[Alert] ${scanId}: ${urgency} — no active alert (worklist updated)`);
            return;
        }
        // Get tenant config and clinical users
        const [tenant, users, scan] = await Promise.all([
            database_1.prisma.tenant.findUnique({ where: { id: tenantId } }),
            database_1.prisma.user.findMany({
                where: { tenantId, role: { in: ['radiologist', 'doctor', 'admin'] }, isActive: true },
                select: { id: true, email: true, role: true, fcmToken: true, phone: true, name: true },
            }),
            database_1.prisma.scan.findUnique({
                where: { id: scanId },
                include: { patient: { select: { nhsNumber: true, dateOfBirth: true, sex: true } } },
            }),
        ]);
        const radiologists = users.filter(u => u.role === 'radiologist');
        const doctors = users.filter(u => u.role === 'doctor');
        // ── 1. WebSocket (always first — fastest) ────────────────────────────
        const wsStart = Date.now();
        try {
            index_1.io.to(`tenant:${tenantId}`).emit('critical:alert', {
                scanId, urgency, primaryFinding, confidence,
                gradCamUrl, doorToAlertMs,
                timestamp: new Date().toISOString(),
            });
            channels.push({ channel: 'websocket', status: 'delivered', ms: Date.now() - wsStart });
        }
        catch (e) {
            channels.push({ channel: 'websocket', status: 'failed', error: e.message });
        }
        // ── 2–N: Parallel dispatch ────────────────────────────────────────────
        const parallelTasks = [];
        // FCM Push Notifications
        const fcmTargets = [...radiologists, ...doctors].filter(u => u.fcmToken);
        if (fcmTargets.length > 0) {
            parallelTasks.push(this.sendFCM(fcmTargets, payload, channels));
        }
        // Email
        const emailTargets = [...radiologists, ...doctors].filter(u => u.email);
        if (emailTargets.length > 0) {
            parallelTasks.push(this.sendEmailAlerts(emailTargets, payload, channels));
        }
        // HL7 ORU^R01
        if (tenant?.hl7Endpoint) {
            parallelTasks.push(this.sendHL7Alert(scan, payload, tenant, channels));
        }
        // WhatsApp (CRITICAL only)
        if (urgency === 'CRITICAL' && tenant?.whatsappEnabled) {
            const whatsappTargets = [...radiologists].filter(u => u.phone);
            if (whatsappTargets.length > 0) {
                parallelTasks.push(this.sendWhatsApp(whatsappTargets, payload, channels));
            }
        }
        // SMS fallback (edge/Africa mode or WhatsApp fallback)
        if (urgency === 'CRITICAL' && tenant?.smsEnabled) {
            const smsTargets = [...radiologists, ...doctors.slice(0, 2)].filter(u => u.phone);
            if (smsTargets.length > 0) {
                parallelTasks.push(this.sendSMS(smsTargets, payload, channels));
            }
        }
        await Promise.allSettled(parallelTasks);
        // ── Stroke Code ──────────────────────────────────────────────────────
        if (urgency === 'CRITICAL' && STROKE_CODE_CONDITIONS.has(payload.primaryFinding)) {
            await this.activateStrokeCode(scan, payload, tenant, channels);
        }
        const totalMs = Date.now() - dispatchStart;
        // ── Save alert record ────────────────────────────────────────────────
        await database_1.prisma.notification.createMany({
            data: users.map(u => ({
                userId: u.id, tenantId, type: urgency === 'CRITICAL' ? 'CRITICAL_ALERT' : 'URGENT_ALERT',
                title: `${urgency}: ${primaryFinding}`,
                message: `Confidence ${(confidence * 100).toFixed(0)}% · Door-to-alert ${doorToAlertMs}ms`,
                scanId, aiResultId: payload.aiResultId,
                channels: channels.map(c => c.channel),
                read: false,
            })),
            skipDuplicates: true,
        });
        await (0, audit_1.auditLog)({
            tenantId, userId: 'SYSTEM', action: 'ALERT_DISPATCHED',
            entity: 'Scan', entityId: scanId,
            metadata: { urgency, primaryFinding, confidence, channels, doorToAlertMs, totalMs },
        });
        logger_1.logger.info(`[Alert] ${scanId}: ${urgency} dispatched via ${channels.map(c => c.channel).join(', ')} in ${totalMs}ms`);
    }
    // ── FCM Push ────────────────────────────────────────────────────────────
    async sendFCM(users, payload, channels) {
        const start = Date.now();
        try {
            await Promise.all(users.map(u => (0, fcmService_1.sendFCMPush)({
                token: u.fcmToken || '',
                title: `🚨 ${payload.urgency}: ${payload.primaryFinding}`,
                body: `Confidence ${(payload.confidence * 100).toFixed(0)}% · Tap to review scan`,
                data: { scanId: payload.scanId, urgency: payload.urgency, type: 'CRITICAL_ALERT' },
            })));
            channels.push({ channel: 'fcm_push', status: 'delivered', ms: Date.now() - start });
        }
        catch (e) {
            channels.push({ channel: 'fcm_push', status: 'failed', error: e.message });
        }
    }
    // ── Email ───────────────────────────────────────────────────────────────
    async sendEmailAlerts(users, payload, channels) {
        const start = Date.now();
        try {
            await Promise.all(users.map(u => (0, emailService_1.sendEmail)({
                to: u.email || '', name: u.name || '',
                subject: `🚨 ${payload.urgency} Alert — ${payload.primaryFinding}`,
                template: 'critical-alert',
                data: { ...payload, recipientName: u.name },
            })));
            channels.push({ channel: 'email', status: 'delivered', ms: Date.now() - start });
        }
        catch (e) {
            channels.push({ channel: 'email', status: 'failed', error: e.message });
        }
    }
    // ── HL7 ORU^R01 ─────────────────────────────────────────────────────────
    async sendHL7Alert(scan, payload, tenant, channels) {
        const start = Date.now();
        try {
            await (0, hl7Service_1.sendHL7ORU)({
                ...scan, finding: payload.primaryFinding, urgency: payload.urgency,
                confidence: payload.confidence, endpoint: tenant.hl7Endpoint,
            });
            channels.push({ channel: 'hl7_oru_r01', status: 'delivered', ms: Date.now() - start });
        }
        catch (e) {
            channels.push({ channel: 'hl7_oru_r01', status: 'failed', error: e.message });
        }
    }
    // ── WhatsApp ─────────────────────────────────────────────────────────────
    async sendWhatsApp(users, payload, channels) {
        const start = Date.now();
        try {
            const msg = `🚨 SEWA AI CRITICAL ALERT\n*${payload.primaryFinding}*\nConfidence: ${(payload.confidence * 100).toFixed(0)}%\nScan: ${payload.scanId}\nOpen SEWA AI to review.`;
            await Promise.all(users.map(u => axios_1.default.post(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, new URLSearchParams({ From: `whatsapp:${TWILIO_FROM_NUMBER}`, To: `whatsapp:${u.phone}`, Body: msg }), { auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN } })));
            channels.push({ channel: 'whatsapp', status: 'delivered', ms: Date.now() - start });
        }
        catch (e) {
            channels.push({ channel: 'whatsapp', status: 'failed', error: e.message });
        }
    }
    // ── SMS (edge/Africa fallback) ───────────────────────────────────────────
    async sendSMS(users, payload, channels) {
        const start = Date.now();
        try {
            const msg = `SEWA AI CRITICAL: ${payload.primaryFinding} (${(payload.confidence * 100).toFixed(0)}%). Scan ${payload.scanId.slice(-8)}. Open app now.`;
            await Promise.all(users.map(u => axios_1.default.post(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, new URLSearchParams({ From: TWILIO_FROM_NUMBER, To: u.phone || '', Body: msg }), { auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN } })));
            channels.push({ channel: 'sms', status: 'delivered', ms: Date.now() - start });
        }
        catch (e) {
            channels.push({ channel: 'sms', status: 'failed', error: e.message });
        }
    }
    // ── Stroke Code Activation ───────────────────────────────────────────────
    async activateStrokeCode(scan, payload, tenant, channels) {
        logger_1.logger.warn(`[STROKE CODE] Activating for scan ${payload.scanId} — ${payload.primaryFinding}`);
        const tasks = [];
        // HL7 ADT^A02 — transfer to stroke unit
        if (tenant?.hl7Endpoint) {
            tasks.push((0, hl7Service_1.sendHL7ADT)({
                patient: scan.patient, patientId: scan.patientId,
                destinationUnit: 'STROKE_UNIT',
                endpoint: tenant.hl7Endpoint,
            }).then(() => { channels.push({ channel: 'hl7_adt_a02', status: 'delivered' }); })
                .catch(e => { channels.push({ channel: 'hl7_adt_a02', status: 'failed', error: e.message }); }));
            // HL7 ORM^O01 — CTA order
            tasks.push((0, hl7Service_1.sendHL7ORM)({
                ...scan, orderType: 'CTA_HEAD_NECK', priority: 'STAT',
                clinicalIndication: `STROKE CODE: ${payload.primaryFinding}`,
            }).then(() => { channels.push({ channel: 'hl7_orm_cta', status: 'delivered' }); })
                .catch(e => { channels.push({ channel: 'hl7_orm_cta', status: 'failed', error: e.message }); }));
        }
        // Broadcast stroke code to ALL users in tenant
        index_1.io.to(`tenant:${payload.tenantId}`).emit('stroke:code', {
            scanId: payload.scanId,
            finding: payload.primaryFinding,
            urgency: payload.urgency,
            confidence: payload.confidence,
            doorToAlertMs: payload.doorToAlertMs,
            timestamp: new Date().toISOString(),
            strokeCodeActivated: true,
        });
        await Promise.allSettled(tasks);
        logger_1.logger.warn(`[STROKE CODE] ${payload.scanId}: fully activated`);
    }
}
exports.alertService = new AlertService();
