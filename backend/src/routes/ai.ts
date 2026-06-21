import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as ctrl from '../controllers/aiController';

const r = Router();

// ── Health Checks ─────────────────────────────────────────────
r.get('/triage/health',       ctrl.getAIHealth('triage'));
r.get('/vlm/health',          ctrl.getAIHealth('vlm'));
r.get('/uncertainty/health',  ctrl.getAIHealth('uncertainty'));
r.get('/metacognition/health',ctrl.getAIHealth('metacognition'));

r.use(authenticate);

// ── AI Operations ─────────────────────────────────────────────
r.post('/triage/:scanId', authorize('admin','superadmin','radiologist'), ctrl.triggerTriage);

// Standard VLM (Full report)
r.post('/vlm/:scanId',    authorize('admin','superadmin','radiologist'), ctrl.streamVLMReport); // Switched to streaming by default for better UX

// Streaming VLM (SSE)
r.get('/vlm/stream/:scanId', authorize('admin','superadmin','radiologist'), ctrl.streamVLMReport);

r.post('/icd10/:scanId',   authorize('admin','superadmin','radiologist'), ctrl.getICD10);
r.get('/result/:scanId',   ctrl.getAIResult);
r.get('/explain/:scanId',  ctrl.getExplanation);
r.get('/progression/:patientId', ctrl.getProgression);

// ── Model Management ──────────────────────────────────────────
r.get('/models',           ctrl.getAIModels);
r.get('/ab-test/metrics',  authorize('admin','superadmin'), ctrl.getABTestMetrics);
r.post('/validate/:scanId',authorize('radiologist','doctor','admin','superadmin'), ctrl.validateResult);
r.post('/ab-test/start',   authorize('superadmin'), ctrl.startABTest);
r.patch('/models/:id/promote', authorize('superadmin'), ctrl.promoteModel);

export default r;
