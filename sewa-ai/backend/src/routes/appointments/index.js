"use strict";
// SEWA AI — backend/src/routes/appointments/index.ts
// End-to-end appointment booking: CRUD, availability, reminders,
// telehealth video rooms, iCal export, role-based access
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAppointmentReminders = sendAppointmentReminders;
const express_1 = require("express");
const database_1 = require("../../config/database");
const auth_1 = require("../../middleware/auth");
const env_1 = require("../../config/env");
const notificationService_1 = require("../../services/notifications/notificationService");
const logger_1 = require("../../utils/logger");
const r = (0, express_1.Router)();
r.use(auth_1.authenticate);
// ─────────────────────────────────────────────────────────────
// GET /appointments — list (filtered by role)
// ─────────────────────────────────────────────────────────────
r.get('/', async (req, res, next) => {
    try {
        const { date, status, type, doctorId, patientId, limit = 50, offset = 0 } = req.query;
        const user = req.user;
        const where = { tenantId: user.tenantId };
        // Role-scoping
        if (user.role === 'patient') {
            const patient = await database_1.prisma.patient.findFirst({ where: { userId: user.id } });
            if (!patient)
                return res.json({ appointments: [], total: 0 });
            where.patientId = patient.id;
        }
        else if (user.role === 'doctor') {
            where.doctorId = user.id;
        }
        else if (!['admin', 'superadmin'].includes(user.role)) {
            where.doctorId = user.id;
        }
        // Optional filters
        if (doctorId)
            where.doctorId = doctorId;
        if (patientId)
            where.patientId = patientId;
        if (status)
            where.status = status;
        if (type)
            where.type = type;
        if (date) {
            const d = new Date(date);
            const next = new Date(d);
            next.setDate(next.getDate() + 1);
            where.scheduledDate = { gte: d, lt: next };
        }
        const [appointments, total] = await Promise.all([
            database_1.prisma.appointment.findMany({
                where,
                orderBy: { scheduledDate: 'asc' },
                take: Number(limit),
                skip: Number(offset),
                include: {
                    patient: {
                        include: { user: { select: { firstName: true, lastName: true, email: true } } }
                    },
                },
            }),
            database_1.prisma.appointment.count({ where }),
        ]);
        // Enrich with doctor name
        const doctorIds = [...new Set(appointments.map((a) => a.doctorId))];
        const doctors = await database_1.prisma.user.findMany({
            where: { id: { in: doctorIds } },
            select: { id: true, firstName: true, lastName: true, speciality: true },
        });
        const docMap = Object.fromEntries(doctors.map((d) => [d.id, d]));
        const enriched = appointments.map((a) => ({
            ...a,
            doctor: docMap[a.doctorId] ?? null,
        }));
        res.json({ appointments: enriched, total });
    }
    catch (err) {
        next(err);
    }
});
// ─────────────────────────────────────────────────────────────
// GET /appointments/availability — doctor's available slots
// ─────────────────────────────────────────────────────────────
r.get('/availability', async (req, res, next) => {
    try {
        const { doctorId, date, duration = 30 } = req.query;
        if (!doctorId || !date)
            return res.status(400).json({ error: 'doctorId and date required' });
        const targetDate = new Date(date);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const durMins = Number(duration);
        // Fetch existing appointments for that doctor on that date
        const existing = await database_1.prisma.appointment.findMany({
            where: {
                doctorId: doctorId,
                status: { notIn: ['cancelled'] },
                scheduledDate: { gte: targetDate, lt: nextDay },
            },
            select: { scheduledDate: true, durationMins: true },
        });
        // Generate slots: 08:00 – 18:00 in `duration`-minute intervals
        const slots = [];
        const start = new Date(targetDate);
        start.setHours(8, 0, 0, 0);
        const end = new Date(targetDate);
        end.setHours(18, 0, 0, 0);
        for (let t = new Date(start); t < end; t = new Date(t.getTime() + durMins * 60000)) {
            const slotEnd = new Date(t.getTime() + durMins * 60000);
            const clash = existing.some((e) => {
                const eStart = new Date(e.scheduledDate);
                const eEnd = new Date(eStart.getTime() + e.durationMins * 60000);
                return t < eEnd && slotEnd > eStart;
            });
            slots.push({
                time: t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                available: !clash,
                datetime: t.toISOString(),
            });
        }
        res.json({ doctorId, date, slots });
    }
    catch (err) {
        next(err);
    }
});
// ─────────────────────────────────────────────────────────────
// GET /appointments/:id
// ─────────────────────────────────────────────────────────────
r.get('/:id', async (req, res, next) => {
    try {
        const appt = await database_1.prisma.appointment.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: {
                patient: {
                    include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } }
                },
            },
        });
        if (!appt)
            return res.status(404).json({ error: 'Appointment not found' });
        const doctor = await database_1.prisma.user.findUnique({
            where: { id: appt.doctorId },
            select: { firstName: true, lastName: true, email: true, speciality: true },
        });
        res.json({ ...appt, doctor });
    }
    catch (err) {
        next(err);
    }
});
// ─────────────────────────────────────────────────────────────
// POST /appointments — book appointment
// ─────────────────────────────────────────────────────────────
r.post('/', async (req, res, next) => {
    try {
        const user = req.user;
        const { patientId, doctorId, scheduledDate, durationMins = 30, type, priority = 'routine', location, notes, scanId, reportId, } = req.body;
        // Validate required fields
        if (!patientId || !doctorId || !scheduledDate || !type) {
            return res.status(400).json({ error: 'patientId, doctorId, scheduledDate, type required' });
        }
        // Clash check
        const slotStart = new Date(scheduledDate);
        const slotEnd = new Date(slotStart.getTime() + durationMins * 60000);
        const clash = await database_1.prisma.appointment.findFirst({
            where: {
                doctorId,
                status: { notIn: ['cancelled'] },
                scheduledDate: { gte: slotStart, lt: slotEnd },
            },
        });
        if (clash)
            return res.status(409).json({ error: 'Doctor unavailable at this time' });
        // Create telehealth room if telemedicine
        let videoUrl, videoRoomId;
        if (type === 'telemedicine' && env_1.config.DAILY_API_KEY) {
            try {
                const room = await createVideoRoom();
                videoUrl = room.url;
                videoRoomId = room.name;
            }
            catch (e) {
                logger_1.logger.warn('[Appointments] Video room creation failed:', e.message);
            }
        }
        const appointment = await database_1.prisma.appointment.create({
            data: {
                tenantId: user.tenantId,
                patientId, doctorId, scheduledDate: slotStart,
                durationMins, type, priority,
                location: videoUrl ?? location,
                notes, scanId, reportId,
                videoUrl, videoRoomId,
                status: 'scheduled',
            },
        });
        // Fetch names for notifications
        const [patient, doctor] = await Promise.all([
            database_1.prisma.patient.findUnique({
                where: { id: patientId },
                include: { user: { select: { firstName: true, id: true } } },
            }),
            database_1.prisma.user.findUnique({ where: { id: doctorId }, select: { firstName: true, id: true } }),
        ]);
        const dateStr = slotStart.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = slotStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        // Fire notifications (push + email + WhatsApp)
        await (0, notificationService_1.notifyAppointmentBooked)({
            tenantId: user.tenantId,
            patientId: patient?.user?.id ?? '',
            doctorId: doctor?.id ?? '',
            appointmentId: appointment.id,
            date: dateStr,
            time: timeStr,
            type,
            patientName: patient?.user?.firstName ?? 'Patient',
            doctorName: `Dr. ${doctor?.firstName ?? 'Doctor'}`,
        }).catch(e => logger_1.logger.error('[Appointments] Notify error:', e.message));
        res.status(201).json(appointment);
    }
    catch (err) {
        next(err);
    }
});
// ─────────────────────────────────────────────────────────────
// PATCH /appointments/:id — update / reschedule / cancel
// ─────────────────────────────────────────────────────────────
r.patch('/:id', async (req, res, next) => {
    try {
        const user = req.user;
        const { status, scheduledDate, notes, cancelReason, location } = req.body;
        const existing = await database_1.prisma.appointment.findFirst({
            where: { id: req.params.id, tenantId: user.tenantId },
        });
        if (!existing)
            return res.status(404).json({ error: 'Not found' });
        // Permission: patient can only cancel their own
        if (user.role === 'patient' && status && status !== 'cancelled') {
            return res.status(403).json({ error: 'Patients can only cancel appointments' });
        }
        const updated = await database_1.prisma.appointment.update({
            where: { id: req.params.id },
            data: {
                ...(status && { status: status }),
                ...(scheduledDate && { scheduledDate: new Date(scheduledDate), status: 'rescheduled' }),
                ...(notes && { notes }),
                ...(cancelReason && { cancelReason, cancelledById: user.id }),
                ...(location && { location }),
            },
        });
        // Notify on cancellation
        if (status === 'cancelled') {
            const [patient, doctor] = await Promise.all([
                database_1.prisma.patient.findUnique({ where: { id: existing.patientId }, include: { user: { select: { id: true, firstName: true } } } }),
                database_1.prisma.user.findUnique({ where: { id: existing.doctorId }, select: { id: true, firstName: true } }),
            ]);
            const dateStr = new Date(existing.scheduledDate).toLocaleDateString('en-GB');
            const timeStr = new Date(existing.scheduledDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            await (0, notificationService_1.dispatch)({
                tenantId: user.tenantId, type: 'appointment_cancelled',
                title: '❌ Appointment Cancelled',
                body: `Your appointment on ${dateStr} at ${timeStr} has been cancelled.`,
                userIds: [patient?.user?.id, doctor?.id].filter(Boolean),
                templateData: { date: dateStr, time: timeStr, reason: cancelReason, appointmentId: existing.id },
            }).catch(() => { });
        }
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
});
// ─────────────────────────────────────────────────────────────
// DELETE /appointments/:id — hard delete (admin only)
// ─────────────────────────────────────────────────────────────
r.delete('/:id', (0, auth_1.authorize)('admin', 'superadmin'), async (req, res, next) => {
    try {
        await database_1.prisma.appointment.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
// ─────────────────────────────────────────────────────────────
// GET /appointments/:id/ical — download iCalendar file
// ─────────────────────────────────────────────────────────────
r.get('/:id/ical', async (req, res, next) => {
    try {
        const appt = await database_1.prisma.appointment.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: { patient: { include: { user: { select: { firstName: true, lastName: true } } } } },
        });
        if (!appt)
            return res.status(404).json({ error: 'Not found' });
        const doctor = await database_1.prisma.user.findUnique({
            where: { id: appt.doctorId },
            select: { firstName: true, lastName: true },
        });
        const start = new Date(appt.scheduledDate);
        const end = new Date(start.getTime() + appt.durationMins * 60000);
        const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const uid = `${appt.id}@sewaxai.health`;
        const ical = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//SEWA AI//Appointments//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:REQUEST',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${fmt(new Date())}`,
            `DTSTART:${fmt(start)}`,
            `DTEND:${fmt(end)}`,
            `SUMMARY:${appt.type} — SEWA AI`,
            `DESCRIPTION:Appointment with Dr. ${doctor?.firstName ?? ''} ${doctor?.lastName ?? ''}`,
            `LOCATION:${appt.location ?? 'SEWA AI Platform'}`,
            `STATUS:${appt.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`,
            'END:VEVENT',
            'END:VCALENDAR',
        ].join('\r\n');
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="appointment-${appt.id}.ics"`);
        res.send(ical);
    }
    catch (err) {
        next(err);
    }
});
// ─────────────────────────────────────────────────────────────
// POST /appointments/:id/confirm — doctor confirms
// ─────────────────────────────────────────────────────────────
r.post('/:id/confirm', (0, auth_1.authorize)('doctor', 'radiologist', 'admin'), async (req, res, next) => {
    try {
        const updated = await database_1.prisma.appointment.update({
            where: { id: req.params.id },
            data: { status: 'confirmed' },
        });
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
});
// ─────────────────────────────────────────────────────────────
// POST /appointments/:id/complete — mark completed
// ─────────────────────────────────────────────────────────────
r.post('/:id/complete', (0, auth_1.authorize)('doctor', 'radiologist', 'admin'), async (req, res, next) => {
    try {
        const { notes } = req.body;
        const updated = await database_1.prisma.appointment.update({
            where: { id: req.params.id },
            data: { status: 'completed', ...(notes && { notes }) },
        });
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
});
// ─────────────────────────────────────────────────────────────
// GET /appointments/calendar/:year/:month — calendar grid
// ─────────────────────────────────────────────────────────────
r.get('/calendar/:year/:month', async (req, res, next) => {
    try {
        const user = req.user;
        const year = parseInt(req.params.year);
        const month = parseInt(req.params.month) - 1; // JS months 0-indexed
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0, 23, 59, 59);
        const where = { tenantId: user.tenantId, scheduledDate: { gte: start, lte: end } };
        if (user.role === 'doctor')
            where.doctorId = user.id;
        const appointments = await database_1.prisma.appointment.findMany({
            where,
            select: { id: true, scheduledDate: true, durationMins: true, type: true, status: true, patientId: true, doctorId: true },
            orderBy: { scheduledDate: 'asc' },
        });
        // Group by date
        const byDate = {};
        appointments.forEach((a) => {
            const key = new Date(a.scheduledDate).toISOString().split('T')[0];
            if (!byDate[key])
                byDate[key] = [];
            byDate[key].push(a);
        });
        res.json({ year, month: month + 1, appointments: byDate, total: appointments.length });
    }
    catch (err) {
        next(err);
    }
});
// ─────────────────────────────────────────────────────────────
// REMINDER CRON — call this from a scheduled job every hour
// ─────────────────────────────────────────────────────────────
async function sendAppointmentReminders() {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in24h1 = new Date(in24h.getTime() + 60 * 60 * 1000);
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const in1h1 = new Date(in1h.getTime() + 60 * 60 * 1000);
    // 24h reminders
    const due24h = await database_1.prisma.appointment.findMany({
        where: { status: { in: ['scheduled', 'confirmed'] }, reminderSent24h: false,
            scheduledDate: { gte: in24h, lt: in24h1 } },
        include: { patient: { include: { user: { select: { id: true, firstName: true } } } } },
    });
    for (const a of due24h) {
        const doctor = await database_1.prisma.user.findUnique({ where: { id: a.doctorId }, select: { id: true, firstName: true } });
        const dateStr = new Date(a.scheduledDate).toLocaleDateString('en-GB');
        const timeStr = new Date(a.scheduledDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        await (0, notificationService_1.dispatch)({
            tenantId: a.tenantId, type: 'appointment_reminder',
            title: '⏰ Appointment Tomorrow',
            body: `Reminder: your appointment is tomorrow at ${timeStr}`,
            userIds: [a.patient?.user?.id, doctor?.id].filter(Boolean),
            templateData: { date: dateStr, time: timeStr, type: a.type, firstName: a.patient?.user?.firstName, appointmentId: a.id },
        }).catch(() => { });
        await database_1.prisma.appointment.update({ where: { id: a.id }, data: { reminderSent24h: true } });
    }
    // 1h reminders
    const due1h = await database_1.prisma.appointment.findMany({
        where: { status: { in: ['scheduled', 'confirmed'] }, reminderSent1h: false,
            scheduledDate: { gte: in1h, lt: in1h1 } },
        include: { patient: { include: { user: { select: { id: true, firstName: true } } } } },
    });
    for (const a of due1h) {
        const doctor = await database_1.prisma.user.findUnique({ where: { id: a.doctorId }, select: { id: true } });
        const timeStr = new Date(a.scheduledDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        await (0, notificationService_1.dispatch)({
            tenantId: a.tenantId, type: 'appointment_reminder',
            title: '⏰ Appointment in 1 Hour',
            body: `Your appointment is in 1 hour at ${timeStr}`,
            userIds: [a.patient?.user?.id, doctor?.id].filter(Boolean),
            templateData: { time: timeStr, type: a.type, firstName: a.patient?.user?.firstName, appointmentId: a.id },
        }).catch(() => { });
        await database_1.prisma.appointment.update({ where: { id: a.id }, data: { reminderSent1h: true } });
    }
    logger_1.logger.info(`[Appointments] Reminders: ${due24h.length} 24h, ${due1h.length} 1h`);
}
// ── Daily video room creation (daily.co) ─────────────────────
async function createVideoRoom() {
    const res = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env_1.config.DAILY_API_KEY}` },
        body: JSON.stringify({
            privacy: 'private',
            properties: {
                exp: Math.floor(Date.now() / 1000) + 3600,
                enable_recording: false,
                enable_chat: true,
                enable_screenshare: false,
                max_participants: 2,
            },
        }),
    });
    if (!res.ok)
        throw new Error(`Daily.co API error: ${res.statusText}`);
    const data = await res.json();
    return data;
}
exports.default = r;
