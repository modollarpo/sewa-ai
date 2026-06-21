// SEWA AI — backend/src/services/longitudinalService.ts
// Longitudinal progression analysis — finding prior scans and preparing for registration
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).

import axios from 'axios';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export interface PriorScanInfo {
  id: string;
  receivedAt: Date;
  finding: string;
  urgency: string;
  vlmImpression: string | null;
}

/**
 * Finds the most relevant prior scan for comparison.
 * Modality and BodyPart must match for valid longitudinal analysis.
 */
export async function findPriorScan(patientId: string, currentScanId: string, modality: string, bodyPart: string): Promise<PriorScanInfo | null> {
  try {
    const prior = await prisma.scan.findFirst({
      where: {
        patientId,
        id: { not: currentScanId },
        modality,
        bodyPart,
        status: 'COMPLETED',
        aiResult: { isNot: null }
      },
      orderBy: { receivedAt: 'desc' },
      include: { aiResult: true }
    });

    if (!prior) return null;

    return {
      id: prior.id,
      receivedAt: prior.receivedAt,
      finding: prior.aiResult?.primaryFinding || 'Normal',
      urgency: prior.aiResult?.urgency || 'NORMAL',
      vlmImpression: prior.aiResult?.vlmImpression || null,
    };
  } catch (err: any) {
    logger.error(`[Longitudinal] Prior search failed: ${err.message}`);
    return null;
  }
}

/**
 * Generates a comparison summary for the VLM engine.
 */
export function formatLongitudinalPrompt(prior: PriorScanInfo | null): string {
  if (!prior) return "No prior scans available for longitudinal comparison.";
  
  return `[PRIOR SCAN]: ${prior.receivedAt.toISOString()} | [FINDING]: ${prior.finding} | [IMPRESSION]: ${prior.vlmImpression || 'None'}`;
}
/**
 * Performs Deformable Image Registration (SimpleElastix) via the Python AI Engine.
 * Compares the current scan to the prior scan to track volumetric progression.
 */
export async function performDeformableRegistration(currentScanId: string, priorScanId: string): Promise<any> {
  try {
    const current = await prisma.scan.findUnique({ where: { id: currentScanId } });
    const prior = await prisma.scan.findUnique({ where: { id: priorScanId } });
    if (!current?.storageUrl || !prior?.storageUrl) return null;

    logger.info(`[Longitudinal] Initiating SimpleElastix Registration: ${currentScanId} vs ${priorScanId}`);
    
    // Call Python AI Service for Deformable Image Registration
    const res = await axios.post(`${config.AI_SERVICE_URL}/longitudinal/register`, {
      current_scan_id: currentScanId,
      prior_scan_id: priorScanId,
      current_storage_url: current.storageUrl,
      prior_storage_url: prior.storageUrl,
      method: 'deformable_simple_elastix'
    });

    return res.data; // e.g. { progressionVolumeChange: '+12%', displacementFieldUrl: '...' }
  } catch (err: any) {
    logger.warn(`[Longitudinal] Deformable Registration failed: ${err.message}`);
    return null;
  }
}
