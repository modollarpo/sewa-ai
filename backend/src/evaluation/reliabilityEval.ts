/**
 * Reliability-state evaluation runner (audit §30.4, §34 research step).
 *
 * Reads a JSON file of labelled per-case signals, evaluates the frozen
 * reliability state g (see reliabilityState.ts) and reports:
 *   - error-detection AUROC (primary: can R detect wrong predictions?)
 *   - confidence AUROC (secondary discrimination reference)
 *   - risk-coverage curve + AURC under the R-based selective policy
 *   - false-abstention rate (over-deferral on cases that were safe to keep)
 *   - ECE and Brier with seeded percentile-bootstrap 95% CIs
 *
 * Honesty rules (audit §34.4): with fewer than MIN_SAMPLES labelled cases all
 * metrics are reported as null with status 'insufficient_data'. Nothing is
 * ever filled in from a published number.
 *
 * Usage:  npm run reliability-eval -- path/to/cases.json
 * Case shape:
 *   { "confidence": 0.8, "epistemic": 0.1, "aleatoric": 0.2,
 *     "errorFlags": 0, "warningFlags": 1,
 *     "contractValid": true, "rulesPassed": true,
 *     "correct": true, "shouldRetain": true? }
 *
 * Exit codes: 0 = evaluated (or insufficient data), 1 = usage/input error.
 */

import * as fs from 'fs';
import { computeReliabilityState, RELIABILITY_VERSION, FROZEN_THRESHOLDS } from './reliabilityState';
import {
  auroc,
  riskCoverage,
  areaUnderRiskCoverage,
  falseAbstentionRate,
  expectedCalibrationError,
  brierScore,
  bootstrapCI,
} from './metrics';

export const MIN_SAMPLES = 30;

export interface EvalCase {
  confidence: number;
  epistemic?: number;
  aleatoric?: number;
  errorFlags?: number;
  warningFlags?: number;
  contractValid?: boolean;
  rulesPassed?: boolean;
  /** Prediction matched ground truth. */
  correct: boolean;
  /** Whether the case should have been retained (defaults to `correct`). */
  shouldRetain?: boolean;
}

export interface EvalReport {
  status: 'ok' | 'insufficient_data';
  version: typeof RELIABILITY_VERSION;
  sampleSize: number;
  minSamples: number;
  seed: number;
  interpretation: string;
  metrics: Record<string, number | null> | null;
  policy: { thresholds: typeof FROZEN_THRESHOLDS; retainedWhen: string };
}

/** Pure evaluation: exported so tests can call it without touching the FS. */
export function evaluateReliability(cases: readonly EvalCase[], seed = 20261007): EvalReport {
  const policy = {
    thresholds: FROZEN_THRESHOLDS,
    retainedWhen: "state === 'reliable' (R >= 0.60 and contract/rules valid)",
  };

  if (cases.length < MIN_SAMPLES) {
    return {
      status: 'insufficient_data',
      version: RELIABILITY_VERSION,
      sampleSize: cases.length,
      minSamples: MIN_SAMPLES,
      seed,
      interpretation:
        `Insufficient data: ${cases.length} labelled cases < ${MIN_SAMPLES}. ` +
        'No metrics are reported. The audit targets N >= 300 labelled cases ' +
        'before any reliability number is published.',
      metrics: null,
      policy,
    };
  }

  const states = cases.map(c => computeReliabilityState(c));
  const retained = states.map(s => !s.requiresReview);

  // Primary: does (1 - R) discriminate wrong predictions from correct ones?
  const errorDetection = auroc(
    cases.map((c, i) => ({ score: 1 - states[i].R, positive: !c.correct })),
  );
  // Reference: raw confidence discriminating correct from incorrect.
  const confidenceDiscrimination = auroc(
    cases.map(c => ({ score: c.confidence, positive: c.correct })),
  );

  // Selective policy ordered by descending reliability.
  const curve = riskCoverage(
    cases.map((c, i) => ({ confidence: states[i].R, correct: c.correct })),
  );

  const falseAbstention = falseAbstentionRate(
    cases.map((c, i) => ({
      retained: retained[i],
      shouldRetain: c.shouldRetain ?? c.correct,
    })),
  );

  const eceCI = bootstrapCI(cases, s => expectedCalibrationError(s, 10), { seed });
  const brierCI = bootstrapCI(cases, s => brierScore(s), { seed });

  return {
    status: 'ok',
    version: RELIABILITY_VERSION,
    sampleSize: cases.length,
    minSamples: MIN_SAMPLES,
    seed,
    interpretation:
      'Rule/contract-level evaluation of the frozen reliability state g. ' +
      'Model-level performance claims are out of scope until real weights ' +
      'and labelled clinical data are obtained (audit §34 step 6, §30.5b).',
    metrics: {
      errorDetectionAUROC: errorDetection,
      confidenceAUROC: confidenceDiscrimination,
      aurc: areaUnderRiskCoverage(curve),
      finalSelectiveRisk: curve.length ? curve[curve.length - 1].risk : Number.NaN,
      falseAbstentionRate: falseAbstention,
      ece: eceCI.point,
      eceCI95Lower: eceCI.lower,
      eceCI95Upper: eceCI.upper,
      brier: brierCI.point,
      brierCI95Lower: brierCI.lower,
      brierCI95Upper: brierCI.upper,
    },
    policy,
  };
}

function main(): void {
  const path = process.argv[2];
  if (!path) {
    console.error('Usage: npm run reliability-eval -- path/to/cases.json');
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (e) {
    console.error(`Could not read cases file '${path}': ${(e as Error).message}`);
    process.exit(1);
    return;
  }

  if (!Array.isArray(parsed)) {
    console.error('Cases file must contain a JSON array of case objects.');
    process.exit(1);
    return;
  }

  const report = evaluateReliability(parsed as EvalCase[]);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

if (require.main === module) main();
