// SEWA XAI — calibrationService.ts
// Confidence Calibration Tracking: records prediction-outcome pairs,
// computes Expected Calibration Error (ECE) and Brier score over a rolling window,
// detects calibration drift, and generates per-modality calibration summaries.
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).

import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';
import { auditLog } from '../utils/audit';

// ── Types ─────────────────────────────────────────────────────────────────

interface PredictionRecord {
  scanId: string;
  tenantId: string;
  modality: string;
  predictedConfidence: number;
  predictedFinding: string;
  actualOutcome: 'correct' | 'incorrect' | 'inconclusive';
  outcomeDeterminedBy: 'radiologist' | 'follow_up' | 'pathology' | 'automated';
  outcomeDeterminedAt: Date;
  clinicianOverride?: boolean;
}

interface CalibrationBin {
  lowerBound: number;
  upperBound: number;
  count: number;
  correctCount: number;
  avgPredictedConfidence: number;
  observedAccuracy: number;
}

interface CalibrationMetrics {
  ece: number;
  mce: number;
  brierScore: number;
  sampleCount: number;
  binCount: number;
  timestamp: Date;
}

interface DriftDetectionResult {
  driftDetected: boolean;
  direction: 'improving' | 'degrading' | 'stable';
  currentEce: number;
  previousEce: number;
  eceDelta: number;
  weeksAnalyzed: number;
  recommendation: string;
}

interface ModalityCalibrationSummary {
  modality: string;
  ece: number;
  mce: number;
  brierScore: number;
  sampleCount: number;
  wellCalibrated: boolean;
  lastUpdated: Date;
}

// ── Configuration ─────────────────────────────────────────────────────────

const DEFAULT_BIN_COUNT = 10;
const DEFAULT_ROLLING_WINDOW_DAYS = 90;
const DRIFT_LOOKBACK_WEEKS = 8;
const ECE_DRIFT_THRESHOLD = 0.05; // 5% absolute ECE increase triggers drift alert
const MIN_SAMPLES_FOR_ECE = 50;
const MIN_SAMPLES_FOR_DRIFT = 20;

// ── Calibration Service ───────────────────────────────────────────────────

class CalibrationService {

  // ── Record Prediction-Outcome Pair ─────────────────────────────────────

  async recordPrediction(record: PredictionRecord): Promise<void> {
    // We store calibration data via ModelPerformanceMetric with a custom metric type
    await prisma.modelPerformanceMetric.create({
      data: {
        tenantId: record.tenantId,
        scanId: record.scanId,
        modality: record.modality,
        metricType: 'calibration_pair',
        value: record.predictedConfidence,
        sampleSize: 1,
        windowStart: record.outcomeDeterminedAt,
        windowEnd: record.outcomeDeterminedAt,
      },
    });

    // Also store the outcome as a separate metric for joining
    await prisma.modelPerformanceMetric.create({
      data: {
        tenantId: record.tenantId,
        scanId: record.scanId,
        modality: record.modality,
        metricType: record.actualOutcome === 'correct'
          ? 'calibration_outcome_correct'
          : record.actualOutcome === 'incorrect'
            ? 'calibration_outcome_incorrect'
            : 'calibration_outcome_inconclusive',
        value: record.clinicianOverride ? 1 : 0,
        sampleSize: 1,
        windowStart: record.outcomeDeterminedAt,
        windowEnd: record.outcomeDeterminedAt,
      },
    });

    logger.info(
      `[Calibration] Recorded prediction: scan=${record.scanId} ` +
      `confidence=${record.predictedConfidence.toFixed(3)} outcome=${record.actualOutcome} ` +
      `modality=${record.modality}`
    );
  }

  // ── Compute ECE & Brier Score (Rolling Window) ─────────────────────────

  async computeCalibrationMetrics(
    tenantId: string,
    modality?: string,
    windowDays: number = DEFAULT_ROLLING_WINDOW_DAYS,
    binCount: number = DEFAULT_BIN_COUNT
  ): Promise<CalibrationMetrics> {
    const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const predictions = await this.getPredictionPairs(tenantId, windowStart, modality);

    if (predictions.length < MIN_SAMPLES_FOR_ECE) {
      return {
        ece: NaN,
        mce: NaN,
        brierScore: NaN,
        sampleCount: predictions.length,
        binCount: 0,
        timestamp: new Date(),
      };
    }

    const bins = this.createCalibrationBins(predictions, binCount);

    const ece = this.computeECE(bins, predictions.length);
    const mce = this.computeMCE(bins);
    const brierScore = this.computeBrierScore(predictions);

    const metrics: CalibrationMetrics = {
      ece,
      mce,
      brierScore,
      sampleCount: predictions.length,
      binCount: bins.length,
      timestamp: new Date(),
    };

    // Persist summary metric
    await prisma.modelPerformanceMetric.create({
      data: {
        tenantId,
        modality: modality ?? 'ALL',
        metricType: 'ece_score',
        value: ece,
        sampleSize: predictions.length,
        windowStart,
        windowEnd: new Date(),
      },
    });

    await prisma.modelPerformanceMetric.create({
      data: {
        tenantId,
        modality: modality ?? 'ALL',
        metricType: 'brier_score',
        value: brierScore,
        sampleSize: predictions.length,
        windowStart,
        windowEnd: new Date(),
      },
    });

    logger.info(
      `[Calibration] Metrics: ECE=${ece.toFixed(4)} MCE=${mce.toFixed(4)} ` +
      `Brier=${brierScore.toFixed(4)} samples=${predictions.length} ` +
      `modality=${modality ?? 'ALL'}`
    );

    return metrics;
  }

  // ── Calibration Drift Detection ────────────────────────────────────────

  async detectCalibrationDrift(
    tenantId: string,
    modality?: string
  ): Promise<DriftDetectionResult> {
    const weeklyEces: Array<{ weekStart: Date; ece: number; sampleCount: number }> = [];

    for (let i = DRIFT_LOOKBACK_WEEKS - 1; i >= 0; i--) {
      const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

      const predictions = await this.getPredictionPairs(tenantId, weekStart, modality, weekEnd);

      if (predictions.length >= MIN_SAMPLES_FOR_DRIFT) {
        const bins = this.createCalibrationBins(predictions, DEFAULT_BIN_COUNT);
        const ece = this.computeECE(bins, predictions.length);
        weeklyEces.push({ weekStart, ece, sampleCount: predictions.length });
      }
    }

    if (weeklyEces.length < 3) {
      return {
        driftDetected: false,
        direction: 'stable',
        currentEce: NaN,
        previousEce: NaN,
        eceDelta: 0,
        weeksAnalyzed: weeklyEces.length,
        recommendation: 'Insufficient weekly data for drift detection',
      };
    }

    const recentEce = weeklyEces[weeklyEces.length - 1].ece;
    const oldestEce = weeklyEces[0].ece;
    const eceDelta = recentEce - oldestEce;

    // Linear regression to detect trend direction
    const trend = this.computeTrend(weeklyEces.map((w) => w.ece));

    let direction: DriftDetectionResult['direction'] = 'stable';
    if (trend > 0.01) direction = 'degrading';
    else if (trend < -0.01) direction = 'improving';

    const driftDetected = eceDelta > ECE_DRIFT_THRESHOLD && direction === 'degrading';

    let recommendation: string;
    if (driftDetected) {
      recommendation =
        `Calibration drift detected: ECE increased by ${(eceDelta * 100).toFixed(1)}% ` +
        `over ${weeklyEces.length} weeks. Recommend model recalibration or ` +
        `retraining with recent data. Consider adjusting confidence thresholds.`;
    } else if (direction === 'improving') {
      recommendation = 'Calibration is improving. Continue monitoring.';
    } else {
      recommendation = 'Calibration is stable. No action required.';
    }

    // Persist drift event if detected
    if (driftDetected) {
      await this.persistDriftEvent(tenantId, modality, recentEce, oldestEce, eceDelta);
    }

    return {
      driftDetected,
      direction,
      currentEce: recentEce,
      previousEce: oldestEce,
      eceDelta,
      weeksAnalyzed: weeklyEces.length,
      recommendation,
    };
  }

  // ── Per-Modality Calibration Summary ───────────────────────────────────

  async generateModalitySummaries(
    tenantId: string,
    windowDays: number = DEFAULT_ROLLING_WINDOW_DAYS
  ): Promise<ModalityCalibrationSummary[]> {
    const modalities = ['CT', 'XRAY', 'MRI', 'US', 'PATH', 'PET', 'MG'];

    const summaries: ModalityCalibrationSummary[] = [];

    for (const modality of modalities) {
      const metrics = await this.computeCalibrationMetrics(tenantId, modality, windowDays);

      if (metrics.sampleCount >= MIN_SAMPLES_FOR_ECE) {
        summaries.push({
          modality,
          ece: metrics.ece,
          mce: metrics.mce,
          brierScore: metrics.brierScore,
          sampleCount: metrics.sampleCount,
          wellCalibrated: metrics.ece < 0.1,
          lastUpdated: metrics.timestamp,
        });
      }
    }

    // Also compute aggregate across all modalities
    const allMetrics = await this.computeCalibrationMetrics(tenantId, undefined, windowDays);
    if (allMetrics.sampleCount >= MIN_SAMPLES_FOR_ECE) {
      summaries.unshift({
        modality: 'ALL',
        ece: allMetrics.ece,
        mce: allMetrics.mce,
        brierScore: allMetrics.brierScore,
        sampleCount: allMetrics.sampleCount,
        wellCalibrated: allMetrics.ece < 0.1,
        lastUpdated: allMetrics.timestamp,
      });
    }

    return summaries;
  }

  // ── Internal: Prediction Retrieval ─────────────────────────────────────

  private async getPredictionPairs(
    tenantId: string,
    windowStart: Date,
    modality?: string,
    windowEnd?: Date
  ): Promise<Array<{ confidence: number; correct: boolean }>> {
    const predictions = await prisma.modelPerformanceMetric.findMany({
      where: {
        tenantId,
        metricType: 'calibration_pair',
        windowStart: { gte: windowStart },
        ...(windowEnd ? { windowEnd: { lte: windowEnd } } : {}),
        ...(modality ? { modality } : {}),
      },
      select: {
        value: true,
        scanId: true,
      },
    });

    const outcomes = await prisma.modelPerformanceMetric.findMany({
      where: {
        tenantId,
        metricType: { in: ['calibration_outcome_correct', 'calibration_outcome_incorrect'] },
        windowStart: { gte: windowStart },
        ...(windowEnd ? { windowEnd: { lte: windowEnd } } : {}),
        ...(modality ? { modality } : {}),
      },
      select: {
        metricType: true,
        scanId: true,
      },
    });

    const outcomeMap = new Map<string, boolean>();
    for (const o of outcomes) {
      if (o.scanId) {
        outcomeMap.set(o.scanId, o.metricType === 'calibration_outcome_correct');
      }
    }

    return predictions
      .filter((p) => p.scanId && outcomeMap.has(p.scanId))
      .map((p) => ({
        confidence: Number(p.value),
        correct: outcomeMap.get(p.scanId!) ?? false,
      }));
  }

  // ── Internal: ECE Computation ──────────────────────────────────────────

  private createCalibrationBins(
    predictions: Array<{ confidence: number; correct: boolean }>,
    binCount: number
  ): CalibrationBin[] {
    const binWidth = 1.0 / binCount;
    const bins: CalibrationBin[] = [];

    for (let i = 0; i < binCount; i++) {
      const lower = i * binWidth;
      const upper = (i + 1) * binWidth;

      const binPredictions = predictions.filter(
        (p) => p.confidence >= lower && (i === binCount - 1 ? p.confidence <= upper : p.confidence < upper)
      );

      const count = binPredictions.length;
      const correctCount = binPredictions.filter((p) => p.correct).length;
      const avgPredictedConfidence = count > 0
        ? binPredictions.reduce((s, p) => s + p.confidence, 0) / count
        : (lower + upper) / 2;
      const observedAccuracy = count > 0 ? correctCount / count : 0;

      bins.push({
        lowerBound: lower,
        upperBound: upper,
        count,
        correctCount,
        avgPredictedConfidence,
        observedAccuracy,
      });
    }

    return bins;
  }

  private computeECE(bins: CalibrationBin[], totalSamples: number): number {
    if (totalSamples === 0) return NaN;

    let ece = 0;
    for (const bin of bins) {
      if (bin.count > 0) {
        const binWeight = bin.count / totalSamples;
        ece += binWeight * Math.abs(bin.observedAccuracy - bin.avgPredictedConfidence);
      }
    }
    return ece;
  }

  private computeMCE(bins: CalibrationBin[]): number {
    let mce = 0;
    for (const bin of bins) {
      if (bin.count > 0) {
        const diff = Math.abs(bin.observedAccuracy - bin.avgPredictedConfidence);
        if (diff > mce) mce = diff;
      }
    }
    return mce;
  }

  private computeBrierScore(predictions: Array<{ confidence: number; correct: boolean }>): number {
    if (predictions.length === 0) return NaN;

    const sum = predictions.reduce((s, p) => {
      const outcome = p.correct ? 1 : 0;
      return s + Math.pow(p.confidence - outcome, 2);
    }, 0);

    return sum / predictions.length;
  }

  // ── Internal: Trend Analysis ───────────────────────────────────────────

  private computeTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((s, v) => s + v, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) * (i - xMean);
    }

    return denominator !== 0 ? numerator / denominator : 0;
  }

  // ── Internal: Drift Event Persistence ──────────────────────────────────

  private async persistDriftEvent(
    tenantId: string,
    modality: string | undefined,
    currentEce: number,
    previousEce: number,
    delta: number
  ): Promise<void> {
    try {
      // Use the AIDriftEvent model to record calibration drift
      const modelVersions = await prisma.aIModelVersion.findMany({
        where: { active: true },
        take: 1,
      });

      if (modelVersions.length > 0) {
        await prisma.aIDriftEvent.create({
          data: {
            modelVersionId: modelVersions[0].id,
            tenantId,
            driftType: 'prediction',
            severity: delta > 0.1 ? 'high' : 'medium',
            description:
              `Calibration drift: ECE increased from ${previousEce.toFixed(4)} to ${currentEce.toFixed(4)} ` +
              `(delta: +${(delta * 100).toFixed(1)}%) over ${DRIFT_LOOKBACK_WEEKS} weeks` +
              `${modality ? ` for modality ${modality}` : ''}`,
            status: 'detected',
            metadata: {
              currentEce,
              previousEce,
              delta,
              modality: modality ?? 'ALL',
              weeksAnalyzed: DRIFT_LOOKBACK_WEEKS,
            },
          },
        });
      }

      await auditLog({
        tenantId,
        action: 'CALIBRATION_DRIFT_DETECTED',
        entity: 'AIModelVersion',
        entityId: modelVersions[0]?.id ?? 'unknown',
        metadata: {
          currentEce,
          previousEce,
          delta,
          modality: modality ?? 'ALL',
        },
      });
    } catch (err: any) {
      logger.error(`[Calibration] Failed to persist drift event: ${err.message}`);
    }
  }
}

export const calibrationService = new CalibrationService();
