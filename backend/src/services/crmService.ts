// SEWA XAI — src/services/crmService.ts
// HubSpot CRM Integration — Service Key (scopes: contacts r/w, companies w, deals w, appointments w, invoices r/w)
// Falls back to Slack webhook if HubSpot is unavailable.

import axios from 'axios';
import { logger } from '../utils/logger';

const HUBSPOT_BASE = 'https://api.hubapi.com/crm/v3/objects';

function hubspotHeaders() {
  return {
    Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

async function hubspotPost(path: string, body: object): Promise<any> {
  const res = await axios.post(`${HUBSPOT_BASE}${path}`, body, {
    headers: hubspotHeaders(),
    timeout: 8000,
  });
  return res.data;
}

// ── Check HubSpot availability ──────────────────────────────────
function hubspotEnabled(): boolean {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  return !!(token && !token.includes('xxx'));
}

// ── Slack fallback ──────────────────────────────────────────────
async function notifySlack(text: string): Promise<void> {
  const webhook = process.env.SUPPORT_SLACK_WEBHOOK;
  if (!webhook) return;
  await axios.post(webhook, { text }, { timeout: 5000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONTACT — Lead Capture from /onboarding/lead
// ─────────────────────────────────────────────────────────────────────────────
interface LeadPayload {
  name: string;
  email: string;
  organization: string;
  message?: string;
}

export async function forwardLeadToCRM(lead: LeadPayload): Promise<void> {
  const [firstName, ...rest] = lead.name.split(' ');
  const lastName = rest.join(' ') || '[No Last Name]';

  if (hubspotEnabled()) {
    try {
      await hubspotPost('/contacts', {
        properties: {
          email: lead.email,
          firstname: firstName,
          lastname: lastName,
          company: lead.organization,
          message: lead.message || '',
          hs_lead_status: 'NEW',
        },
      });
      logger.info(`[CRM] HubSpot contact created for ${lead.email}`);
      return;
    } catch (err: any) {
      logger.error(`[CRM] HubSpot contact failed: ${err.message} — falling back to Slack`);
    }
  }

  try {
    await notifySlack(
      `🎯 *New Lead*\n*Name:* ${lead.name}\n*Email:* ${lead.email}\n*Org:* ${lead.organization}\n*Message:* ${lead.message || 'None'}`
    );
    logger.info(`[CRM] Lead forwarded to Slack for ${lead.email}`);
  } catch (err: any) {
    logger.error(`[CRM] Slack fallback also failed: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. COMPANY — Auto-create when a hospital/clinic onboards
// ─────────────────────────────────────────────────────────────────────────────
interface CompanyPayload {
  name: string;
  region: string;
  plan: string;
  domain?: string;
}

export async function createHubSpotCompany(company: CompanyPayload): Promise<string | null> {
  if (!hubspotEnabled()) return null;
  try {
    const data = await hubspotPost('/companies', {
      properties: {
        name: company.name,
        domain: company.domain || '',
        description: `SEWA XAI tenant — ${company.plan} plan — ${company.region.toUpperCase()} region`,
      },
    });
    logger.info(`[CRM] HubSpot company created: ${company.name} (${data.id})`);
    return data.id as string;
  } catch (err: any) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    logger.error(`[CRM] HubSpot company creation failed: ${detail}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DEAL — Auto-create Closed Won deal when Stripe payment succeeds
// ─────────────────────────────────────────────────────────────────────────────
interface DealPayload {
  tenantName: string;
  plan: string;
  amountUSD: number;
  currency: string;
  hubspotCompanyId?: string | null;
}

export async function createHubSpotDeal(deal: DealPayload): Promise<void> {
  if (!hubspotEnabled()) return;
  try {
    const data = await hubspotPost('/deals', {
      properties: {
        dealname: `${deal.tenantName} — ${deal.plan.toUpperCase()} Plan`,
        dealstage: 'closedwon',
        amount: deal.amountUSD.toString(),
        closedate: new Date().toISOString().split('T')[0],
        pipeline: 'default',
      },
    });
    logger.info(`[CRM] HubSpot deal created: ${deal.tenantName} (${data.id})`);

    // Associate deal with the company record if available
    if (deal.hubspotCompanyId) {
      await axios.put(
        `https://api.hubapi.com/crm/v3/objects/deals/${data.id}/associations/companies/${deal.hubspotCompanyId}/deal_to_company`,
        {},
        { headers: hubspotHeaders(), timeout: 5000 }
      );
    }
  } catch (err: any) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    logger.error(`[CRM] HubSpot deal creation failed: ${detail}`);
    try {
      await notifySlack(
        `💰 *New Closed Won Deal*\n*Tenant:* ${deal.tenantName}\n*Plan:* ${deal.plan.toUpperCase()}\n*Value:* ${deal.currency} ${deal.amountUSD}/month`
      );
    } catch (_) { /* Slack notification is non-critical; failure is silently ignored */ }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. APPOINTMENT — Sync patient/demo appointment bookings
// ─────────────────────────────────────────────────────────────────────────────
interface AppointmentPayload {
  title: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  tenantName?: string;
  attendeeEmail?: string;
}

export async function createHubSpotAppointment(appt: AppointmentPayload): Promise<void> {
  if (!hubspotEnabled()) return;
  try {
    await hubspotPost('/appointments', {
      properties: {
        hs_appointment_title: appt.title,
        hs_appointment_start: appt.startTime,
        hs_appointment_end: appt.endTime,
        hs_appointment_status: 'SCHEDULED',
      },
    });
    logger.info(`[CRM] HubSpot appointment created: ${appt.title}`);
  } catch (err: any) {
    logger.error(`[CRM] HubSpot appointment failed: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. INVOICE — Mirror Stripe invoices into HubSpot
// ─────────────────────────────────────────────────────────────────────────────
interface InvoicePayload {
  tenantName: string;
  invoiceNumber: string;
  amountDue: number;
  currency: string;
  dueDate: string;     // ISO 8601 date string
  status: 'draft' | 'open' | 'paid' | 'void';
  hubspotCompanyId?: string | null;
}

export async function createHubSpotInvoice(invoice: InvoicePayload): Promise<void> {
  if (!hubspotEnabled()) return;
  try {
    const data = await hubspotPost('/invoices', {
      properties: {
        hs_invoice_status: invoice.status.toUpperCase(),
        hs_due_date: invoice.dueDate,
        hs_currency_code: invoice.currency.toUpperCase(),
        hs_invoice_source: 'STRIPE',
      },
    });
    logger.info(`[CRM] HubSpot invoice created: ${invoice.invoiceNumber} for ${invoice.tenantName}`);

    // Associate invoice with the company record if available
    if (invoice.hubspotCompanyId) {
      await axios.put(
        `https://api.hubapi.com/crm/v3/objects/invoices/${data.id}/associations/companies/${invoice.hubspotCompanyId}/invoice_to_company`,
        {},
        { headers: hubspotHeaders(), timeout: 5000 }
      );
    }
  } catch (err: any) {
    logger.error(`[CRM] HubSpot invoice creation failed: ${err.message}`);
  }
}
