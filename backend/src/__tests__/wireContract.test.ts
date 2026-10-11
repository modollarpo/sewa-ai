/**
 * Wire-contract tests (audit E-01…E-04 / N29).
 *
 * These tests are deliberately DB-free and mock-free: they check the contract
 * itself, the normalisers that read it, and the payload builders that write it.
 * The live leg (real FastAPI services over HTTP) is
 * tests/contract/test_wire_contract.py in CI.
 */

import {
  WIRE_CONTRACT,
  ContractViolation,
  assertContractFields,
  normalizeTriage,
  normalizeUncertainty,
  normalizeVLM,
  readMetacognition,
  buildTriagePayload,
  buildUncertaintyPayload,
  buildVlmPayload,
  buildMetacognitionPayload,
  payloadContractCheck,
  validateRequestPayload,
  serviceContract,
} from '../services/wireContract';
import {
  buildMetacogPayload,
  payloadProblems,
  responseProblems,
} from '../validation/metacogCase';

const SERVICE_NAMES = Object.keys(WIRE_CONTRACT.services);

/** Fields a normaliser dereferences on its `raw` argument. */
function normalizerReads(fn: unknown): string[] {
  const src = String(fn);
  const out = new Set<string>();
  const re = /\braw\.([A-Za-z_][A-Za-z0-9_]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.add(m[1]);
  return [...out];
}

const TRIAGE_RAW = {
  scan_id: 'CONTRACT-TRIAGE-001',
  primary_finding: 'Acute ICH',
  snomed_code: '235595009',
  urgency: 'CRITICAL',
  confidence: 0.95,
  location: 'Left basal ganglia',
  size: '3.2 cm',
  midline_shift: 'none',
  inference_ms: 118,
  model_version: 'v2.4.1',
  backend: 'onnx-int8-cpu',
  all_findings: [{ condition: 'Acute ICH', probability: 0.95 }],
};

const UNCERTAINTY_RAW = {
  scan_id: 'CONTRACT-UNCERTAINTY-001',
  uncertainty_score: 0.07,
  aleatoric_uncertainty: 0.02,
  epistemic_uncertainty: 0.05,
  shap_values: [{ f: 'density', v: 0.4 }],
  gradcam_url: null,
  gradcam_base64: null,
  mc_dropout_mean: 0.06,
  mc_dropout_std: 0.03,
  mc_passes_used: 10,
  is_uncertain: false,
  explanation: 'Low predictive entropy across MC passes.',
  inference_ms: 52,
  backend: 'onnx-int8-mc10',
  demo_mode: false,
  attribution_method: 'mc-dropout-perturbation',
  mc_method: 'onnx-input-noise',
  ood_score: null,
  ood_flag: false,
  window_coherence: null,
  window_deficit: null,
  channel_shares: null,
  channel_flag: false,
  sensitive_windows: null,
};

const VLM_RAW = {
  scan_id: 'CONTRACT-VLM-001',
  technique: 'Non-contrast CT Head',
  findings: 'Intracerebral haemorrhage.',
  impression: 'Acute ICH confirmed.',
  recommendation: 'Urgent neurosurgical review.',
  full_text: 'Non-contrast CT Head. Intracerebral haemorrhage.',
  generated_at: '2026-10-06T00:00:00Z',
  model_version: 'gpt-4o-vlm-2026',
  generation_ms: 41,
};

const METACOG_RAW = {
  scan_id: 'CONTRACT-METACOG-001',
  passed: true,
  hallucination_risk: 0.01,
  calibration_score: 0.92,
  self_eval_notes: 'Consistent.',
  flags: [],
  corrected_urgency: null,
  corrected_confidence: null,
  safe_to_alert: true,
  evaluation_ms: 12,
  evaluated_at: '2026-10-06T00:00:00Z',
  shap_coherence: 0.9,
  window_coherence: null,
  window_deficit: null,
  sensitive_windows: null,
  window_flag_used: false,
};

const NORMALIZERS: Record<string, (raw: never) => unknown> = {
  triage: raw => normalizeTriage(raw as never),
  uncertainty: raw => normalizeUncertainty(raw as never),
  vlm: raw => normalizeVLM(raw as never, 'en'),
  metacognition: raw => readMetacognition(raw as never),
};

const RAW_SAMPLES: Record<string, Record<string, unknown>> = {
  triage: TRIAGE_RAW,
  uncertainty: UNCERTAINTY_RAW,
  vlm: VLM_RAW,
  metacognition: METACOG_RAW,
};

describe('wire-contract.json', () => {
  it('declares every service the orchestrator calls', () => {
    expect(SERVICE_NAMES.sort()).toEqual(['metacognition', 'triage', 'uncertainty', 'vlm']);
  });

  it('rejects an unknown service name', () => {
    expect(() => serviceContract('does-not-exist')).toThrow(/unknown service/);
  });

  it.each(SERVICE_NAMES)('%s: every orchestrator read is a declared response field', service => {
    const { orchestratorReads, response } = serviceContract(service);
    for (const field of orchestratorReads) {
      expect(Object.keys(response.fields)).toContain(field);
    }
  });

  it.each(SERVICE_NAMES)('%s: every pipelineSample key is declared (schema or ignored)', service => {
    const { request } = serviceContract(service);
    const declared = new Set([...Object.keys(request.schema), ...request.ignoredFields]);
    for (const key of Object.keys(request.pipelineSample)) {
      expect(declared).toContain(key);
    }
  });
});

describe('normalisers read only fields the contract declares', () => {
  const EXPORTED_NORMALIZERS: Record<string, unknown> = {
    normalizeTriage,
    normalizeUncertainty,
    normalizeVLM,
    readMetacognition,
  };

  it.each(SERVICE_NAMES)('%s: raw.<field> reads ⊆ response.fields', service => {
    const { response, normalizer } = serviceContract(service);
    const fn = EXPORTED_NORMALIZERS[normalizer];
    expect(typeof fn).toBe('function');
    expect((NORMALIZERS as Record<string, unknown>)[service]).toBeDefined();

    const reads = normalizerReads(fn);
    for (const field of reads) {
      expect(Object.keys(response.fields)).toContain(field);
    }
    // The normaliser must actually touch the wire: readMetacognition is the
    // only exception (it asserts every orchestrator read, then hands back raw).
    if (service !== 'metacognition') {
      expect(reads.length).toBeGreaterThan(0);
      // …and the contract's orchestratorReads list must reflect what the code
      // really reads, so the list cannot silently drift from the implementation.
      for (const field of serviceContract(service).orchestratorReads) {
        expect(reads).toContain(field);
      }
    }
  });

  it.each(SERVICE_NAMES)('%s: normaliser output matches the response sample', service => {
    expect(() => NORMALIZERS[service](RAW_SAMPLES[service] as never)).not.toThrow();
  });

  it('coerces an unexpected urgency to NORMAL', () => {
    const out = normalizeTriage({ ...TRIAGE_RAW, urgency: 'ROUTINE' } as never);
    expect(out.urgency).toBe('NORMAL');
    expect(normalizeTriage(TRIAGE_RAW as never).urgency).toBe('CRITICAL');
  });

  it('maps uncertainty snake_case to the camelCase view', () => {
    const out = normalizeUncertainty(UNCERTAINTY_RAW as never);
    expect(out).toMatchObject({
      epistemicUncertainty: 0.05,
      aleatoricUncertainty: 0.02,
      compositeScore: 0.07,
      highUncertaintyFlag: false,
      mcPassesUsed: 10,
      inferenceMs: 52,
      backend: 'onnx-int8-mc10',
      demoMode: false,
    });
    expect(out.shapValues).toEqual([{ f: 'density', v: 0.4 }]);
    expect(out.gradcamUrl).toBeNull();
  });

  it('labels demo mode when the uncertainty service reports it', () => {
    const out = normalizeUncertainty({ ...UNCERTAINTY_RAW, demo_mode: true } as never);
    expect(out.demoMode).toBe(true);
  });

  it('metacognition keeps the wire shape the orchestrator persists', () => {
    const out = readMetacognition(METACOG_RAW as never);
    expect(out.passed).toBe(true);
    expect(out.safe_to_alert).toBe(true);
    expect(out.evaluated_at).toBe('2026-10-06T00:00:00Z');
  });
});

describe('assertContractFields', () => {
  it('passes a fully-populated response', () => {
    expect(() => assertContractFields('triage', TRIAGE_RAW)).not.toThrow();
    expect(() => assertContractFields('uncertainty', UNCERTAINTY_RAW)).not.toThrow();
    expect(() => assertContractFields('metacognition', METACOG_RAW)).not.toThrow();
    expect(() => assertContractFields('vlm', VLM_RAW)).not.toThrow();
  });

  it('fails when a declared field is absent', () => {
    const { urgency: _drop, ...without } = TRIAGE_RAW;
    expect(() => assertContractFields('triage', without)).toThrow(ContractViolation);
    expect(() => assertContractFields('triage', without)).toThrow(/urgency/);
  });

  it('fails when a field has the wrong type', () => {
    expect(() =>
      assertContractFields('triage', { ...TRIAGE_RAW, confidence: '0.95' }),
    ).toThrow(/should be number/);
  });

  it('fails when a non-nullable field is null', () => {
    expect(() =>
      assertContractFields('metacognition', { ...METACOG_RAW, passed: null }),
    ).toThrow(/is null but the contract declares/);
  });

  it('allows null on nullable fields', () => {
    expect(() =>
      assertContractFields('uncertainty', { ...UNCERTAINTY_RAW, gradcam_url: null }),
    ).not.toThrow();
  });
});

describe('request builders emit only declared fields', () => {
  const scan = {
    scanId: 'CONTRACT-001',
    storageUrl: 'https://example.blob.core.windows.net/scans/001.dcm',
    modality: 'CT',
    bodyPart: 'Head',
    clinicalContext: 'Acute stroke protocol',
  };

  const builders: Array<[string, () => Record<string, unknown>]> = [
    ['triage', () => buildTriagePayload(scan)],
    ['uncertainty', () => buildUncertaintyPayload(scan)],
    ['vlm', () =>
      buildVlmPayload({
        ...scan,
        patientAge: 45,
        patientSex: 'M',
        clinicalIndication: 'Acute stroke protocol',
        aiFinding: 'Acute ICH',
        urgency: 'CRITICAL',
        confidence: 0.95,
        location: 'Left basal ganglia',
        shapValues: [{ f: 'density', v: 0.4 }],
        longitudinalContext: 'No prior scans.',
        region: 'uk',
        language: 'en',
        systemPrompt: 'You are a radiologist.',
      })],
    ['metacognition', () =>
      buildMetacognitionPayload({
        scanId: scan.scanId,
        primaryFinding: 'Acute ICH',
        urgency: 'CRITICAL',
        confidence: 0.95,
        uncertaintyScore: 0.07,
        shapValues: [{ f: 'density', v: 0.4 }],
        modality: scan.modality,
        bodyPart: scan.bodyPart,
        patientAge: 45,
        patientSex: 'M',
        allFindings: [{ condition: 'Acute ICH', probability: 0.95 }],
        reportText: 'Intracerebral haemorrhage.',
      })],
  ];

  it.each(builders)('%s: no undeclared fields and no missing required fields', (service, build) => {
    const { undeclared, missingRequired } = payloadContractCheck(service, build());
    const { ignoredFields } = serviceContract(service).request;
    expect(undeclared.filter(f => !ignoredFields.includes(f))).toEqual([]);
    expect(missingRequired).toEqual([]);
  });

  it.each(builders)('%s: every emitted key is declared in pipelineSample', (service, build) => {
    const sample = serviceContract(service).request.pipelineSample;
    for (const key of Object.keys(build())) {
      expect(Object.keys(sample)).toContain(key);
    }
  });

  it('the documented pipelineSample itself satisfies the contract', () => {
    for (const service of SERVICE_NAMES) {
      const { request } = serviceContract(service);
      const { undeclared, missingRequired } = payloadContractCheck(
        service,
        request.pipelineSample,
      );
      expect(undeclared.filter(f => !request.ignoredFields.includes(f))).toEqual([]);
      expect(missingRequired).toEqual([]);
    }
  });

  it('vlm payload keeps the pipeline sample fields the orchestrator no longer sends undefined', () => {
    const payload = buildVlmPayload({
      ...scan,
      aiFinding: 'Acute ICH',
      urgency: 'CRITICAL',
      confidence: 0.95,
      shapValues: [],
      region: 'uk',
      language: 'en',
      systemPrompt: '',
    });
    expect(payload.patient_age).toBeNull();
    expect(payload.patient_sex).toBeNull();
    expect(payload.location).toBeUndefined();
  });
});

describe('validateRequestPayload mirrors the pydantic request models', () => {
  it('accepts every documented pipelineSample', () => {
    for (const service of SERVICE_NAMES) {
      expect(validateRequestPayload(service, serviceContract(service).request.pipelineSample)).toEqual([]);
    }
  });

  it('rejects a missing required field', () => {
    const payload = { ...serviceContract('metacognition').request.pipelineSample };
    delete payload.scan_id;
    expect(validateRequestPayload('metacognition', payload)).toEqual([
      expect.stringContaining('scan_id: required field missing'),
    ]);
  });

  it('rejects a scan_id that violates the uppercase pattern (harness bug detector)', () => {
    const payload = {
      ...serviceContract('metacognition').request.pipelineSample,
      scan_id: 'SCAN-1f0a2b3c-0000-0000-0000-000000000001',
    };
    expect(validateRequestPayload('metacognition', payload)).toEqual([
      expect.stringContaining('does not match pattern'),
    ]);
  });

  it('rejects an out-of-range confidence and an unknown urgency', () => {
    expect(
      validateRequestPayload('metacognition', {
        ...serviceContract('metacognition').request.pipelineSample,
        confidence: 1.4,
        urgency: 'ROUTINE',
      }),
    ).toEqual([
      expect.stringContaining('is not one of'),
      expect.stringContaining('above max 1'),
    ]);
  });

  it('rejects an empty modality (deliberate missing-metadata case)', () => {
    expect(
      validateRequestPayload('metacognition', {
        ...serviceContract('metacognition').request.pipelineSample,
        modality: '',
        body_part: '',
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('modality'),
        expect.stringContaining('body_part'),
      ]),
    );
  });

  it('flags undeclared fields but tolerates contract-ignored ones', () => {
    expect(
      validateRequestPayload('triage', {
        ...serviceContract('triage').request.pipelineSample,
        bogus_field: 1,
      }),
    ).toEqual([expect.stringContaining('bogus_field')]);
    expect(
      validateRequestPayload('triage', serviceContract('triage').request.pipelineSample),
    ).toEqual([]);
  });
});

describe('safety harness payload/response helpers', () => {
  it('builds a contract-valid payload for a well-formed case', () => {
    const payload = buildMetacogPayload({
      scan_id: 'PASS-1',
      modality: 'CT',
      body_part: 'Head',
      triageFinding: 'ICH',
      confidence: 0.95,
      uncertainty: 0.05,
      vlmImpression: 'Acute intracranial haemorrhage.',
      expected: 'PASS',
    });
    expect(payloadProblems(payload)).toEqual([]);
    expect(payload.shap_values).toEqual([]);
    expect(payload.urgency).toBe('CRITICAL');
  });

  it('omits empty case values instead of sending ""', () => {
    const payload = buildMetacogPayload({
      scan_id: 'ATTACK-3',
      modality: '',
      body_part: '',
      triageFinding: 'Normal',
      confidence: 0.99,
      uncertainty: 0.01,
      vlmImpression: 'Normal scan.',
      expected: 'FAIL',
    });
    expect(payload).not.toHaveProperty('modality');
    expect(payload).not.toHaveProperty('body_part');
    expect(payloadProblems(payload).length).toBeGreaterThan(0);
  });

  it('generates an uppercase fallback scan_id that passes the pattern', () => {
    const payload = buildMetacogPayload({
      modality: 'CT',
      body_part: 'Head',
      triageFinding: 'ICH',
      confidence: 0.9,
      uncertainty: 0.1,
    });
    expect(payloadProblems(payload)).toEqual([]);
    expect(String(payload.scan_id)).toMatch(/^[A-Z0-9\-_]{4,64}$/);
  });

  it('detects a response that drops declared fields', () => {
    expect(responseProblems(METACOG_RAW)).toEqual([]);
    const { safe_to_alert: _drop, ...partial } = METACOG_RAW;
    expect(responseProblems(partial)).toEqual([expect.stringContaining('safe_to_alert')]);
  });
});
