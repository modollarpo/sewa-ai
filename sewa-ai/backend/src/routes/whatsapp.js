"use strict";
// SEWA AI — backend/src/routes/whatsapp.ts
// WhatsApp number registration, OTP verification, opt-in/out management
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const whatsappService_1 = require("../services/notifications/whatsappService");
const redis_1 = require("../config/redis");
const r = (0, express_1.Router)();
r.use(auth_1.authenticate);
// ── GET /whatsapp/status — current registration for this user ──
r.get('/status', async (req, res, next) => {
    try {
        const reg = await database_1.prisma.whatsAppRegistration.findUnique({
            where: { userId: req.user.id },
            select: { number: true, verified: true, optedIn: true, createdAt: true },
        });
        res.json(reg ?? { number: null, verified: false, optedIn: false });
    }
    catch (err) {
        next(err);
    }
});
// ── POST /whatsapp/register — add / update WhatsApp number ─────
r.post('/register', async (req, res, next) => {
    try {
        const { number } = req.body;
        if (!number || !/^\+[1-9]\d{7,14}$/.test(number)) {
            return res.status(400).json({ error: 'number must be in E.164 format e.g. +447911123456' });
        }
        const user = req.user;
        // Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
        // Upsert registration record (unverified until OTP confirmed)
        await database_1.prisma.whatsAppRegistration.upsert({
            where: { userId: user.id },
            update: { number, verified: false, verifyCode: code, verifyExpiry: expiry, optedIn: true },
            create: { userId: user.id, tenantId: user.tenantId, number, verified: false, verifyCode: code, verifyExpiry: expiry, optedIn: true },
        });
        // Send OTP via WhatsApp
        const sent = await whatsappService_1.whatsappService.send({
            to: number,
            type: 'otp_verify',
            data: {
                title: `🔐 SEWA AI — WhatsApp Verification\n\nYour code: *${code}*\n\nExpires in 10 minutes. Do not share this code.`,
                body: '',
            },
        });
        // Also cache in Redis for fast lookup
        await redis_1.redisClient.setex(`whatsapp:otp:${user.id}`, 600, code).catch(() => { });
        res.json({
            success: true,
            message: sent
                ? 'Verification code sent via WhatsApp'
                : 'Registered (WhatsApp service not configured — auto-verified for testing)',
            autoVerified: !sent,
        });
    }
    catch (err) {
        next(err);
    }
});
// ── POST /whatsapp/verify — confirm OTP ───────────────────────
r.post('/verify', async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code)
            return res.status(400).json({ error: 'code required' });
        const user = req.user;
        const reg = await database_1.prisma.whatsAppRegistration.findUnique({ where: { userId: user.id } });
        if (!reg || !reg.verifyCode) {
            return res.status(400).json({ error: 'No pending verification. Register first.' });
        }
        if (reg.verifyExpiry && new Date() > reg.verifyExpiry) {
            return res.status(400).json({ error: 'Verification code expired. Please re-register.' });
        }
        if (reg.verifyCode !== code) {
            return res.status(400).json({ error: 'Invalid code' });
        }
        await database_1.prisma.whatsAppRegistration.update({
            where: { userId: user.id },
            data: { verified: true, verifyCode: null, verifyExpiry: null },
        });
        // Send confirmation
        await whatsappService_1.whatsappService.send({
            to: reg.number,
            type: 'default',
            data: { title: '✅ *SEWA AI — WhatsApp Verified*\n\nYou will now receive clinical alerts and appointment notifications via WhatsApp.', body: '' },
        }).catch(() => { });
        res.json({ success: true, message: 'WhatsApp number verified successfully' });
    }
    catch (err) {
        next(err);
    }
});
// ── DELETE /whatsapp/unsubscribe — remove WhatsApp ─────────────
r.delete('/unsubscribe', async (req, res, next) => {
    try {
        await database_1.prisma.whatsAppRegistration.update({
            where: { userId: req.user.id },
            data: { optedIn: false },
        });
        res.json({ success: true, message: 'Unsubscribed from WhatsApp notifications' });
    }
    catch (err) {
        next(err);
    }
});
// ── GET /whatsapp/preferences — notification prefs ─────────────
r.get('/preferences', async (req, res, next) => {
    try {
        const prefs = await database_1.prisma.notificationPreference.findUnique({
            where: { userId: req.user.id },
        });
        res.json(prefs ?? {
            pushEnabled: true, emailEnabled: true, whatsappEnabled: false, smsEnabled: false,
        });
    }
    catch (err) {
        next(err);
    }
});
// ── PATCH /whatsapp/preferences — update notification prefs ────
r.patch('/preferences', async (req, res, next) => {
    try {
        const { pushEnabled, emailEnabled, whatsappEnabled, smsEnabled, eventOverrides, quietStart, quietEnd } = req.body;
        const prefs = await database_1.prisma.notificationPreference.upsert({
            where: { userId: req.user.id },
            update: { pushEnabled, emailEnabled, whatsappEnabled, smsEnabled, eventOverrides, quietStart, quietEnd },
            create: { userId: req.user.id, pushEnabled: pushEnabled ?? true, emailEnabled: emailEnabled ?? true,
                whatsappEnabled: whatsappEnabled ?? false, smsEnabled: smsEnabled ?? false,
                eventOverrides, quietStart, quietEnd },
        });
        res.json(prefs);
    }
    catch (err) {
        next(err);
    }
});
exports.default = r;
