// SEWA XAI — Edge AI Sync Bridge
// Consumes pre-processed scans from edge devices via Redis or REST,
// merges edge hints into the AI pipeline.

import { PrismaClient, Prisma } from '@prisma/client';

export interface EdgeScanJob {
  scanId: string;
  siteId: string;
  tenantId: string;
  edgeDeviceId: string;
  modality: string;
  bodyPart?: string;
  storageUrl?: string;
  priority?: string;
  edgePreProcessing: {
    qualityScore?: number;
    qualityFlags?: string[];
    blurScore?: number;
    noiseEstimate?: number;
    motionArtifact?: boolean;
    urgencyHint?: string;
    urgencyConfidence?: number;
    urgencyMethod?: string;
    anonymizationComplete?: boolean;
    phiStrippedTags?: string[];
    metadataExtracted?: Record<string, unknown>;
    processingMs?: number;
    qualityModelVersion?: string;
    triageModelVersion?: string;
    edgeSoftwareVersion?: string;
  };
  offlineQueued?: boolean;
}

export class EdgeAIBridge {
  constructor(private prisma: PrismaClient) {}

  async processEdgeScan(job: EdgeScanJob): Promise<{ scanId: string; merged: boolean }> {
    const edgeData = job.edgePreProcessing;

    // Create EdgePreProcessing record
    await this.prisma.edgePreProcessing.create({
      data: {
        scanId: job.scanId,
        edgeDeviceId: job.edgeDeviceId,
        siteId: job.siteId,
        qualityScore: edgeData.qualityScore,
        qualityFlags: edgeData.qualityFlags ?? [],
        blurScore: edgeData.blurScore,
        noiseEstimate: edgeData.noiseEstimate,
        motionArtifact: edgeData.motionArtifact ?? false,
        urgencyHint: edgeData.urgencyHint,
        urgencyConfidence: edgeData.urgencyConfidence,
        urgencyMethod: edgeData.urgencyMethod,
        anonymizationVersion: 'hipaa-safe-harbour-v2',
        anonymizationComplete: edgeData.anonymizationComplete ?? false,
        phiStrippedTags: edgeData.phiStrippedTags ?? [],
        metadataExtracted: edgeData.metadataExtracted as Prisma.InputJsonValue ?? Prisma.JsonNull,
        processingMs: edgeData.processingMs,
        qualityModelVersion: edgeData.qualityModelVersion,
        triageModelVersion: edgeData.triageModelVersion,
        edgeSoftwareVersion: edgeData.edgeSoftwareVersion,
        offlineQueued: job.offlineQueued ?? false,
      },
    });

    // Update scan with edge quality data if quality score present
    if (edgeData.qualityScore != null) {
      await this.prisma.scan.update({
        where: { id: job.scanId },
        data: {
          qualityScore: edgeData.qualityScore,
          qualityFlags: edgeData.qualityFlags ?? [],
          urgency: edgeData.urgencyHint ?? undefined,
        },
      });
    }

    // Update edge device stats
    await this.prisma.edgeDevice.updateMany({
      where: { deviceId: job.edgeDeviceId },
      data: { lastHeartbeat: new Date() },
    }).catch(() => { /* device may not exist yet */ });

    return { scanId: job.scanId, merged: true };
  }

  async getEdgeHints(scanId: string) {
    const ep = await this.prisma.edgePreProcessing.findUnique({
      where: { scanId },
    });
    if (!ep) return null;

    return {
      qualityScore: ep.qualityScore,
      qualityFlags: ep.qualityFlags,
      urgencyHint: ep.urgencyHint,
      urgencyConfidence: ep.urgencyConfidence,
      blurScore: ep.blurScore,
      noiseEstimate: ep.noiseEstimate,
      motionArtifact: ep.motionArtifact,
      skipQualityAssessment: (ep.qualityScore ?? 0) > 0.8,
    };
  }

  async batchProcess(jobs: EdgeScanJob[]): Promise<{ accepted: number; rejected: number; scanIds: string[] }> {
    let accepted = 0;
    let rejected = 0;
    const scanIds: string[] = [];

    for (const job of jobs) {
      try {
        await this.processEdgeScan(job);
        accepted++;
        scanIds.push(job.scanId);
      } catch {
        rejected++;
      }
    }

    return { accepted, rejected, scanIds };
  }
}
