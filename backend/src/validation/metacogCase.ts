// Shared helpers for the safety harnesses (metacognition-benchmark.ts and
// safety-validation.ts).
//
// The harness builds the SAME payload for a corpus case and then decides, from
// the contract, whether a 4xx from the gate is:
//   • an expected rejection of deliberately malformed case data (a safety block)
//   • a contract/harness error (our payload was wrong, or the gate accepted a
//     payload it should have rejected) — which must fail the run.
// Without this split a harness bug (e.g. a scan_id that violates
// `^[A-Z0-9\-_]{4,64}$`) is silently counted as a "blocked" safety outcome and
// inflates the reported catch rate (audit E-11/N29).
import { v4 as uuidv4 } from 'uuid';
import {
  payloadContractCheck,
  serviceContract,
  validateRequestPayload,
} from '../services/wireContract';

export interface SafetyCase {
  scan_id?: string;
  modality?: string;
  body_part?: string;
  triageFinding?: string;
  urgency?: string;
  confidence?: number;
  uncertainty?: number;
  vlmImpression?: string;
  expected?: string;
  reason?: string;
}

/**
 * Build the `/metacognition/evaluate` payload for a corpus case.
 * Empty/absent case values are OMITTED (never sent as "" or undefined) so a
 * case like ATTACK-3 (missing metadata) reaches the service as the genuinely
 * incomplete payload it is meant to be.
 */
export function buildMetacogPayload(
  data: SafetyCase,
  fallbackScanId?: string,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const put = (key: string, value: unknown): void => {
    if (value === undefined || value === null || value === '') return;
    payload[key] = value;
  };

  put('scan_id', data.scan_id ?? fallbackScanId ?? `SCAN-${uuidv4().toUpperCase()}`);
  put('primary_finding', data.triageFinding);
  put('urgency', data.urgency ?? 'CRITICAL');
  put('confidence', data.confidence);
  put('uncertainty_score', data.uncertainty);
  put('shap_values', []);
  put('modality', data.modality);
  put('body_part', data.body_part);
  put('patient_age', 45);
  put('patient_sex', 'M');
  put('all_findings', []);
  put('report_text', data.vlmImpression);
  return payload;
}

/** [] == the service must accept this payload (any 4xx is a contract error). */
export function payloadProblems(payload: Record<string, unknown>): string[] {
  return validateRequestPayload('metacognition', payload);
}

/**
 * [] == the 200 response carries every field the orchestrator/harness reads.
 * A non-empty result means the gate response no longer matches the contract.
 */
export function responseProblems(data: Record<string, unknown>): string[] {
  const { response, orchestratorReads } = serviceContract('metacognition');
  const problems: string[] = [];
  for (const field of orchestratorReads) {
    if (!(field in data)) {
      problems.push(`response.${field}: absent`);
      continue;
    }
    const declared = response.fields[field] ?? '';
    const value = data[field];
    const nullable = declared.split('|').includes('null');
    if (value === null) {
      if (!nullable) problems.push(`response.${field}: null but contract declares "${declared}"`);
      continue;
    }
    if (value === undefined) problems.push(`response.${field}: undefined`);
    else if (declared.startsWith('number') && typeof value !== 'number') problems.push(`response.${field}: expected number`);
    else if (declared.startsWith('string') && typeof value !== 'string') problems.push(`response.${field}: expected string`);
    else if (declared.startsWith('boolean') && typeof value !== 'boolean') problems.push(`response.${field}: expected boolean`);
    else if (declared.startsWith('array') && !Array.isArray(value)) problems.push(`response.${field}: expected array`);
  }
  return problems;
}

export { payloadContractCheck };
