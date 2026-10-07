/**
 * Evaluation-harness primitives (audit §30.4).
 *
 * Pure, dependency-free, DB-free functions used by the reliability-state
 * evaluation runner and its tests. Every statistic is deterministic:
 * resampling uses an explicit seeded PRNG (mulberry32), never Math.random.
 */

// ── Types ────────────────────────────────────────────────────────────────

export interface ScoredCase {
  /** Discriminating score; higher = predicted more likely positive. */
  score: number;
  positive: boolean;
}

export interface ConfidenceCase {
  /** Model confidence in [0, 1]. */
  confidence: number;
  /** Whether the prediction matched ground truth. */
  correct: boolean;
}

export interface RetentionCase {
  /** True when the policy kept the case (did not abstain/defer). */
  retained: boolean;
  /** True when the case should have been kept (gold label says it was safe). */
  shouldRetain: boolean;
}

export interface RiskCoveragePoint {
  coverage: number;
  risk: number;
}

export interface BootstrapOptions {
  iterations?: number;
  seed?: number;
  alpha?: number;
}

export interface BootstrapResult {
  point: number;
  lower: number;
  upper: number;
  iterations: number;
  seed: number;
  alpha: number;
}

// ── Seeded PRNG ──────────────────────────────────────────────────────────

/** Deterministic 32-bit PRNG (mulberry32). Same seed => same stream. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Descriptive statistics ───────────────────────────────────────────────

/** Linear-interpolated percentile (p in 0..100) of a numeric sample. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ── Discrimination ───────────────────────────────────────────────────────

/**
 * AUROC via the rank (Mann-Whitney U) formulation with mid-rank handling
 * for ties. Returns NaN when only one class is present (no defined AUC),
 * never a fabricated 0/1.
 */
export function auroc(cases: readonly ScoredCase[]): number {
  const positives = cases.filter(c => c.positive).length;
  const negatives = cases.length - positives;
  if (positives === 0 || negatives === 0) return Number.NaN;

  const sorted = [...cases].sort((a, b) => a.score - b.score);
  let rankSumPositives = 0;
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].score === sorted[i].score) j++;
    const avgRank = (i + j) / 2 + 1; // 1-based mid-rank of the tied block
    for (let k = i; k <= j; k++) if (sorted[k].positive) rankSumPositives += avgRank;
    i = j + 1;
  }
  return (rankSumPositives - (positives * (positives + 1)) / 2) / (positives * negatives);
}

// ── Selective prediction (risk-coverage) ─────────────────────────────────

/**
 * Risk-coverage curve: cases are ordered by descending confidence, and the
 * selective risk is the error rate among the top-k retained cases.
 * Points are returned in ascending coverage (k = 1..n).
 */
export function riskCoverage(cases: readonly ConfidenceCase[]): RiskCoveragePoint[] {
  const sorted = [...cases].sort((a, b) => b.confidence - a.confidence);
  const points: RiskCoveragePoint[] = [];
  let errors = 0;
  for (let k = 1; k <= sorted.length; k++) {
    if (!sorted[k - 1].correct) errors++;
    points.push({ coverage: k / sorted.length, risk: errors / k });
  }
  return points;
}

/** Area under the risk-coverage curve (mean selective risk over coverages). */
export function areaUnderRiskCoverage(curve: readonly RiskCoveragePoint[]): number {
  if (curve.length === 0) return Number.NaN;
  return curve.reduce((sum, p) => sum + p.risk, 0) / curve.length;
}

/**
 * Fraction of cases that should have been retained but the policy abstained
 * on (false-abstention / over-deferral rate). NaN on an empty denominator.
 */
export function falseAbstentionRate(cases: readonly RetentionCase[]): number {
  const should = cases.filter(c => c.shouldRetain);
  if (should.length === 0) return Number.NaN;
  return should.filter(c => !c.retained).length / should.length;
}

// ── Calibration ──────────────────────────────────────────────────────────

/** Brier score: mean squared difference between confidence and outcome. */
export function brierScore(cases: readonly ConfidenceCase[]): number {
  if (cases.length === 0) return Number.NaN;
  return cases.reduce((sum, c) => {
    const y = c.correct ? 1 : 0;
    return sum + (c.confidence - y) ** 2;
  }, 0) / cases.length;
}

/**
 * Expected calibration error over equal-width bins of [0, 1].
 * Empty bins contribute nothing; NaN on an empty sample.
 */
export function expectedCalibrationError(
  cases: readonly ConfidenceCase[],
  binCount = 10,
): number {
  if (cases.length === 0) return Number.NaN;
  const bins = Array.from({ length: binCount }, () => ({ n: 0, conf: 0, acc: 0 }));
  for (const c of cases) {
    const clamped = Math.min(1, Math.max(0, c.confidence));
    const b = Math.min(Math.floor(clamped * binCount), binCount - 1);
    bins[b].n++;
    bins[b].conf += c.confidence;
    bins[b].acc += c.correct ? 1 : 0;
  }
  let ece = 0;
  for (const b of bins) {
    if (b.n === 0) continue;
    ece += (b.n / cases.length) * Math.abs(b.acc / b.n - b.conf / b.n);
  }
  return ece;
}

// ── Bootstrap confidence intervals ───────────────────────────────────────

/**
 * Percentile bootstrap CI for an arbitrary statistic over a sample.
 * Resampling uses an explicit seed so runs are reproducible bit-for-bit.
 */
export function bootstrapCI<T>(
  items: readonly T[],
  statistic: (sample: readonly T[]) => number,
  opts: BootstrapOptions = {},
): BootstrapResult {
  const iterations = opts.iterations ?? 1000;
  const seed = opts.seed ?? 20261007;
  const alpha = opts.alpha ?? 0.05;
  const empty: BootstrapResult = {
    point: Number.NaN, lower: Number.NaN, upper: Number.NaN,
    iterations, seed, alpha,
  };
  if (items.length === 0) return empty;

  const rnd = mulberry32(seed);
  const draws: number[] = [];
  for (let it = 0; it < iterations; it++) {
    const sample: T[] = [];
    for (let k = 0; k < items.length; k++) {
      sample.push(items[Math.floor(rnd() * items.length)]);
    }
    const v = statistic(sample);
    if (Number.isFinite(v)) draws.push(v);
  }
  if (draws.length === 0) return empty;
  draws.sort((a, b) => a - b);

  return {
    point: statistic(items),
    lower: percentile(draws, (alpha / 2) * 100),
    upper: percentile(draws, (1 - alpha / 2) * 100),
    iterations,
    seed,
    alpha,
  };
}
