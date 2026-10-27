/**
 * AI Orchestration Pipeline — Integration Tests
 *
 * Strategy: mock createAxiosInstance via inline factory so Jest hoisting
 * sees the mock before any transitive imports execute axios.create().
 */

// Shared mock axios instance
const mockPost = jest.fn();

jest.mock('../utils/axiosInstance', () => ({
  createAxiosInstance: jest.fn(() => ({
    post: mockPost,
    get:  jest.fn(),
    put:  jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request:  { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  })),
}));

// Seal off side-effect-heavy modules
jest.mock('../index', () => ({
  io: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) },
}));
jest.mock('../config/redis', () => ({
  redisClient: { setex: jest.fn().mockResolvedValue('OK') },
}));
jest.mock('../services/alertService', () => ({
  alertService: { dispatch: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../services/dlqService', () => ({
  dlq: { enqueue: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../services/fhirService', () => ({
  searchFHIRConditions:   jest.fn().mockResolvedValue({ entry: [] }),
  searchFHIRObservations: jest.fn().mockResolvedValue({ entry: [] }),
}));
jest.mock('../services/longitudinalService', () => ({
  findPriorScan:            jest.fn().mockResolvedValue(null),
  formatLongitudinalPrompt: jest.fn().mockReturnValue('No prior scans for comparison.'),
}));
jest.mock('../utils/audit', () => ({
  auditLog: jest.fn().mockResolvedValue(undefined),
}));

// Imports (after mocks)
import { runAIPipeline } from '../services/aiOrchestrator';
import { prisma } from '../utils/prismaClient';

// Set test timeout to 60 seconds to prevent hanging
jest.setTimeout(60000);

// Fixed IDs (valid UUIDs) ───────────────────────────────────────────────
const TENANT_ID  = 'a0000000-0000-0000-0000-000000000001';
// Each test uses its own scan ID to avoid unique-constraint conflicts
const SCAN_ID_1  = 'b0000000-0000-0000-0000-000000000001';
const SCAN_ID_2  = 'b0000000-0000-0000-0000-000000000002';
// The orchestrator hardcodes authorId: 'SYSTEM' in Report.create —
// we create a real User row with that ID to satisfy the FK.
const SYSTEM_USER_ID = 'SYSTEM';

describe('AI Orchestration Pipeline — Integration', () => {
  beforeAll(async () => {
    // Create tenant and SYSTEM user once for the suite
    await prisma.tenant.upsert({
      where:  { id: TENANT_ID },
      update: {},
      create: {
        id:             TENANT_ID,
        name:           'Test Clinic',
        slug:           'test-clinic-orch',
        subdomain:      'test-clinic-orch',
        region:         'uk',
        currency:       'GBP',
        plan:           'hospital',
        stripeAccountId: 'acct_test_123',
      },
    });

    // SYSTEM user required by Report.authorId FK
    await prisma.user.upsert({
      where:  { id: SYSTEM_USER_ID },
      update: {},
      create: {
        id:           SYSTEM_USER_ID,
        tenantId:     TENANT_ID,
        email:        'system@test-clinic-orch.internal',
        passwordHash: 'not-a-real-hash',
        firstName:    'System',
        lastName:     'User',
        role:         'system',
      },
    });
  });

  afterAll(async () => {
    // Clean up in dependency order (metacognition/explainability tables hold
    // plain, FK-less scanId/aiResultId columns)
    await prisma.report.deleteMany({ where: { tenantId: TENANT_ID } });
    await prisma.metacognitionAuditLog.deleteMany({ where: { tenantId: TENANT_ID } });
    await prisma.explainabilityReport.deleteMany({ where: { tenantId: TENANT_ID } });
    await prisma.aIResult.deleteMany({ where: { tenantId: TENANT_ID } });
    await prisma.scan.deleteMany({ where: { tenantId: TENANT_ID } });
    await prisma.user.deleteMany({ where: { id: SYSTEM_USER_ID } });
    await prisma.tenant.deleteMany({ where: { id: TENANT_ID } });
  });

  beforeEach(async () => {
    mockPost.mockReset();
    const scans = [SCAN_ID_1, SCAN_ID_2];
    await prisma.report.deleteMany({ where: { scanId: { in: scans } } });
    await prisma.metacognitionAuditLog.deleteMany({ where: { scanId: { in: scans } } });
    await prisma.explainabilityReport.deleteMany({ where: { scanId: { in: scans } } });
    await prisma.aIResult.deleteMany({ where: { scanId: { in: scans } } });
    await prisma.scan.deleteMany({ where: { id: { in: scans } } });
  });

  it('successfully completes the 4-engine pipeline', async () => {
    // Create a fresh scan for this test
    await prisma.scan.upsert({
      where:  { id: SCAN_ID_1 },
      update: { status: 'pending' },
      create: {
        id:       SCAN_ID_1,
        tenantId: TENANT_ID,
        modality: 'CT',
        bodyPart: 'HEAD',
        status:   'pending',
        priority: 'ROUTINE',
      },
    });

    // Stage 1a: Triage (snake_case wire contract — every field the real
    // service returns, exactly as ai-services/triage/main.py emits it)
    mockPost.mockResolvedValueOnce({
      data: {
        scan_id:       SCAN_ID_1,
        primary_finding: 'Acute ICH',
        snomed_code:   '235595009',
        confidence:    0.95,
        urgency:       'CRITICAL',
        location:      'Left basal ganglia',
        size:          '3.2 cm',
        midline_shift: 'none',
        all_findings:  [{ condition: 'Acute ICH', probability: 0.95 }],
        inference_ms:  100,
        model_version: 'v2.4.1',
        backend:       'onnx-int8-cpu',
      },
    });
    // Stage 1b: Uncertainty (parallel)
    mockPost.mockResolvedValueOnce({
      data: {
        scan_id:              SCAN_ID_1,
        uncertainty_score:    0.07,
        aleatoric_uncertainty: 0.02,
        epistemic_uncertainty: 0.05,
        shap_values:          [{ f: 'density', v: 0.4 }],
        gradcam_url:          null,
        gradcam_base64:       null,
        mc_dropout_mean:      0.06,
        mc_dropout_std:       0.03,
        mc_passes_used:       10,
        is_uncertain:         false,
        explanation:          'Low predictive entropy across MC passes.',
        inference_ms:         50,
        backend:              'onnx-int8-mc10',
        demo_mode:            true,
        attribution_method:   'demo-random-attribution',
        mc_method:            'onnx-input-noise',
        ood_score:            null,
        ood_flag:             false,
        window_coherence:     null,
        window_deficit:       null,
        channel_shares:       null,
        channel_flag:         false,
        sensitive_windows:    null,
      },
    });
    // Stage 2: VLM
    mockPost.mockResolvedValueOnce({
      data: {
        scan_id:      SCAN_ID_1,
        technique:    'Non-contrast CT Head',
        findings:     'Large hemorrhage detected.',
        impression:   'Acute ICH confirmed.',
        recommendation: 'Immediate neurosurgical consult.',
        full_text:    'Non-contrast CT Head. Large hemorrhage detected. Acute ICH confirmed. Immediate neurosurgical consult.',
        generated_at: '2026-10-06T00:00:00Z',
        model_version: 'gpt-4o-vlm-2026',
        generation_ms: 500,
      },
    });
    // Stage 3: Metacognition
    mockPost.mockResolvedValueOnce({
      data: {
        scan_id:              SCAN_ID_1,
        passed:               true,
        safe_to_alert:        true,
        hallucination_risk:   0.01,
        calibration_score:    0.92,
        self_eval_notes:      'Finding, urgency and confidence are mutually consistent.',
        flags:                [],
        corrected_urgency:    null,
        corrected_confidence: null,
        evaluation_ms:        30,
        evaluated_at:         '2026-10-06T00:00:00Z',
        shap_coherence:       null,
        window_coherence:     null,
        window_deficit:       null,
        sensitive_windows:    null,
        window_flag_used:     false,
      },
    });

    await runAIPipeline(SCAN_ID_1, TENANT_ID);

    const scan = await prisma.scan.findUnique({
      where:   { id: SCAN_ID_1 },
      include: { aiResult: true },
    });

    expect(scan?.status).toBe('ai_complete');
    expect(scan?.aiResult?.primaryFinding).toBe('Acute ICH');
    expect(scan?.aiResult?.urgency).toBe('CRITICAL');
    expect(scan?.requiresHumanReview).toBe(false);
  });

  it('marks scan for human review when metacognition fails', async () => {
    // Create a fresh scan for this test (separate from test 1)
    await prisma.scan.upsert({
      where:  { id: SCAN_ID_2 },
      update: { status: 'pending' },
      create: {
        id:       SCAN_ID_2,
        tenantId: TENANT_ID,
        modality: 'CT',
        bodyPart: 'HEAD',
        status:   'pending',
        priority: 'ROUTINE',
      },
    });

    // Stage 1a: Triage — Normal (full snake_case wire contract)
    mockPost.mockResolvedValueOnce({
      data: {
        scan_id:       SCAN_ID_2,
        primary_finding: 'Normal Study',
        snomed_code:   '16901007',
        confidence:    0.99,
        urgency:       'NORMAL',
        location:      null,
        size:          null,
        midline_shift: null,
        all_findings:  [],
        inference_ms:  100,
        model_version: 'v2.4.1',
        backend:       'onnx-int8-cpu',
      },
    });
    // Stage 1b: Uncertainty — low
    mockPost.mockResolvedValueOnce({
      data: {
        scan_id:              SCAN_ID_2,
        uncertainty_score:    0.01,
        aleatoric_uncertainty: 0.01,
        epistemic_uncertainty: 0.0,
        shap_values:          [],
        gradcam_url:          null,
        gradcam_base64:       null,
        mc_dropout_mean:      0.01,
        mc_dropout_std:       0.0,
        mc_passes_used:       10,
        is_uncertain:         false,
        explanation:          'Model is confident across MC passes.',
        inference_ms:         10,
        backend:              'onnx-int8-mc10',
        demo_mode:            true,
        attribution_method:   'demo-random-attribution',
        mc_method:            'onnx-input-noise',
        ood_score:            null,
        ood_flag:             false,
        window_coherence:     null,
        window_deficit:       null,
        channel_shares:       null,
        channel_flag:         false,
        sensitive_windows:    null,
      },
    });
    // Stage 2: VLM
    mockPost.mockResolvedValueOnce({
      data: {
        scan_id:        SCAN_ID_2,
        impression:     'Normal.',
        recommendation: 'None.',
        findings:       'No acute intracranial abnormality.',
        technique:      'Non-contrast CT Head',
        full_text:      'No acute intracranial abnormality.',
        generated_at:   '2026-10-06T00:00:00Z',
        model_version:  'gpt-4o-vlm-2026',
        generation_ms:  100,
      },
    });
    // Stage 3: Metacognition — FAIL (safety gate)
    mockPost.mockResolvedValueOnce({
      data: {
        scan_id:              SCAN_ID_2,
        passed:               false,
        safe_to_alert:        false,
        hallucination_risk:   0.5,
        calibration_score:    0.3,
        self_eval_notes:      'Confidence is below the reporting floor for a NORMAL study.',
        flags:                [{ code: 'LOW_CONFIDENCE', severity: 'ERROR', message: 'Confidence below floor', suggestion: 'Refer to radiologist' }],
        corrected_urgency:    null,
        corrected_confidence: null,
        evaluation_ms:        30,
        evaluated_at:         '2026-10-06T00:00:00Z',
        shap_coherence:       null,
        window_coherence:     null,
        window_deficit:       null,
        sensitive_windows:    null,
        window_flag_used:     false,
      },
    });

    await runAIPipeline(SCAN_ID_2, TENANT_ID);

    const scan = await prisma.scan.findUnique({ where: { id: SCAN_ID_2 } });
    expect(scan?.requiresHumanReview).toBe(true);
    expect(scan?.humanReviewReason).toBe('METACOGNITION_FAIL');
  });
});
