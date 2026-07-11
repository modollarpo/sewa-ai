import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../utils/prismaClient';

const r = Router();
r.use(authenticate);

// ── GET /pipeline/:scanId/status — real-time pipeline stage for a single scan ──
r.get('/:scanId/status', async (req, res, next) => {
  try {
    const { scanId } = req.params;
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      select: {
        id: true,
        status: true,
        pipelineStage: true,
        pipelineStartedAt: true,
        pipelineCompletedAt: true,
        pipelineMetadata: true,
        qualityScore: true,
        qualityFlags: true,
        errorMessage: true,
        requiresHumanReview: true,
        humanReviewReason: true,
        createdAt: true,
      },
    });
    if (!scan) {
      res.status(404).json({ error: 'Scan not found' });
      return;
    }

    const meta = scan.pipelineMetadata as Record<string, unknown> | null;
    const stageTimings = meta?.stageTimings as Record<string, number> | undefined;

    // Compute total elapsed time
    const elapsedMs = scan.pipelineCompletedAt
      ? scan.pipelineCompletedAt.getTime() - scan.pipelineStartedAt!.getTime()
      : scan.pipelineStartedAt
        ? Date.now() - scan.pipelineStartedAt.getTime()
        : 0;

    res.json({
      scanId: scan.id,
      stage: scan.pipelineStage,
      status: scan.status,
      startedAt: scan.pipelineStartedAt,
      completedAt: scan.pipelineCompletedAt,
      elapsedMs,
      stageTimings: stageTimings ?? {},
      qualityFlags: scan.qualityFlags,
      qualityScore: scan.qualityScore,
      errorMessage: scan.errorMessage,
      requiresHumanReview: scan.requiresHumanReview,
      humanReviewReason: scan.humanReviewReason,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /pipeline/metrics — aggregate pipeline performance metrics (admin only) ──
r.get('/metrics', authorize('admin', 'superadmin'), async (_req, res, next) => {
  try {
    // Stage distribution for active scans
    const stageAgg = await prisma.scan.groupBy({
      by: ['pipelineStage'],
      where: { pipelineStage: { not: null } },
      _count: true,
    });

    // Average pipeline duration for completed scans (last 24h)
    const recentScans = await prisma.scan.findMany({
      where: {
        pipelineStartedAt: { not: null },
        pipelineCompletedAt: { not: null },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: {
        pipelineStartedAt: true,
        pipelineCompletedAt: true,
        pipelineMetadata: true,
        qualityFlags: true,
      },
    });

    let avgDurationMs = 0;
    const stageTimingsAgg: Record<string, { sum: number; count: number }> = {};
    const qualityFlagCounts: Record<string, number> = {};

    for (const s of recentScans) {
      if (s.pipelineStartedAt && s.pipelineCompletedAt) {
        avgDurationMs += s.pipelineCompletedAt.getTime() - s.pipelineStartedAt.getTime();
      }
      const meta = s.pipelineMetadata as Record<string, unknown> | null;
      const timings = meta?.stageTimings as Record<string, number> | undefined;
      if (timings) {
        for (const [k, v] of Object.entries(timings)) {
          if (typeof v === 'number') {
            stageTimingsAgg[k] = stageTimingsAgg[k] ?? { sum: 0, count: 0 };
            stageTimingsAgg[k].sum += v;
            stageTimingsAgg[k].count += 1;
          }
        }
      }
      if (s.qualityFlags && Array.isArray(s.qualityFlags)) {
        for (const flag of s.qualityFlags) {
          qualityFlagCounts[flag] = (qualityFlagCounts[flag] ?? 0) + 1;
        }
      }
    }

    if (recentScans.length > 0) {
      avgDurationMs = Math.round(avgDurationMs / recentScans.length);
    }

    const avgStageTimings: Record<string, number> = {};
    for (const [k, v] of Object.entries(stageTimingsAgg)) {
      avgStageTimings[k] = Math.round(v.sum / v.count);
    }

    res.json({
      period: '24h',
      scanCount: recentScans.length,
      avgDurationMs,
      stageDistribution: Object.fromEntries(stageAgg.map(s => [s.pipelineStage ?? 'null', s._count])),
      avgStageTimings,
      qualityFlagCounts,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /pipeline/:scanId/requeue — requeue a failed scan for retry (admin only) ──
r.post('/:scanId/requeue', authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { scanId } = req.params;
    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) {
      res.status(404).json({ error: 'Scan not found' });
      return;
    }
    if (scan.status !== 'failed') {
      res.status(400).json({ error: 'Only failed scans can be requeued' });
      return;
    }

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'pending',
        pipelineStage: null,
        pipelineStartedAt: null,
        pipelineCompletedAt: null,
        errorMessage: null,
      },
    });

    // Dynamic import to avoid circular dependency
    const { enqueueScanProcessing } = await import('../services/scanQueue');
    await enqueueScanProcessing(scanId, scan.tenantId, 'high');

    res.json({ scanId, status: 'pending', message: 'Scan requeued for processing' });
  } catch (err) {
    next(err);
  }
});

export default r;
