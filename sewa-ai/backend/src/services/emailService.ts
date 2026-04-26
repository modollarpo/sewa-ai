import { EmailClient } from '@azure/communication-email';
import { config } from '../config/env';

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
  'welcome': (d) => `<h2>Welcome to SEWA AI, ${d.name}</h2><p>Your account is ready. <a href="${d.loginUrl}">Sign in →</a></p>`,
};

export async function sendEmail({ to, name, subject, template, html, data }: EmailPayload): Promise<void> {
  if (!emailClient) {
    console.warn('[Email] AZURE_COMMUNICATION_CONNECTION_STRING not set — skipping email');
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
  } catch (error) {
    console.error('[Email] Failed to send via ACS:', error);
  }
}
