import { EmailClient } from '@azure/communication-email';
import { config } from '../config/env';
import { logger } from '../utils/logger';

const connectionString = config.AZURE_COMMUNICATION_CONNECTION_STRING || '';
const emailClient = connectionString ? new EmailClient(connectionString) : null;

const FROM_EMAIL = config.EMAIL_FROM || 'info@sewaxai.health';
const FROM_NAME  = 'SEWA AI Clinical';

interface EmailPayload {
  to: string; name?: string; subject: string;
  template?: string; html?: string; data?: Record<string, any>;
}

const TEMPLATES: Record<string, (d: any) => string> = {
  'critical-alert': (d) => `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#05100D;color:#D6EDE8;border-radius:12px;overflow:hidden">
      <div style="background:#C94444;padding:20px 24px">
        <h1 style="margin:0;color:#fff;font-size:20px">🚨 ${d.urgency} Alert — ${d.primaryFinding}</h1>
      </div>
      <div style="padding:24px">
        <p><strong>AI Confidence:</strong> ${Math.round(d.confidence * 100)}%</p>
        <p><strong>Door-to-Alert:</strong> ${d.doorToAlertMs}ms</p>
        <p><strong>Scan ID:</strong> ${d.scanId}</p>
        <a href="${config.FRONTEND_URL}/scans/${d.scanId}" style="display:inline-block;background:#408D7B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:16px">Review Now →</a>
      </div>
    </div>`,
  'forgot_password': (d) => `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px;background:#f9fafb;border-radius:12px">
      <h2>Reset your SEWA AI password</h2>
      <p>Hello ${d.firstName || 'there'},</p>
      <p>We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
      <a href="${d.resetLink}" style="display:inline-block;background:#408D7B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Reset Password →</a>
      <p style="font-size:12px;color:#666;margin-top:24px">If you didn't request this, you can safely ignore this email.</p>
    </div>`,
  'verify_email': (d) => `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px;background:#f9fafb;border-radius:12px">
      <h2>Verify your clinical account</h2>
      <p>Hello ${d.firstName || 'there'},</p>
      <p>Please verify your email address to activate your SEWA AI clinical dashboard access.</p>
      <a href="${d.verifyLink}" style="display:inline-block;background:#408D7B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Verify Email →</a>
    </div>`,
  'report-ready': (d) => `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2>Your SEWA AI Report is Ready</h2>
      <p>Dear ${d.patientName},</p>
      <p>Your ${d.modality} ${d.bodyPart} scan report has been reviewed and signed by a qualified radiologist.</p>
      <a href="${config.FRONTEND_URL}/portal/scans" style="display:inline-block;background:#408D7B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">View Report →</a>
    </div>`,
  'welcome': (d) => `
    <div style="font-family:'IBM Plex Sans',sans-serif;max-width:600px;margin:0 auto;padding:40px;background:#f9fafb;border-radius:12px">
      <h2 style="color:#0C1D17">Welcome to SEWA AI, ${d.firstName || d.name || 'there'}!</h2>
      <p>Your clinical account at <strong>${d.tenantName || 'SEWA AI'}</strong> has been created and is ready to use.</p>
      <a href="${d.loginUrl || d.inviteLink || '#'}" style="display:inline-block;background:#408D7B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Sign in to SEWA AI →</a>
      <p style="font-size:12px;color:#666;margin-top:24px">If you did not register for this account, please contact support@sewa.ai immediately.</p>
    </div>`,
  'appointment-reminder': (d) => `
    <div style="font-family:'IBM Plex Sans',sans-serif;max-width:600px;margin:0 auto;padding:40px;background:#f9fafb;border-radius:12px">
      <h2 style="color:#0C1D17">Appointment Reminder — SEWA AI</h2>
      <p>Dear ${d.patientName || 'Patient'},</p>
      <p>This is a reminder that you have a <strong>${d.appointmentType || 'medical'}</strong> appointment scheduled for:</p>
      <div style="background:#0C1D17;color:#D0ECE6;padding:16px 20px;border-radius:8px;margin:16px 0">
        <strong>${d.appointmentDate}</strong> at <strong>${d.appointmentTime}</strong><br/>
        <span style="font-size:13px;color:#6FA898">${d.location || 'Please check your patient portal for location details'}</span>
      </div>
      <a href="${d.portalUrl || '#'}" style="display:inline-block;background:#408D7B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">View Appointment →</a>
      <p style="font-size:12px;color:#666;margin-top:24px">To cancel or reschedule, please contact your healthcare provider at least 24 hours in advance.</p>
    </div>`,
  'staff-invite': (d) => `
    <div style="font-family:'IBM Plex Sans',sans-serif;max-width:600px;margin:0 auto;background:#0C1D17;color:#D0ECE6;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#408D7B,#2E6B5E);padding:28px 32px">
        <div style="font-size:11px;color:#A8D8CC;letter-spacing:0.08em;margin-bottom:8px">SEWA AI · NHS Clinical Platform</div>
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">You've been invited to join ${d.tenantName || 'your NHS trust'}</h1>
      </div>
      <div style="padding:32px">
        <p style="margin-top:0">You have been invited as a <strong>${d.role}</strong> on the SEWA AI platform by your hospital administrator.</p>
        <p>Click the button below to create your account and set your password. This invitation expires in <strong>72 hours</strong>.</p>
        <a href="${d.inviteLink}" style="display:inline-block;background:#408D7B;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;margin-top:8px">Accept Invitation &amp; Set Password →</a>
        <hr style="border:none;border-top:1px solid #1B3028;margin:28px 0"/>
        <p style="font-size:12px;color:#6FA898;margin:0">If you did not expect this invitation, please ignore this email or contact <a href="mailto:support@sewa.ai" style="color:#52B09A">support@sewa.ai</a>.</p>
        <p style="font-size:11px;color:#3A6055;margin:8px 0 0">SEWA AI · a Storegrill Inc Ltd company · Registered in England &amp; Wales (14581073)</p>
      </div>
    </div>`,
};

export async function sendEmail({ to, name, subject, template, html, data }: EmailPayload): Promise<void> {
  if (!emailClient) {
    logger.warn(`[Email] AZURE_COMMUNICATION_CONNECTION_STRING not set — skipping email to ${to}`);
    return;
  }
  const emailHtml = html || (template && TEMPLATES[template] ? TEMPLATES[template](data || {}) : `<p>${JSON.stringify(data)}</p>`);
  
  const message = {
    senderAddress: FROM_EMAIL,
    content: {
      subject: subject,
      html: emailHtml,
    },
    recipients: {
      to: [{ address: to, displayName: name || to }],
    },
  };

  try {
    const poller = await emailClient.beginSend(message);
    await poller.pollUntilDone();
    logger.info(`[Email] Sent '${subject}' to ${to}`);
  } catch (error: any) {
    // BG4: Log failure but do NOT rethrow — email is non-fatal for most flows
    logger.error(`[Email] Failed to send '${subject}' to ${to}: ${error.message}`);
  }
}
