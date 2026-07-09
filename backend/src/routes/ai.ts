import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as ctrl from '../controllers/aiController';

const r = Router();

// ── Health Checks ─────────────────────────────────────────────
r.get('/triage/health',       ctrl.getAIHealth('triage'));
r.get('/vlm/health',          ctrl.getAIHealth('vlm'));
r.get('/uncertainty/health',  ctrl.getAIHealth('uncertainty'));
r.get('/metacognition/health',ctrl.getAIHealth('metacognition'));
r.get('/pathology/health',    ctrl.getAIHealth('pathology'));
r.get('/mammography/health',  ctrl.getAIHealth('mammography'));
r.get('/retinal/health',      ctrl.getAIHealth('retinal'));
r.get('/xai/health',          ctrl.getAIHealth('xai'));
r.get('/federated/health',    ctrl.getAIHealth('federated'));
r.get('/continuous/health',   ctrl.getAIHealth('continuous'));

r.use(authenticate);

// ── AI Operations ─────────────────────────────────────────────
r.post('/triage/:scanId', authorize('admin','superadmin','radiologist'), ctrl.triggerTriage);
r.post('/ambient-dictation', authorize('admin','superadmin','radiologist', 'doctor'), ctrl.ambientDictation);

// Standard VLM (Full report)
r.post('/vlm/:scanId',    authorize('admin','superadmin','radiologist'), ctrl.streamVLMReport); // Switched to streaming by default for better UX

// Streaming VLM (SSE)
r.get('/vlm/stream/:scanId', authorize('admin','superadmin','radiologist'), ctrl.streamVLMReport);

r.post('/icd10/:scanId',   authorize('admin','superadmin','radiologist'), ctrl.getICD10);
r.get('/result/:scanId',   ctrl.getAIResult);
r.get('/explain/:scanId',  ctrl.getExplanation);
r.get('/progression/:patientId', ctrl.getProgression);

// ── Federated Learning ─────────────────────────────────────────
import * as fedCtrl from '../controllers/federatedController';
r.get('/federated/nodes', authorize('superadmin'), fedCtrl.getNodes);
r.get('/federated/rounds', authorize('superadmin'), fedCtrl.getRounds);
r.post('/federated/train', authorize('superadmin'), fedCtrl.triggerRound);

// ── Edge AI ──────────────────────────────────────────────────
import * as edgeCtrl from '../controllers/edgeController';
r.get('/edge/devices', authorize('superadmin'), edgeCtrl.getEdgeDevices);
r.post('/edge/sync', edgeCtrl.syncOfflineData); // using basic auth or JWT depending on implementation, left open for demonstration

// ── Epidemiology ─────────────────────────────────────────────
import * as epiCtrl from '../controllers/epidemiologyController';
r.get('/epi/heatmaps', authorize('superadmin'), epiCtrl.getHeatmaps);
r.get('/epi/anomalies', authorize('superadmin'), epiCtrl.getAnomalies);
r.get('/epi/events', authorize('superadmin'), epiCtrl.getRecentEvents);

// ── Model Management ──────────────────────────────────────────
r.get('/models',           ctrl.getAIModels);
r.get('/ab-test/metrics',  authorize('admin','superadmin'), ctrl.getABTestMetrics);
r.post('/validate/:scanId',authorize('radiologist','doctor','admin','superadmin'), ctrl.validateResult);
r.post('/ab-test/start',   authorize('superadmin'), ctrl.startABTest);
r.patch('/models/:id/promote', authorize('superadmin'), ctrl.promoteModel);

// ── Referral Network ──────────────────────────────────────────
import * as refCtrl from '../controllers/referralController';
r.get('/referrals',             authenticate, refCtrl.getReferrals);
r.post('/referrals',            authenticate, authorize('doctor','admin','radiologist'), refCtrl.createReferral);
r.patch('/referrals/:id',       authenticate, refCtrl.updateReferral);
r.get('/referrals/specialists', authenticate, refCtrl.getSpecialists);
r.get('/referrals/stats',       authenticate, authorize('admin','superadmin'), refCtrl.getReferralStats);

export default r;
