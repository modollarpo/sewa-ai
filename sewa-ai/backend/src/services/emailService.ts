// SEWA AI — src/services/emailService.ts
// SendGrid transactional email with clinical alert templates
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
const FROM_EMAIL = 'info@sewaxai.health';
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
        <a href="https://app.sewaxai.health/scans/${d.scanId}" style="display:inline-block;background:#408D7B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:16px">Review Now →</a>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #1A3028;font-size:11px;color:#5E9488">
        © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.
      </div>
    </div>`,
  'report-ready': (d) => `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2>Your SEWA AI Report is Ready</h2>
      <p>Dear ${d.patientName},</p>
      <p>Your ${d.modality} ${d.bodyPart} scan report has been reviewed and signed by a qualified radiologist.</p>
      <a href="https://app.sewaxai.health/patient/reports" style="display:inline-block;background:#408D7B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">View Report →</a>
      <p style="font-size:11px;color:#888;margin-top:24px">© 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).</p>
    </div>`,
  'welcome': (d) => `<h2>Welcome to SEWA AI, ${d.name}</h2><p>Your account is ready. <a href="${d.loginUrl}">Sign in →</a></p>`,
};

export async function sendEmail({ to, name, subject, template, html, data }: EmailPayload): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[Email] SENDGRID_API_KEY not set — skipping email');
    return;
  }
  const emailHtml = html || (template && TEMPLATES[template] ? TEMPLATES[template](data || {}) : `<p>${JSON.stringify(data)}</p>`);
  await sgMail.send({ to, from: { email: FROM_EMAIL, name: FROM_NAME }, subject, html: emailHtml });
}
