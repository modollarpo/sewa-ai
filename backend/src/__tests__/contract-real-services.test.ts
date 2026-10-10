import axios from 'axios';

const baseTriage = process.env.TRIAGE_URL || 'http://localhost:8000';
const baseUnc = process.env.UNCERTAINTY_URL || 'http://localhost:8002';
const baseMet = process.env.METACOGNITION_URL || 'http://localhost:8003';
const baseVlm = process.env.VLM_URL || 'http://localhost:8001';
const img = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function waitFor(url: string, timeoutMs=60000) {
  const start = Date.now();
  while (Date.now()-start < timeoutMs) {
    try { const r = await axios.get(url, {timeout:2000}); if (r.status<500) return true; } catch (e) {}
    await new Promise(x=>setTimeout(x,1000));
  }
  throw new Error('timeout:'+url);
}

test('real services contract: triage->uncertainty->metacognition (end-to-end)', async () => {
  await waitFor(baseTriage+'/health');
  await waitFor(baseUnc+'/health');
  await waitFor(baseMet+'/health');
  const tri = await axios.post(baseTriage+'/triage/predict', { scan_id:'CT-REAL-0001', image_data:img, modality:'CT' }, {timeout:120000});
  expect(tri.status).toBe(200);
  const t = tri.data;
  expect(t).toHaveProperty('primary_finding');
  expect(t).toHaveProperty('confidence');
  expect(typeof t.confidence).toBe('number');
  const unc = await axios.post(baseUnc+'/uncertainty/explain', { scan_id:t.scan_id, modality:'CT', image_data:img }, {timeout:120000});
  expect(unc.status).toBe(200);
  const u = unc.data;
  expect(u).toHaveProperty('uncertainty_score');
  expect(u).toHaveProperty('epistemic_uncertainty');
  expect(u).toHaveProperty('aleatoric_uncertainty');
  const met = await axios.post(baseMet+'/metacognition/evaluate', {
    scan_id:t.scan_id, finding:t.primary_finding, confidence:t.confidence, uncertainty_score:u.uncertainty_score,
    epistemic_uncertainty:u.epistemic_uncertainty, aleatoric_uncertainty:u.aleatoric_uncertainty, urgency:t.urgency||'NORMAL', shap_values:[]
  }, {timeout:120000});
  expect(met.status).toBe(200);
  const m = met.data;
  expect(m).toHaveProperty('passed');
  expect(m).toHaveProperty('safe_to_alert');
  expect(m).toHaveProperty('hallucination_risk');
  expect(m).toHaveProperty('flags');
}, 300000);
