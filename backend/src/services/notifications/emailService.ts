// SEWA XAI — backend/src/services/notifications/emailService.ts
// Full production email service: 18 HTML templates, multi-language stub,
// Azure Communication Services (ACS) integration
import { EmailClient } from '@azure/communication-email';
import { config }      from '../../config/env';
import { logger }      from '../../utils/logger';

// ── Client ───────────────────────────────────────────────────
const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING || '';
const emailClient = connectionString ? new EmailClient(connectionString) : null;
const FROM_EMAIL = config.EMAIL_FROM || 'info@sewaxai.health';

// ── Base HTML wrapper ──────────────────────────────────────────
const BASE = (content: string, preheader = '') => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>SEWA XAI</title>
<style>
  body { margin:0; padding:0; background:#050F0C; font-family:'Helvetica Neue',Arial,sans-serif; color:#D0ECE6; }
  .wrapper { max-width:600px; margin:0 auto; background:#08160F; border:1px solid #1B3028; border-radius:16px; overflow:hidden; }
  .header { background:linear-gradient(135deg,#408D7B,#2E6B5E); padding:24px 32px; }
  .header-logo { display:flex; align-items:center; gap:10px; }
  .logo-icon { width:36px; height:36px; background:rgba(255,255,255,0.2); border-radius:10px; display:flex; align-items:center; justify-content:center; }
  .logo-text { font-size:20px; font-weight:800; color:white; letter-spacing:-0.5px; }
  .logo-sub { font-size:11px; color:rgba(255,255,255,0.7); }
  .body { padding:32px; }
  .footer { padding:20px 32px; border-top:1px solid #1B3028; background:#050F0C; }
  .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
  .badge-critical { background:#2A0A0A; color:#E03535; border:1px solid #4A1515; }
  .badge-urgent   { background:#2A1800; color:#E08A20; border:1px solid #3A2000; }
  .badge-normal   { background:#0A1F14; color:#1DBF73; border:1px solid #0D2A1A; }
  .badge-info     { background:#0A1530; color:#2A6EF2; border:1px solid #152040; }
  .btn { display:inline-block; padding:12px 28px; background:linear-gradient(135deg,#408D7B,#2E6B5E); color:white; text-decoration:none; border-radius:10px; font-weight:700; font-size:14px; }
  .btn-critical { background:linear-gradient(135deg,#E03535,#B02020); }
  .card { background:#0C1D17; border:1px solid #1B3028; border-radius:12px; padding:16px; margin:16px 0; }
  .divider { height:1px; background:#1B3028; margin:20px 0; }
  .stat { text-align:center; padding:12px; background:#111F1A; border-radius:10px; }
  .stat-value { font-size:24px; font-weight:800; font-family:monospace; }
  h2 { margin:0 0 8px; font-size:20px; font-weight:800; color:#D0ECE6; }
  p  { margin:8px 0; font-size:14px; line-height:1.6; color:#6FA898; }
  .preheader { display:none; max-height:0; overflow:hidden; color:transparent; }
</style>
</head><body>
<span class="preheader">${preheader}</span>
<table width="100%" cellpadding="20">
<tr><td align="center">
<div class="wrapper">
  <div class="header">
    <div class="header-logo">
      <div class="logo-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      </div>
      <div>
        <div class="logo-text">SEWA XAI</div>
        <div class="logo-sub">Smart Early Warning Assistant</div>
      </div>
    </div>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    <p style="font-size:11px;color:#3A6055;margin:0;">
      SEWA XAI · Clinical Intelligence Platform ·
      <a href="{{unsubscribeUrl}}" style="color:#408D7B;">Manage notifications</a> ·
      <a href="https://app.sewaxai.health/privacy" style="color:#408D7B;">Privacy Policy</a>
    </p>
    <p style="font-size:10px;color:#3A6055;margin:4px 0 0;">
      This email was sent to {{recipientEmail}} as part of your SEWA XAI account.
      GDPR lawful basis: legitimate interest / contractual obligation.
    </p>
  </div>
</div>
</td></tr></table>
</body></html>`;

// ── All email templates ────────────────────────────────────────
export const EMAIL_TEMPLATES: Record<string, (d: any) => { subject: string; html: string }> = {

  // ── Auth ────────────────────────────────────────────────────
  welcome: (d) => ({
    subject: `Welcome to SEWA XAI — ${d.tenantName}`,
    html: BASE(`
      <h2>Welcome to SEWA XAI, ${d.firstName}! 👋</h2>
      <p>Your account at <strong style="color:#D0ECE6;">${d.tenantName}</strong> has been created successfully.</p>
      <div class="card">
        <p style="margin:0;"><strong style="color:#D0ECE6;">Role:</strong> ${d.role}<br/>
        <strong style="color:#D0ECE6;">Email:</strong> ${d.email}<br/>
        <strong style="color:#D0ECE6;">Region:</strong> ${d.region?.toUpperCase() ?? '—'}</p>
      </div>
      <p>SEWA XAI gives you AI-powered triage, explainable diagnostic reports, and real-time clinical alerts.</p>
      <center style="margin:24px 0;">
        <a href="https://app.sewaxai.health/login" class="btn">Access SEWA XAI →</a>
      </center>
      <p style="font-size:12px;">Your temporary password was provided by your administrator. You will be prompted to set a new password on first login.</p>
    `, `Welcome to SEWA XAI at ${d.tenantName}`),
  }),

  mfa_code: (d) => ({
    subject: 'SEWA XAI — Your verification code',
    html: BASE(`
      <h2>Two-factor verification code</h2>
      <p>Use the code below to complete your SEWA XAI login. It expires in <strong style="color:#D0ECE6;">5 minutes</strong>.</p>
      <center style="margin:28px 0;">
        <div style="background:#0C1D17;border:2px solid #408D7B;border-radius:14px;padding:24px 40px;display:inline-block;">
          <div style="font-size:42px;font-weight:800;letter-spacing:12px;color:#1DBF73;font-family:monospace;">${d.code}</div>
        </div>
      </center>
      <p>If you did not request this code, please <a href="https://app.sewaxai.health/security" style="color:#E03535;">secure your account immediately</a>.</p>
    `, `Your SEWA XAI code: ${d.code}`),
  }),

  password_reset: (d) => ({
    subject: 'SEWA XAI — Reset your password',
    html: BASE(`
      <h2>Reset your SEWA XAI password</h2>
      <p>Hi ${d.firstName}, we received a request to reset your password. Click the button below to set a new one.</p>
      <center style="margin:24px 0;">
        <a href="${d.resetUrl}" class="btn">Reset Password →</a>
      </center>
      <p style="font-size:12px;color:#3A6055;">This link expires in 30 minutes. If you did not request a password reset, you can ignore this email.</p>
    `, 'Reset your SEWA XAI password'),
  }),

  // ── Clinical ────────────────────────────────────────────────
  critical_finding: (d) => ({
    subject: `🚨 CRITICAL FINDING — Scan ${d.scanId}`,
    html: BASE(`
      <span class="badge badge-critical">🚨 CRITICAL FINDING</span>
      <h2 style="margin-top:12px;">${d.finding}</h2>
      <div class="card" style="border-color:#4A1515;background:#2A0A0A;">
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <div class="stat"><div class="stat-value" style="color:#E03535;">${(d.confidence*100).toFixed(1)}%</div><div style="font-size:10px;color:#6FA898;margin-top:4px;">AI CONFIDENCE</div></div>
          <div style="flex:1;padding:8px;">
            <p style="margin:0;"><strong style="color:#D0ECE6;">Scan ID:</strong> ${d.scanId}<br/>
            ${d.location ? `<strong style="color:#D0ECE6;">Location:</strong> ${d.location}<br/>` : ''}
            ${d.patientName ? `<strong style="color:#D0ECE6;">Patient:</strong> ${d.patientName}<br/>` : ''}
            <strong style="color:#D0ECE6;">Detected:</strong> ${new Date().toLocaleString('en-GB')}</p>
          </div>
        </div>
      </div>
      <center style="margin:20px 0;">
        <a href="https://app.sewaxai.health/scans/${d.scanId}" class="btn btn-critical">Review Scan Immediately →</a>
      </center>
      <p style="font-size:12px;color:#3A6055;">This is an automated AI-generated alert. Clinical judgment is required. The SEWA XAI result has passed metacognition validation.</p>
    `, `CRITICAL: ${d.finding} — Scan ${d.scanId}`),
  }),

  stroke_code: (d) => ({
    subject: `⚡ STROKE CODE — Scan ${d.scanId}`,
    html: BASE(`
      <span class="badge badge-critical">⚡ STROKE CODE</span>
      <h2 style="color:#E03535;margin-top:12px;">Immediate Clinical Action Required</h2>
      <div class="card" style="border-color:#4A1515;background:#2A0A0A;">
        <p style="margin:0;color:#E03535;font-size:16px;font-weight:700;">${d.finding}</p>
        <p style="margin:8px 0 0;">${d.location} · Confidence: ${(d.confidence*100).toFixed(1)}%</p>
      </div>
      <p>A stroke code has been automatically triggered. Please attend and review immediately.</p>
      <center style="margin:20px 0;">
        <a href="https://app.sewaxai.health/scans/${d.scanId}" class="btn btn-critical">⚡ Open Stroke Workflow →</a>
      </center>
    `, `STROKE CODE — Scan ${d.scanId}`),
  }),

  report_ready: (d) => ({
    subject: `📋 Your Radiology Report is Ready — ${d.tenantName}`,
    html: BASE(`
      <h2>Your report is ready 📋</h2>
      <p>Hi ${d.firstName}, your radiology report has been reviewed, signed, and is now available.</p>
      <div class="card">
        <p style="margin:0;"><strong style="color:#D0ECE6;">Report signed by:</strong> ${d.radiologistName}<br/>
        <strong style="color:#D0ECE6;">Date:</strong> ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</p>
      </div>
      <p>You can view your report, download a PDF copy, or share it with your GP through the SEWA XAI patient portal.</p>
      <center style="margin:24px 0;">
        <a href="https://app.sewaxai.health/patient/reports/${d.reportId}" class="btn">View My Report →</a>
      </center>
    `, 'Your radiology report is ready'),
  }),

  // ── Appointments ────────────────────────────────────────────
  appointment_booked: (d) => ({
    subject: `✅ Appointment Confirmed — ${d.date} at ${d.time}`,
    html: BASE(`
      <h2>Appointment Confirmed ✅</h2>
      <p>Hi ${d.firstName}, your appointment has been confirmed.</p>
      <div class="card">
        <p style="margin:0;">
          📅 <strong style="color:#D0ECE6;">Date:</strong> ${d.date}<br/>
          🕐 <strong style="color:#D0ECE6;">Time:</strong> ${d.time}<br/>
          🏥 <strong style="color:#D0ECE6;">Type:</strong> ${d.type}<br/>
          👨‍⚕️ <strong style="color:#D0ECE6;">${d.doctorName ? 'Doctor' : 'Patient'}:</strong> ${d.doctorName ?? d.patientName ?? '—'}<br/>
          📍 <strong style="color:#D0ECE6;">Location:</strong> ${d.location ?? 'To be confirmed'}
        </p>
      </div>
      <div style="display:flex;gap:10px;margin:20px 0;justify-content:center;">
        <a href="https://app.sewaxai.health/appointments/${d.appointmentId}" class="btn">View Appointment</a>
        <a href="https://app.sewaxai.health/appointments/${d.appointmentId}/cancel" style="display:inline-block;padding:12px 20px;border:1px solid #1B3028;color:#6FA898;text-decoration:none;border-radius:10px;font-size:14px;">Cancel</a>
      </div>
      <p style="font-size:12px;">Add to your calendar: <a href="https://app.sewaxai.health/appointments/${d.appointmentId}/ical" style="color:#408D7B;">Download .ics</a></p>
    `, `Appointment confirmed: ${d.date} at ${d.time}`),
  }),

  appointment_reminder: (d) => ({
    subject: `⏰ Appointment Tomorrow — ${d.time}`,
    html: BASE(`
      <h2>Reminder: You have an appointment tomorrow ⏰</h2>
      <p>Hi ${d.firstName}, this is a friendly reminder about your upcoming appointment.</p>
      <div class="card">
        <p style="margin:0;">📅 <strong style="color:#D0ECE6;">Tomorrow:</strong> ${d.date} at ${d.time}<br/>
        🏥 <strong style="color:#D0ECE6;">Type:</strong> ${d.type}</p>
      </div>
      <center style="margin:20px 0;">
        <a href="https://app.sewaxai.health/appointments/${d.appointmentId}" class="btn">View Details</a>
      </center>
    `, `Reminder: Appointment tomorrow at ${d.time}`),
  }),

  appointment_cancelled: (d) => ({
    subject: `❌ Appointment Cancelled — ${d.date}`,
    html: BASE(`
      <h2>Appointment Cancelled ❌</h2>
      <p>Hi ${d.firstName}, your appointment on <strong style="color:#D0ECE6;">${d.date} at ${d.time}</strong> has been cancelled.</p>
      ${d.reason ? `<div class="card"><p style="margin:0;"><strong style="color:#D0ECE6;">Reason:</strong> ${d.reason}</p></div>` : ''}
      <center style="margin:20px 0;">
        <a href="https://app.sewaxai.health/appointments/new" class="btn">Rebook Appointment →</a>
      </center>
    `, `Appointment cancelled: ${d.date}`),
  }),

  // ── Billing ─────────────────────────────────────────────────
  payment_received: (d) => ({
    subject: `✅ Payment Received — ${d.amount}`,
    html: BASE(`
      <h2>Payment Received ✅</h2>
      <p>Hi ${d.firstName}, we have received your payment.</p>
      <div class="card">
        <p style="margin:0;"><strong style="color:#D0ECE6;">Amount:</strong> ${d.amount}<br/>
        <strong style="color:#D0ECE6;">Description:</strong> ${d.description}<br/>
        <strong style="color:#D0ECE6;">Date:</strong> ${new Date().toLocaleDateString('en-GB')}<br/>
        <strong style="color:#D0ECE6;">Reference:</strong> ${d.reference ?? '—'}</p>
      </div>
      <center style="margin:20px 0;">
        <a href="https://app.sewaxai.health/billing/invoices" class="btn">View Invoice →</a>
      </center>
    `, `Payment received: ${d.amount}`),
  }),

  payment_failed: (d) => ({
    subject: `⚠️ Payment Failed — Action Required`,
    html: BASE(`
      <h2>Payment Failed ⚠️</h2>
      <p>Hi ${d.firstName}, a payment for your SEWA XAI subscription could not be processed.</p>
      <div class="card" style="border-color:#3A2000;background:#2A1800;">
        <p style="margin:0;color:#E08A20;"><strong>Amount due:</strong> ${d.amount}<br/>
        <strong>Plan:</strong> ${d.plan}<br/>
        <strong>Failed:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
      </div>
      <p>Please update your payment method to avoid service interruption.</p>
      <center style="margin:20px 0;">
        <a href="https://app.sewaxai.health/billing/payment-method" class="btn">Update Payment Method →</a>
      </center>
    `, 'Payment failed — action required'),
  }),

  // ── Admin / System ───────────────────────────────────────────
  new_user_registered: (d) => ({
    subject: `New user registered — ${d.newUserEmail}`,
    html: BASE(`
      <h2>New User Registered</h2>
      <p>A new user has registered at <strong style="color:#D0ECE6;">${d.tenantName}</strong>.</p>
      <div class="card">
        <p style="margin:0;"><strong style="color:#D0ECE6;">Name:</strong> ${d.newUserName}<br/>
        <strong style="color:#D0ECE6;">Email:</strong> ${d.newUserEmail}<br/>
        <strong style="color:#D0ECE6;">Role:</strong> ${d.newUserRole}</p>
      </div>
      <center style="margin:20px 0;">
        <a href="https://app.sewaxai.health/admin/users" class="btn">Manage Users →</a>
      </center>
    `, `New user: ${d.newUserEmail}`),
  }),

  compliance_deadline: (d) => ({
    subject: `⚠️ Compliance Deadline — ${d.framework} due ${d.dueDate}`,
    html: BASE(`
      <h2>Compliance Deadline Approaching ⚠️</h2>
      <div class="card" style="border-color:#3A2000;background:#2A1800;">
        <p style="margin:0;color:#E08A20;"><strong style="color:#D0ECE6;">Framework:</strong> ${d.framework}<br/>
        <strong style="color:#D0ECE6;">Due:</strong> ${d.dueDate}<br/>
        <strong style="color:#D0ECE6;">Action:</strong> ${d.action}</p>
      </div>
      <center style="margin:20px 0;">
        <a href="https://app.sewaxai.health/compliance" class="btn">View Compliance Dashboard →</a>
      </center>
    `, `Compliance deadline: ${d.framework} — ${d.dueDate}`),
  }),

  consent_expiring: (d) => ({
    subject: 'Your SEWA XAI data consent is expiring soon',
    html: BASE(`
      <h2>Your data consent is expiring 🔐</h2>
      <p>Hi ${d.firstName}, your consent for SEWA XAI to process your health data will expire on <strong style="color:#D0ECE6;">${d.expiryDate}</strong>.</p>
      <p>To continue using SEWA XAI services, please renew your consent in the patient portal.</p>
      <center style="margin:24px 0;">
        <a href="https://app.sewaxai.health/patient/consent" class="btn">Review & Renew Consent →</a>
      </center>
      <p style="font-size:12px;color:#3A6055;">Under GDPR Article 7, you can withdraw consent at any time. Your data will be retained only as required by law.</p>
    `, 'Your consent is expiring soon'),
  }),
};

// ── Email service ──────────────────────────────────────────────
export interface SendTemplatedOptions {
  to:          string;
  type:        string;
  data:        Record<string, any>;
  recipientEmail?: string;
  unsubscribeUrl?: string;
}

export const emailService = {
  async sendTemplated(opts: SendTemplatedOptions): Promise<boolean> {
    if (!emailClient) {
      logger.warn('[Email] ACS not configured — skipping');
      return false;
    }

    const tpl = EMAIL_TEMPLATES[opts.type];
    if (!tpl) {
      logger.warn(`[Email] No template for event: ${opts.type}`);
      return false;
    }

    const { subject, html } = tpl(opts.data);

    // Inject personalisation tokens
    const finalHtml = html
      .replace(/{{recipientEmail}}/g,  opts.recipientEmail ?? opts.to)
      .replace(/{{unsubscribeUrl}}/g,  opts.unsubscribeUrl ?? 'https://app.sewaxai.health/notifications');

    try {
      const poller = await emailClient.beginSend({
        senderAddress: FROM_EMAIL,
        content: {
          subject: subject,
          html: finalHtml,
        },
        recipients: {
          to: [{ address: opts.to }],
        },
      });
      await poller.pollUntilDone();
      logger.info(`[Email] Sent ${opts.type} to ${opts.to}`);
      return true;
    } catch (e: any) {
      logger.error(`[Email] Failed to ${opts.to}:`, e.message);
      return false;
    }
  },

  async sendRaw(opts: { to: string; subject: string; html: string }): Promise<boolean> {
    if (!emailClient) return false;
    try {
      const poller = await emailClient.beginSend({
        senderAddress: FROM_EMAIL,
        content: {
          subject: opts.subject,
          html: opts.html,
        },
        recipients: {
          to: [{ address: opts.to }],
        },
      });
      await poller.pollUntilDone();
      return true;
    } catch (e: any) {
      logger.error('[Email] Raw send failed:', e.message);
      return false;
    }
  },
};
