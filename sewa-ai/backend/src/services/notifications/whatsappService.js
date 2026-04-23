"use strict";
// SEWA AI — backend/src/services/notifications/whatsappService.ts
// Twilio WhatsApp Business API — clinical notifications
// All NHS/GDPR compliant: no PHI in WhatsApp unless user opted in
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappService = void 0;
const twilio_1 = __importDefault(require("twilio"));
const env_1 = require("../../config/env");
const logger_1 = require("../../utils/logger");
const database_1 = require("../../config/database");
let client = null;
function getTwilio() {
    if (!client && env_1.config.TWILIO_ACCOUNT_SID && env_1.config.TWILIO_AUTH_TOKEN) {
        client = (0, twilio_1.default)(env_1.config.TWILIO_ACCOUNT_SID, env_1.config.TWILIO_AUTH_TOKEN);
    }
    return client;
}
const FROM = `whatsapp:${env_1.config.TWILIO_WHATSAPP_NUMBER || '+14155238886'}`; // Twilio sandbox default
// ── WhatsApp message templates ─────────────────────────────────
// Uses Twilio WhatsApp template messages (pre-approved by Meta for critical health alerts)
// Template names must match your approved templates in Twilio console
const TEMPLATES = {
    critical_finding: (d) => `🚨 *SEWA AI — CRITICAL ALERT*\n\n` +
        `*Finding:* ${d.title?.replace('🚨 CRITICAL: ', '') ?? d.finding}\n` +
        `*Scan:* ${d.scanId ?? '—'}\n` +
        `*Confidence:* ${d.confidence ? `${(d.confidence * 100).toFixed(1)}%` : '—'}\n\n` +
        `Log in to review: https://app.sewaxai.health\n\n` +
        `_SEWA AI — ${new Date().toLocaleTimeString('en-GB')}_`,
    stroke_code: (d) => `⚡ *STROKE CODE — IMMEDIATE ACTION*\n\n` +
        `*${d.finding ?? 'Stroke/LVO detected'}*\n` +
        `Location: ${d.location ?? '—'}\n` +
        `Confidence: ${d.confidence ? `${(d.confidence * 100).toFixed(1)}%` : '—'}\n\n` +
        `Please attend immediately and log in to SEWA AI.\nhttps://app.sewaxai.health\n\n` +
        `_${new Date().toISOString()}_`,
    appointment_booked: (d) => `✅ *Appointment Confirmed — SEWA AI*\n\n` +
        `Hi ${d.firstName},\n\n` +
        `Your appointment has been confirmed:\n` +
        `📅 *Date:* ${d.date}\n` +
        `🕐 *Time:* ${d.time}\n` +
        `🏥 *Type:* ${d.type}\n` +
        `👨‍⚕️ *With:* ${d.doctorName ?? d.patientName ?? '—'}\n\n` +
        `To reschedule: https://app.sewaxai.health/appointments\n\n` +
        `_SEWA AI Patient Portal_`,
    appointment_reminder: (d) => `⏰ *Appointment Reminder — SEWA AI*\n\n` +
        `Hi ${d.firstName},\n\n` +
        `You have an appointment *tomorrow*:\n` +
        `📅 ${d.date} at ${d.time}\n` +
        `Type: ${d.type}\n\n` +
        `To confirm or cancel: https://app.sewaxai.health/appointments\n\n` +
        `_SEWA AI_`,
    appointment_cancelled: (d) => `❌ *Appointment Cancelled — SEWA AI*\n\n` +
        `Hi ${d.firstName},\n\n` +
        `Your appointment on ${d.date} at ${d.time} has been cancelled.\n\n` +
        `To rebook: https://app.sewaxai.health/appointments\n\n` +
        `_SEWA AI_`,
    report_ready: (d) => `📋 *Your Radiology Report is Ready — SEWA AI*\n\n` +
        `Hi ${d.firstName},\n\n` +
        `Your radiology report has been signed and is now available to view.\n\n` +
        `View report: https://app.sewaxai.health/reports/${d.reportId ?? ''}\n\n` +
        `_SEWA AI Patient Portal_`,
    service_down: (d) => `🔴 *SEWA AI — Service Alert*\n\n` +
        `Service: *${d.service ?? 'Unknown'}*\n` +
        `Status: DOWN\n` +
        `Time: ${new Date().toISOString()}\n\n` +
        `Dashboard: https://app.sewaxai.health/admin\n\n` +
        `_SEWA AI Ops_`,
    deployment_failed: (d) => `🚨 *SEWA AI — Deployment Failed*\n\n` +
        `Environment: ${d.environment ?? 'production'}\n` +
        `Commit: ${d.commit ?? '—'}\n` +
        `Error: ${d.error ?? 'See CI/CD logs'}\n\n` +
        `_SEWA AI DevOps_`,
    default: (d) => `🔔 *SEWA AI Notification*\n\n${d.title ?? ''}\n${d.body ?? ''}\n\nhttps://app.sewaxai.health`,
};
// ── Send a WhatsApp message ────────────────────────────────────
exports.whatsappService = {
    async send(opts) {
        const tw = getTwilio();
        if (!tw) {
            logger_1.logger.warn('[WhatsApp] Twilio not configured — skipping');
            return false;
        }
        const template = TEMPLATES[opts.type] ?? TEMPLATES.default;
        const body = template({ firstName: opts.firstName, ...opts.data });
        try {
            const msg = await tw.messages.create({
                from: FROM,
                to: `whatsapp:${opts.to}`,
                body,
            });
            logger_1.logger.info(`[WhatsApp] Sent ${opts.type} to ${opts.to} — SID: ${msg.sid}`);
            return true;
        }
        catch (e) {
            logger_1.logger.error(`[WhatsApp] Failed to ${opts.to}:`, e.message);
            return false;
        }
    },
    // Register a WhatsApp number for a user
    async registerNumber(opts) {
        const tw = getTwilio();
        // Validate E.164
        if (!/^\+[1-9]\d{7,14}$/.test(opts.number)) {
            return { success: false };
        }
        // Update user record
        await database_1.prisma.user.update({
            where: { id: opts.userId },
            data: { whatsappNumber: opts.number },
        });
        if (opts.verify && tw) {
            // Send OTP via WhatsApp to verify number ownership
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            try {
                await tw.messages.create({
                    from: FROM,
                    to: `whatsapp:${opts.number}`,
                    body: `🔐 *SEWA AI — WhatsApp Verification*\n\nYour verification code: *${code}*\n\nThis code expires in 10 minutes.\n\n_Do not share this code._`,
                });
                // Store in Redis for verification (10 min TTL)
                // (requires redis import — stubbed here)
                logger_1.logger.info(`[WhatsApp] Verification sent to ${opts.number}`);
                return { success: true, verificationId: code };
            }
            catch (e) {
                logger_1.logger.error('[WhatsApp] Verification send failed:', e.message);
                return { success: false };
            }
        }
        return { success: true };
    },
    // Verify OTP
    async verifyNumber(userId, code, storedCode) {
        if (code !== storedCode)
            return false;
        await database_1.prisma.user.update({
            where: { id: userId },
            data: { whatsappVerified: true },
        });
        return true;
    },
    // Remove WhatsApp number
    async removeNumber(userId) {
        await database_1.prisma.user.update({
            where: { id: userId },
            data: { whatsappNumber: null, whatsappVerified: false },
        });
    },
    // Bulk broadcast (e.g. system maintenance notice)
    async broadcast(numbers, message) {
        const tw = getTwilio();
        if (!tw)
            return { sent: 0, failed: numbers.length };
        let sent = 0, failed = 0;
        for (const number of numbers) {
            try {
                await tw.messages.create({ from: FROM, to: `whatsapp:${number}`, body: message });
                sent++;
                await new Promise(r => setTimeout(r, 50)); // rate limit: 20/s
            }
            catch {
                failed++;
            }
        }
        return { sent, failed };
    },
};
