// SEWA XAI — backend/src/__tests__/contract-real-services.test.ts
//
// End-to-end boundary test against the REAL AI services (no mocks, real HTTP).
//
// Unlike tests/contract/test_wire_contract.py (which posts the raw contract
// `pipelineSample` JSON), this test round-trips through the backend's own
// boundary code — serviceContract(), the payload builders and the response
// normalizers — so a drift in wireContract.ts fails here even when the JSON
// contract still matches the services.
//
// Gated behind RUN_REAL_SERVICE_CONTRACT=1: it needs triage/vlm/uncertainty/
// metacognition listening on the contract's base URLs. When the flag is unset
// the suite is skipped, keeping DB-free unit runs green. To run locally:
//
//   $env:RUN_REAL_SERVICE_CONTRACT=1
//   npx jest --runTestsByPath src/__tests__/contract-real-services.test.ts
import axios from 'axios';
import {
  LIVE_SERVICES,
  resolveAllBoundaries,
  type ServiceName,
} from '../contracts/boundaries';
import {
  assertContractFields,
  buildMetacognitionPayload,
  buildTriagePayload,
  buildUncertaintyPayload,
  buildVlmPayload,
  normalizeTriage,
  normalizeUncertainty,
  normalizeVLM,
  readMetacognition,
} from '../services/wireContract';

const ENABLED = process.env.RUN_REAL_SERVICE_CONTRACT === '1';
const run = ENABLED ? describe : describe.skip;

// Deterministic 1x1 grayscale PNG (base64) — the services require either
// storage_url or image_data; HTTPS-only SSRF rules rule out storage_url here.
const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const SCAN = {
  scanId: 'CONTRACT-REAL-0001',
  storageUrl: null,
  modality: 'CT',
  bodyPart: 'Head',
  clinicalContext: 'contract-real-services synthetic case',
} as const;

async function waitForHealth(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'no attempt';
  while (Date.now() < deadline) {
    try {
      const res = await axios.get(url, { timeout: 3000, validateStatus: () => true });
      if (res.status < 500) return;
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`service not ready: ${url} (${lastError})`);
}

run('real AI services — live HTTP boundary contract', () => {
  jest.setTimeout(300_000);

  const boundaries = Object.fromEntries(
    resolveAllBoundaries().map((b) => [b.service, b]),
  ) as Record<ServiceName, ReturnType<typeof resolveAllBoundaries>[number]>;

  beforeAll(async () => {
    await Promise.all(
      LIVE_SERVICES.map((s) => waitForHealth(boundaries[s].healthUrl, 120_000)),
    );
  });

  it('all four services report healthy', async () => {
    for (const service of LIVE_SERVICES) {
      const res = await axios.get(boundaries[service].healthUrl, { timeout: 10_000 });
      expect(res.status).toBe(200);
      expect(res.data).toBeTruthy();
    }
  });

  it('triage builder payload → real service → normalizer round-trip', async () => {
    const payload = { ...buildTriagePayload(SCAN, 'v2.4.1'), image_data: PNG_B64 };
    const res = await axios.post(boundaries.triage.predictUrl, payload, { timeout: 120_000 });
    expect(res.status).toBe(200);

    assertContractFields('triage', res.data as Record<string, unknown>);
    const normalized = normalizeTriage(res.data);
    expect(typeof normalized.confidence).toBe('number');
    expect(normalized.primaryFinding).toBe(res.data.primary_finding);
    expect(['CRITICAL', 'URGENT', 'NORMAL']).toContain(normalized.urgency);
  });

  it('uncertainty builder payload → real service → normalizer round-trip', async () => {
    const payload = { ...buildUncertaintyPayload(SCAN, 'v2.4.1'), image_data: PNG_B64 };
    const res = await axios.post(boundaries.uncertainty.predictUrl, payload, { timeout: 120_000 });
    expect(res.status).toBe(200);

    assertContractFields('uncertainty', res.data as Record<string, unknown>);
    const normalized = normalizeUncertainty(res.data);
    expect(typeof normalized.compositeScore).toBe('number');
    expect(typeof normalized.epistemicUncertainty).toBe('number');
    expect(typeof normalized.aleatoricUncertainty).toBe('number');
    expect(Array.isArray(normalized.shapValues)).toBe(true);
    expect(typeof normalized.highUncertaintyFlag).toBe('boolean');
  });

  it('metacognition builder payload → real service → reader round-trip', async () => {
    const payload = buildMetacognitionPayload({
      scanId: SCAN.scanId,
      primaryFinding: 'ICH',
      urgency: 'CRITICAL',
      confidence: 0.92,
      uncertaintyScore: 0.1,
      shapValues: [],
      modality: 'CT',
      bodyPart: 'Head',
      patientAge: 45,
      patientSex: 'M',
      allFindings: [],
      reportText: 'Acute intracranial haemorrhage.',
    });
    const res = await axios.post(boundaries.metacognition.predictUrl, payload, { timeout: 120_000 });
    expect(res.status).toBe(200);

    const read = readMetacognition(res.data);
    for (const key of ['passed', 'safe_to_alert', 'hallucination_risk', 'flags'] as const) {
      expect(read).toHaveProperty(key);
    }
    expect(Array.isArray(read.flags)).toBe(true);
  });

  it('vlm builder payload → real service (cpu-template mode) → normalizer round-trip', async () => {
    const payload = buildVlmPayload({
      ...SCAN,
      patientAge: 45,
      patientSex: 'M',
      clinicalIndication: 'contract-real-services synthetic case',
      aiFinding: 'ICH',
      urgency: 'CRITICAL',
      confidence: 0.92,
      location: 'Basal ganglia',
      shapValues: [],
      longitudinalContext: null,
      region: 'uk',
      language: 'en',
      systemPrompt: '',
    });
    const res = await axios.post(boundaries.vlm.predictUrl, payload, { timeout: 120_000 });
    expect(res.status).toBe(200);

    // normalizeVLM asserts contract fields internally.
    const normalized = normalizeVLM(res.data, 'en');
    expect(typeof normalized.findings).toBe('string');
    for (const key of ['technique', 'impression', 'recommendation', 'fullText'] as const) {
      expect(normalized).toHaveProperty(key);
    }
  });
});
