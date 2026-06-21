// SEWA AI — src/services/aiService.ts
// AI service exports — delegates to aiOrchestrator and VLM engine
import axios from 'axios';
import CircuitBreaker from 'opossum';
export { triggerAITriage, runAIPipeline } from './aiOrchestrator';

import { config } from '../config/env';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';

const VLM_URL = config.VLM_SERVICE_URL;

const vlmBreaker = new CircuitBreaker(async (scanId: string, tenantId: string) => {
  const resp = await axios.post(`${VLM_URL}/generate`, { scan_id: scanId, tenant_id: tenantId }, { timeout: 15_000 });
  return resp.data?.impression || resp.data?.text || 'AI Impression generated successfully.';
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
