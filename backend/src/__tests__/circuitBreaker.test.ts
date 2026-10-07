/**
 * AI Service — Circuit Breaker & ICD Code Tests
 *
 * Strategy: mock createAxiosInstance via inline factory so Jest hoisting
 * sees the mock before aiService.ts (and its transitive imports) execute
 * axios.create() / instance.interceptors.
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
jest.mock('../utils/audit', () => ({
  auditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../utils/prismaClient', () => ({
  prisma: {
    aIResult: {
      update:     jest.fn(),
      findUnique: jest.fn(),
    },
  },
  tenantStorage: {
    getStore: jest.fn(),
  },
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────
import { generateVLMReport, generateICDCodes } from '../services/aiService';
import { prisma } from '../utils/prismaClient';

// ── Tests ─────────────────────────────────────────────────────────────────
describe('AI Service Circuit Breaker', () => {
  beforeEach(() => {
    mockPost.mockReset();
    jest.clearAllMocks();
  });

  it('should successfully generate report on API success', async () => {
    mockPost.mockResolvedValueOnce({ data: { impression: 'Normal' } });
    (prisma.aIResult.findUnique as jest.Mock).mockResolvedValueOnce({
      scanId: 'scan1', primaryFinding: 'Acute ICH', urgency: 'CRITICAL', confidence: 0.95,
      scan: { modality: 'CT', bodyPart: 'HEAD', storageUrl: 'https://example.com/dicom' },
    });
    (prisma.aIResult.update as jest.Mock).mockResolvedValueOnce({});

    const result = await generateVLMReport('scan1', 'tenant1');

    expect(result.impression).toBe('Normal');
    expect(mockPost).toHaveBeenCalled();
    expect(prisma.aIResult.update).toHaveBeenCalled();
  });

  it('should trigger circuit breaker and throw error on API failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network Error'));
    (prisma.aIResult.findUnique as jest.Mock).mockResolvedValue({
      scanId: 'scan1', primaryFinding: 'Acute ICH', urgency: 'CRITICAL', confidence: 0.95,
      scan: { modality: 'CT', bodyPart: 'HEAD', storageUrl: 'https://example.com/dicom' },
    });

    await expect(generateVLMReport('scan1', 'tenant1')).rejects.toThrow(
      'VLM Engine currently unavailable. Request queued for secondary processing.',
    );
  });
});

describe('generateICDCodes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates hemorrhage codes', async () => {
    (prisma.aIResult.findUnique as jest.Mock).mockResolvedValueOnce({ primaryFinding: 'Large ICH detected' });
    const codes = await generateICDCodes('scan1');
    expect(codes).toEqual(['I61.9', 'I62.9']);
  });

  it('generates fracture codes', async () => {
    (prisma.aIResult.findUnique as jest.Mock).mockResolvedValueOnce({ primaryFinding: 'skull fracture' });
    const codes = await generateICDCodes('scan2');
    expect(codes).toEqual(['S02.91']);
  });

  it('generates tumor codes', async () => {
    (prisma.aIResult.findUnique as jest.Mock).mockResolvedValueOnce({ primaryFinding: 'brain tumor' });
    const codes = await generateICDCodes('scan3');
    expect(codes).toEqual(['D49.2']);
  });

  it('returns default code for benign findings', async () => {
    (prisma.aIResult.findUnique as jest.Mock).mockResolvedValueOnce({ primaryFinding: 'normal scan' });
    const codes = await generateICDCodes('scan4');
    expect(codes).toEqual(['R93.8']);
  });
});
