/**
 * Reliability state g + evaluation harness (audit §30.3-§30.4, §34 research step).
 *
 * Deliberately DB-free and mock-free: every function under test is pure and
 * deterministic, and all resampling uses the explicit seeded PRNG.
 * Fixtures are constructed, not random, so expected values are hand-checkable.
 */

import {
  auroc,
  riskCoverage,
  areaUnderRiskCoverage,
  falseAbstentionRate,
  expectedCalibrationError,
  brierScore,
  percentile,
  bootstrapCI,
  mulberry32,
} from '../evaluation/metrics';
import {
  computeReliabilityState,
  FROZEN_THRESHOLDS,
  FROZEN_WEIGHTS,
  RELIABILITY_VERSION,
} from '../evaluation/reliabilityState';
import { evaluateReliability, EvalCase, MIN_SAMPLES } from '../evaluation/reliabilityEval';

// ── AUROC ────────────────────────────────────────────────────────────────

describe('AUROC — rank formulation', () => {
  it('returns 1.0 for perfect separation', () => {
    const cases = [
      { score: 0.9, positive: true },
      { score: 0.8, positive: true },
      { score: 0.3, positive: false },
      { score: 0.1, positive: false },
    ];
    expect(auroc(cases)).toBe(1);
  });

  it('returns 0.0 when scores are perfectly inverted', () => {
    const cases = [
      { score: 0.9, positive: false },
      { score: 0.8, positive: false },
      { score: 0.3, positive: true },
      { score: 0.1, positive: true },
    ];
    expect(auroc(cases)).toBe(0);
  });

  it('counts tied scores as 0.5 discrimination', () => {
    const cases = [
      { score: 0.5, positive: true },
      { score: 0.5, positive: false },
    ];
    expect(auroc(cases)).toBe(0.5);
  });

  it('matches the hand-computed value for one swapped positive', () => {
    // 3 positives x 5 negatives = 15 pairs. Positives score 0.9, 0.8, 0.4;
    // negatives 0.7, 0.6, 0.5, 0.3, 0.2. The 0.9 and 0.8 positives beat all
    // five negatives (10), the 0.4 positive beats only 0.3 and 0.2 (2):
    // AUC = 12/15 = 0.8.
    const cases = [
      { score: 0.9, positive: true },
      { score: 0.8, positive: true },
      { score: 0.7, positive: false },
      { score: 0.6, positive: false },
      { score: 0.5, positive: false },
      { score: 0.4, positive: true },
      { score: 0.3, positive: false },
      { score: 0.2, positive: false },
    ];
    expect(auroc(cases)).toBeCloseTo(0.8, 10);
  });

  it('returns NaN rather than a fabricated value when one class is missing', () => {
    expect(auroc([{ score: 0.5, positive: true }])).toBeNaN();
    expect(auroc([])).toBeNaN();
  });
});

// ── Risk-coverage ────────────────────────────────────────────────────────

describe('Risk-coverage — selective prediction', () => {
  const cases = [
    { confidence: 0.9, correct: true },
    { confidence: 0.8, correct: false }, // retained first, wrong
    { confidence: 0.7, correct: true },
    { confidence: 0.6, correct: true },
  ];

  it('orders by descending confidence and reports cumulative risk', () => {
    const curve = riskCoverage(cases);
    expect(curve).toHaveLength(4);
    expect(curve[0]).toEqual({ coverage: 0.25, risk: 0 });
    expect(curve[1]).toEqual({ coverage: 0.5, risk: 0.5 });
    expect(curve[3]).toEqual({ coverage: 1, risk: 0.25 });
  });

  it('computes AURC as the mean selective risk', () => {
    const curve = riskCoverage(cases);
    expect(areaUnderRiskCoverage(curve)).toBeCloseTo((0 + 0.5 + 1 / 3 + 0.25) / 4, 10);
  });

  it('returns NaN for an empty curve', () => {
    expect(areaUnderRiskCoverage([])).toBeNaN();
    expect(riskCoverage([])).toEqual([]);
  });
});

// ── False abstention ─────────────────────────────────────────────────────

describe('False-abstention rate — over-deferral', () => {
  it('reports the fraction of safe cases the policy threw away', () => {
    const cases = [
      { retained: false, shouldRetain: true },
      { retained: false, shouldRetain: true },
      { retained: true, shouldRetain: true },
      { retained: false, shouldRetain: false },
    ];
    expect(falseAbstentionRate(cases)).toBeCloseTo(2 / 3, 10);
  });

  it('returns NaN when no case should have been retained', () => {
    expect(falseAbstentionRate([{ retained: false, shouldRetain: false }])).toBeNaN();
  });
});

// ── Calibration ──────────────────────────────────────────────────────────

describe('Calibration metrics — ECE and Brier', () => {
  it('matches hand-computed Brier for three cases', () => {
    const cases = [
      { confidence: 0.9, correct: true },  // (0.9-1)^2 = 0.01
      { confidence: 0.6, correct: true },  // (0.6-1)^2 = 0.16
      { confidence: 0.4, correct: false }, // (0.4-0)^2 = 0.16
    ];
    expect(brierScore(cases)).toBeCloseTo((0.01 + 0.16 + 0.16) / 3, 10);
  });

  it('reports ECE 0 when every bin is perfectly calibrated', () => {
    // Bin accuracy must equal bin confidence: 10 cases at 0.9 with 9 correct
    // (acc 0.9), plus 2 cases at 0.5 with 1 correct (acc 0.5).
    const cases = [
      ...Array.from({ length: 9 }, () => ({ confidence: 0.9, correct: true })),
      { confidence: 0.9, correct: false },
      { confidence: 0.5, correct: true },
      { confidence: 0.5, correct: false },
    ];
    expect(expectedCalibrationError(cases, 10)).toBeCloseTo(0, 10);
  });

  it('weights bin gaps by occupancy', () => {
    // One bin at conf 0.2 with 100% accuracy => gap 0.8, occupancy 1.0.
    const cases = Array.from({ length: 10 }, () => ({ confidence: 0.2, correct: true }));
    expect(expectedCalibrationError(cases, 10)).toBeCloseTo(0.8, 10);
  });

  it('returns NaN for an empty sample', () => {
    expect(expectedCalibrationError([])).toBeNaN();
    expect(brierScore([])).toBeNaN();
  });
});

// ── Seeded resampling ────────────────────────────────────────────────────

describe('Bootstrap CI — seeded and reproducible', () => {
  const values = [0.1, 0.4, 0.5, 0.6, 0.9, 0.3, 0.7, 0.2, 0.8, 0.55];
  const mean = (sample: readonly number[]) => sample.reduce((s, v) => s + v, 0) / sample.length;

  it('produces identical intervals for identical seeds', () => {
    const a = bootstrapCI(values, mean, { seed: 99, iterations: 400 });
    const b = bootstrapCI(values, mean, { seed: 99, iterations: 400 });
    expect(a).toEqual(b);
  });

  it('produces a different interval for a different seed', () => {
    const a = bootstrapCI(values, mean, { seed: 1, iterations: 400 });
    const b = bootstrapCI(values, mean, { seed: 2, iterations: 400 });
    expect(a.lower !== b.lower || a.upper !== b.upper).toBe(true);
  });

  it('brackets the point estimate with lower <= point <= upper', () => {
    const r = bootstrapCI(values, mean, { seed: 7, iterations: 1000 });
    expect(r.lower).toBeLessThanOrEqual(r.point);
    expect(r.point).toBeLessThanOrEqual(r.upper);
    expect(r.alpha).toBe(0.05);
    expect(r.iterations).toBe(1000);
  });

  it('is deterministic for a fixed PRNG seed', () => {
    const first = [...Array(5)].map((_, i) => mulberry32(42)());
    const second = [...Array(5)].map((_, i) => mulberry32(42)());
    expect(first).toEqual(second);
  });

  it('returns NaN bounds for an empty sample', () => {
    const r = bootstrapCI([], mean);
    expect(r.point).toBeNaN();
    expect(r.lower).toBeNaN();
    expect(r.upper).toBeNaN();
  });
});

describe('Percentile — linear interpolation', () => {
  it('interpolates between order statistics', () => {
    const v = [1, 2, 3, 4];
    expect(percentile(v, 0)).toBe(1);
    expect(percentile(v, 100)).toBe(4);
    expect(percentile(v, 50)).toBeCloseTo(2.5, 10);
  });
});

// ── Reliability state g ──────────────────────────────────────────────────

describe('Reliability state — frozen pre-registered g v1', () => {
  it('reports the frozen version and thresholds', () => {
    const s = computeReliabilityState({ confidence: 0.8 });
    expect(s.version).toBe(RELIABILITY_VERSION);
    expect(s.thresholds).toBe(FROZEN_THRESHOLDS);
    expect(FROZEN_THRESHOLDS.gateHallucinationRisk).toBe(0.6);
    expect(FROZEN_THRESHOLDS.epistemicUncertain).toBe(0.25);
    expect(FROZEN_THRESHOLDS.aleatoricUncertain).toBe(0.5);
    expect(FROZEN_THRESHOLDS.reliableAbove).toBe(0.6);
    expect(FROZEN_THRESHOLDS.unreliableBelow).toBe(0.4);
  });

  it('is monotone: R rises with confidence', () => {
    const low = computeReliabilityState({ confidence: 0.3 });
    const high = computeReliabilityState({ confidence: 0.9 });
    expect(high.R).toBeGreaterThan(low.R);
  });

  it('is monotone: R falls with epistemic uncertainty, aleatoric uncertainty and flags', () => {
    const base = computeReliabilityState({ confidence: 0.8, epistemic: 0, aleatoric: 0 });
    expect(computeReliabilityState({ confidence: 0.8, epistemic: 0.4 }).R).toBeLessThan(base.R);
    expect(computeReliabilityState({ confidence: 0.8, aleatoric: 0.6 }).R).toBeLessThan(base.R);
    expect(computeReliabilityState({ confidence: 0.8, errorFlags: 1 }).R).toBeLessThan(base.R);
    expect(computeReliabilityState({ confidence: 0.8, warningFlags: 1 }).R).toBeLessThan(base.R);
  });

  it('decomposes the logit into intercept plus per-input contributions', () => {
    const s = computeReliabilityState({
      confidence: 0.7, epistemic: 0.3, aleatoric: 0.2,
      errorFlags: 1, warningFlags: 2, contractValid: false,
    });
    const sum =
      FROZEN_WEIGHTS.intercept +
      s.contributions.confidence + s.contributions.epistemic + s.contributions.aleatoric +
      s.contributions.errorFlags + s.contributions.warningFlags + s.contributions.validity;
    expect(s.logit).toBeCloseTo(sum, 10);
    expect(s.R).toBeCloseTo(1 / (1 + Math.exp(-s.logit)), 10);
    expect(s.R).toBeGreaterThan(0);
    expect(s.R).toBeLessThan(1);
  });

  it('forces the invalid band when the contract or rules fail, regardless of confidence', () => {
    const s = computeReliabilityState({ confidence: 0.99, contractValid: false });
    expect(s.state).toBe('invalid');
    expect(s.requiresReview).toBe(true);
    const s2 = computeReliabilityState({ confidence: 0.99, rulesPassed: false });
    expect(s2.state).toBe('invalid');
  });

  it('assigns bands at the frozen cut-offs', () => {
    // confidence high, no uncertainty, no flags => R well above 0.60
    expect(computeReliabilityState({ confidence: 0.95 }).state).toBe('reliable');
    // identical inputs except an ERROR flag => must drop below the reliable band
    const withError = computeReliabilityState({ confidence: 0.95, errorFlags: 1 });
    expect(withError.R).toBeLessThan(FROZEN_THRESHOLDS.reliableAbove);
    expect(['uncertain', 'unreliable']).toContain(withError.state);
    expect(withError.requiresReview).toBe(true);
  });

  it('mirrors the human-review policy: only reliable cases are kept', () => {
    const kept = computeReliabilityState({ confidence: 0.9 });
    expect(kept.requiresReview).toBe(false);
    const deferred = computeReliabilityState({ confidence: 0.9, epistemic: 0.5 });
    expect(deferred.requiresReview).toBe(true);
  });

  it('is total: never throws on degenerate inputs', () => {
    expect(() => computeReliabilityState({ confidence: Number.NaN })).not.toThrow();
    expect(() => computeReliabilityState({ confidence: -5, epistemic: 7 })).not.toThrow();
    const s = computeReliabilityState({ confidence: Number.NaN });
    expect(Number.isFinite(s.R)).toBe(true);
  });
});

// ── Evaluation runner ────────────────────────────────────────────────────

function makeCase(overrides: Partial<EvalCase> = {}): EvalCase {
  return {
    confidence: 0.8,
    epistemic: 0.1,
    aleatoric: 0.1,
    errorFlags: 0,
    warningFlags: 0,
    contractValid: true,
    rulesPassed: true,
    correct: true,
    ...overrides,
  };
}

describe('Reliability evaluation runner — honesty and determinism', () => {
  it('reports insufficient_data with null metrics below the sample floor', () => {
    const report = evaluateReliability([makeCase()]);
    expect(report.status).toBe('insufficient_data');
    expect(report.sampleSize).toBe(1);
    expect(report.minSamples).toBe(MIN_SAMPLES);
    expect(report.metrics).toBeNull();
    expect(report.interpretation).toContain('No metrics are reported');
    expect(report.interpretation).toContain('N >= 300');
  });

  it('returns null metrics for an empty file', () => {
    const report = evaluateReliability([]);
    expect(report.status).toBe('insufficient_data');
    expect(report.metrics).toBeNull();
  });

  it('evaluates a separable sample with perfect error detection', () => {
    const cases: EvalCase[] = [];
    for (let i = 0; i < 30; i++) {
      // confident, no uncertainty, correct -> reliable
      cases.push(makeCase({ confidence: 0.9, correct: true }));
      // confident-looking but with ERROR flags and epistemic noise -> error
      cases.push(makeCase({
        confidence: 0.4, epistemic: 0.7, errorFlags: 1, correct: false, shouldRetain: false,
      }));
    }
    const report = evaluateReliability(cases, 20261007);
    expect(report.status).toBe('ok');
    expect(report.sampleSize).toBe(60);
    expect(report.metrics).not.toBeNull();
    const m = report.metrics!;
    expect(m.errorDetectionAUROC).toBe(1);
    expect(m.falseAbstentionRate).toBe(0);
    // Half the sample sits at confidence 0.9 (bin gap 0.1), half at 0.4
    // (bin gap 0.4) => ECE = 0.5*0.1 + 0.5*0.4 = 0.25.
    expect(m.ece).toBeCloseTo(0.25, 1);
    expect(m.brier).toBeGreaterThan(0);
    expect(m.brier).toBeLessThan(1);
    expect(m.eceCI95Lower).toBeLessThanOrEqual(m.ece as number);
    expect(m.eceCI95Upper).toBeGreaterThanOrEqual(m.ece as number);
    expect(report.policy.retainedWhen).toContain('reliable');
    expect(report.interpretation).toContain('out of scope');
  });

  it('is bit-for-bit reproducible for a fixed seed', () => {
    const cases = Array.from({ length: 40 }, (_, i) =>
      makeCase({
        confidence: 0.5 + (i % 10) / 30,
        epistemic: (i % 7) / 20,
        correct: i % 3 !== 0,
        shouldRetain: i % 3 !== 0,
      }),
    );
    const a = evaluateReliability(cases, 1234);
    const b = evaluateReliability(cases, 1234);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const other = evaluateReliability(cases, 99);
    expect(JSON.stringify(other)).not.toBe(JSON.stringify(a));
  });

  it('handles the case where every prediction is correct without fabricating AUC', () => {
    const cases = Array.from({ length: MIN_SAMPLES }, () => makeCase({ correct: true }));
    const report = evaluateReliability(cases);
    expect(report.status).toBe('ok');
    expect(report.metrics!.errorDetectionAUROC).toBeNaN();
    expect(report.metrics!.confidenceAUROC).toBeNaN();
  });
});
