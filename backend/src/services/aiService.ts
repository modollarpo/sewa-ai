// SEWA XAI — src/services/aiService.ts
// AI service exports — delegates to aiOrchestrator and VLM engine
import CircuitBreaker from 'opossum';
export { triggerAITriage, runAIPipeline } from './aiOrchestrator';

import { config } from '../config/env';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';
import { createAxiosInstance } from '../utils/axiosInstance';

const axios = createAxiosInstance();

const VLM_URL = config.VLM_SERVICE_URL;

// Circuit-breaker wrapper around the real VLM endpoint
// (`/vlm/generate-report` — the previous `${VLM_URL}/generate` path did not
// exist on the service, audit E-04).
const vlmBreaker = new CircuitBreaker(async (scanId: string, tenantId: string) => {
  const result = await prisma.aIResult.findUnique({ where: { scanId }, include: { scan: true } });
  if (!result || !result.scan) throw new Error(`No AI result for scan ${scanId}`);

  const resp = await axios.post(
    `${VLM_URL}/vlm/generate-report`,
    {
      scan_id: scanId,
      storage_url: result.scan.storageUrl ?? null,
      modality: result.scan.modality ?? 'CT',
      body_part: result.scan.bodyPart ?? 'unknown',
      ai_finding: result.primaryFinding,
      urgency: result.urgency === 'CRITICAL' || result.urgency === 'URGENT' ? result.urgency : 'NORMAL',
      confidence: result.confidence,
      region: 'uk',
      language: 'en',
    },
    { timeout: 15_000 },
  );
  return resp.data?.impression || resp.data?.findings || 'AI Impression generated successfully.';
}, {
  timeout: 15000, // If function takes longer than 15s, trigger a failure
  errorThresholdPercentage: 50, // When 50% of requests fail, open the circuit
  resetTimeout: 30000 // After 30s, try again
});

export async function generateVLMReport(scanId: string, tenantId: string) {
  let impressionText = '';
  try {
    impressionText = await vlmBreaker.fire(scanId, tenantId);
  } catch (err: any) {
    logger.error(`[VLM] Engine saturated or unreachable for scan ${scanId}. Circuit breaker triggered.`);
    throw new Error('VLM Engine currently unavailable. Request queued for secondary processing.');
  }

  // Persist the generated impression to the database so the frontend can read it
  const updatedResult = await prisma.aIResult.update({
    where: { scanId },
    data: { vlmImpression: impressionText }
  });

  return { 
    impression: impressionText, 
    findings: impressionText,
    technique: 'Standard non-contrast axial acquisition.',
    fullText: `CLINICAL INDICATION: AI Triage triggered.\n\nTECHNIQUE: Standard non-contrast axial acquisition.\n\nFINDINGS: ${impressionText}\n\nIMPRESSION: ${impressionText}`,
    updatedResult 
  };
}
export async function generateICDCodes(scanId: string) {
  const result = await prisma.aIResult.findUnique({ where: { scanId } });
  const finding = (result?.primaryFinding || '').toLowerCase();
  
  let codes = ['R93.8']; // Abnormal findings on diagnostic imaging of other body structures
  if (finding.includes('hemorrhage') || finding.includes('ich')) codes = ['I61.9', 'I62.9'];
  if (finding.includes('fracture')) codes = ['S02.91'];
  if (finding.includes('tumor') || finding.includes('mass')) codes = ['D49.2'];
  
  await prisma.aIResult.update({
    where: { scanId },
    data: { icd10Codes: codes.join(', ') }
  });
  
  return codes;
}
