// SEWA AI — backend/src/routes/fhir.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getFHIRPatient, getFHIRImagingStudy } from '../services/fhirService';
const r = Router();
r.get('/health', (_req, res) => res.json({ status: 'operational', service: 'FHIR R4 Interface' }));
r.use(authenticate);
r.get('/r4/Patient/:id',       async (req, res, next) => { try { res.json(await getFHIRPatient(req.params.id)); } catch (e) { next(e); } });
r.get('/r4/ImagingStudy/:id',  async (req, res, next) => { try { res.json(await getFHIRImagingStudy(req.params.id)); } catch (e) { next(e); } });
export default r;

// ── audit.ts ─────────────────────────────────────────────────
// (separate file)
