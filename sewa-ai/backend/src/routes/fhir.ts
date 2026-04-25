// SEWA AI — backend/src/routes/fhir.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { 
  getFHIRPatient, getFHIRImagingStudy, getFHIRDiagnosticReport, 
  getFHIRObservation, getFHIRPractitioner, getFHIROrganization,
  searchFHIRDiagnosticReports 
} from '../services/fhirService';
import { fhirSyncWorker } from '../services/fhirSyncWorker';
const r = Router();
r.get('/health', (_req, res) => res.json({ status: 'operational', service: 'FHIR R4 Interface' }));
r.use(authenticate);
r.get('/r4/Patient/:id',       async (req, res, next) => { try { res.json(await getFHIRPatient(req.params.id)); } catch (e) { next(e); } });
r.get('/r4/ImagingStudy/:id',  async (req, res, next) => { try { res.json(await getFHIRImagingStudy(req.params.id)); } catch (e) { next(e); } });
r.get('/r4/DiagnosticReport/:id', async (req, res, next) => { try { res.json(await getFHIRDiagnosticReport(req.params.id)); } catch (e) { next(e); } });
r.get('/r4/Observation/:id',     async (req, res, next) => { try { res.json(await getFHIRObservation(req.params.id)); } catch (e) { next(e); } });
r.get('/r4/Practitioner/:id',    async (req, res, next) => { try { res.json(await getFHIRPractitioner(req.params.id)); } catch (e) { next(e); } });
r.get('/r4/Organization/:id',    async (req, res, next) => { try { res.json(await getFHIROrganization(req.params.id)); } catch (e) { next(e); } });

// Search
r.get('/r4/DiagnosticReport', async (req, res, next) => { 
  try { 
    const patient = req.query.patient as string;
    res.json(await searchFHIRDiagnosticReports(patient)); 
  } catch (e) { next(e); } 
});

// Inbound Webhook (EHR -> SEWA AI)
r.post('/webhook', async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const resourceType = req.headers['x-fhir-resource'] as string || req.body.resourceType;
    await fhirSyncWorker.handleInboundWebhook(resourceType, req.body, tenantId);
    res.status(202).json({ message: 'Accepted for processing' });
  } catch (e) { next(e); }
});

export default r;

// ── audit.ts ─────────────────────────────────────────────────
// (separate file)
