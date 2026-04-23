// SEWA AI — src/services/aiService.ts
// AI service exports — delegates to aiOrchestrator and VLM engine
import axios from 'axios';
export { triggerAITriage, runAIPipeline } from './aiOrchestrator';

const VLM_URL = process.env.VLM_URL || 'http://sewa-vlm-report:8001';

export async function generateVLMReport(scanId: string, tenantId: string) {
  const resp = await axios.post(`${VLM_URL}/generate`, { scan_id: scanId, tenant_id: tenantId }, { timeout: 45_000 });
  return resp.data;
}
