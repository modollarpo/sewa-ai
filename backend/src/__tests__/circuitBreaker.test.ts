import axios from 'axios';
import { generateVLMReport, generateICDCodes } from '../services/aiService';
import { prisma } from '../utils/prismaClient';

jest.mock('axios');
jest.mock('../utils/prismaClient', () => ({
  prisma: {
    aIResult: {
      update: jest.fn(),
      findUnique: jest.fn()
    }
  },
  tenantStorage: {
    getStore: jest.fn()
  }
}));

describe('AI Service Circuit Breaker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully generate report on API success', async () => {
    (axios.post as jest.Mock).mockResolvedValueOnce({ data: { impression: 'Normal' } });
    (prisma.aIResult.update as jest.Mock).mockResolvedValueOnce({});

    const result = await generateVLMReport('scan1', 'tenant1');
    expect(result.impression).toBe('Normal');
    expect(axios.post).toHaveBeenCalled();
    expect(prisma.aIResult.update).toHaveBeenCalled();
  });

  it('should trigger circuit breaker and throw error on API failure', async () => {
    (axios.post as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));
    
    await expect(generateVLMReport('scan1', 'tenant1')).rejects.toThrow('VLM Engine currently unavailable. Request queued for secondary processing.');
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
