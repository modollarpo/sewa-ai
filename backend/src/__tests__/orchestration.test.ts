/**
 * AI Orchestration Pipeline — Integration Tests
 *
 * Strategy: mock createAxiosInstance via inline factory so Jest hoisting
 * sees the mock before any transitive imports execute axios.create().
 */

// ── Shared mock axios instance ────────────────────────────────────────────
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

// ── Seal off side-effect-heavy modules ───────────────────────────────────
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
  searchFHIRConditions:  jest.fn().mockResolvedValue({ entry: [] }),
  searchFHIRObservations: jest.fn().mockResolvedValue({ entry: [] }),
}));
jest.mock('../services/longitudinalService', () => ({
  findPriorScan:           jest.fn().mockResolvedValue(null),
  formatLongitudinalPrompt: jest.fn().mockReturnValue('No prior scans for comparison.'),
}));
jest.mock('../utils/audit', () => ({
  auditLog: jest.fn().mockResolvedValue(undefined),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────
import { runAIPipeline } from '../services/aiOrchestrator';
import { prisma } from '../utils/prismaClient';

// ── Tests ─────────────────────────────────────────────────────────────────
describe('AI Orchestration Pipeline — Integration', () => {
  const mockTenantId = 'a0000000-0000-0000-0000-000000000001';
  const mockScanId   = 'b0000000-0000-0000-0000-000000000001';

  beforeEach(async () => {
    mockPost.mockReset();

    // Setup minimal DB state
    await prisma.tenant.upsert({
      where:  { id: mockTenantId },
      update: {},
      create: {
        id:        mockTenantId,
        name:      'Test Clinic',
        slug:      'test-clinic',
        subdomain: 'test-clinic',
        region:    'uk',
        currency:  'GBP',
        plan:      'hospital',
      },
    });

    await prisma.scan.upsert({
      where:  { id: mockScanId },
      update: { status: 'pending' },
      create: {
        id:       mockScanId,
        tenantId: mockTenantId,
        modality: 'CT',
        bodyPart: 'HEAD',
        status:   'pending',
        priority: 'ROUTINE',
      },
    });
  });

  it('successfully completes the 4-engine pipeline', async () => {
    // Stage 1a: Triage
    mockPost.mockResolvedValueOnce({
      data: {
        primaryFinding:   'Acute ICH',
        primaryCondition: 'ICH',
        confidence:       0.95,
        urgency:          'CRITICAL',
        allFindings:      [],
        inferenceMs:      100,
      },
    });

    // Stage 1b: Uncertainty (parallel with triage via Promise.all)
    mockPost.mockResolvedValueOnce({
      data: {
        epistemicUncertainty: 0.05,
        aleatoricUncertainty: 0.02,
        compositeScore:       0.07,
        highUncertaintyFlag:  false,
        inferenceMs:          50,
      },
    });

    // Stage 2: VLM
    mockPost.mockResolvedValueOnce({
      data: {
        technique:      'Non-contrast CT Head',
        findings:       'Large hemorrhage detected.',
        impression:     'Acute ICH confirmed.',
        recommendation: 'Immediate neurosurgical consult.',
        language:       'en',
        inferenceMs:    500,
      },
    });

    // Stage 3: Metacognition
    mockPost.mockResolvedValueOnce({
      data: {
        layer1_modality_plausibility: 'PASS',
        layer9_safe_to_alert:         true,
        layer8_hallucination_risk:    0.01,
        inferenceMs:                  30,
      },
    });

    await runAIPipeline(mockScanId, mockTenantId);

    const scan = await prisma.scan.findUnique({
      where:   { id: mockScanId },
      include: { aiResult: true },
    });

    expect(scan?.status).toBe('ai_complete');
    expect(scan?.aiResult?.primaryFinding).toBe('Acute ICH');
    expect(scan?.aiResult?.urgency).toBe('CRITICAL');
    expect(scan?.requiresHumanReview).toBe(false);
  });

  it('marks scan for human review when metacognition fails', async () => {
    // Stage 1a: Triage — Normal
    mockPost.mockResolvedValueOnce({
      data: {
        primaryFinding:   'Normal Study',
        primaryCondition: 'NORMAL',
        confidence:       0.99,
        urgency:          'NORMAL',
        allFindings:      [],
        inferenceMs:      100,
      },
    });

    // Stage 1b: Uncertainty — low
    mockPost.mockResolvedValueOnce({
      data: { compositeScore: 0.01, highUncertaintyFlag: false, inferenceMs: 10 },
    });

    // Stage 2: VLM
    mockPost.mockResolvedValueOnce({
      data: {
        impression:     'Normal.',
        recommendation: 'None.',
        findings:       '',
        technique:      '',
        language:       'en',
        inferenceMs:    100,
      },
    });

    // Stage 3: Metacognition — FAIL (safety gate)
    mockPost.mockResolvedValueOnce({
      data: {
        layer9_safe_to_alert:      false,
        layer8_hallucination_risk: 0.5,
        inferenceMs:               30,
      },
    });

    await runAIPipeline(mockScanId, mockTenantId);

    const scan = await prisma.scan.findUnique({ where: { id: mockScanId } });
    expect(scan?.requiresHumanReview).toBe(true);
    expect(scan?.humanReviewReason).toBe('METACOGNITION_FAIL');
  });
});
