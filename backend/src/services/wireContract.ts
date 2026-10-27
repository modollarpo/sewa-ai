// ─────────────────────────────────────────────────────────────────────────────
// wireContract — the single, typed boundary between the orchestration layer and
// the AI microservices.
//
// WHY THIS FILE EXISTS (audit E-01…E-04 / N29): the orchestrator used to read
// fields that no service ever returned (`layer9_safe_to_alert`,
// `highUncertaintyFlag`, `compositeScore`, …). Every axios call in the test
// suite was mocked, so the tests stayed green while the real pipeline 422'd on
// every stage. All response reads and request payloads now live here, next to
// `wire-contract.json` (the machine-readable contract), and are checked by:
//   • backend/src/__tests__/wireContract.test.ts — static + builder checks
//   • tests/contract/test_wire_contract.py       — live services in CI
//
// `assertContractFields` also runs at runtime: a service that silently drops a
// field fails loudly (ContractViolation → pipeline DLQ) instead of degrading to
// `?? 0` / `?? false` defaults that mask the break.
// ─────────────────────────────────────────────────────────────────────────────
import wireContractJson from './wire-contract.json';

export interface ServiceRequestContract {
  path: string;
  schema: Record<string, 'required' | 'optional'>;
  /**
   * Mirrors the pydantic constraints on the service's request model so a
   * caller can tell "the case data is deliberately malformed" (expected 4xx —
   * a safety block) from "our harness built an invalid payload" (a harness
   * bug that must fail the run). Keep in sync with the pydantic Field(...) rules.
   */
  constraints?: Record<string, FieldConstraint>;
  /** Fields the orchestrator sends that the service's pydantic model ignores. */
  ignoredFields: string[];
  /** The exact payload shape the orchestrator emits for a synthetic case. */
  pipelineSample: Record<string, unknown>;
}

export interface FieldConstraint {
  pattern?: string;
  enum?: Array<string | number>;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}

export interface ServiceContract {
  live: boolean;
  liveNote?: string;
  baseUrlEnv: string;
  /** Additional env vars consulted (in order) when {@link baseUrlEnv} is unset. */
  baseUrlEnvFallbacks?: string[];
  defaultBaseUrl: string;
  healthPath: string;
  request: ServiceRequestContract;
  response: { fields: Record<string, string> };
  orchestratorReads: string[];
  normalizer: string;
}

export interface WireContract {
  version: number;
  description: string;
  services: Record<string, ServiceContract>;
}

export const WIRE_CONTRACT = wireContractJson as unknown as WireContract;

export function serviceContract(service: string): ServiceContract {
  const svc = WIRE_CONTRACT.services[service];
  if (!svc) throw new Error(`[wire-contract] unknown service "${service}"`);
  return svc;
}

// ── Runtime contract enforcement ─────────────────────────────────────────────
export class ContractViolation extends Error {
  constructor(service: string, field: string, detail: string) {
    super(
      `[wire-contract] ${service}.${field} ${detail}. ` +
      `The service response no longer matches backend/src/services/wire-contract.json — ` +
      `fix the service or the contract, never the read.`,
    );
    this.name = 'ContractViolation';
  }
}

/**
 * Verify that every field the orchestrator reads is present on the wire with a
 * type-compatible value (null only where the contract declares `…|null`).
 */
export function assertContractFields(
  service: string,
  raw: Record<string, unknown>,
  reads: string[] = serviceContract(service).orchestratorReads,
  fields: Record<string, string> = serviceContract(service).response.fields,
): void {
  for (const field of reads) {
    const declared = fields[field];
    if (!declared) {
      throw new ContractViolation(service, field, 'is read by the orchestrator but missing from the contract');
    }
    if (!(field in raw)) {
      throw new ContractViolation(service, field, 'is absent from the service response');
    }
    const value = raw[field];
    const nullable = declared.split('|').includes('null');
    if (value === null && !nullable) {
      throw new ContractViolation(service, field, `is null but the contract declares "${declared}"`);
    }
    if (value === undefined) {
      throw new ContractViolation(service, field, 'is undefined');
    }
    if (value === null) continue;
    const base = declared.replace('|null', '');
    const actual =
      Array.isArray(value) ? 'array'
      : typeof value === 'object' ? 'object'
      : typeof value;
    if (base === 'number' && actual !== 'number') {
      throw new ContractViolation(service, field, `should be number, received ${actual}`);
    }
    if (base === 'string' && actual !== 'string') {
      throw new ContractViolation(service, field, `should be string, received ${actual}`);
    }
    if (base === 'boolean' && actual !== 'boolean') {
      throw new ContractViolation(service, field, `should be boolean, received ${actual}`);
    }
    if (base === 'array' && actual !== 'array') {
      throw new ContractViolation(service, field, `should be array, received ${actual}`);
    }
  }
}

// ── Raw (wire) shapes ────────────────────────────────────────────────────────
export interface RawTriageResult {
  scan_id?: string;
  primary_finding: string;
  snomed_code?: string;
  urgency: string;
  confidence: number;
  location?: string | null;
  size?: string | null;
  midline_shift?: string | null;
  inference_ms?: number;
  model_version?: string;
  backend?: string;
  all_findings?: Array<{ condition: string; probability: number }>;
}

export interface TriageResult {
  primaryFinding: string;
  primaryCondition: string;
  confidence: number;
  urgency: 'CRITICAL' | 'URGENT' | 'NORMAL';
  allFindings: Array<{ condition: string; probability: number }>;
  inferenceMs: number;
  backend?: string;
  modelVersion?: string;
  location?: string | null;
  size?: string | null;
  midlineShift?: string | null;
}

export interface RawUncertaintyResult {
  scan_id?: string;
  uncertainty_score: number;
  aleatoric_uncertainty: number;
  epistemic_uncertainty: number;
  shap_values?: Array<{ f: string; v: number }>;
  gradcam_url?: string | null;
  gradcam_base64?: string | null;
  mc_dropout_mean?: number;
  mc_dropout_std?: number;
  mc_passes_used?: number;
  is_uncertain: boolean;
  explanation?: string;
  inference_ms?: number;
  backend?: string;
  demo_mode?: boolean;
  attribution_method?: string;
  mc_method?: string;
  ood_score?: number | null;
  ood_flag?: boolean;
  window_coherence?: number | null;
  window_deficit?: number | null;
  channel_shares?: Record<string, number> | null;
  channel_flag?: boolean;
  sensitive_windows?: string[] | null;
}

export interface UncertaintyResult {
  epistemicUncertainty: number;
  aleatoricUncertainty: number;
  compositeScore: number;
  highUncertaintyFlag: boolean;
  mcPassesUsed?: number;
  inferenceMs: number;
  shapValues: Array<{ f: string; v: number }>;
  gradcamUrl?: string | null;
  backend?: string;
  demoMode?: boolean;
  /** How shapValues were produced: "onnx-occlusion-finite-difference" | "demo-random-attribution". */
  attributionMethod?: string;
  /** How MC passes were generated: "mc-dropout-torch" | "onnx-input-noise". */
  mcMethod?: string;
  /** Mahalanobis OOD distance over the penultimate embedding; null until enabled. */
  oodScore?: number | null;
  /** True when oodScore exceeds the configured OOD threshold. */
  oodFlag?: boolean;
  /** Experimental window-specific coherence (0..1); null unless the flag is on. Not validated. */
  windowCoherence?: number | null;
  /** 1 - windowCoherence. */
  windowDeficit?: number | null;
  /** Per-window (brain/subdural/bone) share of attribution mass. */
  channelShares?: Record<string, number> | null;
  /** True when a non-sensitive window dominates a finding-specific call. */
  channelFlag?: boolean;
  /** Windows considered sensitive for this finding. */
  sensitiveWindows?: string[] | null;
}

export interface RawVLMResult {
  scan_id?: string;
  technique: string;
  findings: string;
  impression: string;
  recommendation?: string;
  full_text?: string | null;
  generated_at?: string;
  model_version?: string;
  generation_ms?: number;
}

export interface VLMResult {
  technique: string;
  findings: string;
  impression: string;
  recommendation: string;
  fullText: string;
  language: string;
  inferenceMs: number;
  modelVersion?: string;
}

export interface MetacognitionFlag {
  code: string;
  severity: string;
  message: string;
  suggestion: string;
}

export interface MetacognitionResult {
  scan_id?: string;
  passed: boolean;
  hallucination_risk: number;
  calibration_score?: number | null;
  self_eval_notes?: string | null;
  flags: MetacognitionFlag[];
  corrected_urgency?: string | null;
  corrected_confidence?: number | null;
  safe_to_alert: boolean;
  evaluation_ms: number;
  evaluated_at?: string;
  /** Generic SHAP coherence used for the hallucination-risk check. */
  shap_coherence?: number | null;
  /** Experimental window-specific coherence; null unless the flag is on. Not validated. */
  window_coherence?: number | null;
  /** 1 - window_coherence. */
  window_deficit?: number | null;
  /** Windows considered sensitive for this finding. */
  sensitive_windows?: string[] | null;
  /** True when the window deficit (rather than generic coherence) drove the H check. */
  window_flag_used?: boolean;
}

// ── Normalisers (response → internal shape) ──────────────────────────────────
export function normalizeTriage(raw: RawTriageResult): TriageResult {
  assertContractFields('triage', raw as unknown as Record<string, unknown>);
  const urgency: TriageResult['urgency'] =
    raw.urgency === 'CRITICAL' || raw.urgency === 'URGENT' ? raw.urgency : 'NORMAL';
  return {
    primaryFinding: raw.primary_finding,
    primaryCondition: raw.primary_finding,
    confidence: raw.confidence,
    urgency,
    allFindings: raw.all_findings ?? [],
    inferenceMs: raw.inference_ms ?? 0,
    backend: raw.backend,
    modelVersion: raw.model_version,
    location: raw.location,
    size: raw.size,
    midlineShift: raw.midline_shift,
  };
}

export function normalizeUncertainty(raw: RawUncertaintyResult): UncertaintyResult {
  assertContractFields('uncertainty', raw as unknown as Record<string, unknown>);
  return {
    epistemicUncertainty: raw.epistemic_uncertainty ?? 0,
    aleatoricUncertainty: raw.aleatoric_uncertainty ?? 0,
    compositeScore: raw.uncertainty_score ?? 0,
    highUncertaintyFlag: raw.is_uncertain ?? false,
    mcPassesUsed: raw.mc_passes_used,
    inferenceMs: raw.inference_ms ?? 0,
    shapValues: raw.shap_values ?? [],
    gradcamUrl: raw.gradcam_url ?? null,
    backend: raw.backend,
    demoMode: raw.demo_mode ?? false,
    attributionMethod: raw.attribution_method,
    mcMethod: raw.mc_method,
    oodScore: raw.ood_score ?? null,
    oodFlag: raw.ood_flag ?? false,
    windowCoherence: raw.window_coherence ?? null,
    windowDeficit: raw.window_deficit ?? null,
    channelShares: raw.channel_shares ?? null,
    channelFlag: raw.channel_flag ?? false,
    sensitiveWindows: raw.sensitive_windows ?? null,
  };
}

export function normalizeVLM(raw: RawVLMResult, language: string): VLMResult {
  assertContractFields('vlm', raw as unknown as Record<string, unknown>);
  return {
    technique: raw.technique,
    findings: raw.findings,
    impression: raw.impression,
    recommendation: raw.recommendation ?? '',
    fullText: raw.full_text ?? '',
    language,
    inferenceMs: raw.generation_ms ?? 0,
    modelVersion: raw.model_version,
  };
}

/** Metacognition is consumed as-is; the assertion is the value it adds. */
export function readMetacognition(raw: MetacognitionResult): MetacognitionResult {
  assertContractFields('metacognition', raw as unknown as Record<string, unknown>);
  return raw;
}

// ── Request builders (internal shape → wire) ─────────────────────────────────
export interface ScanContext {
  scanId: string;
  storageUrl?: string | null;
  modality: string;
  bodyPart: string;
  clinicalContext?: string | null;
}

export function buildTriagePayload(
  scan: ScanContext,
  modelVersion?: string,
): Record<string, unknown> {
  return {
    scan_id: scan.scanId,
    storage_url: scan.storageUrl ?? null,
    modality: scan.modality,
    body_part: scan.bodyPart,
    model_version: modelVersion,
    clinical_context: scan.clinicalContext ?? null,
  };
}

export function buildUncertaintyPayload(
  scan: ScanContext,
  modelVersion?: string,
): Record<string, unknown> {
  return {
    scan_id: scan.scanId,
    storage_url: scan.storageUrl ?? null,
    modality: scan.modality,
    body_part: scan.bodyPart,
    // Stage 1 runs in parallel with triage: no finding is known yet, so the
    // service gets its documented neutral prior (see wire-contract.json).
    primary_finding: 'unknown',
    confidence: 0.5,
    model_version: modelVersion,
  };
}

export interface VlmPayloadContext extends ScanContext {
  patientAge?: number | null;
  patientSex?: string | null;
  clinicalIndication?: string | null;
  aiFinding: string;
  urgency: string;
  confidence: number;
  location?: string | null;
  shapValues: Array<{ f: string; v: number }>;
  longitudinalContext?: string | null;
  region: string;
  language: string;
  systemPrompt: string;
}

export function buildVlmPayload(ctx: VlmPayloadContext): Record<string, unknown> {
  return {
    scan_id: ctx.scanId,
    storage_url: ctx.storageUrl ?? null,
    modality: ctx.modality,
    body_part: ctx.bodyPart,
    patient_age: ctx.patientAge ?? null,
    patient_sex: ctx.patientSex ?? null,
    clinical_indication: ctx.clinicalIndication ?? null,
    ai_finding: ctx.aiFinding,
    urgency: ctx.urgency,
    confidence: ctx.confidence,
    location: ctx.location ?? undefined,
    shap_values: ctx.shapValues,
    clinical_context: ctx.clinicalContext ?? null,
    longitudinal_context: ctx.longitudinalContext ?? null,
    region: ctx.region,
    language: ctx.language,
    system_prompt: ctx.systemPrompt,
  };
}

export interface MetacognitionPayloadContext {
  scanId: string;
  primaryFinding: string;
  urgency: string;
  confidence: number;
  uncertaintyScore: number;
  shapValues: Array<{ f: string; v: number }>;
  modality: string;
  bodyPart: string;
  patientAge?: number | null;
  patientSex?: string | null;
  allFindings: Array<{ condition: string; probability: number }>;
  reportText: string;
  /** Experimental window-coherence inputs (only present when the flag is on). */
  windowCoherence?: number | null;
  windowDeficit?: number | null;
  sensitiveWindows?: string[] | null;
  windowChannelFlag?: boolean | null;
}

export function buildMetacognitionPayload(ctx: MetacognitionPayloadContext): Record<string, unknown> {
  return {
    scan_id: ctx.scanId,
    primary_finding: ctx.primaryFinding,
    urgency: ctx.urgency,
    confidence: ctx.confidence,
    uncertainty_score: ctx.uncertaintyScore,
    // The service requires a LIST of {f, v} attributions — the uncertainty
    // engine is the sole source of truth for SHAP values.
    shap_values: ctx.shapValues,
    modality: ctx.modality,
    body_part: ctx.bodyPart,
    patient_age: ctx.patientAge ?? null,
    patient_sex: ctx.patientSex ?? null,
    all_findings: ctx.allFindings,
    report_text: ctx.reportText,
    window_coherence: ctx.windowCoherence ?? null,
    window_deficit: ctx.windowDeficit ?? null,
    sensitive_windows: ctx.sensitiveWindows ?? null,
    window_channel_flag: ctx.windowChannelFlag ?? null,
  };
}
export function payloadContractCheck(
  service: string,
  payload: Record<string, unknown>,
): { undeclared: string[]; missingRequired: string[] } {
  const { request } = serviceContract(service);
  const sent = Object.keys(payload);
  const declared = new Set(Object.keys(request.schema));
  const undeclared = sent.filter(k => !declared.has(k));
  const missingRequired = Object.entries(request.schema)
    .filter(([, v]) => v === 'required')
    .map(([k]) => k)
    .filter(k => !(k in payload));
  return { undeclared, missingRequired };
}

/**
 * Full pre-flight check of a request payload against the contract: required
 * fields present, and present values satisfying the mirrored pydantic
 * constraints. An empty result means "the service must accept this payload" —
 * any 4xx on such a payload is a contract error, not a safety outcome.
 */
export function validateRequestPayload(
  service: string,
  payload: Record<string, unknown>,
): string[] {
  const { request } = serviceContract(service);
  const constraints = request.constraints ?? {};
  const problems: string[] = [];

  const { undeclared, missingRequired } = payloadContractCheck(service, payload);
  for (const field of missingRequired) problems.push(`${field}: required field missing`);
  for (const field of undeclared) {
    if (!request.ignoredFields.includes(field)) problems.push(`${field}: not declared by the request schema`);
  }

  for (const [field, c] of Object.entries(constraints)) {
    const raw = payload[field];
    if (raw === undefined || raw === null) continue; // optional / already reported

    if (c.pattern !== undefined) {
      if (typeof raw !== 'string' || !new RegExp(c.pattern).test(raw)) {
        problems.push(`${field}: ${JSON.stringify(raw)} does not match pattern ${c.pattern}`);
      }
    }
    if (c.enum !== undefined && !c.enum.some(v => v === raw)) {
      problems.push(`${field}: ${JSON.stringify(raw)} is not one of [${c.enum.join(', ')}]`);
    }
    if ((c.minLength !== undefined || c.maxLength !== undefined) && typeof raw === 'string') {
      if (raw.length < (c.minLength ?? 0)) problems.push(`${field}: shorter than minLength ${c.minLength}`);
      if (c.maxLength !== undefined && raw.length > c.maxLength) problems.push(`${field}: longer than maxLength ${c.maxLength}`);
    }
    if (c.min !== undefined || c.max !== undefined) {
      if (typeof raw !== 'number' || Number.isNaN(raw)) {
        problems.push(`${field}: expected a number, received ${JSON.stringify(raw)}`);
      } else {
        if (c.min !== undefined && raw < c.min) problems.push(`${field}: ${raw} is below min ${c.min}`);
        if (c.max !== undefined && raw > c.max) problems.push(`${field}: ${raw} is above max ${c.max}`);
      }
    }
  }

  return problems;
}
