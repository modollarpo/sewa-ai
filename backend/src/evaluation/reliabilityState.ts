/**
 * Pre-registered reliability state R = g(conf, ep, al, flags, validity)
 * (audit §30.3 — "freeze g before evaluation").
 *
 * VERSION g-v1, FROZEN 2026-10-07.
 *
 * This is the monotone logistic baseline the audit asks for, deliberately
 * NOT a learned model: it has no fitted parameters, no data-dependent terms
 * and it must not be tuned against any evaluation result. Any change to
 * FROZEN_WEIGHTS or FROZEN_THRESHOLDS is a new version (g-v2) and requires
 * an ADR plus re-running the evaluation harness from scratch.
 *
 * Inputs are the per-case signals already produced by the pipeline:
 *   conf  - triage confidence (0..1)
 *   ep    - epistemic uncertainty from the uncertainty service
 *   al    - aleatoric uncertainty from the uncertainty service
 *   flags - counts of metacognition flags by severity
 *   validity - wire-contract validity + clinical-rule pass/fail
 *
 * g is monotone: R never decreases when confidence rises, and never
 * increases when epistemic/aleatoric uncertainty or flag counts rise.
 */

// ── Frozen constants (do not tune) ───────────────────────────────────────

export const FROZEN_THRESHOLDS = {
  /** Metacognition gate: passed = no ERROR flags and risk < 0.60 (metacognition/main.py:275). */
  gateHallucinationRisk: 0.60,
  /** Uncertainty service: epistemic > 0.25 => is_uncertain (uncertainty/main.py:443). */
  epistemicUncertain: 0.25,
  /** Uncertainty service: aleatoric > 0.50 => is_uncertain (uncertainty/main.py:443). */
  aleatoricUncertain: 0.50,
  /** R >= 0.60 => state 'reliable' (aligned with the gate's 0.60 risk floor). */
  reliableAbove: 0.60,
  /** R < 0.40 => state 'unreliable'; in between => 'uncertain'. */
  unreliableBelow: 0.40,
} as const;

export const FROZEN_WEIGHTS = {
  intercept: 0.5,
  confidence: 2.0,
  epistemic: -4.0,
  aleatoric: -1.5,
  errorFlag: -3.0,
  warningFlag: -0.5,
  invalidity: -5.0,
} as const;

export const RELIABILITY_VERSION = 'g-v1' as const;

// ── Types ────────────────────────────────────────────────────────────────

export interface ReliabilityInput {
  confidence: number;
  epistemic?: number;
  aleatoric?: number;
  /** Count of metacognition flags with severity ERROR. */
  errorFlags?: number;
  /** Count of metacognition flags with severity WARNING. */
  warningFlags?: number;
  /** False when a service response failed wire-contract validation. */
  contractValid?: boolean;
  /** False when clinical rules rejected the result. */
  rulesPassed?: boolean;
}

export type ReliabilityBand = 'reliable' | 'uncertain' | 'unreliable' | 'invalid';

export interface ReliabilityState {
  version: typeof RELIABILITY_VERSION;
  /** Reliability state R = g(...) in [0, 1]. */
  R: number;
  /** Logit before the sigmoid; equals intercept + sum(contributions). */
  logit: number;
  state: ReliabilityBand;
  /** Mirrors the policy: anything but 'reliable' goes to human review. */
  requiresReview: boolean;
  /** Per-input additive contributions to the logit (faithfulness ablations). */
  contributions: {
    confidence: number;
    epistemic: number;
    aleatoric: number;
    errorFlags: number;
    warningFlags: number;
    validity: number;
  };
  thresholds: typeof FROZEN_THRESHOLDS;
}

// ── Implementation ───────────────────────────────────────────────────────

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));

/**
 * Evaluate the frozen reliability state for one inference.
 * Pure and total: never throws, always returns a state.
 */
export function computeReliabilityState(input: ReliabilityInput): ReliabilityState {
  const w = FROZEN_WEIGHTS;
  const confidence = clamp01(Number.isFinite(input.confidence) ? input.confidence : 0);
  const epistemic = clamp01(input.epistemic ?? 0);
  const aleatoric = clamp01(input.aleatoric ?? 0);
  const errorFlags = Math.max(0, input.errorFlags ?? 0);
  const warningFlags = Math.max(0, input.warningFlags ?? 0);
  const valid = (input.contractValid ?? true) && (input.rulesPassed ?? true);

  const contributions = {
    confidence: w.confidence * confidence,
    epistemic: w.epistemic * epistemic,
    aleatoric: w.aleatoric * aleatoric,
    errorFlags: w.errorFlag * errorFlags,
    warningFlags: w.warningFlag * warningFlags,
    validity: valid ? 0 : w.invalidity,
  };

  const logit =
    w.intercept +
    contributions.confidence +
    contributions.epistemic +
    contributions.aleatoric +
    contributions.errorFlags +
    contributions.warningFlags +
    contributions.validity;

  const R = sigmoid(logit);

  let state: ReliabilityBand;
  if (!valid) state = 'invalid';
  else if (R >= FROZEN_THRESHOLDS.reliableAbove) state = 'reliable';
  else if (R >= FROZEN_THRESHOLDS.unreliableBelow) state = 'uncertain';
  else state = 'unreliable';

  return {
    version: RELIABILITY_VERSION,
    R,
    logit,
    state,
    requiresReview: state !== 'reliable',
    contributions,
    thresholds: FROZEN_THRESHOLDS,
  };
}
