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
    // Clean up in dependency order
    await prisma.report.deleteMany({ where: { tenantId: TENANT_ID } });
    await prisma.aIResult.deleteMany({ where: { tenantId: TENANT_ID } });
    await prisma.scan.deleteMany({ where: { tenantId: TENANT_ID } });
    await prisma.user.deleteMany({ where: { id: SYSTEM_USER_ID } });
    await prisma.tenant.deleteMany({ where: { id: TENANT_ID } });
  });

  beforeEach(async () => {
    mockPost.mockReset();
    await prisma.report.deleteMany({ where: { scanId: { in: [SCAN_ID_1, SCAN_ID_2] } } });
    await prisma.aIResult.deleteMany({ where: { scanId: { in: [SCAN_ID_1, SCAN_ID_2] } } });
    await prisma.scan.deleteMany({ where: { id: { in: [SCAN_ID_1, SCAN_ID_2] } } });
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
    // Stage 1b: Uncertainty (parallel)
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

    await runAIPipeline(SCAN_ID_2, TENANT_ID);

    const scan = await prisma.scan.findUnique({ where: { id: SCAN_ID_2 } });
    expect(scan?.requiresHumanReview).toBe(true);
    expect(scan?.humanReviewReason).toBe('METACOGNITION_FAIL');
  });
});
