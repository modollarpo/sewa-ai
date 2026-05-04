// SEWA AI — backend/src/routes/fhir.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { 
  getFHIRPatient, getFHIRImagingStudy, getFHIRDiagnosticReport, 
  getFHIRObservation, getFHIRPractitioner, getFHIROrganization,
  searchFHIRDiagnosticReports 
} from '../services/fhirService';
import { fhirSyncWorker } from '../services/fhirSyncWorker';
const r = Router();
r.get('/health', (_req, res) => res.json({ status: 'operational', service: 'FHIR R4 Interface' }));

// Inbound Webhook (EHR -> SEWA AI)
// EHRs typically use API Key or Basic Auth. We verify the X-API-Key header.
r.post('/webhook', async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) throw new AppError('X-API-Key required for FHIR webhooks', 401);

    const tenant = await prisma.tenant.findFirst({ where: { apiKey } });
    if (!tenant) throw new AppError('Invalid API Key', 401);

    const resourceType = req.headers['x-fhir-resource'] as string || req.body.resourceType;
    await fhirSyncWorker.handleInboundWebhook(resourceType, req.body, tenant.id);
    res.status(202).json({ message: 'Accepted for processing' });
  } catch (e) { next(e); }
});

r.use(authenticate, authorize('admin', 'superadmin'));

r.get('/r4/Patient/:id', async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const p = await prisma.patient.findFirst({ where: { fhirId: req.params.id, tenantId } });
    if (!p) throw new AppError('Patient FHIR resource not found in this institution', 404);
    res.json(await getFHIRPatient(req.params.id));
  } catch (e) { next(e); }
});

r.get('/r4/ImagingStudy/:id', async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const s = await prisma.scan.findFirst({ where: { fhirStudyId: req.params.id, tenantId } });
    if (!s) throw new AppError('ImagingStudy not found in this institution', 404);
    res.json(await getFHIRImagingStudy(req.params.id));
  } catch (e) { next(e); }
});

r.get('/r4/DiagnosticReport/:id', async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const r = await prisma.report.findFirst({ where: { fhirReportId: req.params.id, tenantId } });
    if (!r) throw new AppError('DiagnosticReport not found in this institution', 404);
    res.json(await getFHIRDiagnosticReport(req.params.id));
  } catch (e) { next(e); }
});

r.get('/r4/Observation/:id', async (req, res, next) => {
  // Observations are linked to Scans. We need to verify the scan ownership.
  // This is complex as we don't store fhirObservationId in DB yet.
  // For safety, we block direct Observation fetch unless we add mapping.
  try {
    throw new AppError('Direct observation fetch by ID is restricted. Use DiagnosticReport instead.', 403);
  } catch (e) { next(e); }
});

r.get('/r4/Practitioner/:id', async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const u = await prisma.user.findFirst({ where: { id: req.params.id, tenantId } });
    if (!u) throw new AppError('Practitioner not found in this institution', 404);
    res.json(await getFHIRPractitioner(req.params.id));
  } catch (e) { next(e); }
});

r.get('/r4/Organization/:id', async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    if (req.params.id !== tenantId && req.user!.role !== 'superadmin') {
      throw new AppError('Unauthorized access to other organization records', 403);
    }
    res.json(await getFHIROrganization(req.params.id));
  } catch (e) { next(e); }
});

// Search
r.get('/r4/DiagnosticReport', async (req, res, next) => { 
  try { 
    const { tenantId } = req.user!;
    const patientFhirId = req.query.patient as string;
    if (!patientFhirId) throw new AppError('patient query param required', 400);

    // Verify patient ownership
    const p = await prisma.patient.findFirst({ where: { fhirId: patientFhirId.replace('Patient/', ''), tenantId } });
    if (!p) throw new AppError('Patient not found in this institution', 404);

    res.json(await searchFHIRDiagnosticReports(patientFhirId)); 
  } catch (e) { next(e); } 
});

export default r;

// ── audit.ts ─────────────────────────────────────────────────
// (separate file)
