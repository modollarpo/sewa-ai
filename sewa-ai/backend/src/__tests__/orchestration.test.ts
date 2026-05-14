import { runAIPipeline } from '../services/aiOrchestrator';
import { prisma } from '../config/database';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AI Orchestration Pipeline — Integration', () => {
  const mockTenantId = 'test-tenant-id';
  const mockScanId = 'test-scan-id';

  beforeEach(async () => {
    jest.clearAllMocks();
    // Setup minimal DB state
    await prisma.tenant.upsert({
      where: { id: mockTenantId },
      update: {},
      create: { id: mockTenantId, name: 'Test Clinic', slug: 'test-clinic', subdomain: 'test-clinic', region: 'uk', currency: 'GBP', plan: 'pro' }
    });

    await prisma.scan.upsert({
      where: { id: mockScanId },
      update: { status: 'pending' },
      create: { 
        id: mockScanId, 
        tenantId: mockTenantId, 
        modality: 'CT', 
        bodyPart: 'HEAD', 
        status: 'pending',
        priority: 'ROUTINE'
      }
    });
  });

  it('successfully completes the 4-engine pipeline', async () => {
    // 1. Mock Triage
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        primaryFinding: 'Acute ICH',
        primaryCondition: 'ICH',
        confidence: 0.95,
        urgency: 'CRITICAL',
        allFindings: [],
        inferenceMs: 100,
      }
    });

    // 2. Mock Uncertainty
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        epistemicUncertainty: 0.05,
        aleatoricUncertainty: 0.02,
        compositeScore: 0.07,
        highUncertaintyFlag: false,
        oodDistance: 0.1,
        inferenceMs: 50,
      }
    });

    // 3. Mock VLM
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        technique: 'Non-contrast CT Head',
        findings: 'Large hemorrhage detected.',
        impression: 'Acute ICH confirmed.',
        recommendation: 'Immediate neurosurgical consult.',
        language: 'en',
        inferenceMs: 500,
      }
    });

    // 4. Mock Metacognition
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        layer1_modality_plausibility: 'PASS',
        layer9_safe_to_alert: true,
        layer8_hallucination_risk: 0.01,
        inferenceMs: 30,
      }
    });

    await runAIPipeline(mockScanId, mockTenantId);

    const scan = await prisma.scan.findUnique({ 
      where: { id: mockScanId },
      include: { aiResult: true }
    });

    expect(scan?.status).toBe('ai_complete');
    expect(scan?.aiResult?.primaryFinding).toBe('Acute ICH');
    expect(scan?.aiResult?.urgency).toBe('CRITICAL');
    expect(scan?.requiresHumanReview).toBe(false);
  });

  it('marks scan for human review when metacognition fails', async () => {
    // Mock Triage (Normal)
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        primaryFinding: 'Normal Study',
        primaryCondition: 'NORMAL',
        confidence: 0.99,
        urgency: 'NORMAL',
        allFindings: [],
        inferenceMs: 100,
      }
    });

    // Mock Uncertainty (Low)
    mockedAxios.post.mockResolvedValueOnce({
      data: { compositeScore: 0.01, highUncertaintyFlag: false, inferenceMs: 10 }
    });

    // Mock VLM
    mockedAxios.post.mockResolvedValueOnce({
      data: { impression: 'Normal.', recommendation: 'None.', inferenceMs: 100 }
    });

    // 4. Mock Metacognition (FAIL)
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        layer9_safe_to_alert: false, // SAFETY GATE
        layer8_hallucination_risk: 0.5,
        inferenceMs: 30,
      }
    });

    await runAIPipeline(mockScanId, mockTenantId);

    const scan = await prisma.scan.findUnique({ where: { id: mockScanId } });
    expect(scan?.requiresHumanReview).toBe(true);
    expect(scan?.humanReviewReason).toBe('METACOGNITION_FAIL');
  });
});
