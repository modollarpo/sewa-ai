"use strict";
// SEWA AI — backend/src/services/notifications/notificationService.ts
// Universal notification dispatcher: FCM push + Email + WhatsApp
// All users auto-subscribed by role. Respects per-user preferences.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyUsers = exports.ROLE_SUBSCRIPTIONS = void 0;
exports.dispatch = dispatch;
exports.notifyCriticalFinding = notifyCriticalFinding;
exports.notifyStrokeCode = notifyStrokeCode;
exports.notifyAppointmentBooked = notifyAppointmentBooked;
exports.notifyReportReady = notifyReportReady;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const database_1 = require("../../config/database");
const env_1 = require("../../config/env");
const emailService_1 = require("./emailService");
const whatsappService_1 = require("./whatsappService");
const index_1 = require("../../index");
const logger_1 = require("../../utils/logger");
// ── Firebase init (singleton) ──────────────────────────────────
let fbApp = null;
function firebase() {
    if (!fbApp && env_1.config.FIREBASE_PROJECT_ID && env_1.config.FIREBASE_PRIVATE_KEY) {
        fbApp = firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert({
                projectId: env_1.config.FIREBASE_PROJECT_ID,
                privateKey: env_1.config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                clientEmail: env_1.config.FIREBASE_CLIENT_EMAIL,
            }),
        });
    }
    return fbApp;
}
// ── Role → notification subscription map ──────────────────────
// Defines which event types each role receives by default.
// Users can override in their notification preferences.
exports.ROLE_SUBSCRIPTIONS = {
    radiologist: [
        'scan_assigned', 'critical_finding', 'urgent_finding', 'second_opinion_request',
        'report_returned', 'worklist_update', 'ai_result_ready', 'stroke_code',
    ],
    doctor: [
        'critical_finding', 'urgent_finding', 'report_ready', 'appointment_booked',
        'appointment_reminder', 'appointment_cancelled', 'patient_admitted',
        'stroke_code', 'second_opinion_response',
    ],
    admin: [
        'new_user_registered', 'scan_volume_alert', 'payment_received', 'payment_failed',
        'integration_error', 'storage_threshold', 'compliance_deadline', 'system_alert',
    ],
    superadmin: [
        'new_tenant_registered', 'tenant_payment_failed', 'ai_model_drift', 'service_down',
        'security_alert', 'compliance_deadline', 'federated_learning_complete',
        'deployment_complete', 'deployment_failed',
    ],
    technician: [
        'scan_upload_failed', 'pacs_sync_error', 'worklist_update',
        'ai_result_ready', 'storage_threshold',
    ],
    patient: [
        'report_ready', 'appointment_booked', 'appointment_reminder', 'appointment_cancelled',
        'consent_expiring', 'data_access_response', 'message_received',
    ],
};
const EVENT_CHANNELS = {
    critical_finding: ['push', 'email', 'whatsapp', 'socket'],
    stroke_code: ['push', 'email', 'whatsapp', 'socket'],
    urgent_finding: ['push', 'socket', 'email'],
    report_ready: ['push', 'email', 'socket'],
    appointment_booked: ['push', 'email', 'whatsapp'],
    appointment_reminder: ['push', 'whatsapp'],
    appointment_cancelled: ['push', 'email', 'whatsapp'],
    scan_assigned: ['push', 'socket'],
    second_opinion_request: ['push', 'email', 'socket'],
    second_opinion_response: ['push', 'email', 'socket'],
    payment_received: ['email'],
    payment_failed: ['email', 'push'],
    new_user_registered: ['email', 'push'],
    new_tenant_registered: ['email', 'push'],
    service_down: ['push', 'email', 'whatsapp'],
    deployment_complete: ['push', 'socket'],
    deployment_failed: ['push', 'email', 'whatsapp'],
    ai_model_drift: ['push', 'email'],
    compliance_deadline: ['email', 'push'],
    consent_expiring: ['email', 'push'],
    message_received: ['push', 'socket'],
    report_returned: ['push', 'socket'],
    ai_result_ready: ['socket', 'push'],
    default: ['push', 'socket'],
};
async function dispatch(opts) {
    const { tenantId, type, title, body, data = {}, roles, userIds, templateData } = opts;
    // ── 1. Find target users ─────────────────────────────────────
    const where = { tenantId, status: 'active' };
    if (userIds?.length) {
        where.id = { in: userIds };
    }
    else if (roles?.length) {
        where.role = { in: roles };
    }
    else {
        // Auto-subscribe: find all roles that listen for this event
        const subscribedRoles = Object.entries(exports.ROLE_SUBSCRIPTIONS)
            .filter(([, events]) => events.includes(type))
            .map(([role]) => role);
        if (!subscribedRoles.length)
            return;
        where.role = { in: subscribedRoles };
    }
    const users = await database_1.prisma.user.findMany({
        where,
        select: {
            id: true, email: true, firstName: true, lastName: true,
            role: true, language: true,
            fcmTokens: true, // string[] — user can have multiple devices
            whatsappNumber: true, // E.164 format e.g. +447911123456
            notifPrefs: true, // JSON: { push:bool, email:bool, whatsapp:bool }
        },
    });
    if (!users.length)
        return;
    // ── 2. Persist notification records ─────────────────────────
    await database_1.prisma.notification.createMany({
        data: users.map((u) => ({
            tenantId,
            userId: u.id,
            type,
            title,
            body,
            data: { ...data, type },
            read: false,
        })),
        skipDuplicates: true,
    });
    // ── 3. Determine channels ────────────────────────────────────
    const channels = opts.channels ?? EVENT_CHANNELS[type] ?? EVENT_CHANNELS.default;
    // ── 4. Fire channels concurrently ───────────────────────────
    await Promise.allSettled([
        // ── Socket.IO (real-time in-app) ─────────────────────────
        channels.includes('socket') && (async () => {
            const io = index_1.io;
            if (!io)
                return;
            users.forEach((u) => {
                io.to(`user:${u.id}`).emit('notification:new', {
                    type, title, body, data,
                });
            });
        })(),
        // ── FCM Push ─────────────────────────────────────────────
        channels.includes('push') && (async () => {
            const fb = firebase();
            if (!fb)
                return;
            const tokens = users
                .flatMap((u) => (u.fcmTokens ?? []))
                .filter(Boolean);
            if (!tokens.length)
                return;
            const isUrgent = ['critical_finding', 'stroke_code'].includes(type);
            // Batch FCM (max 500 per batch)
            for (let i = 0; i < tokens.length; i += 500) {
                const batch = tokens.slice(i, i + 500);
                try {
                    await fb.messaging().sendMulticast({
                        tokens: batch,
                        notification: { title, body },
                        data: { ...data, type },
                        android: {
                            priority: isUrgent ? 'high' : 'normal',
                            notification: {
                                channelId: isUrgent ? 'critical_alerts' : 'sewa_general',
                                sound: isUrgent ? 'critical_alert.mp3' : 'default',
                                priority: isUrgent ? 'max' : 'default',
                                vibrateTimingsMillis: isUrgent ? [0, 500, 200, 500] : undefined,
                            },
                        },
                        apns: {
                            payload: {
                                aps: {
                                    sound: isUrgent ? { name: 'critical_alert.caf', critical: true, volume: 1 } : 'default',
                                    interruptionLevel: isUrgent ? 'critical' : 'active',
                                    badge: 1,
                                },
                            },
                        },
                    });
                    logger_1.logger.info(`[FCM] Sent ${batch.length} push(es) for ${type}`);
                }
                catch (e) {
                    logger_1.logger.error('[FCM] Batch push failed:', e.message);
                }
            }
        })(),
        // ── Email ────────────────────────────────────────────────
        channels.includes('email') && (async () => {
            const emailPromises = users
                .filter((u) => {
                const prefs = u.notifPrefs;
                return prefs?.email !== false; // opt-out only
            })
                .map((u) => emailService_1.emailService.sendTemplated({
                to: u.email,
                type,
                data: {
                    firstName: u.firstName,
                    lastName: u.lastName,
                    role: u.role,
                    language: u.language,
                    ...templateData,
                    title,
                    body,
                },
            }));
            await Promise.allSettled(emailPromises);
        })(),
        // ── WhatsApp ─────────────────────────────────────────────
        channels.includes('whatsapp') && (async () => {
            const waUsers = users.filter((u) => {
                const prefs = u.notifPrefs;
                return u.whatsappNumber && prefs?.whatsapp !== false;
            });
            const waPromises = waUsers.map((u) => whatsappService_1.whatsappService.send({
                to: u.whatsappNumber,
                type,
                firstName: u.firstName,
                data: { title, body, ...templateData },
            }));
            await Promise.allSettled(waPromises);
        })(),
    ]);
    logger_1.logger.info(`[Notify] ${type} → ${users.length} users (channels: ${channels.join(',')})`);
}
// Alias for clinical roadmap compatibility
exports.notifyUsers = dispatch;
// ── Convenience wrappers ───────────────────────────────────────
async function notifyCriticalFinding(opts) {
    return dispatch({
        tenantId: opts.tenantId,
        type: 'critical_finding',
        title: `🚨 CRITICAL: ${opts.finding}`,
        body: `Scan ${opts.scanId}${opts.location ? ` — ${opts.location}` : ''} · ${(opts.confidence * 100).toFixed(1)}% confidence`,
        data: { scanId: opts.scanId, finding: opts.finding, confidence: String(opts.confidence) },
        templateData: { ...opts },
    });
}
async function notifyStrokeCode(opts) {
    return dispatch({
        tenantId: opts.tenantId,
        type: 'stroke_code',
        title: `⚡ STROKE CODE: ${opts.finding}`,
        body: `${opts.location} — ${(opts.confidence * 100).toFixed(1)}% confidence. Immediate action required.`,
        data: { scanId: opts.scanId },
        templateData: { ...opts },
        channels: ['push', 'email', 'whatsapp', 'socket'],
    });
}
async function notifyAppointmentBooked(opts) {
    // Notify patient
    await dispatch({
        tenantId: opts.tenantId, type: 'appointment_booked',
        title: '✅ Appointment Confirmed',
        body: `Your ${opts.type} appointment with ${opts.doctorName} is confirmed for ${opts.date} at ${opts.time}`,
        userIds: [opts.patientId],
        templateData: { ...opts },
    });
    // Notify doctor
    await dispatch({
        tenantId: opts.tenantId, type: 'appointment_booked',
        title: '📅 New Appointment',
        body: `New ${opts.type} appointment with ${opts.patientName} on ${opts.date} at ${opts.time}`,
        userIds: [opts.doctorId],
        templateData: { ...opts },
    });
}
async function notifyReportReady(opts) {
    return dispatch({
        tenantId: opts.tenantId, type: 'report_ready',
        title: '📋 Your Radiology Report is Ready',
        body: `Report for scan ${opts.scanId} has been signed by ${opts.radiologistName}`,
        userIds: [opts.patientId],
        templateData: { ...opts },
    });
}
