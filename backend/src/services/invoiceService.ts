// SEWA XAI — backend/src/services/invoiceService.ts
// PDF invoice generation and delivery per billing cycle.
// Generates structured invoice HTML → stores in Azure Blob → emails via SendGrid.
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import { prisma } from '../utils/prismaClient';
import { sendEmail } from './emailService';
import { uploadToStorage } from './storageService';
import { logger } from '../utils/logger';

interface InvoiceData {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  tenant: {
    name: string; address?: string;
    email: string; billingEmail?: string;
    region: string; currency: string;
    plan: string; subscriptionId?: string;
  };
  lineItems: { description: string; quantity: number; unitPrice: number; total: number; }[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  currency: string;
  paymentId: string;
  periodStart: Date;
  periodEnd: Date;
}

export async function generateInvoice(paymentId: string): Promise<string | null> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { tenant: true },
    });
    if (!payment) { logger.warn(`[Invoice] Payment not found: ${paymentId}`); return null; }

    const tenant = payment.tenant;
    const meta = payment.metadata as any || {};
    const now = new Date();
    const invoiceNumber = `INV-${tenant.id.slice(0,6).toUpperCase()}-${Date.now()}`;

    // Determine tax rate by region
    const taxRates: Record<string, number> = {
      uk: 0.20, eu: 0.21, us: 0.00, ng: 0.075, ke: 0.16, za: 0.15,
    };
    const taxRate = taxRates[tenant.region] ?? 0;
    const subtotal = payment.amount;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const data: InvoiceData = {
      invoiceNumber,
      issueDate: now,
      dueDate: now,
      tenant: {
        name: tenant.name,
        email: tenant.billingEmail || '',
        billingEmail: tenant.billingEmail || undefined,
        region: tenant.region,
        currency: tenant.currency,
        plan: tenant.plan,
        subscriptionId: tenant.subscriptionId || undefined,
      },
      lineItems: [{
        description: `SEWA XAI ${(tenant.plan || 'starter').charAt(0).toUpperCase() + (tenant.plan || 'starter').slice(1)} Plan`,
        quantity: 1,
        unitPrice: subtotal,
        total: subtotal,
      }],
      subtotal,
      tax,
      taxRate,
      total,
      currency: tenant.currency,
      paymentId,
      periodStart: tenant.billingCycleResetAt
        ? new Date(new Date(tenant.billingCycleResetAt).setMonth(new Date(tenant.billingCycleResetAt).getMonth() - 1))
        : new Date(now.getFullYear(), now.getMonth(), 1),
      periodEnd: tenant.billingCycleResetAt
        ? new Date(new Date(tenant.billingCycleResetAt).getTime() - 1)
        : new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };

    // Generate HTML invoice
    const html = renderInvoiceHTML(data);

    // Store in Azure Blob
    const blobName = `invoices/${tenant.id}/${invoiceNumber}.html`;
    const invoiceUrl = await uploadToStorage({
      tenantId: tenant.id,
      file: Buffer.from(html),
      fileName: `${invoiceNumber}.html`,
      contentType: 'text/html',
      folder: 'invoices',
    });

    // Email invoice to billing contact
    const billingTo = tenant.billingEmail || '';
    if (billingTo) {
      await sendEmail({
        to: billingTo,
        subject: `SEWA XAI Invoice ${invoiceNumber} — ${tenant.currency} ${total.toFixed(2)}`,
        template: 'invoice',
        data: {
          invoiceNumber, total, currency: tenant.currency,
          planName: tenant.plan, tenantName: tenant.name, invoiceUrl,
        },
      });
      logger.info(`[Invoice] Sent ${invoiceNumber} to ${billingTo}`);
    }

    return invoiceUrl;
  } catch (err: any) {
    logger.error(`[Invoice] Generation failed: ${err.message}`);
    return null;
  }
}

function renderInvoiceHTML(d: InvoiceData): string {
  const fmt = (n: number) => `${d.currency} ${n.toFixed(2)}`;
  const fmtDate = (dt: Date) => dt.toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${d.invoiceNumber}</title>
<style>
  body { font-family: 'IBM Plex Sans', Arial, sans-serif; margin: 0; padding: 40px; background: #fff; color: #111; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .logo { font-size: 24px; font-weight: 900; color: #408D7B; }
  .logo span { font-size: 12px; font-weight: 400; color: #666; display: block; margin-top: 2px; }
  .invoice-meta { text-align: right; font-size: 13px; color: #444; }
  .invoice-meta h1 { font-size: 28px; margin: 0; color: #111; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 32px; }
  .party h4 { margin: 0 0 6px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #888; }
  .party p { margin: 3px 0; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #f4f7f6; padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #555; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #e0e0e0; }
  td { padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
  .totals { max-width: 320px; margin-left: auto; font-size: 14px; }
  .totals tr td:first-child { color: #666; }
  .totals tr td:last-child { text-align: right; font-weight: 600; }
  .totals .total-row td { font-size: 16px; font-weight: 900; color: #408D7B; border-top: 2px solid #e0e0e0; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #999; text-align: center; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; background: #e8f5f2; color: #408D7B; font-weight: 700; font-size: 12px; }
</style>
</head>
<body>
<div class="header">
  <div class="logo">SEWA XAI <span>a Storegrill Inc Ltd company · No. 14581073</span></div>
  <div class="invoice-meta">
    <h1>Invoice</h1>
    <p><strong>${d.invoiceNumber}</strong></p>
    <p>Issued: ${fmtDate(d.issueDate)}</p>
    <p><span class="badge">PAID</span></p>
  </div>
</div>
<div class="parties">
  <div class="party">
    <h4>From</h4>
    <p><strong>SEWA XAI — Storegrill Inc Ltd</strong></p>
    <p>18 Hampshire Close, Binley, Coventry, CV3 2FP, UK</p>
    <p>info@sewaxai.health</p>
    <p>sewaxai.health</p>
  </div>
  <div class="party">
    <h4>Bill To</h4>
    <p><strong>${d.tenant.name}</strong></p>
    ${d.tenant.address ? `<p>${d.tenant.address}</p>` : ''}
    <p>${d.tenant.billingEmail || d.tenant.email}</p>
    <p>Plan: <strong>${d.tenant.plan}</strong> · Region: ${d.tenant.region.toUpperCase()}</p>
    ${d.tenant.subscriptionId ? `<p>Ref: ${d.tenant.subscriptionId}</p>` : ''}
  </div>
</div>
<p style="font-size:13px;color:#666;margin-bottom:24px">
  Billing period: <strong>${fmtDate(d.periodStart)}</strong> to <strong>${fmtDate(d.periodEnd)}</strong>
</p>
<table>
  <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
  <tbody>
    ${d.lineItems.map(l => `<tr><td>${l.description}</td><td>${l.quantity}</td><td>${fmt(l.unitPrice)}</td><td>${fmt(l.total)}</td></tr>`).join('')}
  </tbody>
</table>
<table class="totals">
  <tr><td>Subtotal</td><td>${fmt(d.subtotal)}</td></tr>
  ${d.taxRate > 0 ? `<tr><td>VAT / Tax (${(d.taxRate*100).toFixed(0)}%)</td><td>${fmt(d.tax)}</td></tr>` : ''}
  <tr class="total-row"><td>Total Due</td><td>${fmt(d.total)}</td></tr>
</table>
<p style="font-size:12px;color:#888;text-align:center">
  Payment reference: ${d.paymentId}<br>
  This invoice was generated automatically. For queries, contact <a href="mailto:billing@sewaxai.health">billing@sewaxai.health</a>.
</p>
<div class="footer">
  © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England &amp; Wales (14581073). All rights reserved.
  · sewaxai.health · VAT No. (pending)
</div>
</body>
</html>`;
}
