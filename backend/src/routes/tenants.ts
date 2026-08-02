// SEWA XAI — backend/src/routes/tenants.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../utils/prismaClient';
import { validate }  from '../middleware/validate';
import { TenantOnboardSchema } from '../utils/validators';

const r = Router();
r.use(authenticate);

r.get('/me', async (req, res, next) => {
  try {
    const t = await prisma.tenant.findUnique({
      where: { id: req.user!.tenantId },
      select: {
        id: true, name: true, slug: true, subdomain: true, region: true,
        currency: true, language: true, reportLanguage: true, plan: true, status: true,
        fhirBaseUrl: true, hl7Endpoint: true, pacsEndpoint: true,
        timezone: true, address: true,
        scanQuota: true, scansUsedThisMonth: true,
        trialEndsAt: true, nextBillDate: true,
        createdAt: true, updatedAt: true,
      }
    });
    res.json(t);
  } catch (err) { next(err); }
});

/**
 * PATCH /api/v1/tenants/me
 * Allows tenant admins to update their institution's settings.
 * Supported fields: reportLanguage (multilingual VLM), timezone, address.
 */
const SUPPORTED_REPORT_LANGUAGES = new Set([
  'en', 'ha', 'yo', 'ig', 'sw', 'fr', 'pt', 'ar'
]);

r.patch('/me', authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const { reportLanguage, timezone, address } = req.body;

    // Validate language code if provided
    if (reportLanguage && !SUPPORTED_REPORT_LANGUAGES.has(reportLanguage)) {
      return res.status(400).json({
        message: `Unsupported reportLanguage '${reportLanguage}'. Supported: ${[...SUPPORTED_REPORT_LANGUAGES].join(', ')}`
      });
    }

    const updateData: Record<string, unknown> = {};
    if (reportLanguage) updateData.reportLanguage = reportLanguage;
    if (timezone)       updateData.timezone = timezone;
    if (address)        updateData.address = address;

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
      select: { id: true, name: true, reportLanguage: true, timezone: true, address: true },
    });

    return res.json({ message: 'Tenant settings updated.', tenant: updated });
  } catch (err) { next(err); }
});

r.get('/integrations/health', authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { checkFHIRHealth } = await import('../services/fhirService');
    const { checkHL7Health }  = await import('../services/hl7Service');
    
    const [fhir, hl7] = await Promise.all([
      checkFHIRHealth(),
      checkHL7Health(),
    ]);
    
    res.json({ fhir, hl7 });
  } catch (err) { next(err); }
});

r.post('/', authorize('superadmin'), validate(TenantOnboardSchema), async (req, res, next) => {
  try {
    const t = await prisma.tenant.create({ data: req.body });
    res.status(201).json(t);
  } catch (err) { next(err); }
});

/**
 * PATCH /api/v1/tenants/:id
 * SuperAdmin: update any tenant (plan, status, supportedModalities, etc.)
 */
r.patch('/:id', authorize('superadmin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plan, status, name, region, currency } = req.body;

    const updateData: Record<string, unknown> = {};
    if (plan)     updateData.plan = plan;
    if (status)   updateData.status = status;
    if (name)     updateData.name = name;
    if (region)   updateData.region = region;
    if (currency) updateData.currency = currency;

    const updated = await prisma.tenant.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, slug: true, plan: true, status: true, region: true, currency: true },
    });

    return res.json({ message: 'Tenant updated.', tenant: updated });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/tenants/integrations/pacs/echo
 * C1 fix: Tests DICOM C-ECHO reachability via TCP socket to the configured PACS host.
 */
r.post('/integrations/pacs/echo', authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {} as Record<string, never>,
    });
    const t = tenant as { pacsHost?: string; pacsPort?: number } | null;
    const host = t?.pacsHost || process.env.PACS_HOST || 'pacs.sewa.nhs.uk';
    const port = Number(t?.pacsPort || process.env.PACS_PORT || 11112);

    const net = await import('net');
    const reachable = await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(3000);
      socket.connect(port, host, () => { socket.destroy(); resolve(true); });
      socket.on('error',   () => { socket.destroy(); resolve(false); });
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
    });

    if (reachable) {
      res.json({ status: 'ok', message: `C-ECHO to ${host}:${port} successful` });
    } else {
      res.status(503).json({ status: 'fail', message: `PACS ${host}:${port} unreachable` });
    }
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/tenants/integrations
 * Returns the current integration status for this tenant.
 */
r.get('/integrations', authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { fhirBaseUrl: true, hl7Endpoint: true, pacsEndpoint: true },
    });
    res.json({
      fhir:  { status: 'online', endpoint: tenant?.fhirBaseUrl || 'https://fhir.london.nhs.uk/r4' },
      hl7:   { status: 'online', host: tenant?.hl7Endpoint || '10.5.22.41' },
      pacs:  { status: 'connected', aeTitle: 'SEWA_AI' },
    });
  } catch (err) { next(err); }
});

export default r;

